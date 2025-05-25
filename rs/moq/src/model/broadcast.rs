use std::{
	collections::HashMap,
	sync::{Arc, Mutex},
};

use crate::{TrackConsumer, TrackProducer};
use tokio::sync::watch;

use super::Track;

struct State {
	published: HashMap<String, TrackConsumer>,
	requested: HashMap<String, TrackProducer>,
	queue: async_channel::Sender<TrackProducer>,
}

impl State {
	pub fn new(queue: async_channel::Sender<TrackProducer>) -> Self {
		Self {
			published: HashMap::new(),
			requested: HashMap::new(),
			queue,
		}
	}
}

/// Receive broadcast/track requests and return if we can fulfill them.
///
/// This is a pull-based producer.
/// If you want an easier push-based producer, use [BroadcastProducer::map].
#[derive(Clone)]
pub struct BroadcastProducer {
	state: Arc<Mutex<State>>,
	queue: async_channel::Receiver<TrackProducer>,

	// Dropped when all senders or all receivers are dropped.
	// TODO Make a better way of doing this.
	closed: watch::Sender<bool>,
}

impl Default for BroadcastProducer {
	fn default() -> Self {
		Self::new()
	}
}

impl BroadcastProducer {
	pub fn new() -> Self {
		let (send, recv) = async_channel::bounded(32);

		Self {
			state: Arc::new(Mutex::new(State::new(send))),
			queue: recv,
			closed: watch::Sender::default(),
		}
	}

	pub async fn requested(&self) -> Option<TrackProducer> {
		tokio::select! {
			biased;
			producer = self.queue.recv() => producer.ok(),
			_ = self.closed() => None,
		}
	}

	pub fn create(&self, track: Track) -> TrackProducer {
		let producer = track.produce();
		self.insert(producer.consume());
		producer
	}

	/// Insert a new track into the lookup, returning the old track if it already exists.
	pub fn insert(&self, track: TrackConsumer) -> Option<TrackConsumer> {
		let mut state = self.state.lock().unwrap();
		state.published.insert(track.info.name.clone(), track)
	}

	/// Remove a track from the lookup.
	pub fn remove(&self, name: &str) -> Option<TrackConsumer> {
		let mut state = self.state.lock().unwrap();
		state.published.remove(name)
	}

	// Try to create a new consumer.
	pub fn consume(&self) -> BroadcastConsumer {
		BroadcastConsumer {
			state: self.state.clone(),
			closed: self.closed.subscribe(),
		}
	}

	pub fn finish(&self) {
		self.closed.send(true).ok();
	}

	pub async fn closed(&self) {
		self.closed.closed().await
	}

	/// Block until there are no more consumers.
	///
	/// A new consumer can be created by calling [Self::consume] and this will block again.
	pub async fn unused(&self) {
		self.closed.closed().await;
	}
}

/// Subscribe to abitrary broadcast/tracks.
#[derive(Clone)]
pub struct BroadcastConsumer {
	state: Arc<Mutex<State>>,

	// Annoying, but we need to know when the above channel is closed without sending.
	closed: watch::Receiver<bool>,
}

impl BroadcastConsumer {
	pub fn subscribe(&self, track: &Track) -> TrackConsumer {
		let mut state = self.state.lock().unwrap();

		// Return any explictly published track.
		if let Some(consumer) = state.published.get(&track.name).cloned() {
			return consumer;
		}

		// Return any requested track, deduplicating it.
		if let Some(requested) = state.requested.get(&track.name) {
			return requested.consume();
		}

		// Otherwise we have never seen this track before and need to create a new producer.
		let producer = track.clone().produce();
		let consumer = producer.consume();

		// Insert the producer into the lookup so we will deduplicate requests.
		// This is not a subscriber so it doesn't count towards "used" subscribers.
		state.requested.insert(track.name.clone(), producer.clone());

		let queue = state.queue.clone();
		let state = self.state.clone();
		let track = track.clone();

		web_async::spawn(async move {
			// Send the request to the producer.
			let _ = queue.send(producer.clone()).await;

			// Wait until we no longer want this track.
			producer.unused().await;

			// Remove the track from the lookup.
			state.lock().unwrap().requested.remove(&track.name);
		});

		consumer
	}

	pub async fn closed(&self) {
		self.closed.clone().changed().await.ok();
	}

	/// Check if this is the exact same instance of a broadcast.
	///
	/// Duplicate names are allowed in the case of resumption.
	pub fn ptr_eq(&self, other: &Self) -> bool {
		Arc::ptr_eq(&self.state, &other.state)
	}
}

use anyhow::{Context, Ok};

use chrono::prelude::*;
use moq_transfork::*;
use tracing::Instrument;

use tokio::io::*;

pub struct Publisher {
	track: TrackProducer,
}

impl Publisher {
	pub fn new(track: TrackProducer) -> Self {
		Self { track }
	}

	pub async fn run(mut self) -> anyhow::Result<()> {
		let start = Utc::now();
		let mut sequence = start.minute();

		let stdin = tokio::io::stdin();
		let stdout = tokio::io::stdout(); // for writing prompt
		let mut stdout = tokio::io::BufWriter::new(stdout);

		let reader = BufReader::new(stdin);
		let mut lines = reader.lines();

		loop {
			// Write the prompt
			stdout.write_all(b"Enter text: ").await?;
			stdout.flush().await?;

			// Read the input
			if let Some(line) = lines.next_line().await? {
				let segment = self.track.create_group(sequence as u64);
				sequence += 1;

				tokio::spawn(
					async move {
						if let Err(err) = Self::send_segment(segment, line) {
							tracing::warn!("failed to send text: {:?}", err);
						}
					}
					.in_current_span(),
				);
			} else {
				break;
			}
		}
		Ok(())
	}

	fn send_segment(mut segment: GroupProducer, now: String) -> anyhow::Result<()> {
		segment.write_frame(now.clone());
		//segment.write_frame(now.clone());

		return Ok(());
	}
}
pub struct Subscriber {
	track: TrackConsumer,
}

impl Subscriber {
	pub fn new(track: TrackConsumer) -> Self {
		Self { track }
	}

	pub async fn run(mut self) -> anyhow::Result<()> {

		while let Some(mut group) = self.track.next_group().await? {
			let base = group
				.read_frame()
				.await
				.context("failed to get first object")?
				.context("empty group")?;

			let base = String::from_utf8_lossy(&base);

			println!("Right before group.read_frame()");

			while let Some(object) = group.read_frame().await? {

				let str = String::from_utf8_lossy(&object);
				println!("Inside the group.read_frame(), before printing something");
				println!("{}{}", base, str);
				println!("After something should have printed out");
			}
			println!("After the group.read_frame()-loop");
		}


		Ok(())
	}
}

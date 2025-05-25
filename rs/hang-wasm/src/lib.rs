mod bridge;
mod connect;
mod error;
mod message;
mod publish;
mod watch;
mod worklet;

pub use bridge::*;
pub use connect::*;
pub use error::*;
pub use message::*;
pub use publish::*;
pub use watch::*;
pub use worklet::*;

use wasm_bindgen::prelude::wasm_bindgen;

#[wasm_bindgen(start)]
pub fn start() {
	// print pretty errors in wasm https://github.com/rustwasm/console_error_panic_hook
	// This is not needed for tracing_wasm to work, but it is a common tool for getting proper error line numbers for panics.
	console_error_panic_hook::set_once();

	let config = wasm_tracing::WasmLayerConfig {
		max_level: tracing::Level::DEBUG,
		..Default::default()
	};
	wasm_tracing::set_as_global_default_with_config(config).expect("failed to install logger");

	tracing::info!("creating bridge");

	wasm_bindgen_futures::spawn_local(async move {
		let bridge = Bridge::new();
		if let Err(err) = bridge.run().await {
			tracing::error!(?err, "bridge terminated");
		}
	});
}

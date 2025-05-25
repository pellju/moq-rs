import type { Command, Event } from "./message";
export type { Command, Event };

export class Bridge {
	#worker: Promise<Worker>;

	constructor() {
		this.#worker = new Promise((resolve, reject) => {
			// NOTE: This file has to be in the root of `src` to work with the current setup.
			// That way `../pkg` works pre and post build.
			const worker = new Worker(new URL("../pkg", import.meta.url), {
				type: "module",
			});

			worker.addEventListener(
				"message",
				(event: MessageEvent<Event>) => {
					if (event.data === "Init") {
						resolve(worker);
					} else {
						console.error("unknown init event", event.data);
						reject(new Error(`Unknown init event: ${event.data}`));
					}
				},
				{ once: true },
			);
		});
	}

	addEventListener(callback: (event: Event) => void) {
		this.#worker.then((worker) => {
			worker.addEventListener("message", (event: MessageEvent<Event>) => {
				callback(event.data);
			});
		});
	}

	postMessage(cmd: Command) {
		const transfer = collectTransferables(cmd);
		this.#worker.then((worker) => worker.postMessage(cmd, { transfer }));
	}
}

function collectTransferables(obj: unknown, out: Transferable[] = []): Transferable[] {
	if (obj && typeof obj === "object") {
		if (isTransferable(obj)) {
			out.push(obj);
		} else if (Array.isArray(obj)) {
			for (const item of obj as unknown[]) {
				collectTransferables(item, out);
			}
		} else {
			for (const value of Object.values(obj)) {
				collectTransferables(value, out);
			}
		}
	}
	return out;
}

function isTransferable(value: unknown): value is Transferable {
	return (
		value instanceof MessagePort ||
		value instanceof OffscreenCanvas ||
		value instanceof ReadableStream ||
		value instanceof WritableStream ||
		value instanceof TransformStream ||
		value instanceof ArrayBuffer ||
		// Add others if needed
		false
	);
}

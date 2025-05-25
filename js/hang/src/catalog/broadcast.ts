import * as Moq from "@kixelated/moq";
import { z } from "zod/v4-mini";

import { type Audio, AudioSchema } from "./audio";
import { type Video, VideoSchema } from "./video";

export const BroadcastSchema = z.object({
	video: z.optional(z.array(VideoSchema)),
	audio: z.optional(z.array(AudioSchema)),
});

export class Broadcast {
	video: Video[] = [];
	audio: Audio[] = [];

	encode() {
		return JSON.stringify(this);
	}

	static decode(raw: Uint8Array): Broadcast {
		const decoder = new TextDecoder();
		const str = decoder.decode(raw);
		const json = JSON.parse(str);
		const parsed = BroadcastSchema.parse(json);

		const broadcast = new Broadcast();
		broadcast.video = parsed.video ?? [];
		broadcast.audio = parsed.audio ?? [];

		return broadcast;
	}

	static async fetch(track: Moq.TrackConsumer): Promise<Broadcast | undefined> {
		const group = await track.nextGroup();
		if (!group) return undefined; // track is done

		try {
			const frame = await group.readFrame();
			if (!frame) throw new Error("empty group");
			return Broadcast.decode(frame);
		} finally {
			group.close();
		}
	}
}

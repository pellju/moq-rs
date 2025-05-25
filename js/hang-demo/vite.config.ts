import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import fs from 'fs';

export default defineConfig({
	root: "src",
	plugins: [tailwindcss(), solidPlugin()],
	build: {
		target: "esnext",
		rollupOptions: {
			input: {
				watch: "index.html",
				publish: "publish.html",
				announce: "announce.html",
			},
		},
	},
	server: {
		host: 'insert.domain.here',
		https: {
			key: fs.readFileSync('/home/juho/moq-rs/moq-rs-2025-05-24/rs/moq-rs-key.pem'),
			cert: fs.readFileSync('/home/juho/moq-rs/moq-rs-2025-05-24/rs/moq-rs-crt.pem'),
		}
	}
});

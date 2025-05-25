import path from "node:path";

import { fileURLToPath } from "node:url";
import WasmPackPlugin from "@wasm-tool/wasm-pack-plugin";
import HtmlWebpackPlugin from "html-webpack-plugin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
	entry: "./src/demo/index.ts",
	output: {
		path: path.resolve(__dirname, "out"),
		filename: "index.js",
	},
	plugins: [
		new WasmPackPlugin({
			crateDirectory: path.resolve(__dirname),
			outDir: path.resolve(__dirname, "pkg"),
			args: "--log-level warn",
			outName: "index",
		}),
		new HtmlWebpackPlugin({
			template: "src/demo/watch.html",
			filename: "index.html",
		}),
		new HtmlWebpackPlugin({
			template: "src/demo/publish.html",
			filename: "publish.html",
		}),
	],
	mode: "development",
	experiments: {
		asyncWebAssembly: true,
		topLevelAwait: true,
	},
	// Typescript support
	module: {
		rules: [
			{
				test: /\.ts(x)?$/,
				loader: "builtin:swc-loader",
				exclude: /node_modules/,
			},
		],
		parser: {
			javascript: {
				worker: ["*context.audioWorklet.addModule()", "..."],
			},
		},
	},
	resolve: {
		extensions: [".ts", ".tsx", ".js"],
	},
	devServer: {
		open: true,
		hot: false,
		liveReload: false,
	},
	optimization: {
		sideEffects: true,
	},
};

export default config;

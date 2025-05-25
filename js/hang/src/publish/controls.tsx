import { Match, Switch, createSelector } from "solid-js";
import { JSX } from "solid-js/jsx-runtime";
import { Device } from "./broadcast";
import { Publish } from "./publish";

export function Controls(props: { lib: Publish }): JSX.Element {
	return (
		<div
			style={{
				display: "flex",
				"justify-content": "space-around",
				gap: "16px",
				margin: "8px 0",
				"align-content": "center",
			}}
		>
			<Select lib={props.lib} />
			<Status lib={props.lib} />
		</div>
	);
}

function Status(props: { lib: Publish }): JSX.Element {
	const url = props.lib.connection.url.get;
	const status = props.lib.connection.status.get;
	const audio = props.lib.broadcast.audio.catalog.get;
	const video = props.lib.broadcast.video.catalog.get;

	return (
		<div>
			<Switch>
				<Match when={!url()}>🔴&nbsp;No URL</Match>
				<Match when={status() === "disconnected"}>🔴&nbsp;Disconnected</Match>
				<Match when={status() === "connecting"}>🟡&nbsp;Connecting...</Match>
				<Match when={!audio() && !video()}>🔴&nbsp;Select Device</Match>
				<Match when={!audio() && video()}>🟡&nbsp;Video Only</Match>
				<Match when={audio() && !video()}>🟡&nbsp;Audio Only</Match>
				<Match when={audio() && video()}>🟢&nbsp;Live</Match>
				<Match when={status() === "connected"}>🟢&nbsp;Connected</Match>
			</Switch>
		</div>
	);
}

function Select(props: { lib: Publish }): JSX.Element {
	const setDevice = (device: Device | undefined) => {
		props.lib.broadcast.device.set(device);
	};

	const selected = createSelector(props.lib.broadcast.device.get);

	const buttonStyle = (id: Device | undefined) => ({
		cursor: "pointer",
		opacity: selected(id) ? 1 : 0.5,
	});

	return (
		<div style={{ display: "flex", gap: "16px" }}>
			Device:
			<button
				id="camera"
				title="Camera"
				type="button"
				onClick={() => setDevice("camera")}
				style={buttonStyle("camera")}
			>
				🎥
			</button>
			<button
				id="screen"
				title="Screen"
				type="button"
				onClick={() => setDevice("screen")}
				style={buttonStyle("screen")}
			>
				🖥️
			</button>
			<button
				id="none"
				title="Nothing"
				type="button"
				onClick={() => setDevice(undefined)}
				style={buttonStyle(undefined)}
			>
				🚫
			</button>
		</div>
	);
}

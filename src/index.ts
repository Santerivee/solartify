"use strict";
import { validateOnLoad, cookieFun, byIdx } from "exports";

cookieFun();
if (!window.localStorage) alert("Your browser does not support local storage. get a new browser.");

byIdx("main-title").addEventListener("click", () => {
	// SECRET DEBUGS STUFF
	const items = { ...window.localStorage };
	let str = "";
	for (const key in items) str += `${key}: ${items[key]}\n`;
	alert(str);
});

if (!localStorage.getItem("settings")) {
	// set defaults so i dont have to handle undefineds everywhere

	localStorage.setItem(
		"settings",
		JSON.stringify({
			buttonFunction: "remove",
			addTarget: {
				name: "",
				id: "",
			},
			fastLogin: false,
		})
	);
}

if (window.location.search.includes("action=login")) {
	const state = Array(32)
		.fill(0)
		.map(() => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 62)])
		.join("");

	localStorage.setItem("state", state);

	const client_id = "ae780b9e7bf4476285fcfc7475fc2664";

	const redirect_uri = window.location.origin + (new URLSearchParams(window.location.search).get("redirect_path") || "/");

	const url =
		"https://accounts.spotify.com/authorize" +
		"?response_type=token&scope=streaming user-modify-playback-state user-read-playback-position user-read-playback-state playlist-read-collaborative playlist-read-private user-read-private playlist-modify-public playlist-modify-private" +
		"&client_id=" +
		client_id +
		"&redirect_uri=" +
		redirect_uri +
		"&state=" +
		state;

	window.location.href = url;
} else {
	validateOnLoad().then(state => {
		if (state) document.getElementById("login")?.classList.add("hide-keep-layout");
	});
}

"use strict";
import { validateOnLoad, byId, cookieFun } from "./exports.js";
import { IDefaultHeaders, ISettings, Spotify } from "./types";

cookieFun();

if (!window.localStorage.getItem("nag-dismissed")) {
	const nag = byId("desktop-nag");
	const cover = byId("menu-cover");

	nag.classList.remove("hide");
	cover.classList.add("fill");

	nag.addEventListener(
		"click",
		e => {
			e.stopPropagation();
			cover.classList.remove("fill");
			if (e.composedPath().includes(byId("nag-dismiss-forever"))) window.localStorage.setItem("nag-dismissed", "true");
			nag.classList.add("hide");
		},
		{ once: true }
	);
	byId("menu-cover").addEventListener("click", () => byId("desktop-nag").click(), { once: true });
}

class Data {
	error: HTMLParagraphElement;
	album_art: HTMLImageElement;
	song_name: HTMLParagraphElement;
	song_artist: HTMLParagraphElement;
	playlist_name: HTMLParagraphElement;
	prev: HTMLButtonElement;
	next: HTMLButtonElement;
	play: HTMLButtonElement;
	play_img: HTMLImageElement;
	volume: number;
	saved_volume: number;
	volume_button: HTMLButtonElement;
	volume_range: HTMLInputElement;
	/**
	 * seconds
	 */
	position_s: number;
	/**
	 * seconds
	 */
	duration_s: number;
	position: HTMLParagraphElement;
	duration: HTMLParagraphElement;
	seek_button: HTMLButtonElement;
	seek_range: HTMLInputElement;
	decide: HTMLButtonElement;
	decide_menu: HTMLDivElement;
	functionButtons: {
		add: HTMLButtonElement;
		remove: HTMLButtonElement;
	};
	menu: HTMLDivElement;
	menu_cover: HTMLDivElement;
	contextId: string;
	contextType: "unknown" | "playlist" | "album" | "artist" | "solartify-playlist";
	song_uri: string;
	play_state: boolean;
	background: HTMLDivElement;
	timeout: number;
	interval: number;
	defaultHeaders: IDefaultHeaders;
	settings: ISettings;
	toucher: {
		start: number;
		end: number;
	};

	constructor() {
		this.error = byId("error");
		this.album_art = byId("album-art");
		this.song_name = byId("song-name");
		this.song_artist = byId("song-artist");
		this.playlist_name = byId("playlist-name");

		this.prev = byId("prev");
		this.next = byId("next");

		this.play = byId("play");
		this.play_img = byId("play-img");

		this.volume = 1;
		this.saved_volume = 1;
		this.volume_button = byId("volume-btn");
		this.volume_range = byId("volume-range");

		this.position = byId("seek-current");
		this.duration = byId("seek-total");
		this.position_s = 0;
		this.duration_s = 1;
		this.seek_button = byId("seek-btn");
		this.seek_range = byId("seek-range");

		this.decide = byId("decide");
		this.decide_menu = byId("decide-menu");

		this.functionButtons = {
			add: byId("add"),
			remove: byId("remove"),
		};

		for (const [, elem] of Object.entries<HTMLElement>(this.functionButtons)) {
			const div = document.createElement("div");
			const img = document.createElement("img");
			const btn = document.createElement("button");

			div.setAttribute("data-targetid", elem.id);
			div.style.display = "flex";
			div.style["align-items"] = "center";
			div.style["justify-content"] = "center";

			img.src = (elem.children[0] as HTMLImageElement).src;
			img.style.height = "2.5em";
			img.style.width = "2.5em";

			btn.innerText = elem.id;
			btn.classList.add("menu-button");
			btn.classList.add("func-button");

			div.appendChild(img);
			div.appendChild(btn);
			this.decide_menu.appendChild(div);
		}

		this.menu = byId("menu");
		this.menu_cover = byId("menu-cover");

		this.contextId = "";
		this.contextType = "unknown";
		this.song_uri = "";
		this.play_state = false;

		this.background = byId("background");

		this.timeout = 2;
		this.interval = 0;

		this.defaultHeaders = [
			["Content-Type", "application/json"],
			["Accept", "application/json"],
			["Authorization", ""],
		];

		//@ts-ignore it is not null and never will be!!
		this.settings = JSON.parse(window.localStorage.getItem("settings"));
		byId(this.settings.buttonFunction).style.display = "initial";

		this.toucher = {
			start: 0,
			end: 0,
		};
	}
}

const a = new Data(); //naming conventions?
const BASEURL = "https://api.spotify.com/v1/";

validateOnLoad().then(state => {
	if (state) {
		byId("login-btn").style.display = "none";
		// get token AFTER validating, otherwise first time login will be useless
		a.defaultHeaders.push(["Authorization", "Bearer " + window.localStorage.getItem("token")]);
		handleInterval();

		// get playlist info
		a.contextId = localStorage.getItem("active_playlist") ?? "";
		if (a.contextId) {
			a.contextType = "solartify-playlist";
			fetch(BASEURL + "playlists/" + a.contextId, {
				headers: a.defaultHeaders,
			})
				.then(res => (res.ok ? res.json() : Promise.reject(res)))
				.then(json => (a.playlist_name.innerText = json.name))
				.catch(e => console.warn(e));
		}
	}
});

//
//init event listeners and stuff
a.album_art.addEventListener("click", () => {
	a.menu.classList.remove("hide");
	a.menu_cover.classList.add("fill");
});

//swipe to next song
a.album_art.addEventListener("touchstart", function (e: TouchEvent) {
	a.toucher.start = e.touches[0].clientX;
});

a.album_art.addEventListener("touchmove", function (e: TouchEvent) {
	a.toucher.end = e.touches[0].clientX;
	a.album_art.style.transform = `translateX(${a.toucher.end - a.toucher.start}px)`;

	if (a.toucher.end - a.toucher.start > 100 || a.toucher.end - a.toucher.start < -100) {
		// show user that they can release
		a.album_art.style.opacity = "0.5";
	} else {
		a.album_art.style.opacity = "1";
	}
});

//swipe to next song
a.album_art.addEventListener("touchend", function (e: TouchEvent) {
	if (a.toucher.start > 0 && a.toucher.end > 0) {
		if (a.toucher.end - a.toucher.start > 100) {
			//swipe right
			a.prev.click();
		} else if (a.toucher.end - a.toucher.start < -100) {
			//swipe left
			a.next.click();
		}
		a.toucher.start = 0;
		a.toucher.end = 0;
	}

	a.album_art.style.opacity = "1";

	a.album_art.style.transition = "transform 0.2s ease-out";
	a.album_art.style.transform = `translateX(0)`;
	setTimeout(() => {
		// looks like shit if the transition is active when user moves it
		a.album_art.style.transition = "none";
	}, 201);
});

a.menu_cover.addEventListener("click", e => {
	if (e.target == a.menu_cover) {
		a.menu.classList.add("hide");
		a.decide_menu.classList.add("hide");
		a.menu_cover.classList.remove("fill");
	}
});
a.menu.onclick = e => e.stopPropagation();
a.menu_cover.onclick = e => e.stopPropagation();
//
// todo disable buttons until request is complete
a.prev.addEventListener("click", function () {
	fetch(BASEURL + "me/player/previous", {
		method: "POST",
		headers: a.defaultHeaders,
	}).then(res => {
		if (res.ok) {
			resetInterval(2);
			handleInterval(); // call handleinterval to instantly update UI
		} else console.warn(res);
	});
});

a.next.addEventListener("click", () => {
	fetch(BASEURL + "me/player/next", {
		method: "POST",
		headers: a.defaultHeaders,
	}).then(res => {
		if (res.ok) {
			resetInterval(2);
			handleInterval();
		} else console.warn(res);
	});
});

a.play.addEventListener("click", function () {
	if (a.play_state) {
		fetch(BASEURL + "me/player/pause", {
			method: "PUT",
			headers: a.defaultHeaders,
		}).then(res => {
			if (res.ok) {
				a.play_state = false;
				a.play_img.src = "/media/icon_play.png";
				resetInterval(2);
			} else console.warn(res);
		});
	} else {
		fetch(BASEURL + "me/player/play", {
			method: "PUT",
			headers: a.defaultHeaders,
		}).then(res => {
			if (res.ok) {
				a.play_state = true;
				a.play_img.src = "/media/icon_pause.png";
				resetInterval(2);
			} else console.warn(res);
		});
	}
	handleInterval();
});

a.functionButtons.remove.addEventListener("click", () => {
	if (!a.contextType.endsWith("playlist")) return alert("Cannot remove song from " + a.contextType + " context");
	confirm(`Delete ${a.song_name.innerText || "this song"} from ${a.playlist_name.innerText || "this playlist"}?`) &&
		fetch(BASEURL + "playlists/" + a.contextId + "/tracks", {
			method: "DELETE",
			headers: a.defaultHeaders,
			body: JSON.stringify({ tracks: [{ uri: a.song_uri }] }),
		})
			.then(res => (res.ok ? a.next.click() : res.json().then(json => (a.error.innerText = json.error.message))))
			.catch(e => {
				console.warn(e);
			});
});

a.functionButtons.add.addEventListener("click", () => {
	if (!a.settings.addTarget.id) return;

	confirm(`Add ${a.song_name.innerText || "this song"} to ${a.settings.addTarget.name || "target playlist"}?`) &&
		fetch(BASEURL + "playlists/" + a.settings.addTarget.id + "/tracks", {
			method: "POST",
			headers: a.defaultHeaders,
			body: JSON.stringify({ uris: [a.song_uri] }),
		})
			.then(res => res.ok || res.json().then(json => (a.error.innerText = json.error.message)))

			.catch(e => {
				console.warn(e);
				a.error.innerText = e.message;
			});
});

a.decide.addEventListener("click", () => {
	a.decide_menu.classList.remove("hide");
	a.menu_cover.classList.add("fill");
});

Array.from(a.decide_menu.children).forEach(div =>
	div.addEventListener("click", e => {
		a.menu_cover.classList.remove("fill");
		a.decide_menu.classList.add("hide");
		//@ts-ignore yes yes we know that these elements have a dataset and that dataset has a targetid property
		byId(div.dataset.targetid).click();
	})
);

a.volume_button.addEventListener("click", () => {
	if (a.volume > 0) {
		a.saved_volume = a.volume;
		fetch(BASEURL + "me/player/volume?volume_percent=0", {
			method: "PUT",
			headers: a.defaultHeaders,
		}).then(res => {
			if (res.ok) {
				a.volume = 0;
				a.volume_button.querySelector("img")!.src = "/media/volume_0.png";
			} else {
				console.warn(res);
				res.json().then(json => (a.error.innerText = json.error.message));
			}
		});
	} else {
		fetch(BASEURL + "me/player/volume?volume_percent=" + a.saved_volume, {
			method: "PUT",
			headers: a.defaultHeaders,
		}).then(res => {
			if (res.ok) {
				a.volume = a.saved_volume;

				if (a.volume == 0) a.volume_button.querySelector("img")!.src = "/media/volume_0.png";
				else if (a.volume < 33) a.volume_button.querySelector("img")!.src = "/media/volume_33.png";
				else if (a.volume < 66) a.volume_button.querySelector("img")!.src = "/media/volume_66.png";
				else a.volume_button.querySelector("img")!.src = "/media/volume_99.png";
			} else {
				console.warn(res);
				res.json().then(json => (a.error.innerText = json.error.message));
			}
		});
	}
});

a.volume_range.addEventListener("change", function (this: HTMLInputElement) {
	const val = parseInt(this.value);
	fetch(BASEURL + "me/player/volume?volume_percent=" + val, {
		method: "PUT",
		headers: a.defaultHeaders,
	}).then(res => {
		if (res.ok) {
			a.volume = val;
			a.saved_volume = val;

			if (val == 0) a.volume_button.querySelector("img")!.src = "/media/volume_0.png";
			else if (val < 33) a.volume_button.querySelector("img")!.src = "/media/volume_33.png";
			else if (val < 66) a.volume_button.querySelector("img")!.src = "/media/volume_66.png";
			else a.volume_button.querySelector("img")!.src = "/media/volume_99.png";
		} else {
			console.warn(res);
			res.json().then(json => (a.error.innerText = json.error.message));
		}
	});
});

a.seek_button.addEventListener("click", () => {
	fetch(BASEURL + "me/player/seek?position_ms=0", {
		method: "PUT",
		headers: a.defaultHeaders,
	}).then(res => {
		if (res.ok) {
			resetInterval(2);
			handleInterval();
		} else {
			console.warn(res);
			res.json().then(json => (a.error.innerText = json.error.message));
		}
	});
});

a.seek_range.addEventListener("change", function (this: HTMLInputElement) {
	fetch(BASEURL + "me/player/seek?position_ms=" + parseInt(this.value) * 1000, {
		method: "PUT",
		headers: a.defaultHeaders,
	}).then(res => {
		if (res.ok) {
			resetInterval(2);
			handleInterval();
		} else {
			console.warn(res);
			res.json().then(json => (a.error.innerText = json.error.message));
		}
	});
});

a.error.addEventListener("click", function () {
	this.innerHTML = "";
});

async function handleInterval() {
	const res = await fetch(BASEURL + "me/player", { headers: a.defaultHeaders });

	if (res.status == 503) return resetInterval(4); // spotify throws 503 now and then but does not provide a retry-after, fun
	if (res.status == 429) return resetInterval(10); // user deserves to be punished for spamming
	if (res.status == 204) return resetInterval(a.timeout > 30 ? 30 : a.timeout + 1); // paused and nothing's changed
	if (res.status == 401) {
		endInterval();
		a.error.innerText = "401:: " + res.statusText; // probably old token
		a.settings.fastLogin && window.location.replace("/index.html?action=login&redirect_path=/player/");
		return;
	}
	if (!res.ok) {
		if (a.timeout > 120) {
			endInterval();
			a.error.innerText = res.status + ":: " + res.statusText;
		} else {
			resetInterval(a.timeout + 1);
		}
		console.warn(res);
		a.error.innerText = res.status + ":: " + res.statusText;
		return;
	}

	const data = await res.json();
	if (!data) return resetInterval(a.timeout >= 10 ? 10 : a.timeout + 1);

	a.volume = data["device"]["volume_percent"];
	a.volume_range.value = data["device"]["volume_percent"].toString();

	if (a.volume < 1) a.volume_button.querySelector("img")!.src = "/media/volume_0.png";
	else if (a.volume < 33) a.volume_button.querySelector("img")!.src = "/media/volume_33.png";
	else if (a.volume < 66) a.volume_button.querySelector("img")!.src = "/media/volume_66.png";
	else a.volume_button.querySelector("img")!.src = "/media/volume_99.png";

	if (true == data["is_playing"]) {
		resetInterval(2);
		a.play_img.src = "/media/icon_pause.png";
		a.play_state = true;
	} else if (false == data["is_playing"]) {
		resetInterval(4);
		a.play_img.src = "/media/icon_play.png";
		a.play_state = false;
	}

	a.position_s = data["progress_ms"] / 1000;
	resetPosition();

	/** return if song has not changed */
	if (a.song_uri == data["item"]["uri"] && !a.album_art.src.startsWith("data:")) return;

	//select biggest image
	a.album_art.src = (data["item"]["album"]["images"] as Spotify.ImageResponse[]).reduce((a, b) => (a.width > b.width ? a : b)).url;
	a.song_name.innerText = data["item"]["name"];
	a.song_artist.innerText = data["item"]["artists"].map((artist: { name: string } /* todo Spotify.Artist */) => artist["name"]).join(", ");

	byId("page-title").innerText = a.song_name.innerText + " - " + a.song_artist.innerText;

	if (data["context"]?.["uri"] && "spotify:playlist:" + a.contextId != data["context"]?.["uri"]) {
		// context changed

		a.contextId = data["context"]?.["uri"].split(":")[2];

		switch (data["context"]?.["type"]) {
			case "playlist":
				a.contextType = "playlist";
				break;
			case "album":
				a.contextType = "album";
				break;
			case "artist":
				a.contextType = "artist";
				break;
			default: {
				// no way to know if context is null && !queue by solartify :(
				if (a.contextType != "solartify-playlist") {
					a.contextType = "unknown";
					a.playlist_name.innerText = "Unknown";
					a.contextId = "";
					return;
				}
			}
		}

		switch (a.contextType) {
			case "playlist":
			case "solartify-playlist": {
				if (a.contextType == "solartify-playlist" && a.contextId !== localStorage.getItem("active_playlist")) {
					localStorage.removeItem("active_playlist"); // not active anymore
				}

				fetch(BASEURL + "playlists/" + a.contextId, { headers: a.defaultHeaders })
					.then(res => {
						if (!res.ok) {
							console.warn(res);
							return;
						}
						res.json().then(json => {
							a.playlist_name.innerText = json["name"];
						});
					})
					.catch(err => (a.error.innerText = err));
				break;
			}
			case "album": {
				fetch(BASEURL + "albums/" + a.contextId, { headers: a.defaultHeaders })
					.then(res => {
						if (!res.ok) {
							console.warn(res);
							return;
						}
						res.json().then(json => {
							a.playlist_name.innerText = json["name"];
						});
					})
					.catch(err => (a.error.innerText = err));
				break;
			}
			case "artist": {
				fetch(BASEURL + "artists/" + a.contextId, { headers: a.defaultHeaders })
					.then(res => {
						if (!res.ok) {
							console.warn(res);
							return;
						}
						res.json().then(json => {
							a.playlist_name.innerText = json["name"];
						});
					})
					.catch(err => (a.error.innerText = err));
				break;
			}
		}
	}

	a.duration_s = data["item"]["duration_ms"] / 1000;
	a.duration.innerText = formatTime(a.duration_s);
	a.seek_range.max = a.duration_s.toString();

	a.song_uri = data["item"]["uri"];
	if (a.contextId && a.contextType.endsWith("playlist")) byId<HTMLAnchorElement>("q-link").href = "/playlists/?selected=" + a.contextId; // todo make easy to add many params (will make when needed)

	//scuffed but works
	if (!a.background.style.background.includes(a.album_art.src)) {
		setThemeColor();
		a.background.style.background = "no-repeat url(" + a.album_art.src + ")";
	}
	if (!a.interval) resetInterval(2); // runs on app init if needed
}

function resetInterval(newTime: number) {
	a.timeout = newTime;
	a.interval && clearInterval(a.interval); // dont know what happens in executing handleInterval takes longer than timeout
	a.interval = setInterval(handleInterval, a.timeout * 1000);
}

function endInterval() {
	// end app cycle
	clearInterval(a.interval);
}

let posInterval = 0;
/**
 * Used to better sync position with spotify.
 * Interval is used because handleInterval is not called every second
 */
function resetPosition() {
	clearInterval(posInterval);
	posInterval = setInterval(() => {
		if (!a.play_state) return;
		a.position_s++;
		a.position.innerText = formatTime(a.position_s);
		a.seek_range.value = a.position_s.toString();
	}, 1000);
}

function setThemeColor() {
	const img = new Image();
	img.src = byId<HTMLImageElement>("album-art").src;
	img.crossOrigin = "Anonymous";

	// get some pixels from image and then caluclate the most common color (mode)
	// why? to set the theme color of the page.
	// why mode? because average color is ugly, and dominant color is too hard

	img.addEventListener("load", async function () {
		const startTime = performance.now();

		const canvas = document.createElement("canvas");
		canvas.width = img.width;
		canvas.height = img.width;
		const ctx = canvas.getContext("2d", {
			willReadFrequently: true,
			alpha: false,
			desynchronized: true,
		})!; // using byte stream would be infinitely faster but not necessary for now

		ctx.drawImage(await createImageBitmap(img), 0, 0);

		let i = -1;
		const limit = 24; // magic number that happens to give good-ish performance

		const stepY = Math.floor(this.height / limit);
		const stepX = Math.floor(this.width / limit);

		const pixels = new DataView(new ArrayBuffer(Math.ceil(this.height / stepY) * Math.ceil(this.width / stepX)));

		let readCanvasTime = performance.now();
		for (let y = 0; y < this.height; y += stepY) {
			for (let x = 0; x < this.width; x += stepX) {
				pixels[++i] = ctx.getImageData(x, y, 1, 1).data.slice(0, 3);
			}
		}
		// 2ms on chrome, 300ms on firefox :/
		readCanvasTime = performance.now() - readCanvasTime;

		const NORMALIZE_VAL = 20;
		const NORMALIZE_DIR = -1; // 1 = up, -1 = down. currently hardcoded

		/*
		what it does is group colors by NORMALIZE_VAL
		for example:
		real_value -> normalized_value
		1 -> 0
		2 -> 0
		3 -> 0
		4 -> 0
		5 -> 0
		6 -> 0
		7 -> 0
		8 -> 0
		9 -> 0
		10 -> 10
		11 -> 10
		12 -> 10
		13 -> 10
		14 -> 10
		15 -> 10
		16 -> 10
		17 -> 10
		18 -> 10
		19 -> 10
		20 -> 20
		21 -> 20
		22 -> 20
		23 -> 20
		24 -> 20
		25 -> 20
		26 -> 20
		27 -> 20
		28 -> 20
		29 -> 20
		30 -> 30
		*/

		// normalize values, group them and find the most common one
		const color = (() => {
			// https://stackoverflow.com/questions/1053843/get-the-element-with-the-highest-occurrence-in-an-array
			let modeMap: { string?: number } = {},
				// [color, occurrenceCount]
				maxEl = ["", 0];

			for (let i = 0; i < pixels.byteLength; i++) {
				let hexValue = pixels[i]; // not actually hex value yet but will be soon

				// normalize color and convert to hex
				// https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
				// prettier-ignore
				if(NORMALIZE_DIR > 0) 
					hexValue = "#" + ((1 << 24) + 
							(( NORMALIZE_VAL * Math.ceil(hexValue[0] / NORMALIZE_VAL)) << 16) +
							(NORMALIZE_VAL * Math.ceil(hexValue[1] / NORMALIZE_VAL) << 8) +
							NORMALIZE_VAL * Math.ceil(hexValue[2] / NORMALIZE_VAL))
							.toString(16).slice(1);
				else
					hexValue = "#" + ((1 << 24) + 
						(NORMALIZE_VAL * Math.floor( hexValue[0] / NORMALIZE_VAL) << 16) +
						(NORMALIZE_VAL * Math.floor( hexValue[1] / NORMALIZE_VAL) << 8) +
						NORMALIZE_VAL * Math.floor( hexValue[2] / NORMALIZE_VAL))
						.toString(16).slice(1);

				if (modeMap[hexValue] == null) modeMap[hexValue] = 1;
				else modeMap[hexValue]++;

				if (modeMap[hexValue] > maxEl[1]) maxEl = [hexValue, modeMap[hexValue]];
			}

			return maxEl[0];
		})();

		document.querySelector("meta[name=theme-color]")?.setAttribute("content", color as string);
		console.log(
			`%cTotal Time to calculate theme color: %c${performance.now() - startTime}ms
%cTime to read canvas: %c${readCanvasTime}ms
%cResult: %c${color}`,
			"color: #eee",
			"color: lightBlue",
			"color: #eee",
			"color: lightBlue",
			"color: #eee",
			`color: ${color}; background: ${color[1] > "3" ? "" : "white"}`
		);
	});
}

function formatTime(seconds: number) {
	const minutes = Math.floor(seconds / 60);
	seconds = Math.floor(seconds % 60);
	return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`; // I LOVE GITHUB COPILOT X
}

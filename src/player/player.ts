"use strict";
import { validateOnLoad, byId, byIdx, cookieFun } from "../exports";
import { IDefaultHeaders, ISettings, Spotify } from "../types";

cookieFun();

if (window.localStorage.getItem("nag-dismissed") == "true") byIdx("desktop-nag").classList.add("hide") 
//prettier-ignore
else
	byIdx("desktop-nag").addEventListener( "click", e => {
			if (e.composedPath().includes(byId("nag-dismiss-forever"))) window.localStorage.setItem("nag-dismissed", "true");
			byIdx("desktop-nag").style.opacity = "0";
			setTimeout(() => (byIdx("desktop-nag").classList.add("hide")), 210);
		},
		{ once: true }
	);

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
	decide: HTMLButtonElement;
	decide_menu: HTMLDivElement;
	functionButtons: {
		add: HTMLButtonElement;
		remove: HTMLButtonElement;
	};
	menu: HTMLDivElement;
	menu_cover: HTMLDivElement;
	playlist: string;
	song_uri: string;
	play_state: boolean;
	background: HTMLDivElement;
	timeout: number;
	access_token: string;
	interval: number;
	defaultHeaders: IDefaultHeaders;
	settings: ISettings;

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

		this.playlist = "";
		this.song_uri = "";
		this.play_state = false;

		this.background = byId("background");

		this.timeout = 2;
		this.access_token;

		this.interval;
		this.defaultHeaders = [
			["Content-Type", "application/json"],
			["Accept", "application/json"],
			["Authorization", ""],
		];

		//@ts-ignore it is not null and never will be!!
		this.settings = JSON.parse(window.localStorage.getItem("settings"));
		byId(this.settings.buttonFunction).style.display = "initial";
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

		a.playlist = new URLSearchParams(window.location.search).get("p") ?? ""; // when redirected from q.html
		if (a.playlist)
			fetch(BASEURL + "playlists/" + a.playlist, {
				headers: a.defaultHeaders,
			})
				.then(res => (res.ok ? res.json() : Promise.reject(res)))
				.then(json => (a.playlist_name.innerText = json.name))
				.catch(e => console.log(e));
	}
});

//
//init event listeners and stuff
a.album_art.addEventListener("click", () => {
	a.menu.classList.remove("hide");
	a.menu_cover.classList.add("fill");
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
		} else console.log(res);
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
		} else console.log(res);
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
			} else console.log(res);
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
			} else console.log(res);
		});
	}
});

a.functionButtons.remove.addEventListener("click", () => {
	confirm(`Delete ${a.song_name.innerText || "this song"} from ${a.playlist_name.innerText || "this playlist"}?`) &&
		fetch(BASEURL + "playlists/" + a.playlist + "/tracks", {
			method: "DELETE",
			headers: a.defaultHeaders,
			body: JSON.stringify({ tracks: [{ uri: a.song_uri }] }),
		})
			.then(res => (res.ok ? a.next.click() : res.json().then(json => (a.error.innerText = json.error.message))))
			.catch(e => {
				console.log(e);
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
				console.log(e);
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
		a.error.innerHTML = "401:: " + res.statusText; // probably old token
		a.settings.fastLogin && window.location.replace("/index.html?action=login&redirect_path=/player/");
		return;
	}
	if (!res.ok) {
		resetInterval(a.timeout > 120 ? endInterval() : a.timeout + 1);
		console.log(res);
		a.error.innerHTML = res.status + ":: " + res.statusText;
		return;
	}

	const data = await res.json();
	if (!data) return resetInterval(a.timeout >= 10 ? 10 : a.timeout + 1);

	if (true == data["is_playing"]) {
		resetInterval(2);
		a.play_img.src = "/media/icon_pause.png";
		a.play_state = true;
	} else if (false == data["is_playing"]) {
		resetInterval(4);
		a.play_img.src = "/media/icon_play.png";
		a.play_state = false;
	}

	if (a.song_uri == data["item"]["uri"] && !a.album_art.src.startsWith("data:")) return; // no need to update UI further if nothing's changed

	//select biggest image
	a.album_art.src = (data["item"]["album"]["images"] as Spotify.ImageResponse[]).reduce((a, b) => (a.width > b.width ? a : b)).url;
	a.song_name.innerText = data["item"]["name"];
	a.song_artist.innerText = data["item"]["artists"].map(artist => artist["name"]).join(", ");

	byId("page-title").innerText = a.song_name.innerText + " - " + a.song_artist.innerText;

	if (data["context"]?.["uri"] && "spotify:playlist:" + a.playlist != data["context"]?.["uri"]) {
		// playlist changed
		a.playlist = data["context"]["uri"].split(":")[2]; // we want id, not uri

		a.playlist_name.innerText =
			data["context"]?.["metadata"]?.["context_description"] ||
			(await fetch(BASEURL + "playlists/" + a.playlist, { headers: a.defaultHeaders })
				.then(res => res.json())
				.then(json => json.name)
				.catch(e => {
					a.error.innerHTML = e.message;
					return "";
				}));
	}

	a.song_uri = data["item"]["uri"];
	if (a.playlist) byId<HTMLAnchorElement>("q-link").href = "/playlists/?selected=" + a.playlist; // todo make easy to add many params (will make when needed)

	//scuffed but works
	if (!a.background.style.background.includes(a.album_art.src)) {
		setThemeColor();
		a.background.style.background = "no-repeat url(" + a.album_art.src + ")";
	}
	if (!a.interval) resetInterval(2); // runs on app init if needed
}

function resetInterval(newTime) {
	a.timeout = newTime;
	a.interval && clearInterval(a.interval); // dont know what happens in executing handleInterval takes longer than timeout
	a.interval = setInterval(handleInterval, a.timeout * 1000);
}

function endInterval() {
	// end app cycle
	clearInterval(a.interval);
}

function setThemeColor() {
	const img = new Image();
	img.src = byId<HTMLImageElement>("album-art").src;
	img.crossOrigin = "Anonymous";

	// get some pixels from image and then caluclate the most common color (mode)
	// why? to set the theme color of the page.
	// why mode? because average color is ugly, and dominant color is too hard
	img.onload = async () => {
		const startTime = performance.now();

		const canvas = document.createElement("canvas");
		canvas.width = img.width;
		canvas.height = img.width;
		const ctx = canvas.getContext("2d") ?? new CanvasRenderingContext2D /* typescript moment */(); // using byte stream would be infinitely faster but not necessary for now

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
		// reading the canvas is up to 50 times slower in firefox vs chrome lol
		readCanvasTime = performance.now() - readCanvasTime;

		const NORMALIZE_VAL = 20;
		const NORMALIZE_DIR = -1; // 1 = up, -1 = down. currently hardcoded

		// get mode (most commonly appearing color)
		const color = (() => {
			// https://stackoverflow.com/questions/1053843/get-the-element-with-the-highest-occurrence-in-an-array
			let modeMap: { string?: number } = {},
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
	};
}

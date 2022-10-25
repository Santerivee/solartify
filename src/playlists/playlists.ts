"use strict";
import { validateOnLoad, byId, cookieFun, redirect, byIdx } from "../exports";
import { ListBuilder } from "../list";
cookieFun();

validateOnLoad().then(state => {
	if (!state) {
		const ul = byId<HTMLUListElement>("the-list");

		while (ul.offsetHeight < window.innerHeight)
			ul.innerHTML += `<li style='height:64px'><a style='width:100%;height:100%' href='/index.html?action=login&redirect_path=/playlists/'><button style='font-size:1.6em;width:100%;height:100%' >Login</button></a></li>`;
	}
});

document.addEventListener("c-loaded-global-nav", () => (byIdx("dummy").style.height = 4 + (document.querySelector("header")?.offsetHeight || 20) + "px"), { once: true });

const listBuilder = new ListBuilder();

listBuilder.initRenderer(function () {
	const template = byId<HTMLTemplateElement>("item-template");
	const list = byId<HTMLUListElement>("the-list");
	const selectedPlaylist = new URLSearchParams(window.location.search).get("selected");
	this as ListBuilder;
	return (items: Spotify.PlaylistResponse[]) =>
		list.append(
			...items.map(item => {
				const clone = template.content.cloneNode(true) as extNode;
				clone.querySelector("li").id = item.id;
				// for mobile devices
				clone.querySelector("li").oncontextmenu = e => {
					e.preventDefault();
					e.stopImmediatePropagation();
					return false;
				};

				let longPressTimeout: number;
				let action = 0;

				clone.querySelector("li").addEventListener("pointerdown", function () {
					const aborter = new AbortController();

					longPressTimeout = setTimeout(() => {
						aborter.abort();
						action = 1;
					}, 500);

					this.addEventListener(
						"pointerup",
						() => {
							clearTimeout(longPressTimeout);
							action = 2;
						},
						{ once: true, signal: aborter.signal }
					);

					// ugly code but works
					document.onscroll = () => {
						clearTimeout(longPressTimeout);
						aborter.abort();
						action = 0;
					};
				});

				clone.querySelector("li").addEventListener("click", () => {
					switch (action) {
						case 1: // long press
							confirm(`Set ${item.name} as active playlist without changing queue?`) && redirect("/player/?p=" + item.id);
							break;
						case 2: // short press
							setQueue(item.id);
							break;
					}
				});

				// select smallest image because it is small in ui and load time is important even though it looks a bit ugly
				clone.querySelectorT<HTMLImageElement>("img").src = item.images.reduce((prev, cur) => (prev.height < cur.height ? prev : cur)).url;
				clone.querySelector(".playlist-name").textContent = item.name;
				clone.querySelector(".playlist-author").textContent = item.owner.display_name;
				clone.querySelector(".set-addTarget").addEventListener("click", e => {
					e.stopPropagation();
					// @ts-ignore yes yes we know that settings exists
					const settings = JSON.parse(localStorage.getItem("settings"));
					settings.addTarget = {
						id: item.id,
						name: item.name,
					};
					localStorage.setItem("settings", JSON.stringify(settings));
					alert(`Successfully set ${item.name} as add target`);
				});

				this.searchables.push([item.owner.display_name.toUpperCase() + " " + item.name.toUpperCase(), clone]);

				if (selectedPlaylist == item.id) clone.querySelector("li").classList.add("selected");

				return clone;
			})
		);
});

let timeout = 200,
	timer;

const token = localStorage.getItem("token");

(async () => {
	if (!token) return;
	// get and render playlists
	let offset = 0;
	let total = 1;

	while (offset < total) {
		const res = await fetch("https://api.spotify.com/v1/me/playlists?limit=50&offset=" + offset, {
			headers: [
				["Authorization", "Bearer " + token],
				["Content-Type", "application/json"],
				["Accept", "application/json"],
			],
		});

		if (!res.ok) {
			if (res.status == 503) {
				const tmp = byId<HTMLUListElement>("the-list").appendChild(document.createElement("li"));

				for (let i = 3; i > 0; i--) {
					tmp.innerText = "Spotify unavailable, retrying in " + i + " seconds";
					await new Promise(resolve => setTimeout(resolve, 1000));
				}

				tmp.remove();
				continue;
			} else return alert(res.statusText);
		}

		const json = await res.json();
		offset += json.limit;
		total = json.total;
		listBuilder.render(json.items);
	}
	timeout = Math.ceil(total / 2); // idk something about keeping performance and responsiveness both high
})();

async function setQueue(id) {
	// set ui
	byIdx("loading-container").classList.add("active");
	byIdx("loading-cover").classList.add("active");

	const percentage = byIdx("spinner-percentage");
	percentage.innerText = "0%";

	const aborter = new AbortController();
	byId<HTMLButtonElement>("cancel").addEventListener(
		"click",
		() => {
			aborter.abort();
			byIdx("loading-container").classList.remove("active");
			byIdx("loading-cover").classList.remove("active");
		},
		{ once: true }
	);

	//get songs
	const songs: string[] = [];
	let offset = 0;
	let total = 1;

	while (offset < total) {
		const res = await fetch(`https://api.spotify.com/v1/playlists/${id}/tracks?limit=50&offset=${offset}`, {
			headers: [
				["Authorization", "Bearer " + token],
				["Content-Type", "application/json"],
				["Accept", "application/json"],
			],
			signal: aborter.signal,
		});

		if (!res.ok) {
			if (res.status == 503) {
				// spotify api will 503 sometimes for no apparent reason
				for (let i = 3; i > 0; i--) {
					percentage.innerText = "Service unavailable, retrying in " + i + "s";
					await new Promise(resolve => setTimeout(resolve, 1000));
				}
			} else return alert(res.statusText);
		}

		const json = await res.json();
		offset += json.limit;
		total = json.total;
		songs.push(...json.items.map(item => item.track.uri));
		percentage.innerText = Math.round((songs.length / total) * 100) + "%";
	}

	//shuffle songs https://stackoverflow.com/a/12646864
	for (let i = songs.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[songs[i], songs[j]] = [songs[j], songs[i]];
	}

	//set q
	(async () => {
		let device_id = "";
		let i = 0;
		// attempt 3 times because sometimes api says no for no reason
		while (++i < 4) {
			const res = await fetch(`https://api.spotify.com/v1/me/player/play${device_id && "?device_id=" + device_id}`, {
				method: "PUT",
				headers: [
					["Authorization", "Bearer " + token],
					["Content-Type", "application/json"],
					["Accept", "application/json"],
				],
				// spotify has funny feature where over 50 items in queue will break desktop app
				body: JSON.stringify({ uris: songs.slice(0, 50) }),
			});

			if (res.ok) {
				window.location.href = "/player/?p=" + id;
				break;
			}

			// since solartify mini doesnt actually play the song, spotify needs to know what device it should start playback on
			if (res.status == 404 && (await res.json())?.["error"]?.["reason"] == "NO_ACTIVE_DEVICE") {
				device_id = await showDevicesModal(); // hacky function at 2am
				if (!device_id) break;
				continue;
			}

			if (res.statusText) alert(res.statusText);
			else (await res.json())?.["error"]?.["message"] && alert((await res.json())["error"]["message"]);

			continue;
		}

		byIdx("loading-container").classList.remove("active");
		byIdx("loading-cover").classList.remove("active");
		byIdx("devices").style.display = "none";
	})();
}

async function showDevicesModal(): Promise<string> {
	type IDevice = { name: string; type: string; id: string }[];

	const devices: IDevice = await fetch("https://api.spotify.com/v1/me/player/devices", {
		headers: [
			["Authorization", "Bearer " + token],
			["Content-Type", "application/json"],
			["Accept", "application/json"],
		],
	})
		.then(res => (res.ok ? res.json() : Promise.reject(res)))
		.then(json => json.devices)
		.catch(() => null);

	if (!devices || devices.length == 0) return prompt("No devices found! Please open Spotify on your device and try again.") ? showDevicesModal() : Promise.resolve("");

	const target = byIdx("device-list");
	const template = byId<HTMLTemplateElement>("device-template");

	let resolve = device_id => device_id;
	const returnPromise = new Promise(res => (resolve = res));

	devices.forEach(device => {
		const clone = template.content.cloneNode(true) as extNode;
		clone.querySelector(".device-name").innerText = device.name;
		clone.querySelector(".device-type").innerText = device.type;
		clone.querySelector("li").addEventListener("click", () => resolve(device.id)); // https://stackoverflow.com/questions/26150232/resolve-javascript-promise-outside-the-promise-constructor-scope
		target.appendChild(clone);
	});

	byIdx("devices").style.display = "flex";
	return returnPromise as Promise<string>;
}

// convert searchables to use html elements instead of id's. makes search filtering infinitely faster because we are querying dom once instead of on every input
// byId<HTMLInputElement>("search").addEventListener("focus", () => typeof listBuilder.searchables[0][1] == "string" && searchables.forEach(item => (item[1] = byId(item[1]))));

byId<HTMLInputElement>("search").addEventListener("input", e => {
	const query = (e.target as HTMLInputElement).value.toUpperCase();

	clearTimeout(timer);
	timer = setTimeout(() => {
		if (query.length == 0) listBuilder.searchables.forEach(entry => entry[1].classList.remove("hide"));

		listBuilder.searchables.forEach(entry => {
			if (entry[0].includes(query)) entry[1].classList.remove("hide");
			else entry[1].classList.add("hide");
		});
	}, timeout);
});

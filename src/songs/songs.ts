"use strict";
import { validateOnLoad, byId, cookieFun, byIdx } from "../exports";
import { IDefaultHeaders, extNode, Spotify } from "../types";

cookieFun();

validateOnLoad().then(state => {
	if (!state) {
		const ul = byId<HTMLUListElement>("songs-list");

		while (ul.offsetHeight < window.innerHeight)
			ul.innerHTML += `<li style='height:64px'><a style='width:100%;height:100%' href='/index.html?action=login&redirect_path=/songs/'><button style='font-size:1.6em;width:100%;height:100%' >Login</button></a></li>`;
	}
});

const defaultHeaders: IDefaultHeaders = [
	["Content-Type", "application/json"],
	["Accept", "application/json"],
	["Authorization", "Bearer " + window.localStorage.getItem("token")],
];

const list = byId<HTMLUListElement>("songs-list");
const BASEURL = "https://api.spotify.com/v1/";

(byId("search-input") as HTMLInputElement).addEventListener("input", (e: Event) => {
	if ((e as KeyboardEvent).code == "13" || (e as KeyboardEvent).keyCode == 13) {
		byId<HTMLButtonElement>("search-button").click();
	}
});

byId<HTMLButtonElement>("search-button").addEventListener("click", async () => {
	byId<HTMLDivElement>("loading-container").classList.add("active");

	list.querySelectorAll("li").forEach(li => li.remove()); // todo move template outside of list and just do list.innerHTML = ""

	const type = byId<HTMLInputElement>("search-input").value.split(":")[0];

	switch (type) {
		case "by":
			await getSongs(byId<HTMLInputElement>("search-input").value.split(":")[1], "artist");
			break;
		case "in":
			await getSongs(byId<HTMLInputElement>("search-input").value.split(":")[1], "album");
			break;
		default:
			await getSongs(byId<HTMLInputElement>("search-input").value);
	}

	byId<HTMLDivElement>("loading-container").classList.remove("active");
});

async function getSongs(query: string, type = "") {
	let q = "q=";

	switch (type) {
		case "artist": {
			q += `artist:${query}`;
			break;
		}
		case "album": {
			q += `album:${query}`;
			break;
		}
		default:
			q += query;
	}
	q += "&type=track&limit=50";
	q = encodeURI(q);

	const res = await fetch(`${BASEURL}search?${q}`, { headers: defaultHeaders });
	const data = await res.json();
	render(data.tracks.items);
}

function render(items: any) {
	const template = byId<HTMLTemplateElement>("song-template");

	list.append(
		...items.map((item: any) => {
			const clone = template.content.cloneNode(true) as extNode;

			clone.querySelector("li").id = item.id;

			// for mobile devices
			clone.querySelector("li").oncontextmenu = e => {
				e.preventDefault();
				e.stopImmediatePropagation();
				return false;
			};

			clone.querySelector("li").addEventListener("click", () => {
				// add to start of queue
			});

			// select smallest image because it is small in ui and load time is important even though it looks a bit ugly
			clone.querySelectorT<HTMLImageElement>("img").src = (item.album.images as Spotify.ImageResponse[]).reduce((prev, cur) => (prev.height < cur.height ? prev : cur)).url;
			clone.querySelector(".song-name").textContent = item.name;
			clone.querySelector(".song-author").textContent = (item.artists as { name: string }[]) // todo actual type lol
				.map(artist => artist.name)
				.join(", ");
			clone.querySelector(".song-duration").textContent = (() => {
				let seconds = item.duration_ms / 1000;
				const minutes = Math.floor(seconds / 60);
				seconds = Math.floor(seconds % 60);
				return `${minutes}:${seconds < 10 ? "0" + seconds : seconds}`;
			})();

			return clone;
		})
	);
}

byId<HTMLButtonElement>("search-help").addEventListener("click", () => {
	byId<HTMLDivElement>("search-help-container").classList.toggle("hide");
});

byIdx("search-by-artist").addEventListener("click", e => {
	const inp = byId<HTMLInputElement>("search-input");
	if (inp.value.length > 0) {
		inp.value = `by:${inp.value}`;
		byId<HTMLButtonElement>("search-button").click();
	} else {
		inp.value = "by:";
	}
	byIdx("search-help-container").classList.add("hide");
});

byIdx("search-by-album").addEventListener("click", e => {
	const inp = byId<HTMLInputElement>("search-input");
	if (inp.value.length > 0) {
		inp.value = `in:${inp.value}`;
		byId<HTMLButtonElement>("search-button").click();
	} else {
		inp.value = "in:";
	}
	byIdx("search-help-container").classList.add("hide");
});

"use strict";
import { validateOnLoad, byId, cookieFun, redirect, byIdx } from "./exports.js";
import { ListBuilder } from "./list.js";
cookieFun();
validateOnLoad().then(state => {
    if (!state) {
        const ul = byId("the-list");
        while (ul.offsetHeight < window.innerHeight)
            ul.innerHTML += `<li style='height:64px'><a style='width:100%;height:100%' href='/index.html?action=login&redirect_path=/playlists/'><button style='font-size:1.6em;width:100%;height:100%' >Login</button></a></li>`;
    }
});
document.addEventListener("c-loaded-global-nav", () => (byIdx("dummy").style.height = 4 + (document.querySelector("header")?.offsetHeight || 20) + "px"), { once: true });
const listBuilder = new ListBuilder();
listBuilder.initRenderer(function () {
    const template = byId("item-template");
    const list = byId("the-list");
    const selectedPlaylist = new URLSearchParams(window.location.search).get("selected");
    return (items) => list.append(...items.map(item => {
        const clone = template.content.cloneNode(true);
        clone.querySelector("li").id = item.id;
        // for mobile devices
        clone.querySelector("li").oncontextmenu = e => {
            e.preventDefault();
            e.stopImmediatePropagation();
            return false;
        };
        let longPressTimeout;
        let action = 0;
        clone.querySelector("li").addEventListener("pointerdown", function () {
            const aborter = new AbortController();
            longPressTimeout = setTimeout(() => {
                aborter.abort();
                action = 1;
            }, 500);
            this.addEventListener("pointerup", () => {
                clearTimeout(longPressTimeout);
                action = 2;
            }, { once: true, signal: aborter.signal });
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
                    confirm(`Set ${item.name} as active playlist without changing queue?`) && redirPlaylist(item.id);
                    break;
                case 2: // short press
                    setQueue(item.id);
                    break;
            }
        });
        // select smallest image at first. when all small images are done loading, load bigger images
        clone.querySelector("img").src = item.images.reduce((prev, cur) => (prev.height < cur.height ? prev : cur)).url;
        clone.querySelector("img").setAttribute("data-highres", item.images.reduce((prev, cur) => (prev.height > cur.height ? prev : cur)).url);
        clone.querySelector("img").onload = e => onImgLoad(e.target);
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
        if (selectedPlaylist == item.id)
            clone.querySelector("li").classList.add("selected");
        return clone;
    }));
});
let timeout = 200, timer;
const token = localStorage.getItem("token");
(async () => {
    if (!token)
        return;
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
                const tmp = byId("the-list").appendChild(document.createElement("li"));
                for (let i = 3; i > 0; i--) {
                    tmp.innerText = "Spotify unavailable, retrying in " + i + " seconds";
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                tmp.remove();
                continue;
            }
            else
                return alert(res.statusText);
        }
        const json = await res.json();
        offset += json.limit;
        total = json.total;
        listBuilder.render?.(json.items);
    }
    timeout = Math.ceil(total / 2); // idk something about keeping performance and responsiveness both high
})();
async function setQueue(id) {
    // set ui
    byId("loading-container").classList.add("active");
    byId("loading-cover").classList.add("active");
    const percentage = byIdx("spinner-percentage");
    percentage.innerText = "0%";
    const aborter = new AbortController();
    byId("cancel").addEventListener("click", () => {
        aborter.abort();
        byId("loading-container").classList.remove("active");
        byIdx("loading-cover").classList.remove("active");
    }, { once: true });
    //get songs
    const songs = [];
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
            }
            else
                return alert(res.statusText);
        }
        const json = await res.json();
        offset += json.limit;
        total = json.total;
        songs.push(...json.items.map((item /* TODO Spotify.Song */) => item.track.uri));
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
        const qCount = JSON.parse(localStorage.getItem("settings")).queueCount; // NOT null!!!!!!!!!!!!
        // attempt 3 times because sometimes api says no for no reason
        while (++i < 4) {
            const res = await fetch(`https://api.spotify.com/v1/me/player/play${device_id && "?device_id=" + device_id}`, {
                method: "PUT",
                headers: [
                    ["Authorization", "Bearer " + token],
                    ["Content-Type", "application/json"],
                    ["Accept", "application/json"],
                ],
                body: JSON.stringify({ uris: songs.slice(0, qCount > songs.length ? songs.length : qCount) }),
            });
            if (res.ok) {
                redirPlaylist(id);
                break;
            }
            // since solartify mini doesnt actually play the song, spotify needs to know what device it should start playback on
            if (res.status == 404 && (await res.json())?.["error"]?.["reason"] == "NO_ACTIVE_DEVICE") {
                device_id = await showDevicesModal(); // hacky function at 2am
                if (!device_id)
                    break;
                continue;
            }
            if (res.statusText)
                alert(res.statusText);
            else
                (await res.json())?.["error"]?.["message"] && alert((await res.json())["error"]["message"]);
            continue;
        }
        byIdx("loading-container").classList.remove("active");
        byIdx("loading-cover").classList.remove("active");
        byIdx("devices").style.display = "none";
    })();
}
async function showDevicesModal() {
    const devices = await fetch("https://api.spotify.com/v1/me/player/devices", {
        headers: [
            ["Authorization", "Bearer " + token],
            ["Content-Type", "application/json"],
            ["Accept", "application/json"],
        ],
    })
        .then(res => (res.ok ? res.json() : Promise.reject(res)))
        .then(json => json.devices)
        .catch(() => null);
    if (!devices || devices.length == 0)
        return confirm("No devices found! Please open Spotify on your device and try again.") ? showDevicesModal() : Promise.resolve("");
    const target = byId("device-list");
    target.innerHTML = "";
    const template = byId("device-template");
    let resolve = (device_id) => device_id; // scuffed
    const returnPromise = new Promise(res => (resolve = res));
    devices.forEach(device => {
        const clone = template.content.cloneNode(true);
        clone.querySelector(".device-name").innerText = device.name;
        clone.querySelector(".device-type").innerText = device.type;
        clone.querySelector("li").addEventListener("click", () => resolve(device.id)); // https://stackoverflow.com/questions/26150232/resolve-javascript-promise-outside-the-promise-constructor-scope
        target.appendChild(clone);
    });
    byId("devices").style.display = "flex";
    return returnPromise;
}
byId("search").addEventListener("input", e => {
    const query = e.target.value.toUpperCase();
    clearTimeout(timer);
    timer = setTimeout(() => {
        if (query.length == 0)
            listBuilder.searchables.forEach(entry => entry[1].classList.remove("hide"));
        for (let i = 0; i < listBuilder.searchables.length; i++) {
            const entry = listBuilder.searchables[i];
            if (entry[0].includes(query))
                entry[1].classList.remove("hide");
            else
                entry[1].classList.add("hide");
        }
    }, timeout);
});
const loadedImages = [];
const useDynamicLoading = JSON.parse(localStorage.getItem("settings")).dynamicLoading;
function onImgLoad(target) {
    // TODO replace this shit with intersection observer to stop loading 10000 images that wont be used. html lazy loading didnt seem to work.
    if (!useDynamicLoading)
        return;
    loadedImages.push(target);
    if (loadedImages.length == listBuilder.searchables.length) {
        loadedImages.forEach(img => {
            if ("highres" in img.dataset) {
                img.src = img.dataset.highres;
                delete img.dataset.highres;
            }
        });
    }
}
function redirPlaylist(id) {
    localStorage.setItem("active_playlist", id);
    redirect("/player");
}

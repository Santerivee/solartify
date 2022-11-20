import { byId, cookieFun, redirect } from "./exports.js";
cookieFun();

// get saved settings
(() => {
	//@ts-ignore again, blah blah settings is never null
	const settings = JSON.parse(localStorage.getItem("settings"));
	if (!settings) return;

	//@ts-ignore not touching this thing
	Array.from(byId<HTMLSelectElement>("button-function-select").options).find(option => option.value == settings.buttonFunction).selected = "selected";

	byId<HTMLButtonElement>("add-target-playlist").value = settings.addTarget.name && settings.addTarget.name != "undefined" ? settings.addTarget.name : "";
	byId<HTMLInputElement>("fast-login-check").checked = settings.fastLogin;
	byId<HTMLInputElement>("song-queue-count").value = settings.queueCount;
	byId<HTMLInputElement>("dynamic-img-check").checked = settings.dynamicLoading;
})();

byId<HTMLButtonElement>("save").addEventListener("click", async () => {
	const buttonFunction = byId<HTMLSelectElement>("button-function-select").options[byId<HTMLSelectElement>("button-function-select").selectedIndex].value;
	const fastLogin = byId<HTMLInputElement>("fast-login-check").checked;
	//@ts-ignore again, we know that settings is always there
	const addTarget = JSON.parse(localStorage.getItem("settings")).addTarget;

	const queueCount = parseInt(byId<HTMLInputElement>("song-queue-count").value) || 100;

	const dynamicLoading = byId<HTMLInputElement>("dynamic-img-check").checked;

	localStorage.setItem(
		"settings",
		JSON.stringify({
			buttonFunction,
			addTarget,
			fastLogin,
			queueCount,
			dynamicLoading,
		})
	);
	alert("Settings saved!");
	window.location = window.location;
});

byId<HTMLButtonElement>("reset-defaults").addEventListener("click", () => {
	localStorage.removeItem("settings");
	redirect("/");
});

byId<HTMLButtonElement>("reset-active-playlist").addEventListener("click", () => {
	localStorage.removeItem("active_playlist");
	redirect("/player");
});

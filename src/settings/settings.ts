import { byId, cookieFun } from "../exports";
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
})();

byId<HTMLButtonElement>("save").addEventListener("click", async () => {
	const buttonFunction = byId<HTMLSelectElement>("button-function-select").options[byId<HTMLSelectElement>("button-function-select").selectedIndex].value;
	const fastLogin = byId<HTMLInputElement>("fast-login-check").checked;
	//@ts-ignore again, we know that settings is always there
	const addTarget = JSON.parse(localStorage.getItem("settings")).addTarget;

	localStorage.setItem(
		"settings",
		JSON.stringify({
			buttonFunction,
			addTarget,
			fastLogin,
		})
	);

	window.location = window.location;
});

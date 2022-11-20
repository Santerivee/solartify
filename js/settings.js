import { byId, cookieFun, redirect } from "./exports.js";
cookieFun();
// get saved settings
(() => {
    //@ts-ignore again, blah blah settings is never null
    const settings = JSON.parse(localStorage.getItem("settings"));
    if (!settings)
        return;
    //@ts-ignore not touching this thing
    Array.from(byId("button-function-select").options).find(option => option.value == settings.buttonFunction).selected = "selected";
    byId("add-target-playlist").value = settings.addTarget.name && settings.addTarget.name != "undefined" ? settings.addTarget.name : "";
    byId("fast-login-check").checked = settings.fastLogin;
    byId("song-queue-count").value = settings.queueCount;
    byId("dynamic-img-check").checked = settings.dynamicLoading;
})();
byId("save").addEventListener("click", async () => {
    const buttonFunction = byId("button-function-select").options[byId("button-function-select").selectedIndex].value;
    const fastLogin = byId("fast-login-check").checked;
    //@ts-ignore again, we know that settings is always there
    const addTarget = JSON.parse(localStorage.getItem("settings")).addTarget;
    const queueCount = parseInt(byId("song-queue-count").value) || 100;
    const dynamicLoading = byId("dynamic-img-check").checked;
    localStorage.setItem("settings", JSON.stringify({
        buttonFunction,
        addTarget,
        fastLogin,
        queueCount,
        dynamicLoading,
    }));
    alert("Settings saved!");
    window.location = window.location;
});
byId("reset-defaults").addEventListener("click", () => {
    localStorage.removeItem("settings");
    redirect("/");
});
byId("reset-active-playlist").addEventListener("click", () => {
    localStorage.removeItem("active_playlist");
    redirect("/player");
});

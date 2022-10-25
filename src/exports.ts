export const redirect = (url: string) => (window.location.href = url);

export const checkHash = () => {
	if (window.location.hash.length < 2) return false;

	const params = Object.fromEntries(new URLSearchParams(window.location.hash.substring(1)).entries());
	if (localStorage.getItem("state") != params["state"]) return false;
	localStorage.setItem("token", params["access_token"]);

	window.location.hash = "";
	return true; // assume that the token is valid
};

export const checkToken = async () => {
	const token = window.localStorage.getItem("token");
	if (!token) return false;

	return (
		await fetch("https://api.spotify.com/v1/me", {
			headers: [
				["Authorization", "Bearer " + token],
				["Content-Type", "application/json"],
				["Accept", "application/json"],
			],
		})
	).ok;
};

export const validateToken = async () => checkHash() || (await checkToken());

export const validateOnLoad = async () => {
	const valid = await validateToken();
	//@ts-ignore because we know that settings exists :)
	if (!valid && JSON.parse(window.localStorage.getItem("settings")).fastLogin) {
		let path = window.location.pathname;
		if (path.length > 2 && path[path.length - 1] != "/") path += "/";
		redirect("/index.html?action=login&redirect_path=" + path);
	}
	return valid;
};

export const cookieFun = () => {
	const accepted = window.localStorage.getItem("cookieFunAccepted");
	if (accepted) return;

	const howToCenterDivInHtml = document.body.appendChild(document.createElement("div"));
	howToCenterDivInHtml.setAttribute(
		"style",
		"background: #dddddd66; text-align:center; display: flex; justify-content: center; align-items: center; height: 100vh; width: 100vw; position: fixed; top: 0; left: 0; z-index: 100;"
	);

	howToCenterDivInHtml.onclick = e => {
		e.stopPropagation();
		window.localStorage.setItem("cookieFunAccepted", "true");
		howToCenterDivInHtml.remove();
	};

	const p = howToCenterDivInHtml.appendChild(document.createElement("p"));
	p.setAttribute("style", "width: 60%; background: #f3f3f3; padding: 1em; border-radius: 1em; box-shadow: 0 0 1em black; font-size: 1.2em;");

	p.innerHTML = `This website uses only <a onclick='event.stopPropagation();' target='_blank' href='/cookie/'>necessary 1st party cookies</a> and <a onclick='event.stopPropagation();' target='_blank' href='https://www.cloudflare.com/en-gb/cookie-policy/'>necessary CloudFlare cookies</a>.
	<br/><br/>
	By continuing you agree to the use of these cooke.`;
};

// prettier-ignore
export const byIdx = (id: string) =>  document.getElementById(id) || (() => { throw new Error("no element with id " + id) })();
// typescript is hard
// prettier-ignore
export const byId = <T extends HTMLElementTagNameMap[keyof HTMLElementTagNameMap] = HTMLElement >(id: string) =>  (document.getElementById(id)) as T || (() => { throw new Error("no element with id " + id) })();

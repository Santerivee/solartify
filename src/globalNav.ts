class GlobalNav extends HTMLElement {
	constructor() {
		super();

		// Create a shadow root
		const shadow = this.attachShadow({ mode: "open" });

		// Create stuff
		const container = document.createElement("nav");
		container.id = "__global_nav";

		// <a href="/index.html"><button>Home</button></a>
		// <a href="/player.html"><button>Player</button></a>
		// <a href="/q.html"><button>My playlists</button></a>
		// <a href="/s.html"><button>Settings</button></a>
		[
			["Home", "/"],
			["Player", "/player/"],
			["My playlists", "/playlists/"],
			["Settings", "/settings/"],
		].forEach(([text, href]) => {
			let element = document.createElement("a");

			if (window.location.pathname == href) element.classList.add("__global_nav_active");
			element.href = href;
			let button = document.createElement("button");
			button.innerText = text;
			button.type = "button";
			element.appendChild(button);
			container.appendChild(element);
		});

		// Attach the created elements to the shadow dom
		shadow.appendChild(container);

		// Apply external styles to the shadow DOM
		const linkElem = document.createElement("link");
		linkElem.setAttribute("rel", "stylesheet");
		linkElem.setAttribute("href", "/components/globalNav.css");
		linkElem.id = "globalNavCSS";

		// Attach the created element to the shadow DOM
		shadow.appendChild(linkElem);
		document.dispatchEvent(new CustomEvent("c-loaded-global-nav"));
	}
}

customElements.define("global-nav", GlobalNav);

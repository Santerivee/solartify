export interface IDefaultHeaders extends Array<[string, string]> {
	0: ["Content-Type", "application/json"];
	1: ["Accept", "application/json"];
	2: ["Authorization", string]; // i dont know how to make `Bearer ${string}` :(
}

/**
 * Gives necessary functionality for template.cloneNode return type
 */
export interface extNode extends Node {
	querySelector: (selector: string) => HTMLElement;
	querySelectorT: <T>(selector: string) => T;
}

export enum EButtonFunction {
	ADD = "add",
	REM = "remove",
	DEC = "decide",
}

export interface ISettings {
	buttonFunction: EButtonFunction;
	addTarget: {
		id: string;
		name: string;
	};
	fastLogin: boolean;
}

export declare namespace Spotify {
	interface ImageResponse {
		height: number;
		width: number;
		url: string;
	}
	interface PlaylistResponse {
		id: string;
		uri: string;
		images: ImageResponse[];
		name: string;
		owner: {
			display_name: string;
			id: string;
			uri: string;
		};
	}
}

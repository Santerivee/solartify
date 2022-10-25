export class ListBuilder {
	searchables: ISearchables = []; // holds data to use for searching playlists
	render: IRender | undefined;

	constructor() {}
	/* initRenderer = (setup: () => (r: (items: unknown[]) => void)) => {
		this.render = setup();
	}; */

	initRenderer(setup: () => IRender) {
		this.render = setup.call(this);
	}
}

type IRender = (this: ListBuilder, items: any[]) => void;
interface ISearchables extends Array<[string, HTMLElement]> {
	[index: number]: [string, HTMLElement];
}

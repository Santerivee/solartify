export class ListBuilder {
    constructor() {
        this.searchables = []; // holds data to use for searching playlists
    }
    /* initRenderer = (setup: () => (r: (items: unknown[]) => void)) => {
        this.render = setup();
    }; */
    initRenderer(setup) {
        this.render = setup.call(this);
    }
}

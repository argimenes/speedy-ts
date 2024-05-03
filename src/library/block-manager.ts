import { StandoffTextBlock } from "./text-block-editor";

export class BlockManager {
    blocks: StandoffTextBlock[];
    constructor() {
        this.blocks = [];
    }
    startNewDocument() {
        const block = new StandoffTextBlock({ container: document.createElement("DIV") as any });
    }
}
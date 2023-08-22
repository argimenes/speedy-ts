const make = (type: string) => document.createElement(type);

class BlockList {
    blocks: Block[]|undefined;
}
class Block {
    id: string;
    index: number|undefined;
    cells: Cell[];
    cursor: Cursor;
    previous: Block|undefined;
    next: Block|undefined;
    children: Block[]|undefined;
    left: Block|undefined;
    right: Block|undefined;
    constructor() {
        this.id = "";
        this.cells = []
        this.cursor = new Cursor();
    }
    render() {
        return make("DIV");
    }
}
class Cursor {
    left: Cell|undefined;
    right: Cell|undefined;
    constructor() {

    }
}
class Cell {
    block: Block;
    previous: Cell|undefined;
    next: Cell|undefined;
    constructor() {
        this.block = new Block();
    }
}
class TextCell extends Cell {
    index: number;
    text: string;
    constructor() {
        super();
        this.index = 0;
        this.text = "";
    }
    render() {
        const span = make("SPAN");
        span.innerText = this.text;
        return span;
    }
}
class Property {
    css: string;
    start: Cell;
    end: Cell;
    type: string;
    constructor() {
        this.start = new Cell();
        this.end = new Cell();
        this.type = "";
        this.css = "";
    }
    renderCell() {
        // 
    }
    getCells() {
        // returns an array of the Cells in the range
    }
    paint() {
        const cells = this.getCells();
        // applies CSS styling or SVG effects to the range
    }
}
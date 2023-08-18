class Block {
    cells: Cell[];
    constructor() {
        this.cells = []
    }
}
class Cell {
    constructor() {

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
        const span = document.createElement("SPAN");
        span.innerText = this.text;
        return span;
    }
}
class Property {
    segments: Segment[];
    type: string;
    constructor() {
        this.segments = [];
        this.type = "";
    }
    render() {

    }
}
class Segment { 
    start: Cell|undefined;
    end: Cell|undefined;
    constructor() {
        this.start = undefined;
        this.end = undefined;
    }
}
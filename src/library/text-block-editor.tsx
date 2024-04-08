export interface ICellConstructor {
    text: string;
    previous?: Cell;
    next?: Cell;
}
export interface IStandoffProperty {
    type: string;
    startIndex: number;
    endIndex: number;
}
export interface ITextBlock {
    id: GUID;
    text: string;
    properties: IStandoffProperty[];
}

export class Cell {
    index: number;
    previous?: Cell;
    next?: Cell;
    text: string;
    element?: HTMLSpanElement;
    constructor({ text }: ICellConstructor) {
        this.index = 0;
        this.text = text;
    }
    renderNode() {
        const span = document.createElement("SPAN");
        span.innerText = this.text;
        return span;
    }
    replaceElement(el: HTMLElement) {
        const previous = this.element?.previousElementSibling;
        const next = this.element?.nextElementSibling;
    }
    removeNode() {
        this.element?.remove();
    }
}

export type GUID = string;

export class TextBlockEditor {
    id: GUID;
    container: HTMLDivElement;
    cells: Cell[];
    constructor({ container }: { container: HTMLDivElement }) {
        this.id = "";
        this.cells = [];
        this.container = container;
    }
    unbind() {
        const block = {} as ITextBlock;
        block.text = this.getText();
        return block;
    }
    getText() {
        return this.cells.map(c => c.text).join();
    }
    bind(block: ITextBlock) {
        const cells = this.toCells(block.text);
        this.chainCellsTogether(cells);
    }
    getCellAtIndex(index: number, cells: Cell[]) {
        const max = cells.length - 1;
        if (index > max) return undefined;
        if (index < 0) return undefined;
        return cells[index];
    }
    chainCellsTogether(cells: Cell[]) {
        const max = cells.length - 1;
        const many = max > 1;
        for (let i = 0; i <= max; i ++) {
            let cell = cells[i];
            let hasPrevious = many && i > 0;
            let hasNext = many && i < max;
            if (hasPrevious) {
                cells[i - 1].next = cell;
                cell.previous = cells[i - 1];
            }
            if (hasNext) {
                cell.next = cells[i + 1];
                cells[i + 1].previous = cell;
            }
        }
    }
    toCells(text: string) {
        if (!text) return [] as Cell[];
        const len = text.length;
        const cells: Cell[] = [];
        for (let i = 0; i < len; i ++) {
            let cell = new Cell({ text: text[i] });
            cells.push(cell);
        }
        return cells;
    }
    markCells() {
        this.cells.forEach((cell, index) => cell.index = index);
    }
    insertCharacterAfterIndex(char: string, index: number) {
        const previous = this.cells[index];
        const next = this.cells[index+1];
        var cell = new Cell({ text: char, previous, next });
        previous.next = cell;
        cell.previous = previous;
        cell.next = next;
        next.previous = cell;
    }
    removeCharacterAtIndex(index: number) {

    }
}
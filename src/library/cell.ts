import { classList } from "solid-js/web";
import { StandoffEditorBlock } from "../blocks/standoff-editor-block";
import { updateElement } from "./svg";
import { ICellCoordOffsets, CellHtmlElement, ICellConstructor, ELEMENT_ROLE, DIRECTION, CellElement } from "./types";

export class Cell {
    index: number;
    previous?: Cell;
    next?: Cell;
    text: string;
    cache: {
        previousOffset: ICellCoordOffsets,
        offset: ICellCoordOffsets,
        marker?: HTMLSpanElement
    };
    element?: CellHtmlElement;
    isEOL: boolean;
    block: StandoffEditorBlock;
    row?: Row;
    constructor({ text, block }: ICellConstructor) {
        this.index = 0;
        this.text = text;
        this.block = block;
        this.cache = {
            previousOffset: {
                x:0,y:0,w:0,h:0,cy:0
            },
            offset: {
                x:0,y:0,w:0,h:0,cy:0
            }
        };
        this.isEOL = false;
        this.element = this.createElement();
    }
    createElement() {
        /**
         * Ideally we'd like to be able to override this from somewhere when we want to generate different kinds
         * of elements, such as SVGs.
         */
        return this.createSpan();
    }
    setText(c: string) {
        this.text = c;
        const span = this.element as CellHtmlElement;
        span.innerHTML = c;
        if (c === " ") {
            updateElement(span, {
                classList: ["cell-space"]
            });
            span.speedy.isSpace = true;
        } else {
            span.classList.remove("cell-space");
            span.speedy.isSpace = false;
        }
    }
    createSpan() {
        const span = document.createElement("SPAN") as CellHtmlElement;
        span.speedy = {
            cell: this,
            role: ELEMENT_ROLE.CELL,
            isSpace: false
        }
        span.innerHTML = this.text === " " ? " " : this.text;
        if (this.text === " ") {
            updateElement(span, {
                classList: ["cell-space"]
            });
            span.speedy.isSpace = true;
        }
        return span;
    }
    removeElement() {
        this.element?.remove();
    }
    getTextNode() {
        // Get the first TEXT NODE of the element
        let node = this.element?.firstChild;
        if (!node) {
            return this.element as ChildNode;
        }
        while (node?.nodeType != 3) {
            node = node?.firstChild as ChildNode;
        }
        return node;
    }
}

export interface IRowConstructor {
    index: number;
    cells: Cell[]; 
}
export class Row {
    index: number;
    previous?: Row;
    next?: Row;
    cells: Cell[];
    constructor(args: IRowConstructor) {
        this.index = args.index;
        this.cells = args.cells;
    }
    findNearestCell(x: number) {
        const cellDiffs = this.cells.map(c => {
            const diff = x - c.cache.offset.x;
            return {
                diff: Math.abs(diff),
                side: diff <= 0 ? DIRECTION.LEFT : DIRECTION.RIGHT,
                cell: c
            }
        });
        const orderedDiffs = cellDiffs.sort((a, b) => a.diff > b.diff ? 1 : a.diff == b.diff ? 0 : -1);
        const min = orderedDiffs[0];
        return min;
    }
    getLastCell() {
        return this.cells[this.cells.length-1];
    }
}
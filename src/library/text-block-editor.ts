export interface IRange {
    start: Cell;
    end: Cell;
}
export interface ICellConstructor {
    text: string;
    previous?: Cell;
    next?: Cell;
}
export interface IStandoffProperty {
    type: string;
    startIndex: number;
    endIndex: number;
    value?: Record<string,string>;
}
export interface IStandoffPropertySchema {
    type: string;
    bindings: string[];
    decorate: {
        cellClass?: string;
        propertyBlockClass?: string;
        batchRender?: (args: { editor: TextBlockEditor, properties: StandoffProperty[] }) => void;
    }
}
export interface ITextBlock {
    id?: GUID;
    text: string;
    properties: IStandoffProperty[];
    schemas: IStandoffPropertySchema[];
}

export class Cell {
    index: number;
    previous?: Cell;
    next?: Cell;
    text: string;
    element?: HTMLSpanElement;
    isLineBreak: boolean;
    constructor({ text }: ICellConstructor) {
        this.index = 0;
        this.text = text;
        this.isLineBreak = false;
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

export enum Caret {
    Left = 0,
    Right = 1
}

export type GUID = string;

export class StandoffProperty {
    id?: GUID;
    type: string;
    start: Cell;
    end: Cell;
    decorate: Record<string, string>;
    isDeleted: boolean;
    constructor({ start, end }: { start: Cell, end: Cell }) {
        this.isDeleted = false;
        this.type = "";
        this.start = start;
        this.end = end;
        this.decorate = {};
    }
}

export interface IKeyboardInput {

}

export class TextBlockEditor {
    id: GUID;
    container: HTMLDivElement;
    cells: Cell[];
    properties: StandoffProperty[];
    constructor({ container }: { container: HTMLDivElement }) {
        this.id = "";
        this.cells = [];
        this.container = container;
        this.properties = [];
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
    removeCell(args: { cell: Cell, updateCaret?: boolean }) {
        const { cell} = args;
        const updateCaret = !!args.updateCaret;
        const previous = cell.previous;
        const next = cell.next;
        if (cell.isLineBreak) {
            /**
             * Emit an event indicating this.
             */
            return;
        }
        if (previous) {
            previous.next = next;
        }
        if (next) {
            next.previous = previous;
        }
        cell.removeNode();
        if (updateCaret) {
            // if (next) {
            //     this.setCarotByNode({ node: next, offset: Caret.Left });
            // }
            // this.mark();
            // this.updateOffsets();
            // if (this.onTextChanged) {
            //     const caret = {
            //         left: previous, right: next, container: currentTextBlock
            //     };
            //     const { text, cells } = this.getTextBlockData(currentTextBlock);
            //     this.onTextChanged({
            //         action: "deleted", editor: this, caret, text, cells
            //     });
            // }
        }
    }
    setCarotByNode(args: { node: Cell, offset?: Caret }) {
        /**
         * Might want to investigate setting the caret by absolutely positioning an SVG ...
         */
        const { node } = args;
        if (!node) {
            return;
        }
        const selection = document.getSelection() as globalThis.Selection;
        const range = document.createRange();
        const offset = (args.offset != null) ? args.offset : Caret.Right;
        const textNode = node.getTextNode();
        range.setStart(textNode, 1);
        range.collapse(true);
        if (selection.setBaseAndExtent) {
            var startOffset = offset;    // range.startOffset;
            var endOffset = offset;      // range.endOffset;
            selection.setBaseAndExtent(range.startContainer, startOffset, range.endContainer, endOffset);
        } else {
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }
    shiftPropertyBoundaries(cell: Cell) {
        this.shiftPropertyStartNodesRight(cell);
        this.shiftPropertyEndNodesLeft(cell);
    }
    shiftPropertyEndNodesLeft(cell: Cell) {
        const previousCell = cell.previous;
        const properties = this.properties.filter(p => !p.isDeleted);
        const singles = properties.filter(p => p.start == p.end && p.start == cell);
        if (singles) {
            singles.forEach(p => p.isDeleted = true);
        }
        const endProperties = properties.filter(p => p.end == cell && p.start != cell);
        if (endProperties.length) {
            if (!previousCell) {
                endProperties.forEach(p => p.isDeleted = true);
            } else {
                endProperties.forEach(p => p.end = previousCell);
            }
        }
    }
    shiftPropertyStartNodesRight(cell: Cell) {
        const nextCell = cell.next;
        const properties = this.properties.filter(p => !p.isDeleted);
        const singles = properties.filter(p => p.start == p.end && p.start == cell);
        if (singles.length) {
            singles.forEach(p => p.isDeleted = true);
        }
        const startProperties = properties.filter(p => p.start == cell && p.end != cell);
        if (startProperties.length) {
            if (!nextCell) {
                startProperties.forEach(p => p.isDeleted = true);
            } else {
                startProperties.forEach(p => p.start = nextCell);
            }
        }
    }
    removeCellAtIndex({ index, updateCaret }: { index: number, updateCaret?: boolean }) {
        const cell = this.cells.find(c => c.index == index);
        if (!cell) {
            log("Cell could not be found for the index", { index, error: new Error() });
            return;
        }
        return this.removeCell({ cell, updateCaret });
    }
    getCells(range: IRange) {
        const cells: Cell[] = [];
        let cell = range.start;
        while (cell) {
            cells.push(cell);
            if (cell.next && !cell.isLineBreak) {
                cell = cell.next;
            }
            break;
        }
        return cells;
    }
    styleProperty(p: StandoffProperty) {
        if (!p.decorate) return;
        if (p.decorate.cellClass) {
            const cells = this.getCells({ start: p.start, end: p.end });
            cells.forEach(c => {
                if (!c.element) return;
                c.element.classList.add(p.decorate.cellClass);
            });
        }
    }
    createProperty(type: string, range: IRange) {
        const prop = new StandoffProperty(range);
        prop.type = type;
        this.properties.push(prop);
    }
}

const log = (msg: string, data: Record<string,any>) => console.log(msg, data);


const editor = new TextBlockEditor({
    container: document.createElement("DIV") as HTMLDivElement
});
editor.bind({
    text: "Once upon a midnight dreary ...",
    properties: [
        {
            type: "style/italics",
            startIndex: 5,
            endIndex: 9
        },
        {
            type: "codex/entity-reference",
            startIndex: 13,
            endIndex: 21
        },
        {
            type: "style/blur",
            startIndex: 23,
            endIndex: 29
        },
    ],
    modes: {
        "auto-alias": {
            bindingsToInvoke: ["(", "("],
            handler: async (e: TextBlockEditor, selection: IRange) => {
                e.setMode("auto-alias");
                e.setOverrideBindings([

                ]);
                /*
                
                1. Collecting user text input and piping through to an API
                and returning a list of matching entities.

                2. User either selects a matching entity or closes the mode.

                3. If entity is matched, create a new entity reference StandoffProperty
                for the text enterered, and link it to the matching entity GUID.

                */
            }
        }
    },
    schemas: [
        {
            type: "style/italics",
            bindings: ["control-i"],
            bindingHandler: (e: TextBlockEditor, selection: IRange) => {
                if (selection) {
                    e.createProperty("style/italics", selection);
                } else {

                }
            },
            decorate: {
                cellClass: "italics"
            }
        },
        {
            type: "codex/entity-reference",
            bindings: ["control-e", "control-f"],
            bindingHandler: async (e: TextBlockEditor, selection: IRange) => {
                if (selection) {

                } else {

                }
            },
            decorate: {
                batchRender: (args) => {
                    const { editor, properties } = args;
                    const { container } = editor;
                    // Draw purple SVG underlines for entities, etc.
                }
            }
        },
        {
            type: "style/blur",
            bindings: ["control-b"],
            decorate: {
                propertyBlockClass: "blur"
            }
        },
    ]
})


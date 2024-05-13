import { KEYS, Platform } from "./keyboard";

export interface IRange {
    start: Cell;
    end: Cell;
}
export interface ICellConstructor {
    text: string;
    previous?: Cell;
    next?: Cell;
}
export enum BLOCK_POSITION {
    Inside,
    Start,
    End,
    EmptyLine
};
export interface IStandoffProperty {
    type: string;
    startIndex: number;
    endIndex: number;
    value?: string;
}
export interface IStandoffPropertySchema {
    type: string;
    bindings?: string[];
    bindingHandler?: (e: StandoffEditorBlock, selection: IRange) => void;
    decorate: {
        cellClass?: string;
        blockClass?: string;
        batchRender?: (args: { block: StandoffEditorBlock, properties: StandoffProperty[] }) => void;
    }
}
export interface ITextBlock {
    id?: GUID;
    text: string;
    properties: IStandoffProperty[];
}

export class Cell {
    index: number;
    previous?: Cell;
    next?: Cell;
    text: string;
    cache: {
        offset: {
            x: number;
            y: number;
            h: number;
            w: number;
        }
    };
    element?: HTMLSpanElement;
    isLineBreak: boolean;
    constructor({ text }: ICellConstructor) {
        this.index = 0;
        this.text = text;
        this.cache = {
            offset: {
                y: 0, h: 0, x: 0, w: 0
            }
        };
        this.isLineBreak = false;
        this.element = this.renderNode();
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

export enum CARET {
    LEFT = 0,
    RIGHT = 1
}

export enum ELEMENT_ROLE {
    CELL = 0,
    INNER_STYLE_BLOCK = 1,
    ROOT = 2,
    CELL_STYLE = 3,
    TEXT_BLOCK = 4,
    OUTER_STYLE_BLOCK = 5
}

export enum SELECTION_DIRECTION {
    LEFT = 0,
    RIGHT = 1
}

export type GUID = string;

export class StandoffProperty {
    id?: GUID;
    type: string;
    start: Cell;
    end: Cell;
    decorate: Record<string, string>;
    isDeleted: boolean;
    cache: {
        underline?: SVGElement; 
    };
    value: string;
    schema: any;
    block: StandoffEditorBlock; 
    bracket: { left?: HTMLElement; right?: HTMLElement };
    constructor({ type, start, end, block }: { type: string, start: Cell, end: Cell, block: StandoffEditorBlock }) {
        this.isDeleted = false;
        this.type = type;
        this.start = start;
        this.end = end;
        this.value = "";
        this.block = block;
        this.cache = {};
        this.decorate = {};
        this.bracket = {
            left: undefined,
            right: undefined
        };
    }

    scrollTo() {
        this.start.element?.scrollIntoView();
    }
    applyCssClassToRange(className: string) {
        if (this.isDeleted) return;
        const cells = this.getCells();
        cells.forEach(x => x.element?.classList.add(className));
    }
    removeCssClassFromRange(className: string) {
        if (this.isDeleted) return;
        const cells = this.getCells();
        cells.forEach(x => x.element?.classList.remove(className));
    }
    getCells() {
        const cells: Cell[] = [];
        let cell = this.start;
        let looping = true;
        if (this.start == this.end) {
            cells.push(this.start);
            return cells;
        }
        while (looping && !!cell) {
            cells.push(cell);
            let next = cell.next;
            if (!next) {
                looping = false;
            }
            if (next == this.end) {
                cells.push(next);
                looping = false;
            }
            cell = next as Cell;
        }
        return cells;
    }
    showBrackets() {
        if (this.bracket.left) this.bracket.left.style.display = "inline";
        if (this.bracket.right) this.bracket.right.style.display = "inline";
    }
    hideBrackets() {
        if (this.bracket.left) this.bracket.left.style.display = "none";
        if (this.bracket.right) this.bracket.right.style.display = "none";
    }
}

export interface IKeyboardInput {
    control: boolean;
    shift: boolean;
    option: boolean;
    command: boolean;
    //function: boolean;
    key: string;
    keyCode: number;
}
export enum ActionKey {
    DEL,
    TAB,
    ENTER,
    ESC
}

export enum BlockType {
    Outliner = "outliner-block",
    StandoffEditor = "standoff-editor-block",
    HTMLEditor = "html-editor-block",
    IFrame = "iframe-block",
    HTML = "html-block",
    PDF = "pdf-block",
    Image = "image-block",
    Video = "video-block"
}

export interface IBlock {
    id: GUID;
    type: BlockType;
    container: HTMLDivElement;
    relations: Record<string, IBlockRelation>;
    addRelation: (name: string, targetId: string) => void;
    removeRelation: (name: string) => void;
    metadata: Record<string, any>;
    setFocus: () => void;
}
export interface IBlockManager extends IBlock {

}

export interface IBlockRelation {
    type: string;
    sourceId: GUID;
    targetId: GUID;
}
export type Caret = {
    left?: Cell;
    right?: Cell;
};
export interface IBindingHandlerArgs {
    block: StandoffEditorBlock;
    caret: Caret;
}
export type SpeedyElement = {
    role: ELEMENT_ROLE;
}
export type BindingHandler = (args: IBindingHandlerArgs) => void;
export type KeyboardBinding = Record<string, BindingHandler>;
export type MouseBinding = KeyboardBinding;
export type InputBindings = {
    keyboard: KeyboardBinding[];
    mouse: MouseBinding[];
}
export type Mode = Record<string, InputBindings>;
/**
 * A place to store collections of absolutely-positioned SVG elements that 
 * are overlaid on the text underneath, e.g., for overlapping underlines.
 */
export type Overlay = {
    index: number;
    name: string;
    container: HTMLDivElement;
}
export interface ISelection extends IRange {
    direction: SELECTION_DIRECTION;
}

export type SpeedyNode = Node & { speedy: SpeedyElement };

export interface ICursor {
    anchorCell: Cell;
    caret: CARET;
}
export class StandoffEditorBlock implements IBlock {
    id: GUID;
    type: BlockType;
    owner: IBlockManager;
    relations: Record<string, IBlockRelation>;
    container: HTMLDivElement;
    cells: Cell[];
    cache: {
        containerWidth: number;
    };
    properties: StandoffProperty[];
    /**
     * This will keep track of the last couple of key-combinations entered. The main purpose
     * is for triggering two-part bindings, such as 'CTRL-K, CTRL-D'.
     */
    inputBuffer: IKeyboardInput[];
    schemas: IStandoffPropertySchema[];
    /**
     * A Mode is a named collection of input bindings.
     */
    mode: Mode;
    /**
     * Not unlike a StandoffProperty, a Selection denotes a highlighted range of text. Unlike a StandoffProperty,
     * it is not intended to be committed to the document, but represents a transient intention.
     * 
     * A Selection could be a background-color highlight that is applied as a CSS style to each cell in the
     * range, or it could be a collection of one or more SVG lines generated to match the shape of the text range.
     */
    selections: ISelection[];
    /**
     * A place to store data about the Block, especially the kind that may not be relevant to every instance
     * of Block in every circumstance. For example, 'indentLevel: number' is relevant to a Block in a nested-list
     * but not a chain of paragraph-like blocks. For now, this is a catch-all for Block data that hasn't yet been
     * promoted to being a member of the class itself.
     */
    metadata: {};
    /**
     * An Overlay is a named DIV container for storing generated elements - such as SVG underlines - which are meant
     * to be overlaid (like a layer) on top of the text underneath. An Overlay 'container' should be absolutely
     * positioned to be aligned to the top-left of the Block 'container' element, and generated elements inside the Overlay
     * 'container' should be absolutely positioned. Such generated elements will be drawn/undrawn when the StandoffProperty
     * is rendered, and when anything affects the alignment of cells in those properties, such as adding or removing text.
     */
    overlays: Overlay[];
    constructor(owner: IBlockManager, container?: HTMLDivElement) {
        this.id = uuidv4();
        this.owner = owner;
        this.type = BlockType.StandoffEditor;
        this.container = container || (document.createElement("DIV") as HTMLDivElement);
        this.container.setAttribute("contenteditable", "true");
        this.cache = {
            containerWidth: 0
        };
        this.relations = {};
        this.mode = { } as any;
        this.cells = [];
        this.metadata = {};
        this.schemas = [];
        this.properties = [];
        this.selections = [];
        this.inputBuffer = [];
        this.overlays = [];
        this.attachBindings();
    }
    setSchemas(schemas: IStandoffPropertySchema[]) {
        this.schemas.push(...schemas);
    }
    setModes(modes: Mode[]) {
        for (let i = 0; i < modes.length; i++) {
            let mode = modes[i];
            this.mode = {...mode};
        }
    }
    addRelation(name: string, targetId: string) {
        this.relations[name] = {
            type: name,
            sourceId: this.id,
            targetId: targetId
        };
    }
    removeRelation(name: string) {
        delete this.relations[name];
    }
    getOrSetOverlay(name: string) {
        const overlay = this.overlays.find(x=> x.name == name);
        if (overlay) return overlay;
        return this.addOverlay(name);
    }
    addOverlay(name: string) {
        const blockIndex = 100;
        const container = document.createElement("DIV") as HTMLDivElement;
        const indexes = this.overlays.map(x=> x.index);
        const lastIndex = Math.max(...indexes);
        const newIndex = lastIndex + 1;
        container.setAttribute("position", "absolute");
        container.setAttribute("x", "0");
        container.setAttribute("y", "0");
        container.setAttribute("width", "100%");
        container.setAttribute("height", "100%");
        container.setAttribute("z-index", (newIndex + blockIndex).toString());
        const overlay = { name, container, index: newIndex };
        this.overlays.push(overlay);
        return overlay;
    }
    getLastCell() {
        const len = this.cells.length;
        return this.cells[len-1];
    }
    removeOverlay(name: string) {
        const o = this.overlays.find(x => x.name == name);
        if (!o) return;
        o.container.remove();
    }
    setFocus() {
        /**
         * Sets the window focus on the block node.
         * Also sets up the caret/cursor if needed (?).
         */
        this.container.focus();
    }
    getRelation(type: string) {
        return this.relations[type];
    }
    setRelation(type: string, targetId: string) {
        this.relations[type] = { type, sourceId: this.id, targetId };
    }
    addKeyboardBinding(mode: string, binding: KeyboardBinding) {
        this.mode[mode].keyboard.push(binding);
    }
    addMouseBinding(mode: string, binding: MouseBinding) {
        this.mode[mode].mouse.push(binding);
    }
    attachBindings() {
        /*
        
        We want to capture [a] keyboard input and [b] mouse input.

        [a] Keyboard Input
        - should be converted into a structure like this:

        {
            control: boolean;
            shift: boolean;
            option: boolean;
            command: boolean;
            function: boolean;
            key: string;
            keyCode: number;
        }

        We then send the IKeyboardInput object to a Chooser that decides which handler
        should receive the event.

        We also need to keep track of keyboard input combinations, e.g., [CTRL-K, CTRL-D].

        */
        this.container.addEventListener("keydown", this.handleKeyDown);
    }
    createEmptyBlock() {
        const linebreak = this.createLineBreakCell();
        this.container.innerHTML = "";
        this.cells = [linebreak];
        const frag = document.createDocumentFragment();
        this.cells.forEach(c => frag.append(c.element as HTMLElement));
        this.container.appendChild(frag);
    }
    getKeyCode(name: string) {
        const code = KEYS.ENTER.find(x => x.platform == Platform.Windows)?.code as number;
        return code;
    }
    createLineBreakCell() {
        const code = this.getKeyCode("ENTER");
        const EOL = String.fromCharCode(code);
        const cell = new Cell({ text: EOL });
        cell.element?.classList.add("line-break");
        return cell;
    }
    appendCellsToDOM(cells: Cell[]) {
        window.requestAnimationFrame(() => {

        });
    }
    addToInputBuffer(key: IKeyboardInput) {
        if (this.inputBuffer.length <= 1) {
            this.inputBuffer.push(key);
            return;
        }
        this.inputBuffer.splice(0, 1);
        this.addToInputBuffer(key);
    }
    handleKeyDown(e: KeyboardEvent) {
        const input = this.toKeyboardInput(e);
        /**
         * Dispatch to a binding if there is a match.
         * 
         * For now, assume no bindings and ignore text selection.
         */
        e.preventDefault();
        this.insertCharacter(input);
    }
    getCellFromAnchorNode(node: SpeedyNode) {
        let current = node;
        while (current) {
            let speedy = current.speedy;
            if (speedy) {
                if (speedy.role == ELEMENT_ROLE.CELL) {
                    let cell = this.getCellFromNode(current as any);
                    return cell;
                }
            }
            current = current.parentElement as any;
        }
        return undefined;
    }
    getCellFromNode(node: HTMLSpanElement) {
        return this.cells.find(x => x.element == node);
    }
    getBlockPosition(left: Cell, right: Cell) {
        if (right.isLineBreak) {
            if (left == null) return BLOCK_POSITION.EmptyLine;
            return BLOCK_POSITION.End;
        }
        if (left == null) return BLOCK_POSITION.Start;
        return BLOCK_POSITION.Inside;
    }
    getCaret() {
        const sel = window.getSelection() as Selection;
        const { anchorNode } = sel;
        const anchor = this.getCellFromAnchorNode(anchorNode as SpeedyNode);
        if (!anchor) return { left: null, right: null, blockPosition: null };
        const offset = sel.anchorOffset;
        const toTheLeft = offset == 0;
        const left = (toTheLeft ? anchor.previous : anchor) as Cell;
        const right = (toTheLeft ? anchor : anchor.next) as Cell;
        const blockPosition = this.getBlockPosition(left, right);
        return { left, right, blockPosition };
    }
    insertCharacter(input: IKeyboardInput) {
        const caret = this.getCaret();
    }
    setCaretByIndex(index: number) {
        const cell = this.cells[index];
        this.setCarotByNode({ node: cell, offset: CARET.LEFT });
    }
    toKeyboardInput(e: KeyboardEvent): IKeyboardInput {
        const input: IKeyboardInput = {
            shift: e.shiftKey,
            control: e.ctrlKey,
            command: e.metaKey,
            option: e.altKey,
            key: e.key,
            keyCode: parseInt(e.code)
        };
        return input;
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
        const self = this;
        const cells = this.toCells(block.text);
        this.properties = block.properties.map(p => {
            const start = cells[p.startIndex];
            const end = cells[p.endIndex];
            const sproc = new StandoffProperty({ type: p.type, block: self, start, end });
            let schema = this.schemas.find(x => x.type == p.type);
            sproc.block = self;
            sproc.schema = schema;
            sproc.type = p.type;
            sproc.value = p.value as string;
            return sproc;
        });
        const frag = document.createDocumentFragment();
        cells.forEach(c => frag.append(c.element as HTMLElement));
        requestAnimationFrame(() => {
            this.container.innerHTML = "";
            this.container.appendChild(frag);
        });
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
        this.chainCellsTogether(cells);
        return cells;
    }
    markCells() {
        this.cells.forEach((cell, index) => cell.index = index);
    }
    insertCharacterBeforeIndex(char: string, index: number) {
        // TBC
    }
    insertCharacterAfterIndex(char: string, index: number) {
        const previous = this.cells[index];
        const next = this.cells[index+1];
        var cell = new Cell({ text: char, previous, next });
        previous.next = cell;
        cell.previous = previous;
        cell.next = next;
        next.previous = cell;
        return cell;
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
    setCarotByNode(args: { node: Cell, offset?: CARET }) {
        /**
         * Might want to investigate setting the caret by absolutely positioning an SVG ...
         */
        const { node } = args;
        if (!node) {
            return;
        }
        const selection = document.getSelection() as Selection;
        const range = document.createRange();
        const offset = (args.offset != null) ? args.offset : CARET.RIGHT;
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
        const prop = new StandoffProperty({ type, block: this, ...range });
        prop.type = type;
        this.properties.push(prop);
    }
    syncPropertyEndToText() {

    }
    unsynchPropertyEndToText() {

    }
}

const logs: { msg: string, data: Record<string,any>}[] = [];
const log = (msg: string, data: Record<string,any>) => {
    logs.push({ msg, data });
    console.log(msg, data);
}

function uuidv4(): string {
    throw new Error("Function not implemented.");
}

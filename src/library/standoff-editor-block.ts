import _ from "underscore";
import { KEYS, Platform, TPlatformKey } from "./keyboard";
import { v4 as uuidv4 } from 'uuid';
import { updateElement, wrapRange } from "./svg";
import { AbstractBlock, BlockProperty, BlockPropertyDto, Commit, GUID, IAbstractBlockConstructor, IBlockDto, IBlockPropertySchema, IKeyboardInput, InputAction, InputEventSource, ModeTrigger, InputEvent, BlockType,IBindingHandlerArgs, IBlockRelation} from "./abstract-block";
import { Caret, Cell, CellHtmlElement, CellNode, ICoordOffsets, Row } from "./cell";
import { IPlugin } from "./plugins/clock";

export enum CARET {
    LEFT = 0,
    RIGHT = 1
}
export class Word {
    start: number;
    end: number;
    text: string;
    previous?: Word;
    next?: Word
    constructor(start: number, end: number, text: string) {
        this.start = start;
        this.end = end;
        this.text = text;
    }
}
export type StandoffPropertyDto = {
    id?: GUID,
    blockGuid?: GUID,
    start: number,
    end: number,
    type: string,
    value?: string
}

export type StandoffEditorBlockDto = {
    id?: GUID
    text: string
    standoffProperties: StandoffPropertyDto[]
    blockProperties?: BlockPropertyDto[]
}
export enum RowPosition {
    Previous,
    Next
}
export enum ELEMENT_ROLE {
    CELL = 0,
    INNER_STYLE_BLOCK = 1,
    ROOT = 2,
    CELL_STYLE = 3,
    TEXT_BLOCK = 4,
    OUTER_STYLE_BLOCK = 5
}
export enum DIRECTION {
    LEFT = 0,
    RIGHT = 1
}

export interface IStandoffPropertyConstructor {
    id?: GUID;
    type: string,
    start: Cell,
    end: Cell,
    block: StandoffEditorBlock,
    schema: IStandoffPropertySchema
}
export interface IRange {
    start: Cell;
    end: Cell;
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
    name?: string;
    description?: string;
    event: any;
    decorate?: {
        cssClass?: string;
        batchRender?: (args: { block: StandoffEditorBlock, properties: StandoffProperty[] }) => void;
    },
    wrap?: {
        cssClass?: string;
    },
    render?: {
        update: (args: { block: StandoffEditorBlock, properties: StandoffProperty[] }) => void;
        destroy: (args: { block: StandoffEditorBlock, properties: StandoffProperty[] }) => void;
    },
    animation?: {
        init?: (args: { block: StandoffEditorBlock, properties: StandoffProperty[] }) => void;
    }
}
function groupBy<T extends object> (list: T[], keyGetter: (item: T) => any){
    const map = new Map();
    list.forEach((item) => {
        const key = keyGetter(item);
        const collection = map.get(key);
        if (!collection) {
            map.set(key, [item]);
        } else {
            collection.push(item);
        }
    });
    return map;
};


export class StandoffProperty {
    id: GUID;
    type: string;
    start: Cell;
    end: Cell;
    isDeleted: boolean;
    cache: Record<string, any>;
    value: string;
    metadata: Record<string, any>;
    plugin?: IPlugin;
    schema: IStandoffPropertySchema;
    block: StandoffEditorBlock; 
    bracket: { left?: HTMLElement; right?: HTMLElement };
    constructor({ type, start, end, block, id, schema }: IStandoffPropertyConstructor) {
        this.id = id || uuidv4();
        this.isDeleted = false;
        this.type = type;
        this.start = start;
        this.end = end;
        this.schema = schema;
        this.metadata = {};
        this.value = "";
        this.block = block;
        this.cache = {};
        this.bracket = {
            left: undefined,
            right: undefined
        };
        this.onInit();
    }
    onInit() {
        if (this.schema?.event?.onInit) {
            this.schema?.event?.onInit(this);
        }
    }
    onDestroy() {
        if (this.schema?.event?.onDestroy) {
            this.schema?.event?.onDestroy(this);
        }
    }
    destroy() {
        this.isDeleted = true;
        this.onDestroy();
        if (this.schema.decorate?.cssClass) {
            this.detachCssClass(this.schema.decorate?.cssClass);
        }
    }
    hasOffsetChanged() {
        let spoff = this.start.cache.previousOffset;
        let soff = this.start.cache.offset;
        if (!soff || !spoff) {
            return true;
        }
        let startSame = spoff.x == soff.x && spoff.y == soff.y;
        if (!startSame) {
            return true;
        }
        let epoff = this.end.cache.previousOffset;
        let eoff = this.end.cache.offset;
        if (!epoff || !eoff) {
            return true;
        }
        let endSame = epoff.x == eoff.x && epoff.y == eoff.y;
        if (!endSame) {
            return true;
        }
        return false;
    }
    scrollTo() {
        this.start.element?.scrollIntoView();
    }
    applyStyling() {
        if (this.schema?.decorate?.cssClass) {
            this.applyCssClass(this.schema.decorate.cssClass);
        }
        if (this.schema?.wrap?.cssClass) {
            const wrapper = wrapRange(this);
            wrapper.classList.add(this.schema?.wrap?.cssClass);
        }
    }
    applyCssClass(className: string) {
        if (this.isDeleted) return;
        const cells = this.getCells();
        cells.forEach(x => x.element?.classList.add(className));
    }
    detachCssClass(className: string) {
        const cells = this.getCells();
        cells.forEach(x => x.element?.classList.remove(className));
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
    serialize() {
        return {
            id: this.id,
            type: this.type,
            start: this.start.index,
            end: this.end.index,
            value: this.value,
            metadata: this.metadata,
            plugin: this.plugin ? this.plugin.serialise() : null,
            isDeleted: this.isDeleted
        }
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
export interface IStandoffEditorBlockDto extends IBlockDto {
    text: string;
    standoffProperties?: StandoffPropertyDto[];
}

export interface ISelection extends IRange {
    direction: DIRECTION;
}

export interface IStandoffEditorBlockConstructor extends IAbstractBlockConstructor {
}

export class StandoffEditorBlock extends AbstractBlock {
    type: BlockType;
    cells: Cell[];
    rows: Row[];
    cache: {
        previousOffset: ICoordOffsets,
        offset: ICoordOffsets,
        caret: {
            x: number|null;
        },
        containerWidth: number;
    };
    standoffProperties: StandoffProperty[];
    /**
     * This will keep track of the last couple of key-combinations entered. The main purpose
     * is for triggering two-part bindings, such as 'CTRL-K, CTRL-D'.
     */
    inputBuffer: IKeyboardInput[];
    schemas: IStandoffPropertySchema[];
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
    metadata: Record<string, any>;
    /**
     * An Overlay is a named DIV container for storing generated elements - such as SVG underlines - which are meant
     * to be overlaid (like a layer) on top of the text underneath. An Overlay 'container' should be absolutely
     * positioned to be aligned to the top-left of the Block 'container' element, and generated elements inside the Overlay
     * 'container' should be absolutely positioned. Such generated elements will be drawn/undrawn when the StandoffProperty
     * is rendered, and when anything affects the alignment of cells in those properties, such as adding or removing text.
     */
    
    wrapper: HTMLDivElement;
    constructor(args: IStandoffEditorBlockConstructor) {
        super(args);
        this.type = BlockType.StandoffEditorBlock;
        this.relation = {};
        this.wrapper = document.createElement("DIV") as HTMLDivElement;
        updateElement(this.wrapper, {
            attribute: {
                contenteditable: "true"
            },
            style: {
                margin: "0 10px",
                //border: "1px solid #ccc",
                padding: "10px"
            }
        });
        
        this.container.appendChild(this.wrapper);
        this.blocks = [];
        this.cache = {
            previousOffset: {
                x: 0, y: 0, h: 0, w: 0
            },
            offset: {
                x: 0, y: 0, h: 0, w: 0
            },
            caret: {
                x: 0
            },
            containerWidth: 0
        };
        this.cells = [];
        this.rows = [];
        this.metadata = {};
        this.schemas = [];
        this.standoffProperties = [];
        this.selections = [];
        this.inputBuffer = [];
        this.attachBindings();
    }
    addMode(mode: string) {
        this.modes.push(mode);
    }
    getMapOfActiveInputEvents() {
        /**
         * Events should be grouped by modes. The modes at the top of the modes array are higher in priority.
         * If the same event trigger appears in the list more than once, the mode with the highest priority takes precedence
         * and the event is dispatched to THAT handler.
         */
        const map = new Map<ModeTrigger, InputAction>();
        for (let i = this.modes.length - 1; i >= 0; i--) {
            let mode = this.modes[i];
            const triggers = this.inputEvents.filter(x => x.mode == mode);
            triggers.forEach(x => {
                if (map.has(x as ModeTrigger)) return;
                map.set(x as ModeTrigger, x.action);
            });
        }
        const modeGroups = _.groupBy(this.inputEvents, x=> x.mode);
        
        return map;
    }
    removeMode(mode: string) {
        if (mode == "default") return;
        const index = this.modes.findIndex(x => x == mode);
        if (index < 0) return;
        this.modes.splice(index, 1);
    }
    setCommitHandler(handler: (commit: Commit) => void) {
        this.commitHandler = handler;
    }
    setEvents(events: InputEvent[]){
        this.inputEvents.push(...events);
        const actions = events.map(x => x.action);
        this.inputActions.push(...actions);
    }
    setSchemas(schemas: IStandoffPropertySchema[]) {
        this.schemas.push(...schemas);
    }
    getWordsFromText(text: string) {
        const re = new RegExp(/\b[^\s]+\b/, "g");
        const words: Word[] = [];
        let match;
        while ((match = re.exec(text)) != null) {
            let span = match[0];
            words.push({ start: match.index, end: match.index + span.length - 1, text: span });
        }
        const lastIndex = words.length-1;
        for (let i = 0; i <= lastIndex; i++) {
            let word = words[i];
            if (lastIndex == 1) {
                continue;
            }
            if (i > 0) {
                word.previous = words[i-1];
            }
            if (i < lastIndex) {
                word.next = words[i + 1];
            }
            words.push(word);
        }
        return words;
    }
    getSentencesFromText(text: string) {
        const re = new RegExp(/[^.?!\r]+[.!?\r]+[\])'"`’”]*|.+/, "g");
        const results = [];
        let  match;
        while ((match = re.exec(text)) != null) {
            let span = match[0];
            results.push({ start: match.index, end: match.index + span.length - 1, text: span });
        }
        return results;
    }
    getLastCell() {
        const len = this.cells.length;
        return this.cells[len-1];
    }
    private attachBindings() {
        /*
        We also need to keep track of keyboard input combinations, e.g., [CTRL-K, CTRL-D].
        */
        this.wrapper.addEventListener("keydown", this.handleKeyDown.bind(this));
        this.wrapper.addEventListener("mouseup", this.handleMouseUpEvent.bind(this));
        this.wrapper.addEventListener("click", this.handleClickEvent.bind(this));
    }
    handleClickEvent(e: MouseEvent) {
        const mouseEvents = this.inputEvents.filter(x => x.trigger.source == InputEventSource.Mouse);
        const found = mouseEvents.find(x => x.trigger.match == "click");
        if (found) {
            found.action.handler({
                block: this,
                caret: this.getCaret() as Caret
            });
        }
    }
    handleMouseUpEvent(e: MouseEvent) {
        const target = e.target as CellHtmlElement;
        // if (!target || target.speedy?.role != ELEMENT_ROLE.CELL) {
        //     return;
        // }
        // this.updateCurrentRanges(e.target);
        // var selection = this.getSelectionNodes();
        // if (selection) {
        //     selection.text = this.getRangeText(selection);
        //     this.mode.selection.start = selection.start;
        //     this.mode.selection.end = selection.end;
        //     if (this.event.mouse) {
        //         if (this.event.mouse.selection) {
        //             e.preventDefault();
        //             this.event.mouse.selection({ editor: this, e, selection });
        //         }
        //     }
        // } else {
        //     this.mode.selection.start = null;
        //     this.mode.selection.end = null;
        // }
        const caret = this.getCaret() as Caret;
        console.log("handleMouseUpEvent", { caret, e })
        if (caret.left) {
            updateElement(caret.left.element as HTMLElement, { "background-color": "pink" });
        }
        if (caret.right) {
            updateElement(caret.right.element as HTMLElement, { "background-color": "green" });
        }
        // this.handleCaretMoveEvent(e, caret);
        // var props = this.getCurrentRanges(e.target);
        // if (props) {
        //     props.forEach(p => {
        //         try {
        //             if (p.schema.event && p.schema.event.property) {
        //                 var property = p.schema.event.property;
        //                 if (property.mouseUp) {
        //                     property.mouseUp(p);
        //                 }
        //             }
        //         } catch (ex) {
        //             log({ ex, p });
        //         }
        //     });
        // }
        // this.addCursorToHistory(e.target);
        this.commit({
            redo: {
                id: this.id,
                name: "set-cursor",
                value: { anchorIndex: caret.left?.index }
            }
        });
    }                         
    createEmptyBlock() {
        const linebreak = this.createLineBreakCell();
        this.wrapper.innerHTML = "";
        this.cells = [linebreak];
        const frag = document.createDocumentFragment();
        this.cells.forEach(c => frag.append(c.element as HTMLElement));
        this.wrapper.appendChild(frag);
    }
    createLineBreakCell() {
        const code = this.getKeyCode("ENTER");
        const EOL = String.fromCharCode(code);
        const cell = new Cell({ text: EOL, block: this });
        cell.element?.classList.add("line-break");
        return cell;
    }
    addToInputBuffer(key: IKeyboardInput) {
        if (this.inputBuffer.length <= 1) {
            this.inputBuffer.push(key);
            return;
        }
        this.inputBuffer.splice(0, 1);
        this.addToInputBuffer(key);
    }
    private handleKeyDown(e: KeyboardEvent) {
        e.preventDefault();
        const ALLOW = true, FORBID = false;
        const input = this.toKeyboardInput(e);
        const modifiers = ["Shift", "Alt", "Meta", "Control", "Option"];
        if (modifiers.some(x => x == input.key)) {
            return ALLOW;
        }
        const match = this.getFirstMatchingInputEvent(input);
        if (match) {
            const args = { block: this, caret: this.getCaret(), selection: this.getSelection() } as IBindingHandlerArgs;
            match.action.handler(args);
            return FORBID;
        }
        if (input.key.length == 1) {
            // Ignoring UNICODE code page implications for the moment.
            this.insertCharacterAtCaret(input);
        }
        return FORBID;
    }
    getCellFromNode(node: CellNode) {
        let current = node;
        while (current) {
            if (current.speedy?.role == ELEMENT_ROLE.CELL) {
                return this.cells.find(x => x.element == current);
            }
            current = current.parentElement as CellHtmlElement;
        }
        return undefined;
    }
    getBlockPosition(left: Cell, right: Cell) {
        if (right?.isEOL) {
            if (left == null) return BLOCK_POSITION.EmptyLine;
            return BLOCK_POSITION.End;
        }
        if (left == null) return BLOCK_POSITION.Start;
        return BLOCK_POSITION.Inside;
    }
    getCaret() {
        const len = this.cells.length;
        if (len == 1) {
            return { right: this.cells[0], blockPosition: BLOCK_POSITION.EmptyLine };
        }
        const sel = window.getSelection() as Selection;
        const { anchorNode } = sel;
        const anchor = this.getCellFromNode(anchorNode as CellNode);
        if (!anchor) return null;
        const offset = sel.anchorOffset;
        const toTheLeft = offset == 0;
        const left = (toTheLeft ? anchor.previous : anchor) as Cell;
        const right = (toTheLeft ? anchor : anchor.next) as Cell;
        const blockPosition = this.getBlockPosition(left, right);
        return { left, right, blockPosition } as Caret;
    }
    getEnclosingProperties(cell: Cell) {
        /**
         * Rename to: getEnclosingProperties
         */
        if (!cell) return [];
        const i = cell.index;
        const props = this.standoffProperties.filter(prop => {
            if (prop.isDeleted) return false;
            const si = prop.start.index;
            const ei = prop.end.index;
            return si <= i && i <= ei;
        });
        return props;
    }
    // clearSelectionMode(selection: ISelection) {
    //     selection.start = null;
    //     selection.end = null;
    //     selection.direction = null;
    // }
    clearSelection() {
        // ref: https://stackoverflow.com/questions/3169786/clear-text-selection-with-javascript
        const seletion = window.getSelection();
        if (seletion) {
            if (seletion.empty) {  // Chrome
                seletion.empty();
            } else if (seletion.removeAllRanges) {  // Firefox
                seletion.removeAllRanges();
            }
        }
        // else if (document.selection) {  // IE?
        //     document.selection.empty();
        // }
        //this.clearSelectionMode();
    }
    getSelection() {
        const range = window.getSelection()?.getRangeAt(0);
        if (range?.collapsed) return undefined;
        const start = this.getCellFromNode(range?.startContainer as CellNode);
        const end = this.getCellFromNode(range?.endContainer as CellNode);
        return { start, end } as IRange;
    }
    insertCharacterAtCaret(input: IKeyboardInput) {
        const caret = this.getCaret();
        if (!caret) return;
        const selection = this.getSelection();
        if (selection) {
            this.clearSelection();
            const len = (selection.end.index - selection.start.index) + 1;
            this.removeCellsAtIndex(selection.start.index, len);
        }
        this.insertTextAtIndex(input.key, caret.right.index);
    }
    addStandoffProperties(props: StandoffProperty[]) {
        
    }
    applyStylingAndRenderingToNewCells(anchor: Cell, cells: Cell[]) {
        const enclosing = this.getEnclosingProperties(anchor);
        cells.forEach(c => {
            enclosing.forEach(e => {
                if (!e?.schema?.decorate?.cssClass) return;
                c.element?.classList.add(e.schema.decorate.cssClass);
            });
        });
        this.renderProperties(enclosing);
    }
    renderProperties(props: StandoffProperty[]) {
        const propertiesGroupedByType = _.groupBy(props, x=> x.type);
        for (let typeName in propertiesGroupedByType) {
            const props = propertiesGroupedByType[typeName];
            let schema = this.schemas.find(x => x.type == typeName);
            if (schema?.render?.update) {
                schema.render?.update({ block: this, properties: props });
            }
        }
    }
    private getPlatformKey(codes: TPlatformKey[]) {
        return codes.find(x=> x.platform == Platform.Windows);
    }
    addEOL() {
        const charCode = this.getPlatformKey(KEYS.ENTER)!.code;
        if (this.cells.length > 0) {
            return;
        }
        const eol = new Cell({ text: String.fromCharCode(charCode), block: this });
        this.cells = [eol];
        eol.isEOL = true;
        this.reindexCells();
        this.wrapper.append(eol.element as HTMLSpanElement);
        this.updateView();
        this.setCaret(0, CARET.LEFT);
    }
    insertTextAtIndex(text: string, index: number): Cell[] {
        const len = this.cells.length;
        if (len == 0) {
            this.addEOL();
            return this.insertTextAtIndex(text, index);
        }
        const right = this.cells[index];
        const left = right.previous;
        const anchor = left || right;
        const cells = text.split('').map(c => new Cell({ text: c, block: this }));
        this.applyStylingAndRenderingToNewCells(anchor, cells);
        this.knitCells(left, cells, right);
        this.insertIntoCellArrayBefore(index, cells);
        this.reindexCells();
        this.insertElementsBefore(right.element as HTMLElement, cells.map(c => c.element as HTMLElement));
        this.updateView();
        if (index == len-1) {
            let caret = this.getCaret();
            console.log("insertTextAtIndex", { text, index, cells: this.cells, caret });
        }
        this.setCaret(index + 1);
        this.commit({
            redo: {
                id: this.id,
                name: "insertTextAtIndex",
                value: { text, index }
            },
            undo: {
                id: this.id,
                name: "removeCellsAtIndex",
                value: { index, length: text.length }
            }
        });
        return cells;
    }
    private insertElementsBefore(anchor: HTMLElement, elements: HTMLElement[]) {
        const frag = document.createDocumentFragment();
        frag.append(...elements);
        requestAnimationFrame(() => anchor.parentNode.insertBefore(frag, anchor));
    }
    private reindexCells() {
        this.cells.forEach((cell, index) => cell.index = index);
    }
    private insertIntoCellArrayBefore(index: number, cells: Cell[]) {
        this.cells.splice(index, 0, ...cells);
        this.reindexCells();
    }
    private knitCells(left: Cell|undefined, middle: Cell[], right: Cell) {
        const len = middle.length;
        if (len == 0) return;
        for (let i = 0; i < len; i++) {
            let current = middle[i];
            let previous = (i > 0) ? middle[i-1] : left;
            let next = (i < len - 1) ? middle[i+1] : right;
            if (previous) {
                previous.next = current;
                current.previous = previous;
            }
            current.next = next;
            next.previous = current;
        }
    }
    unbind() {
        this.cells = [];
        this.standoffProperties = [];
        this.blockProperties = [];
        this.wrapper.innerHTML = "";
    }
    serialize() {
        const relation: Record<string,any> = {

        };
        if (this.relation.leftMargin) {
            relation.leftMargin = this.relation.leftMargin.serialize();
        }
        if (this.relation.rightMargin) {
            relation.rightMargin = this.relation.rightMargin.serialize();
        }
        return {
            id: this.id,
            type: this.type,
            text: this.getText(),
            standoffProperties: this.standoffProperties?.map(x => x.serialize()) || [],
            blockProperties: this.blockProperties?.map(x => x.serialize()) || [],
            children: this.blocks?.map(x => x.serialize()) || [],
            metadata: this.metadata,
            relation: relation
        } as IStandoffEditorBlockDto;
    }
    getText() {
        return this.cells.map(c => c.text).join("");
    }
    applyStandoffPropertyStyling() {
        this.standoffProperties.forEach(p => {
            p.applyStyling();
        });
    }
    deserialize(json: any) {
        this.bind(json as IStandoffEditorBlockDto);
        return this;
    }
    bind(block: IStandoffEditorBlockDto) {
        const self = this;
        if (this.wrapper) this.wrapper.innerHTML = "";
        const cells = this.toCells(block.text);
        if (block.standoffProperties) {
            this.standoffProperties = block.standoffProperties.map(p => {
                const start = cells[p.start];
                const end = cells[p.end];
                const schema = this.schemas.find(x => x.type == p.type) as IStandoffPropertySchema;
                if (!schema) {
                    console.log("Schema not found for the standoff property type.", { p });
                    // Need to handle this properly ... can't just return early in a map().
                }
                const sproc = new StandoffProperty({ type: p.type, block: self, start, end, schema });
                sproc.value = p.value as string;
                return sproc;
            });
        }
        // const types = _.uniq(this.standoffProperties.filter(x => x.schema.animation));
        // types.forEach(t => {
        //     const schema = t.schema;
        //     const props = self.standoffProperties.filter(x => x.type == t.type);
        //     if (schema.animation && schema.animation.init) {
        //         schema.animation.init({ block: self, properties: props });
        //     }
        // });
        this.blockProperties = block.blockProperties?.map(p => {
            const schema = this.blockSchemas.find(x => x.type == p.type) as IBlockPropertySchema;
            if (!schema) {
                console.log("Schema not found for the standoff property type.", { p });
                // Need to handle this properly ... can't just return early in a map().
            }
            const prop = new BlockProperty({ type: p.type, block: self, schema, value: p.value });
            return prop;
        }) as BlockProperty[];
        this.applyBlockPropertyStyling();
        this.applyStandoffPropertyStyling();
        const frag = document.createDocumentFragment();
        cells.forEach(c => frag.append(c.element as HTMLElement));
        /**
         * May want to check for a line-break character here?
         */
        this.cells = cells;
        this.reindexCells();
        this.wrapper.innerHTML = "";
        this.wrapper.appendChild(frag);
        this.updateView();
        this.commit({
            redo: {
                id: this.id,
                name: "bind",
                value: { block }
            },
            undo: {
                id: this.id,
                name: "unbind"
            }
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
    private toCells(text: string) {
        if (!text) return [] as Cell[];
        const len = text.length;
        const cells: Cell[] = [];
        for (let i = 0; i < len; i ++) {
            let cell = new Cell({ text: text[i], block: this });
            cells.push(cell);
        }
        const lastCode = text.charCodeAt(len-1);
        if (lastCode != 13) {
            const eol = new Cell({ text: String.fromCharCode(13), block: this });
            eol.isEOL = true;
            cells.push(eol);
        }
        this.chainCellsTogether(cells);
        return cells;
    }
    getCellBelow(cell: Cell) {
        const x = cell.cache.offset.x;
        const rLen = this.rows.length;
        const cri = cell.row?.index as number;
        if (cri < rLen - 1) {
            const row = this.rows[cri + 1]; 
            return row.findNearestCell(x);
        }
        return null;
    }
    setCaret(index: number, offset?: CARET) {
        /**
         * Might want to investigate setting the caret by absolutely positioning an SVG ...
         */
        console.log("setCaret", { index, offset });
        offset = offset || CARET.LEFT;
        const cell = this.cells[index];
        const textNode = cell.getTextNode();
        const selection = document.getSelection() as Selection;
        const range = document.createRange();
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
        this.commit({
            redo: {
                id: this.id,
                name: "setCaret",
                value: { index, offset }
            }
        });
    }
    private shiftPropertyBoundaries(cell: Cell) {
        this.shiftPropertyStartNodesRight(cell);
        this.shiftPropertyEndNodesLeft(cell);
    }
    private shiftPropertyEndNodesLeft(cell: Cell) {
        const previousCell = cell.previous;
        const properties = this.standoffProperties;
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
    private shiftPropertyStartNodesRight(cell: Cell) {
        const nextCell = cell.next;
        const properties = this.standoffProperties.filter(p => !p.isDeleted);
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
    private unknit(cell: Cell) {
        const left = cell.previous;
        const right = cell.next as Cell;
        if (left) left.next = right;
        right.previous = left;
    }
    updateView() {
        const block = this;
        requestAnimationFrame(() => {
            block.calculateCellOffsets();
            block.cache.caret.x = null;
            block.updateRenderers();
            block.calculateRows();
        });
    }
    updateRenderers() {
        const block = this;
        const toUpdate = this.standoffProperties
            .filter(p => !p.isDeleted && p.schema?.render?.update && p.hasOffsetChanged())
            ;
        this.batch(toUpdate, (schema, props) => schema.render?.update({ block, properties: props }));
        const toDelete = this.standoffProperties
            .filter(p => p.isDeleted && p.schema?.render?.destroy)
            ;
        this.batch(toDelete, (schema, props) => schema.render?.destroy({ block, properties: props }));
        //console.log("updateRenderers", { block, toUpdate, toDelete })
    }
    batch(properties: StandoffProperty[], action: (schema: IStandoffPropertySchema, props: StandoffProperty[]) => void) {
        const block = this;
        const groups = _.groupBy(properties, p => p.type);
        for (let key in groups) {
            const typeName = key;
            const props = groups[typeName];
            const schema = block.schemas.find(x => x.type == typeName);
            if (!schema) continue;
            action(schema, props);
        }
    }
    calculateCellOffsets() {
        const block = this;
        const container = this.container;
        const offset = this.cache.offset;
        this.cache.previousOffset = { ...offset };
        this.cache.offset = {
            y: container.offsetTop,
            x: container.offsetLeft,
            w: container.offsetWidth,
            h: container.offsetHeight
        };
        this.cells.forEach(cell => {
            const offset = cell.cache.offset;
            const cy = block.cache.offset.y;
            if (offset) {
                cell.cache.previousOffset = {
                    ...offset
                };
            }
            const span = cell.element as HTMLElement;
            if (!span) return;
            const top = span.offsetTop || 0;
            cell.cache.offset = {
                y: top,
                cy: cy + top,
                x: span.offsetLeft,
                w: span.offsetWidth,
                h: span.offsetHeight
            };
        });
    }
    destroy() {
        this.cells = [];
        this.standoffProperties = [];
        this.blockProperties = [];
        this.inputBuffer = [];
        this.schemas =[];
        this.blockSchemas = [];
        this.overlays = [];
        if (this.container) this.container.remove();
    }
    removeCellsAtIndex(index: number, length: number, updateCaret?: boolean) {
        for (let i = 1; i <= length; i++) {
            this.removeCellAtIndex(index, updateCaret);
        }
    }
    calculateRows() {
        const rows = this.getRows();
        const len = rows.length;
        this.rows = [];
        for (let i = 0; i < len; i++) {
            let group = rows[i];
            const cells = group[1] as Cell[];
            let row = new Row({ index: i, cells: cells });
            cells.forEach(c => c.row = row);
            this.rows.push(row);
        }
        for (let i = 0 ; i < len; i++) {
            let row = this.rows[i];
            if (i > 0) {
                row.previous = this.rows[i - 1];
            }
            if (0 < i && i < len - 1) {
                row.next = this.rows[i + 1];
            }
        }
    }
    getRows() {
        const cells = this.cells;
        const rowGroups = Array.from(groupBy(cells, x => x.cache.offset.y));
        const rows = rowGroups.sort((a, b) => a[0] > b[0] ? 1 : a[0] < b[0] ? -1 : 0);
        return rows;
    }
    getClosestRowOfCellsByOffset(args: any) {
        const { x, y, verticalOffset } = args;
        const nextRowOffsetY = y + verticalOffset;
        if (nextRowOffsetY < 0) {
            return [];
        }
        const nextCells = this.cells
            .filter(x => verticalOffset > 0 ? x.cache.offset.cy >= nextRowOffsetY : x.cache.offset.cy <= nextRowOffsetY);
        if (nextCells.length == 0) {
            return [];
        }
        const rows = Array.from(groupBy(nextCells, x => x.cache.offset.cy));
        const ordered = rows.sort((a, b) => a[0] > b[0] ? 1 : a[0] < b[0] ? -1 : 0);
        const group = verticalOffset > 0 ? ordered[0] : ordered[ordered.length - 1];
        return group[1] as Cell[];
    }
    getCellClosestByOffsetX(args: any) {
        const { x, cells } = args;
        const leftMatches = cells.filter((c:Cell) => c.cache.offset.x < x);
        const rightMatches = cells.filter((c:Cell) => c.cache.offset.x >= x);
        if (leftMatches.length) {
            return leftMatches[leftMatches.length - 1];
        }
        if (rightMatches.length) {
            return rightMatches[0];
        }
        return null;
    }
    getCellInRow(anchor: Cell, row: RowPosition) {
        const offset = anchor.cache.offset;
        const lineHeight = offset.h || 14;
        const x = this.cache.caret.x || offset.x;
        const y = offset.cy;
        const verticalOffset = row == RowPosition.Previous ? -Math.abs(lineHeight) : lineHeight;
        const cells = this.getClosestRowOfCellsByOffset({ x, y, verticalOffset });
        if (cells.length == 0 ){
            return null;
        }
        const leftMatches = cells.filter(c => c.cache.offset.x < x) as Cell[];
        const lenL = leftMatches.length;
        if (lenL) {
            if (lenL == 2) {
                return { cell: leftMatches[lenL - 2], caret: CARET.RIGHT };
            } else {
                return { cell: leftMatches[lenL - 1], caret: CARET.LEFT };
            }
        }
        const rightMatches = cells.filter(c => c.cache.offset.x >= x) as Cell[];
        const lenR = rightMatches.length;
        if (lenR) {
            return { cell:rightMatches[0], caret: CARET.LEFT};
        }
        return null;
    }
    setCarotByOffsetX(args: any) {
        const { x, verticalPosition } = args;
        const rows = this.getRows();
        const len = rows.length;
        const rowCells = (verticalPosition == "TOP") ? rows[0] : rows[len - 1];
        const closestCell = this.getCellClosestByOffsetX({ x, cells: rowCells[1] }) as Cell;
        if (closestCell) {
            this.setCaret(closestCell.index, CARET.LEFT);
        }
    }
    removeCellAtIndex(index: number, updateCaret?: boolean) {
        const cell = this.cells[index];
        if (!cell) {
            console.log("Cell not found at the index.", { index, updateCaret });
            return;
        }
        const text = cell.text;
        updateCaret = !!updateCaret;
        if (cell.isEOL) {
            /**
             * Shouldn't be here.
             */
            return;
        }
        this.unknit(cell);
        this.shiftPropertyBoundaries(cell);
        cell.removeElement();
        this.cells.splice(index, 1);
        this.reindexCells();
        // const enclosing = this.getEnclosingProperties(cell);
        // this.renderProperties(enclosing);
        this.updateView();
        if (updateCaret) {
            this.setCaret(index);
        }
        this.commit({
            redo: {
                id: this.id,
                name: "removeCellAtIndex",
                value: { index, updateCaret }
            },
            undo: {
                id: this.id,
                name: "insertTextAtIndex",
                value: { text, index }
            }
        });
    }
    getCells(range: IRange) {
        const cells: Cell[] = [];
        let cell = range.start;
        while (cell) {
            cells.push(cell);
            if (cell.next && !cell.isEOL) {
                cell = cell.next;
            }
            break;
        }
        return cells;
    }
    styleProperty(p: StandoffProperty) {
        p.applyStyling();
    }
    getTextNode(cell: Cell): ChildNode {
        // Get the first TEXT NODE of the element
        var node = cell.element?.firstChild as ChildNode;
        if (!node) {
            return cell.element as ChildNode;
        }
        while (node?.nodeType != 3) {
            node = node?.firstChild as ChildNode;
        }
        return node;
    }
    setSelection(_range: IRange) {
        var selection = document.getSelection() as Selection;
        var range = document.createRange();
        range.setStart(this.getTextNode(_range.start), 1);
        range.setEnd(this.getTextNode(_range.end), 1)
        if (selection.setBaseAndExtent) {
            var startOffset = 0;    // range.startOffset;
            var endOffset = 1;      // range.endOfAfset;
            selection.setBaseAndExtent(range.startContainer, startOffset, range.endContainer, endOffset);
        } else {
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }
    createStandoffProperty(type: string, range: IRange) {
        const schema = this.schemas.find(x => x.type == type) as IStandoffPropertySchema;
        if (!schema) {
            return log(`StandoffProperty schema '${type}' was not found.`, { block: this, type, range });
        }
        const prop = new StandoffProperty({ type, block: this, ...range, schema });
        prop.schema = schema;
        prop.applyStyling();
        this.standoffProperties.push(prop);
        if (schema.render?.update) {
            schema.render?.update({ block: this, properties: [prop] });
        }
        return prop;
    }
    createBlockProperty(type: string) {
        const schema = this.blockSchemas.find(x => x.type == type) as IBlockPropertySchema;
        if (!schema) {
            log(`BlockProperty schema '${type}' was not found.`, { block: this, type });
            return undefined;
        }
        const prop = new BlockProperty({ type, block: this, schema });
        this.blockProperties.push(prop);
        prop.applyStyling();
        return prop;
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

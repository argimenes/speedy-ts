import { KEYS, Platform, TPlatformKey } from "./keyboard";
import { InputEventSource, InputEvent, BlockType, CARET, GUID, IBindingHandlerArgs, IBlock, IBlockManager, IBlockRelation, IRange, IStandoffPropertySchema, Mode, SELECTION_DIRECTION, StandoffEditorBlock, StandoffEditorBlockDto, StandoffProperty, Commit, Cell, BlockProperty, Command, CellHtmlElement } from "./standoff-editor-block";
import { createUnderline, updateElement } from "./svg";
import { v4 as uuidv4 } from 'uuid';

export enum CssClass {
    LineBreak = "codex__line-break"
}

const RelationType = {
    "has_next":"has_next",
    "has_previous":"has_previous",
    "has_parent":"has_parent",
    "has_first_child":"has_first_child",
    "has_left_margin": "has_left_margin",
    "has_margin_parent": "has_margin_parent",
}
export interface IBlockManagerConstructor {
    id?: GUID;
    container?: HTMLDivElement;
}
export interface IBlockRange {
    start: IBlock;
    end: IBlock;
}
export interface IBlockSelection extends IBlockRange {
    direction: SELECTION_DIRECTION;
}

export class GridBlock implements IBlock {
    id: GUID;
    type: BlockType;
    relations: Record<string, IBlockRelation>;
    container: HTMLDivElement;
    metadata: Record<string, any>;
    grid: IBlock[][];
    constructor(args: { id?: GUID, container?: HTMLDivElement }) {
        this.id = args?.id || uuidv4();
        this.type = BlockType.PDF;
        this.relations = {};
        this.container = args?.container || document.createElement("DIV") as HTMLDivElement;
        this.metadata = {};
        this.grid = [];
    }
    serialize() {
        // TBC
        return {
            id: this.id,
            type: this.type,
            metadata: this.metadata
        };
    }
    addKeyboardBindings() {

    }
    getSchemas() {

    }
    getModes() {
        const self = this;
        const modes: Mode[] = [];
        modes.push({
            "default": {
                keyboard: [
                    {
                        "TAB": (args: IBindingHandlerArgs) => {

                        }
                    }
                ],
                mouse: [

                ]
            }
        });
        return modes;
    }
    setFocus() {
        // Find the first block container and focus on that.
    }
    removeRelation(name: string) {
        
    }
    addRelation(name: string, targetId: string){
        
    }
}

enum PointerDirection {
    Undo,
    Redo
}
export class BlockManager implements IBlockManager {
    id: string;
    type: BlockType;
    container: HTMLDivElement;
    relations: Record<string, IBlockRelation>;
    blocks: IBlock[];
    metadata: Record<string,any>;
    focus?: IBlock;
    selections: IBlockSelection[];
    commits: Commit[];
    pointer: number;
    direction: PointerDirection;
    constructor(props?: IBlockManagerConstructor) {
        this.id = props?.id || uuidv4();
        this.type = BlockType.Outliner;
        this.container = props?.container || document.createElement("DIV") as HTMLDivElement;
        this.relations = {};
        this.blocks = [this];
        this.metadata = {};
        this.selections = [];
        this.commits = [];
        this.pointer = 0;
        this.direction = PointerDirection.Undo;
    }
    redo() {
        this.direction = PointerDirection.Redo;
        this.executeCommandAtPointer();
        this.pointer++;
    }
    undo() {
        this.direction = PointerDirection.Undo;
        this.executeCommandAtPointer();
        this.pointer--;
    }
    executeCommandAtPointer() {
        const commit = this.commits[this.pointer];
        const cmd = this.direction == PointerDirection.Undo ? commit.reverse : commit.command;
        if (!cmd) return;
        this.executeCommand(cmd as Command);
    }
    executeCommand(command: Command) {
        const value = command.value as any;
        switch (command.name) {
            case "bind": {
                let block = this.getBlock(command.id) as StandoffEditorBlock;
                block.bind(value);
                return;
            }
            case "unbind": {
                let block = this.getBlock(command.id) as StandoffEditorBlock;
                block.unbind();
                return;
            }
            case "insertTextAtIndex": {
                let block = this.getBlock(command.id) as StandoffEditorBlock;
                block.insertTextAtIndex(value.text, value.index);
                return;
            }
            case "setCaret": {
                let block = this.getBlock(command.id) as StandoffEditorBlock;
                block.setCaret(value.index, value.offset);
                return;
            }
            case "removeCellAtIndex": {
                let block = this.getBlock(command.id) as StandoffEditorBlock;
                block.removeCellAtIndex(value.index, value.updateCaret);
                return;
            }
            case "removeCellsAtIndex": {
                let block = this.getBlock(command.id) as StandoffEditorBlock;
                block.removeCellsAtIndex(value.index, value.length, value.updateCaret);
                return;
            }
            case "createBlock": {
                let block = this.getBlock(command.id) as BlockManager;
                block.createBlock();
                return;
            }
            case "uncreateBlock": {
                let block = this.getBlock(command.id) as BlockManager;
                block.uncreateBlock(value.id);
                return;
            }
            default: {
                console.log("Command not handled.", { command });
                break;
            }
        }
    }
    addRelation(name: string) {

    }
    removeRelation(name: string) {

    }
    setFocus() {

    }
    setBlockFocus(block: IBlock) {
        this.focus = block;
        block.setFocus();
    }
    getBlockSchemas() {
        return [
            {
                type: "block/marginalia/left",
                name: "Left margin block",
                description: "Handles the alignment of a left margin block to the one to its right.",
                decorate: {
                    blockClass: "block_marginalia_left"
                }
            },
            {
                type: "block/alignment/right",
                name: "Right Alignment",
                description: "Align text in the block to the right.",
                decorate: {
                    blockClass: "block_alignment_right"
                }
            },
            {
                type: "block/alignment/centre",
                name: "Centre Alignment",
                description: "Align text in the block to the middle.",
                decorate: {
                    blockClass: "block_alignment_centre"
                }
            },
            {
                type: "block/alignment/left",
                name: "Left Alignment",
                description: "Align text in the block to the left",
                decorate: {
                    blockClass: "block_alignment_left"
                }
            },
            {
                type: "block/alignment/justify",
                name: "Justified Alignment",
                description: "Justifies the alignment of the text.",
                decorate: {
                    blockClass: "block_alignment_justify"
                }
            },
            {
                type: "block/animation/sine-wave",
                name: "Sine Wave",
                description: "Animates the paragraph as a text sine wave.",
                animation: {
                    init: (p: BlockProperty) => {
                        const manager = p.block.owner as BlockManager;
                        manager.animateSineWave(p);
                    }
                }
            }
        ]
    }
    animateSineWave(p: BlockProperty) {
        let pos = 0;
        let startTime = 0;
        let previousTime = 0;
        let pausedTime = 0;
        let paused = false;
        const width = p.block.cache.offset.w;
        const height = p.block.cache.offset.h;
        const centerY = height / 2;
        const amplitude = height * 0.1;
        const speed = 150;
        const degrees = 45;
        const cells = p.block.cells;
        const text = cells.map(c => {
            let w = c.cache.offset.w;
            const data = {
                cell: c, width: w, position: pos
            };
            pos += w;
            return data;
        });
        const scrollText = (dt: number) => {
            text.forEach((charObj) => {
              charObj.position += dt * speed;
          
              if (charObj.position > width) {
                charObj.position = -charObj.width;
              }
          
              const y = Math.sin(charObj.position / degrees) * amplitude;
              updateElement(charObj.cell.element as HTMLSpanElement, {
                style: {
                    position: "absolute",
                    x: charObj.position + "px",
                    y: (centerY + y) + "px"
                }
              });
            }); 
          };
        const getTime = () => {
            return paused 
                 ? pausedTime 
                 : Date.now() - startTime;
          };
        const animate = () => {
            const now = getTime();
            const dt = (now - previousTime) * 0.001 // delta time in seconds.
            previousTime = now;
            scrollText(dt);
            if (!paused) {
                requestAnimationFrame(animate);
            }
        };
        animate();
    }
    getEditorEvents() {
        const events: InputEvent[] = [
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "ESC"
                },
                action: {
                    name: "Create a left margin block.",
                    description: `
                        Let's describe how this works ...
                    `,
                    handler: (args: IBindingHandlerArgs) => {
                        const { caret } = args;
                        const block = args.block as StandoffEditorBlock;
                        const manager = block.owner as BlockManager;
                        const leftMarginEdge = block.getRelation(RelationType.has_left_margin);
                        if (!leftMarginEdge) {
                            const leftMargin = manager.createBlock();
                            leftMargin.addRelation(RelationType.has_margin_parent, block.id);
                            block.addRelation(RelationType.has_left_margin, leftMargin.id);
                            manager.blocks.push(leftMargin);
                            block.container.parentElement?.appendChild(leftMargin.container);
                            leftMargin.container.classList.add("block-window");
                            leftMargin.addBlockProperties([
                                { type: "block/marginalia/left" },
                                { type: "block/alignment/left" },
                            ]);
                            leftMargin.applyBlockPropertyStyling();
                            const charCode = manager.getPlatformKey(KEYS.ENTER)!.code;
                            leftMargin.insertTextAtIndex(String.fromCharCode(charCode), 0);
                            leftMargin.setCaret(0, CARET.LEFT);
                            leftMargin.setFocus();
                            
                        } else {
                            const leftMargin = manager.getBlock(leftMarginEdge.targetId) as StandoffEditorBlock;
                            if (!leftMargin) return;
                            leftMargin.setCaret(0, CARET.LEFT);
                            leftMargin.setFocus();
                        }
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "ENTER"
                },
                action: {
                    name: "Move cursor to the start of the next text block. If one doesn't exist, create it.",
                    description: `
                        
                    `,
                    handler: (args: IBindingHandlerArgs) => {
                        const { caret } = args;
                        const block = args.block as StandoffEditorBlock;
                        const manager = block.owner as BlockManager;
                        const nextEdge = block.getRelation(RelationType.has_next);
                        if (!nextEdge) {
                            const next = manager.createBlock();
                            const blockData = block.serialize();
                            next.addBlockProperties(blockData.blockProperties || []);
                            next.applyBlockPropertyStyling();
                            manager.blocks.push(next);
                            manager.container.append(next.container);
                            block.addRelation(RelationType.has_next, next.id);
                            next.addRelation(RelationType.has_previous, block.id);
                            const charCode = manager.getPlatformKey(KEYS.ENTER)!.code;
                            next.insertTextAtIndex(String.fromCharCode(charCode), 0);
                            next.setCaret(0, CARET.LEFT);
                            next.setFocus();
                        } else {
                            const next = manager.getBlock(nextEdge.targetId) as StandoffEditorBlock;
                            if (!next) return;
                            next.setCaret(0, CARET.LEFT);
                            next.setFocus();
                        }
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "TAB"
                },
                action: {
                    name: "Indent the current text block if it hasn't already been indented.",
                    description: `
                        
                    `,
                    handler: (args: IBindingHandlerArgs) => {
                        const { caret } = args;
                        const block = args.block as StandoffEditorBlock;
                        const manager = block.owner as BlockManager;
                        const parentEdge = block.getRelation(RelationType.has_parent);
                        if (parentEdge) return; // First child of another block.
                        const previousEdge = block.getRelation(RelationType.has_previous);
                        if (!previousEdge) return; // Top level block.
                        /**
                         * Convert the has_previous into a has_parent, etc.
                         */
                        const previous = manager.getBlock(previousEdge.targetId) as StandoffEditorBlock;
                        block.removeRelation(RelationType.has_previous);
                        previous.removeRelation(RelationType.has_next);
                        block.addRelation(RelationType.has_parent, previous.id);
                        previous.addRelation(RelationType.has_first_child, block.id);
                        previous.container.appendChild(block.container);
                        const level = block.metadata.indentLevel as number;
                        block.metadata.indentLevel = level + 1;
                        manager.renderIndent(block);
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "HOME"
                },
                action: {
                    name: "Move the caret to the left of the first character.",
                    description: `
                        
                    `,
                    handler: (args: IBindingHandlerArgs) => {
                        const { caret } = args;
                        const block = args.block as StandoffEditorBlock;
                        const first = block.cells[0];
                        if (!first) return;
                        block.setCaret(0, CARET.LEFT);
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "END"
                },
                action: {
                    name: "Move the caret to the right of the last character.",
                    description: `
                        
                    `,
                    handler: (args: IBindingHandlerArgs) => {
                        const { caret } = args;
                        const block = args.block as StandoffEditorBlock;
                        const last = block.cells[block.cells.length-1];
                        if (!last) return;
                        block.setCaret(last.index, CARET.RIGHT);
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "BACKSPACE"
                },
                action: {
                    name: "Delete the character to the left",
                    description: `
                        Delete the character to the left and move the cursor to the left of the character to the right.
                        If at the start of the block (i.e., no character to the left) then issues an event
                        named "DELETE_CHARACTER_FROM_START_OF_BLOCK" (?).
                    `,
                    handler: (args: IBindingHandlerArgs) => {
                        const { caret } = args;
                        const block = args.block as StandoffEditorBlock;
                        if (!caret.left) {
                            // TBC: merge with the previous block
                            return;
                        }
                        block.removeCellAtIndex(caret.left.index, true);
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "DELETE"
                },
                action: {
                    name: "Delete the character to the right",
                    description: `
                        Delete the character to the right and move the cursor to the left of the character to the right.
                        If at the start of the block (i.e., no character to the left) then issues an event
                        named "DELETE_CHARACTER_FROM_START_OF_BLOCK" (?).
                    `,
                    handler: (args: IBindingHandlerArgs) => {
                        const { caret } = args;
                        const block = args.block as StandoffEditorBlock;
                        const last = block.cells[-1];
                        if (caret.right == last) {
                            // TBC: merge with the next block.
                            return;
                        }
                        block.removeCellAtIndex(caret.right.index, true);
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "UP-ARROW"
                },
                action: {
                    name: "Move the cursor up one text block. If one isn't found, move to the start of the block.",
                    description: `
                        
                    `,
                    handler: (args: IBindingHandlerArgs) => {
                        /**
                         * Move the cursor back one cell ...
                         */
                        const { caret } = args;
                        const block = args.block as StandoffEditorBlock;
                        const manager = block.owner as BlockManager;
                        const previousEdge = block.getRelation(RelationType.has_previous);
                        if (!previousEdge) {
                            block.setCaret(0, CARET.LEFT);
                            return;
                        }
                        const previous = manager.getBlock(previousEdge.targetId) as StandoffEditorBlock;
                        if (!previous) return;
                        previous.setCaret(0, CARET.LEFT);
                        manager.setBlockFocus(previous);
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "DOWN-ARROW"
                },
                action: {
                    name: "Move the cursor down one text block. If one isn't found, move to the end of the block.",
                    description: `
                        
                    `,
                    handler: (args: IBindingHandlerArgs) => {
                        /**
                         * Move the cursor back one cell ...
                         */
                        const { caret } = args;
                        const block = args.block as StandoffEditorBlock;
                        const manager = block.owner as BlockManager;
                        const nextEdit = block.getRelation(RelationType.has_next);
                        const len = block.cells.length;
                        if (!nextEdit) {
                            block.setCaret(len - 1, CARET.LEFT);
                            return;
                        }
                        const next = manager.getBlock(nextEdit.targetId) as StandoffEditorBlock;
                        if (!next) return;
                        next.setCaret(0, CARET.LEFT);
                        manager.setBlockFocus(next);
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "LEFT-ARROW"
                },
                action: {
                    name: "Move the cursor back one cell ...",
                    description: `
                        ... Or skip to the end of the previous block.
                    `,
                    handler: (args: IBindingHandlerArgs) => {
                        /**
                         * Move the cursor back one cell ...
                         */
                        const { caret } = args;
                        const block = args.block as StandoffEditorBlock;
                        const manager = block.owner as BlockManager;
                        if (caret.left) {
                            block.setCaret(caret.left.index);
                            return;
                        }
                        /**
                         * Or skip to the end of the previous block.
                         */
                        const previousEdge = block.getRelation(RelationType.has_previous);
                        if (!previousEdge) return;
                        const previous = manager.getBlock(previousEdge.targetId) as StandoffEditorBlock;
                        if (!previous) return;
                        const last = previous.getLastCell();
                        previous.setCaret(last.index);
                        manager.setBlockFocus(previous);
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "RIGHT-ARROW"
                },
                action: {
                    name: "Move the cursor forward one cell ...",
                    description: `
                        ... Or skip to the end of the previous block.
                    `,
                    handler: (args: IBindingHandlerArgs) => {
                        /**
                         * Move the cursor right one cell ...
                         */
                        const { caret } = args;
                        const block = args.block as StandoffEditorBlock;
                        const manager = block.owner as BlockManager;
                        const len = block.cells.length;
                        const ri = caret.right.index;
                        if (ri < len - 1) {
                            block.setCaret(caret.right.index + 1);
                            return;
                        }
                        const nextEdge = block.getRelation(RelationType.has_next);
                        if (!nextEdge) return;
                        const next = manager.getBlock(nextEdge.targetId) as StandoffEditorBlock;
                        if (!next) return;
                        next.setCaret(0, CARET.LEFT);
                        manager.setBlockFocus(next);
                    }
                }
            }
        ];
        return events;
    }
    getStandoffPropertyEvents() {
        const events: InputEvent[] = [
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "control-i"
                },
                action: {
                    name: "Italicise",
                    description: "Italicises text in the selection. If no text is selected, switches to/from italics text mode.",
                    handler: (args: IBindingHandlerArgs) => {
                        const block = args.block as StandoffEditorBlock;
                        const selection = block.getSelection();
                        if (selection) {
                            block.createStandoffProperty("style/italics", selection);
                        } else {
                            // TBC
                        }      
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "control-b"
                },
                action: {
                    name: "Bold",
                    description: "Emboldens text in the selection. If no text is selected, switches to/from embolden text mode.",
                    handler: (args: IBindingHandlerArgs) => {
                        const block = args.block as StandoffEditorBlock;
                        const selection = block.getSelection();
                        if (selection) {
                            block.createStandoffProperty("style/bold", selection);
                        } else {
                            // TBC
                        }      
                    }
                }
            }
        ];
        return events;
    }
    getStandoffSchemas() {
        return [
            {
                type: "style/italics",
                name: "Italics",
                decorate: {
                    cssClass: "style_italics"
                }
            },
            {
                type: "style/bold",
                name: "Bold",
                decorate: {
                    cssClass: "style_bold"
                }
            },
            {
                type: "codex/block-reference",
                name: "Block reference",
                event: {
                    beforeStyling: async (args: any) => {
                        // TBC : will show some interface where a block can be retrieved
                    }
                },
                render: {
                    destroy: ({ properties }) => {
                        properties.forEach(p => p.cache.underline?.remove())
                    },
                    update: (args) => {
                        const owner = args.block.owner as BlockManager;
                        owner.renderUnderlines("codex/block-reference", args.properties, args.block, "orange", 1);
                    }
                }
            },
            {
                type: "codex/entity-reference",
                name: "Entity reference",
                event: {
                    beforeStyling: async (args: any) => {
                        // TBC : will show a panel where the entity can be searched for
                    }
                },
                render: {
                    destroy: ({ properties }) => {
                        properties.forEach(p => p.cache.underline?.remove())
                    },
                    update: (args) => {
                        const owner = args.block.owner as BlockManager;
                        owner.renderUnderlines("codex/entity-reference", args.properties, args.block, "purple", 3);
                    }
                }
            }
        ] as IStandoffPropertySchema[];
    }
    deserialize(json: any) {
        return {} as IBlock;
    }
    deserializeBlock(data: any) {
        switch (data.type) {
            case BlockType.StandoffEditor: {
                const block = this.createBlock();
                block.bind(data);
                return block;
            };
            default: return {} as IBlock;
        }
    }
    serialize() {
        const json = this.blocks.map(b => b.serialize());
        return json;
    }
    renderUnderlines(type: string, properties: StandoffProperty[], block: StandoffEditorBlock, colour: string, offsetY: number) {
        const overlay = block.getOrSetOverlay(type);
        const cw = block.cache?.offset?.w || block.container.offsetWidth;
        const underlines = properties.map(p =>
            createUnderline(p, {
                stroke: colour,
                containerWidth: cw,
                offsetY: offsetY
            })) as SVGElement[];
        const frag = document.createDocumentFragment();
        frag.append(...underlines);
        updateElement(overlay.container, {
            classList: ["overlay"],
            style: {
                position: "absolute",
                width: "100%",
                top: 0,
                left: 0
            },
            parent: block.container,
            children: [frag]
        });
    }
    getPlatformKey(codes: TPlatformKey[]) {
        return codes.find(x=> x.platform == Platform.Windows);
    }
    getBlock(id: GUID) {
        return this.blocks.find(x => x.id == id);
    }
    commit(msg: Commit) {
        this.commits.push(msg);
    }
    deleteBlock(blockId: GUID) {
        this.commit({
            command: {
                id: this.id,
                name: "deleteBlock",
                value: {
                    blockId
                }
            }
        });
    }
    mergeBlocks(firstBlockId: GUID, secondBlockId: GUID) {
        this.commit({
            command: {
                id: this.id,
                name: "mergeBlocks",
                value: {
                    firstBlockId, secondBlockId
                }
            }
        });
        /**
         * The following isn't really correct because we would also need to update the block references for each
         * Standoff- and BlockProperty object to point to 'first' AND we need to propagate these changes to the
         * StandoffProperty objects on 'second' to the objects in the data store, also.
         * 
         * So this is really no more than a high-level sketch of what's involved in merging two blocks.
         * 
         * We would also need to update relationships between first, second, and the 'next' block after 'second' (if there is one).
         * It should look roughly as follows:
         * 
         * CREATE:
         *      (first)-[:has_next]->(next), (next)-[:has_previous]->(first)
         * 
         * DELETE:
         *      (first)-[:has_next]->(second), (second)-[:has_previous]->(first), (second)-[:has_next]->(next)
         * 
         * None of this takes into account the case where 'second' is a *child block* in a nested list.
         */
        const first = this.getBlock(firstBlockId) as StandoffEditorBlock;
        const second = this.getBlock(secondBlockId) as StandoffEditorBlock;
        const lastIndex = (first?.cells.length as number) -1;
        first?.removeCellAtIndex(lastIndex);
        first?.cells.push(...second?.cells as Cell[]);
        first?.standoffProperties.push(...second?.standoffProperties as StandoffProperty[]);
        first?.blockProperties.push(...second?.blockProperties as BlockProperty[]);
        first?.updateView();
        this.deleteBlock(secondBlockId);
    }
    reset() {
        this.container.innerHTML = "";
        this.blocks = [];
        this.id = uuidv4();
    }
    storeCommit(commit: Commit) {        
        this.commits.push(commit);
        this.pointer++;
    }
    loadDocument(doc: StandoffEditorBlockDto) {
        this.reset();
        const structure = document.createElement("DIV") as HTMLDivElement;
        const paragraphs = doc.text.split(/\r?\n/);
        let start = 0;
        for (let i = 0; i < paragraphs.length; i ++) {
            let block = this.createBlock();
            let text = paragraphs[i];
            let end = start + text.length + 1; // + 1 to account for the CR stripped from the text
            const props = doc.standoffProperties
                .filter(x=> x.start != undefined && x.end != undefined)
                .filter(x=> x.start >= start && x.end <= end)
             ;             
            start += text.length;
            let data = {
                text: text,
                standoffProperties: props as any[],
                blockProperties: [] as any[]
            };
            if (i == 0) {
                data = {...data, blockProperties: doc.blockProperties as any[] };
            }
            block.bind(data);
            structure.appendChild(block.container);
            this.blocks.push(block);
        }
        this.container.appendChild(structure);
        this.commit({
            command: {
                id: this.id,
                name: "loadDocument",
                value: { doc }
            }
        })
    }
    undent(block: IBlock) {
        /**
         * Currently assumes that these are StandoffTextBlocks on the same BlockManager,
         * rather than IBlocks.
         */
        const parentEdge = block.relations["child-of"];
        if (!parentEdge) return;
        const parent = this.blocks.find(x => x.id == parentEdge.targetId);
        if (!parent) return;
        parent.removeRelation("parent-of");
        block.removeRelation("child-of");
        const previous = parent;
        previous.addRelation("followed-by", block.id);
        block.addRelation("follows", previous.id);
        const level = block.metadata.indentLevel as number;
        block.metadata.indentLevel = level - 1;
        this.renderIndent(block);
    }
    indent(currentBlock: IBlock, newBlock: IBlock) {
        /**
         * Currently assumes that these are StandoffTextBlocks on the same BlockManager,
         * rather than IBlocks.
         */
        newBlock.addRelation("child-of", currentBlock.id);
        currentBlock.addRelation("parent-of", newBlock.id);
        const level = currentBlock.metadata.indentLevel as number;
        newBlock.metadata.indentLevel = level + 1;
        this.renderIndent(newBlock);
    }
    renderIndent(block: IBlock) {
        /**
         * Currently assumes that these are StandoffTextBlocks on the same BlockManager,
         * rather than IBlocks.
         */
        const defaultWidth = 20;
        const level = block.metadata.indentLevel as number;
        block.container.setAttribute("margin-left", (level * defaultWidth) + "px");
    }
    createBlock() {
        const standoffSchemas = this.getStandoffSchemas();
        const blockSchemas = this.getBlockSchemas();
        const standoffEvents = this.getStandoffPropertyEvents();
        const editorEvents = this.getEditorEvents();
        const block = new StandoffEditorBlock({
            owner: this
        });
        block.setSchemas(standoffSchemas);
        block.setBlockSchemas(blockSchemas);
        block.setEvents(standoffEvents);
        block.setEvents(editorEvents);
        block.setCommitHandler(this.storeCommit.bind(this));
        block.applyBlockPropertyStyling();
        this.commit({
            command: {
                id: this.id,
                name: "createBlock"
            },
            reverse: {
                id: this.id,
                name: "uncreateBlock",
                value: { id: block.id }
            }
        });
        return block;
    }
    private uncreateBlock(id: GUID) {
        const block = this.getBlock(id) as IBlock;
        if (!block) {
            // Error: block not found.
            return;
        }
        block.container.innerHTML = "";
        const i = this.blocks.findIndex(x=> x.id == id);
        this.blocks.splice(i, 1);
    }
    appendSibling(anchor: HTMLElement, sibling: HTMLElement) {
        anchor.insertAdjacentElement("afterend", sibling);
    }
    startNewDocument() {
        
    }
}


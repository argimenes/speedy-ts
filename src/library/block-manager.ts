import { KEYS, Platform, TPlatformKey } from "./keyboard";
import { InputEventSource, InputEvent, BlockType, CARET, GUID, IBindingHandlerArgs, IBlock, IBlockManager, IBlockRelation, IRange, IStandoffPropertySchema, Mode, SELECTION_DIRECTION, StandoffEditorBlock, StandoffEditorBlockDto, StandoffProperty, Commit, Cell, BlockProperty, Command } from "./standoff-editor-block";
import { createUnderline, updateElement } from "./svg";
import { v4 as uuidv4 } from 'uuid';

export enum CssClass {
    LineBreak = "codex__line-break"
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
    reversePointer: number;
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
        this.reversePointer = 0;
    }
    redo() {
        this.executeCommandAtPointer();
        this.pointer++;
        this.reversePointer = this.pointer - 1;
    }
    undo() {
        this.executeReverseCommandAtPointer();
        this.reversePointer--;
        this.pointer = this.reversePointer + 1;
    }
    setCommitPointer(index: number) {
        this.pointer = index;
        this.reversePointer = index;
    }
    executeCommandAtPointer() {
        const commit = this.commits[this.pointer];
        this.executeCommand(commit.command);
    }
    executeReverseCommandAtPointer() {
        const commit = this.commits[this.reversePointer];
        if (commit.reverse) this.executeCommand(commit.reverse);
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
                type: "block/alignment/centre",
                decorate: {
                    blockClass: "block_alignment_centre"
                },
                bindings: ["control-a", "control-c"],
                bindingHandler: (block: StandoffEditorBlock) => {
                    const prop = block.createBlockProperty("style/alignment/centre");
                }
            }
        ]
    }
    getEditorEvents() {
        const events: InputEvent[] = [
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
                        const previousEdge = block.getRelation("has-previous-sibling");
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
                         * Move the cursor back one cell ...
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
                        if (ri == len - 1) {
                            block.setCaret(caret.right.index, CARET.RIGHT);
                            return;
                        }
                        /**
                         * Or skip to the start of the next block.
                         */
                        // const previousEdge = block.getRelation("has-previous-sibling");
                        // if (!previousEdge) return;
                        // const previous = manager.getBlock(previousEdge.targetId) as StandoffEditorBlock;
                        // if (!previous) return;
                        // const last = previous.getLastCell();
                        // previous.setCaret(last.index);
                        // manager.setBlockFocus(previous);
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
                decorate: {
                    cssClass: "style_italics"
                }
            },
            {
                type: "style/bold",
                decorate: {
                    cssClass: "style_bold"
                }
            },
            {
                type: "animation/spinner",
                animation: {
                    draw: function (p: StandoffProperty) {
                        const block = p.start.element?.parentElement as HTMLElement;
                        p.cache.animation.degrees += 2;
                        if (p.cache.animation.degrees >= 360) {
                            p.cache.animation.degrees = 0;
                        }
                        block.style.transform = "rotate(" + p.cache.animation.degrees + "deg)";
                    },
                    init: (args) => {
                        const { block, properties } = args;
                        properties.forEach(p => {
                            p.cache.animation = {
                                degrees: 0,
                                element: null,
                                stop: false
                            };
                            const cells = p.getCells();
                            const container = document.createElement("DIV") as HTMLDivElement;
                            container.speedy = {

                            }
                            const spans = cells.map(x => x.element as HTMLSpanElement);
                            p.start.next?.element?.insertBefore(container, p.start.next?.element.parentElement);
                            container.append(...spans);
                            var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                            var x = p.start.cache.offset.x;
                            var y = p.start.cache.offset.y;
                            var w = (p.end.cache.offset.x + p.end.cache.offset.w) - p.start.cache.offset.x;
                            var h = p.end.cache.offset.h;
                            console.log({
                                x, y, w, startNode: p.start, endNode: p.end
                            });
                            svg.speedy = {
                                stream: 1
                            };
                            var cr = p.block.container.getBoundingClientRect() as DOMRect;
                            var sr = p.start.element?.getBoundingClientRect() as DOMRect;
                            var er = p.end.element?.getBoundingClientRect() as DOMRect;
                            var w = er.x + er.width - sr.x;
                            var x = sr.x - cr.x;
                            var y = sr.y - cr.y - (w / 4);
                            svg.style.position = "absolute";
                            svg.style.left = x + "px";
                            svg.style.top = y + "px";
                            svg.style.width = w + "px";
                            svg.style.height = w + "px";
                            var svgNS = svg.namespaceURI;
                            var circle = document.createElementNS(svgNS, 'circle');
                            circle.setAttributeNS(null, 'cx', (w / 2)+"");
                            circle.setAttributeNS(null, 'cy', (w / 2)+"");
                            circle.setAttributeNS(null, 'r', (w / 2)+"");
                            circle.setAttributeNS(null, 'fill', 'transparent');
                            svg.appendChild(circle);
                            //p.editor.container.insertBefore(svg, p.startNode.parentNode);
                            p.cache.animation.element = svg;
                        });
                    },
                    start: (p: StandoffProperty) => {
                        p.cache.animation.timer = setInterval(function () {
                            if (p.cache.animation.stop) {
                                // clearInterval(p.animation.timer);
                                return;
                            }
                            if (p.schema?.animation?.draw) p.schema?.animation?.draw(p);
                        }, 125);
                    },
                    stop: (p: StandoffProperty) => {
                        clearInterval(p.cache.animation.timer);
                    },
                    delete: (p: StandoffProperty) => {
                        clearInterval(p.cache.animation.timer);
                    }
                }
            },
            {
                type: "codex/block-reference",
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
    getModes() {
        const self = this;
        const modes: Mode[] = [];
        modes.push({
            "default": {
                keyboard: [
                    {
                        "HOME": (args: IBindingHandlerArgs) => {
                            /**
                             * Move the cursor to the start of the block.
                             */
                            const { caret } = args;
                            const block = args.block as StandoffEditorBlock;
                            const start = block.cells[0];
                            block.setCaret(start.index);
                        },
                        "END": (args: IBindingHandlerArgs) => {
                            /**
                             * Move the cursor to the end of the block.
                             */
                            const { caret } = args;
                            const block = args.block as StandoffEditorBlock;
                            const { cells } = block;
                            const end = cells[-1]; // This should be the CR character cell.
                            block.setCaret(end.index);
                        },
                        "TAB": (args: IBindingHandlerArgs) => {
                            /**
                             * Inserts spaces or a TAB character. If the latter, will need to
                             * see if it needs to be styled to a fixed width.
                             */
                            const { caret } = args;
                            const block = args.block as StandoffEditorBlock;
                            const ci = caret.right!.index;
                            block.insertTextAtIndex("    ", ci);
                        },
                        "ENTER": (args: IBindingHandlerArgs) => {
                            /**
                             * Creates a new StandoffEditorBlock and adds it as a sibling after the current block.
                             */
                            const block = args.block as StandoffEditorBlock;
                            const newBlock = self.createBlock();
                            const next = block.getRelation("next");
                            block.setRelation("next", newBlock.id);
                            newBlock.setRelation("previous", block.id);
                            if (next) {
                                newBlock.setRelation("next", next.targetId);
                            }
                            self.appendSibling(block.container, newBlock.container);
                            self.setBlockFocus(newBlock);
                        },
                        "shift-ENTER": (args: IBindingHandlerArgs) => {
                            /**
                             * Insert a NewLine character, styled such that it displaces following
                             * SPANs onto the next line.
                             */
                            const { caret } = args;
                            const block = args.block as StandoffEditorBlock;
                            const ci = caret.right!.index;
                            const charCode = self.getPlatformKey(KEYS.ENTER)!.code;
                            const lb = block.insertCharacterAfterIndex(String.fromCharCode(charCode), ci);
                            lb.element?.classList.add(CssClass.LineBreak);
                        }
                    }
                ],
                mouse: []
            },
            "nested-list": {
                keyboard: [
                    {
                        "TAB": (args: IBindingHandlerArgs) => {
                            const { block } = args;
                            const newBlock = self.createBlock();
                            self.indent(block, newBlock);
                        }
                    }
                ],
                mouse: [

                ]
            }
        })
        return modes;
    }
    reset() {
        this.container.innerHTML = "";
        this.blocks = [];
        this.id = uuidv4();
    }
    storeCommit(commit: Commit) {        
        this.commits.push(commit);
        this.setCommitPointer(this.commits.length - 1);
    }
    loadDocument(doc: StandoffEditorBlockDto) {
        this.reset();
        const structure = document.createElement("DIV") as HTMLDivElement;
        const paragraphs = doc.text.split(/\r?\n/);
        let start = 0;
        console.log("BlockManager.loadDocument", { doc, paragraphs })
        for (let i = 0; i < paragraphs.length; i ++) {
            let block = this.createBlock();
            let text = paragraphs[i];
            let end = start + text.length + 1; // + 1 to account for the CR stripped from the text
            const props = doc.standoffProperties
                .filter(x=> x.start != undefined && x.end != undefined)
                .filter(x=> x.start >= start && x.end <= end)
             ;             
            start += text.length;
            const data = {
                text: text,
                standoffProperties: props as any[]
            };
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
        this.commit({
            command: {
                id: block.id,
                name: "createBlock"
            },
            reverse: {
                id: block.id,
                name: "uncreateBlock",
                value: { id: block.id }
            }
        });
        return block;
    }
    uncreateBlock(id: GUID) {
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


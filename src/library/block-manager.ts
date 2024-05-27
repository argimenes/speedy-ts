import { KEYS, Platform, TPlatformKey } from "./keyboard";
import { InputEventSource, InputEvent, BlockType, CARET, GUID, IBindingHandlerArgs, IBlock, IBlockManager, IBlockRelation, IRange, IStandoffPropertySchema, Mode, SELECTION_DIRECTION, StandoffEditorBlock, StandoffEditorBlockDto, StandoffProperty, Commit, Cell, BlockProperty } from "./standoff-editor-block";
import { createUnderline } from "./svg";
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
    blocks: StandoffEditorBlock[];
    metadata: Record<string,any>;
    focus?: IBlock;
    selections: IBlockSelection[];
    commits: Commit[];
    constructor(props?: IBlockManagerConstructor) {
        this.id = props?.id || uuidv4();
        this.type = BlockType.Outliner;
        this.container = props?.container || document.createElement("DIV") as HTMLDivElement;
        this.relations = {};
        this.blocks = [];
        this.metadata = {};
        this.selections = [];
        this.commits = [];
    }
    rollforward() {

    }
    rollback() {

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
                    match: "DELETE"
                },
                action: {
                    name: "Delete preceding character",
                    description: `
                        Delete the character to the left and move the cursor to the left of the character to the right.
                        If at the start of the block (i.e., no character to the left) then issues an event
                        named "DELETE_CHARACTER_FROM_START_OF_BLOCK" (?).
                    `,
                    handler: (args: IBindingHandlerArgs) => {
                        const { caret } = args;
                        const block = args.block as StandoffEditorBlock;
                        if (!caret.left) {
                            block.trigger("DELETE_CHARACTER_FROM_START_OF_BLOCK");
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
                        if (!!caret.left) {
                            block.setCaret(caret.left.index);
                            return;
                        }
                        /**
                         * Or skip to the end of the previous block.
                         */
                        const previousEdge = block.getRelation("has-previous-sibling");
                        if (!previousEdge) return;
                        const previous = manager.getBlock(previousEdge.targetId);
                        if (!previous) return;
                        const last = previous.getLastCell();
                        previous.setCaret(last.index);
                        manager.setBlockFocus(previous);
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
        const first = this.getBlock(firstBlockId);
        const second = this.getBlock(secondBlockId);
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
                        "DELETE": (args: IBindingHandlerArgs) => {
                            /**
                             * Delete the character to the right.
                             */
                            const { caret } = args;
                            const block = args.block as StandoffEditorBlock;
                            const len = block.cells.length;
                            const last = block.cells[len-1];
                            if (caret.right == last) {
                                /**
                                 * We're at the end of the text block, so we should merge the following block, if there is one.
                                 * Assuming a list of blocks for now rather than a nested list.
                                 */
                                const next = block.getRelation("next");
                                if (!next) {
                                    // We're on the last block, so nothing left to DELETE.
                                    return;
                                }
                                self.mergeBlocks(block.id, next.targetId);
                            }
                            else {
                                block.removeCellAtIndex(caret.right.index);
                            }                            
                        },
                        "BACKSPACE": (args: IBindingHandlerArgs) => {
                            /**
                             * Delete the character to the left.
                             */
                            const { caret } = args;
                            const block = args.block as StandoffEditorBlock;
                            const first = block.cells[0];
                            if (caret.right == first) {
                                /**
                                 * We're at the start of the text block, so we should merge this block into the preceding, if there is one.
                                 */
                                const previous = block.getRelation("previous");
                                if (!previous) {
                                    // We're on the first block, so nothing left to BACKSPACE into.
                                    return;
                                }
                                self.mergeBlocks(previous.targetId, block.id);
                            }
                            else {
                                if (caret.left) block.removeCellAtIndex(caret.left.index);
                            }                            
                        },
                        "LEFT-ARROW": (args: IBindingHandlerArgs) => {
                            /**
                             * Move the cursor back one cell ...
                             */
                            const { caret } = args;
                            const block = args.block as StandoffEditorBlock;
                            if (!!caret.left) {
                                block.setCaret(caret.left.index);
                                return;
                            }
                            /**
                             * Or skip to the end of the previous block.
                             */
                            const previousEdge = block.getRelation("has-previous-sibling");
                            if (!previousEdge) return;
                            const previous = self.getBlock(previousEdge.targetId);
                            if (!previous) return;
                            const last = previous.getLastCell();
                            previous.setCaret(last.index);
                            self.setBlockFocus(previous);
                        },
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
                            const { caret } = args;
                            const block = args.block as StandoffEditorBlock;
                            const newBlock = self.createNewBlock();
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
                            const newBlock = self.createNewBlock();
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
    }
    loadDocument(doc: StandoffEditorBlockDto) {
        this.reset();
        const standoffSchemas = this.getStandoffSchemas();
        const blockSchemas = this.getBlockSchemas();
        const standoffEvents = this.getStandoffPropertyEvents();
        const editorEvents = this.getEditorEvents();
        const structure = document.createElement("DIV") as HTMLDivElement;
        const paragraphs = doc.text.split(/\r?\n/);
        let start = 0;
        console.log("BlockManager.loadDocument", { doc, paragraphs })
        for (let i = 0; i< paragraphs.length; i ++) {
            let block = this.createNewBlock();
            block.setSchemas(standoffSchemas);
            block.setEvents(standoffEvents);
            block.setEvents(editorEvents);
            block.setCommitHandler(this.storeCommit.bind(this));
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
            const lb = block.createLineBreakCell();
            console.log("BlockManager.loadDocument", { i, data })
            block.bind(data);
            structure.appendChild(block.container);
            this.blocks.push(block);
        }
        this.container.appendChild(structure);
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
    createNewBlock() {
        const self = this;
        const block = new StandoffEditorBlock(this);
        
        // block.createEmpty()
        return block;
    }
    appendSibling(anchor: HTMLElement, sibling: HTMLElement) {
        anchor.insertAdjacentElement("afterend", sibling);
    }
    startNewDocument() {
        
    }
}

function updateElement(container: HTMLDivElement, arg1: { classList: string[]; style: { position: string; width: string; top: number; left: number; }; parent: HTMLDivElement; children: DocumentFragment[]; }) {
    throw new Error("Function not implemented.");
}

import { KEYS, Platform, TPlatformKey } from "./keyboard";
import { BlockType, CARET, GUID, IBindingHandlerArgs, IBlock, IBlockManager, IBlockRelation, IRange, IStandoffPropertySchema, Mode, SELECTION_DIRECTION, StandoffEditorBlock, StandoffEditorBlockDto } from "./standoff-editor-block";
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
    constructor(props?: IBlockManagerConstructor) {
        this.id = props?.id || uuidv4();
        this.type = BlockType.Outliner;
        this.container = props?.container || document.createElement("DIV") as HTMLDivElement;
        this.relations = {};
        this.blocks = [];
        this.metadata = {};
        this.selections = [];
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
    getStandoffSchemas() {
        return [
            {
                type: "style/italics",
                bindings: ["control-i"],
                bindingHandler: (block: StandoffEditorBlock, selection: IRange) => {
                    if (selection) {
                        block.createStandoffProperty("style/italics", selection);
                    } else {
    
                    }
                },
                decorate: {
                    cssClass: "style_italics"
                }
            },
            {
                type: "style/bold",
                bindings: ["control-b"],
                bindingHandler: (block: StandoffEditorBlock, selection: IRange) => {
                    if (selection) {
                        block.createStandoffProperty("style/bold", selection);
                    } else {
    
                    }
                },
                decorate: {
                    cssClass: "style_bold"
                }
            },
            {
                type: "codex/entity-reference",
                bindings: ["control-e", "control-f"],
                bindingHandler: async (e: StandoffEditorBlock, selection: IRange) => {
                    if (selection) {
    
                    } else {
    
                    }
                },
                event: {
                    beforeStyling: async (args: any) => {

                    }
                },
                render: {
                    destroy: ({ properties }) => {
                        properties.forEach(p => p.cache.underline?.remove())
                    },
                    update: (args) => {
                        const { block, properties } = args;
                        const overlay = block.getOrSetOverlay("codex/entity-reference");
                        const cw = block.cache.containerWidth;
                        const underlines = properties.map(p =>
                            createUnderline(p, {
                                stroke: "purple",
                                containerWidth: cw,
                                offsetY: 3
                            })) as SVGElement[];
                        const frag = document.createDocumentFragment();
                        frag.append(...underlines);
                        overlay.container.appendChild(frag);
                    }
                }
            }
        ] as IStandoffPropertySchema[];
    }
    getPlatformKey(codes: TPlatformKey[]) {
        return codes.find(x=> x.platform == Platform.Windows);
    }
    getBlock(id: GUID) {
        return this.blocks.find(x => x.id == id);
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
                             * Delete the character to the left and move the cursor
                             * to the left of the character to the right.
                             * 
                             * If at the start of the block (i.e., no character to the left)
                             * then issue an event named "DELETE_CHARACTER_FROM_START_OF_BLOCK".
                             */
                            const { caret } = args;
                            const block = args.block as StandoffEditorBlock;
                            if (!caret.left) {
                                block.trigger("DELETE_CHARACTER_FROM_START_OF_BLOCK");
                                return;
                            }
                            block.removeCellAtIndex(caret.left.index, true);
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
    loadDocument(doc: StandoffEditorBlockDto) {
        this.reset();
        const standoffSchemas = this.getStandoffSchemas();
        const blockSchemas = this.getBlockSchemas();
        const modes = this.getModes();
        const structure = document.createElement("DIV") as HTMLDivElement;
        const paragraphs = doc.text.split(/\r?\n/);
        let start = 0;
        console.log("BlockManager.loadDocument", { doc, paragraphs })
        for (let i = 0; i< paragraphs.length; i ++) {
            let block = this.createNewBlock();
            block.setSchemas(standoffSchemas);
            block.setModes(modes);
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
            console.log("BlockManager.loadDocument", { i, data })
            block.bind(data);
            structure.appendChild(block.container);
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
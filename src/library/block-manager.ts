import { BlockType, CARET, IBindingHandlerArgs, IBlock, IBlockManager, IBlockRelation, IRange, IStandoffProperty, IStandoffPropertySchema, Mode, StandoffEditorBlock } from "./text-block-editor";

export type SpeedyStandoffProperty = {
    guid: string, start?: number, end?: number, type: string, value: string
}
export type SpeedyDocument = {
    text: string;
    properties: SpeedyStandoffProperty[];
}
export class BlockManager implements IBlockManager {
    id: string;
    type: BlockType;
    container: HTMLDivElement;
    relations: Record<string, IBlockRelation>;
    blocks: StandoffEditorBlock[];
    metadata: Record<string,any>;
    constructor() {
        this.id = "";
        this.type = BlockType.Outliner;
        this.relations = {};
        this.container = document.createElement("DIV") as HTMLDivElement;
        this.blocks = [];
        this.metadata = {};
    }
    addRelation(name: string) {

    }
    removeRelation(name: string) {

    }
    getSchemas() {
        return [
            {
                type: "style/italics",
                bindings: ["control-i"],
                bindingHandler: (e: StandoffEditorBlock, selection: IRange) => {
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
                bindingHandler: async (e: StandoffEditorBlock, selection: IRange) => {
                    if (selection) {
    
                    } else {
    
                    }
                },
                decorate: {
                    batchRender: (args) => {
                        const { block: editor, properties } = args;
                        const { container } = editor;
                        // Draw purple SVG underlines for entities, etc.
                    }
                }
            }
        ] as IStandoffPropertySchema[];
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
                            const { block, caret } = args;
                            const start = block.cells[0];
                            block.setCarotByNode({ node: start, offset: CARET.LEFT });
                        },
                        "END": (args: IBindingHandlerArgs) => {
                            /**
                             * Move the cursor to the end of the block.
                             */
                            const { block, caret } = args;
                            const len = block.cells.length;
                            const end = block.cells[len - 1]; // This should be the CR character cell.
                            block.setCarotByNode({ node: end, offset: CARET.LEFT });
                        },
                        "TAB": (args: IBindingHandlerArgs) => {
                            /**
                             * Inserts spaces or a TAB character. If the latter, will need to
                             * see if it needs to be styled to a fixed width.
                             */
                            const { block, caret } = args;
                            const ci = caret.right.index;
                            block.insertCharacterAfterIndex("    ", ci);
                        },
                        "ENTER": (args: IBindingHandlerArgs) => {
                            /**
                             * Creates a new StandoffEditorBlock and adds it as a sibling after the current block.
                             */
                            const { block } = args;
                            const newBlock = self.createNewBlock();
                            const next = block.getRelation("next");
                            block.setRelation("next", newBlock.id);
                            newBlock.setRelation("previous", block.id);
                            if (next) {
                                newBlock.setRelation("next", next.targetId);
                            }
                            self.appendSibling(block.container, newBlock.container);
                            newBlock.focus();
                        },
                        "shift-ENTER": (args: IBindingHandlerArgs) => {
                            /**
                             * Insert a NewLine character, styled such that it displaces following
                             * SPANs onto the next line.
                             */
                            const { block } = args;
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
    loadDocument(doc: SpeedyDocument) {
        const schemas = this.getSchemas();
        const modes = this.getModes();
        const structure = document.createElement("DIV") as HTMLDivElement;
        const paragraphs = doc.text.split(/\r?\n/);
        let start = 0;
        for (let i = 0; i< paragraphs.length; i ++) {
            let block = this.createNewBlock();
            block.setSchemas(schemas);
            block.setModes(modes);
            let text = paragraphs[i];
            let end = start + text.length + 1; // + 1 to account for the CR stripped from the text
            const props = doc.properties
                .filter(x=> x.start != undefined && x.end != undefined)
                .filter(x=> x.start >= start && x.end <= end)
             ;
            start += text.length;
            block.bind({
                text: text,
                properties: props as any[]
            });
            structure.appendChild(block.container);
        }
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
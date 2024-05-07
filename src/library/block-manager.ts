import { BlockType, IBindingHandlerArgs, IBlock, IBlockRelation, StandoffEditorBlock } from "./text-block-editor";

export class BlockManager implements IBlock {
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
    loadDocument(doc: any) {
        const structure = document.createElement("DIV") as HTMLDivElement;
        const block = this.createNewBlock();        
        structure.appendChild(block.container);
    }
    undent(block: IBlock) {
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
        newBlock.addRelation("child-of", currentBlock.id);
        currentBlock.addRelation("parent-of", newBlock.id);
        const level = currentBlock.metadata.indentLevel as number;
        newBlock.metadata.indentLevel = level + 1;
        this.renderIndent(newBlock);
    }
    renderIndent(block: IBlock) {
        const defaultWidth = 20;
        const level = block.metadata.indentLevel as number;
        block.container.setAttribute("margin-left", (level * defaultWidth) + "px");
    }
    createNewBlock() {
        const self = this;
        const block = new StandoffEditorBlock();
        block.addKeyboardBinding("default", {
            "TAB": (args: IBindingHandlerArgs) => {
                /**
                 * Inserts spaces or a TAB character. If the latter, will need to
                 * see if it needs to be styled to a fixed width.
                 */
                const { block, caret } = args;
                const ci = caret.right.index;
                block.insertCharacterAfterIndex("    ", ci);
            }
        });
        block.addKeyboardBinding("nested-list", {
            "TAB": (args: IBindingHandlerArgs) => {
                const { block } = args;
                const newBlock = self.createNewBlock();
                self.indent(block, newBlock);
            }
        });
        block.addKeyboardBinding("default", {
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
            }
        });
        block.addKeyboardBinding("default", {
            "shift-ENTER": (args: IBindingHandlerArgs) => {
                /**
                 * Insert a NewLine character, styled such that it displaces following
                 * SPANs onto the next line.
                 */
                const { block } = args;
            }
        });
        // block.createEmpty()
        return block;
    }
    appendSibling(anchor: HTMLElement, sibling: HTMLElement) {
        anchor.insertAdjacentElement("afterend", sibling);
    }
    startNewDocument() {
        
    }
}
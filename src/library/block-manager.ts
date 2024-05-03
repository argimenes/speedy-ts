import { IBindingHandlerArgs, StandoffEditorBlock } from "./text-block-editor";

export class BlockManager {
    blocks: StandoffEditorBlock[];
    constructor() {
        this.blocks = [];
    }
    loadDocument(doc: any) {
        const structure = document.createElement("DIV") as HTMLDivElement;
        const block = this.createNewBlock();        
        structure.appendChild(block.container);
    }
    createNewBlock() {
        const self = this;
        const block = new StandoffEditorBlock();
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
                
            }
        });
        return block;
    }
    appendSibling(anchor: HTMLElement, sibling: HTMLElement) {
        anchor.insertAdjacentElement("afterend", sibling);
    }
    startNewDocument() {
        
    }
}
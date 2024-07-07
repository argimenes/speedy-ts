import { AbstractBlock } from "./abstract-block";
import { BlockManager } from "./block-manager";
import { updateElement } from "./svg";
import { IAbstractBlockConstructor, BlockType, IBlockDto, IBlock, IPlainTextBlockDto, IBindingHandlerArgs, Caret, CaretAnchor } from "./types";

export class PlainTextBlock extends AbstractBlock {
    text: string;
    textarea: HTMLTextAreaElement;
    constructor(args: IAbstractBlockConstructor) {
        super(args);
        this.type = BlockType.PlainTextBlock;
        this.text = "";
        this.textarea = document.createElement("textarea") as HTMLTextAreaElement;
        updateElement(this.textarea, {
            style: {
                width: "100%",
                height: "auto"
            }
        })
        this.container.append(this.textarea);
        this.attachEventHandlers();
    }
    attachEventHandlers() {
        const self = this;
        this.textarea.addEventListener("click", () => {
            (self.owner as BlockManager).setBlockFocus(self);
        });
        this.textarea.addEventListener("keydown", this.handleKeyDown.bind(this));
    }
    getCaret() {
        const sel = this.getSelection();
        const { anchorNode } = sel;
        const offset = sel.anchorOffset;
        const toTheLeft = offset == 0;
        const left = sel.anchorNode;
        const right = sel.anchorNode?.nextSibling;
        return { left, right } as CaretAnchor;
    }
    getSelection() {
        const sel = window.getSelection() as Selection
        return sel;
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
            const args = { block: this, caret: this.getCaret(), selection: this.getSelection() } as any;
            match.action.handler(args);
            return FORBID;
        }
        return ALLOW;
    }
    bind(text: string) {
        this.textarea.value = text;
    }
    serialize() {
        return {
            id: this.id,
            type: BlockType.PlainTextBlock,
            text: this.textarea.value,
            metadata: this.metadata,
            blockProperties: this.blockProperties.map(x => x.serialize()),
            children: this.blocks.map(x => x.serialize())
        } as IPlainTextBlockDto;
    }
    deserialize(json: any): IBlock {
        throw new Error("Method not implemented.");
    }
    destroy(): void {
        this.container.remove();
    }
}
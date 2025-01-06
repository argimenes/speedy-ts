import { AbstractBlock } from "./abstract-block";
import { UniverseBlock } from "../universe-block";
import { getCursorPos } from "../library/keyboard";
import { updateElement } from "../library/svg";
import { IAbstractBlockConstructor, BlockType, IBlockDto, IBlock, IPlainTextBlockDto, IBindingHandlerArgs, Caret, CaretAnchor } from "../library/types";

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
            (self.manager as UniverseBlock).setBlockFocus(self);
        });
        this.textarea.addEventListener("keydown", this.handleKeyDown.bind(this));
    }
    setFocus() {
        this.textarea.focus();
    }
    getSelection() {
        const sel = window.getSelection() as Selection
        return sel;
    }
    private handleKeyDown(e: KeyboardEvent) {
        const ALLOW = true, FORBID = false;
        const input = this.toKeyboardInput(e);
        const modifiers = ["Shift", "Alt", "Meta", "Control", "Option"];
        if (modifiers.some(x => x == input.key)) {
            return ALLOW;
        }
        const match = this.getFirstMatchingInputEvent(input);
        if (match) {
            let passthrough = false;
            const characterIndex = getCursorPos(this.textarea);
            const selection = this.getSelection();
            const textLength = this.textarea.value?.length;
            const args = {
                block: this,
                characterIndex,
                textLength,
                selection,
                allowPassthrough: () => passthrough = true
            } as any;
            match.action.handler(args);
            if (!passthrough) {
                e.preventDefault();
                return FORBID;
            }
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
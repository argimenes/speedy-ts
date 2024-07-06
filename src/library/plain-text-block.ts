import { AbstractBlock } from "./abstract-block";
import { BlockManager } from "./block-manager";
import { updateElement } from "./svg";
import { IAbstractBlockConstructor, BlockType, IBlockDto, IBlock, IPlainTextBlockDto } from "./types";

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
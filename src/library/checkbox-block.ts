import { AbstractBlock } from "./abstract-block";
import { StandoffEditorBlock } from "./standoff-editor-block";
import { updateElement } from "./svg";
import { IAbstractBlockConstructor, BlockType, IBlockDto, IBlock, StandoffEditorBlockDto } from "./types";

export interface ICheckBlockConstructor extends IAbstractBlockConstructor {
    checked?: boolean;
}

export class CheckboxBlock extends AbstractBlock {
    checked: boolean;
    checkbox: HTMLInputElement;
    textbox: StandoffEditorBlock;
    constructor(args: ICheckBlockConstructor) {
        super(args);
        this.type = BlockType.CheckboxBlock;
        this.checked = args.checked || false;
        this.checkbox = document.createElement("INPUT") as HTMLInputElement;
        updateElement(this.checkbox, {
            attribute: {
                type: "checkbox"
            },
            style: {
                float: "left",
                height: "50px",
                width: "50px"
            }
        });
        const wrapper = document.createElement("DIV") as HTMLDivElement;
        this.textbox = new StandoffEditorBlock({
            owner: this
        });
        wrapper.append(this.checkbox);
        wrapper.append(this.textbox.container);
        this.container.append(wrapper);
    }
    serialize() {
        return {
            id: this.id,
            type: BlockType.CheckboxBlock,
            checked: this.checked,
            metadata: this.metadata,
            blockProperties: this.blockProperties.map(x => x.serialize()),
            children: this.blocks.map(x => x.serialize())
        } as IBlockDto;
    }
    deserialize(json: any): IBlock {
        throw new Error("Method not implemented.");
    }
    destroy(): void {
        this.textbox.destroy();
        this.container.remove();
    }
}
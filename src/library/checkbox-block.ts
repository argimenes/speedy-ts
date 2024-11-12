import { v4 as uuidv4 } from 'uuid';
import { AbstractBlock } from "./abstract-block";
import { createElement, updateElement } from "./svg";
import { BlockType, IBlockDto, IBlock, IAbstractBlockConstructor } from "./types";

export interface ICheckBlockConstructor extends IAbstractBlockConstructor {
    checked?: boolean;
}

export class CheckboxBlock extends AbstractBlock {
    checked: boolean;
    checkbox: HTMLInputElement;
    wrapper: HTMLDivElement;
    constructor(args: ICheckBlockConstructor) {
        super(args);
        this.id = args?.id || uuidv4();
        this.type = BlockType.CheckboxBlock;
        this.checked = args.checked || false;
        const wrapper = this.wrapper = createElement<HTMLDivElement>("DIV", {
            style: {
                clear: "both"
            }
        });
        this.checkbox = createElement<HTMLInputElement>("INPUT", {
            attribute: {
                type: "checkbox",
                "!checked": args.checked
            },
            style: {
                display: "inline-block",
                height: "25px",
                width: "25px"
            }
        });
        wrapper.append(this.checkbox);
        this.container.append(wrapper);
        this.setupEventHandlers();
    }
    setupEventHandlers() {
        const self = this;
        this.checkbox.addEventListener("change", () => {
            self.checked = !self.checked;
        });
    }
    check() {
        this.checked = true;
        updateElement(this.checkbox, {
            attribute: {
                checked: true
            }
        });
    }
    uncheck() {
        this.checked = false;
        updateElement(this.checkbox, {
            attribute: {
                checked: false
            }
        });
    }
    serialize() {
        return {
            id: this.id,
            type: BlockType.CheckboxBlock,
            checked: this.checked,
            metadata: this.metadata,
            blockProperties: this.blockProperties,
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
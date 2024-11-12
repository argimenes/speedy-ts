import { v4 as uuidv4 } from 'uuid';
import { AbstractBlock } from "./abstract-block";
import { StandoffEditorBlock } from "./standoff-editor-block";
import { createElement, updateElement } from "./svg";
import { BlockType, IBlockDto, IBlock, IStandoffEditorBlockConstructor } from "./types";

export interface ICheckBlockConstructor extends IStandoffEditorBlockConstructor {
    checked?: boolean;
}

export class CheckboxBlock extends AbstractBlock {
    checked: boolean;
    checkbox: HTMLInputElement;
    textbox: StandoffEditorBlock;
    constructor(args: ICheckBlockConstructor) {
        super(args);
        this.id = args?.id || uuidv4();
        this.type = BlockType.CheckboxBlock;
        this.checked = args.checked || false;
        const wrapper = createElement<HTMLDivElement>("DIV");
        this.checkbox = createElement<HTMLInputElement>("INPUT", {
            attribute: {
                type: "checkbox",
                checked: args.checked
            },
            style: {
                float: "left",
                height: "50px",
                width: "50px"
            }
        });
        const standoffSchemas = this.manager.getStandoffSchemas();
        const blockSchemas = this.manager.getBlockSchemas();
        const standoffEvents = this.manager.getStandoffPropertyEvents();
        this.textbox = new StandoffEditorBlock({
            manager: this.manager
        });
        this.textbox.setSchemas(standoffSchemas);
        this.textbox.setBlockSchemas(blockSchemas);
        this.textbox.setEvents(standoffEvents);
        this.textbox.setCommitHandler(this.manager.storeCommit.bind(this));
        if (args?.metadata) this.textbox.metadata = args.metadata;
        if (args?.blockProperties) this.textbox.addBlockProperties(args.blockProperties);
        this.textbox.applyBlockPropertyStyling();
        if (args.text) {
            this.textbox.bind({
                type: BlockType.StandoffEditorBlock,
                text: args.text,
                standoffProperties: args.standoffProperties,
                blockProperties: args.blockProperties
            });
        } else {
            this.textbox.addEOL();
        }
        wrapper.append(this.checkbox);
        wrapper.append(this.textbox.container);
        this.container.append(wrapper);
    }
    setupEventHandlers() {
        const self = this;
        this.checkbox.addEventListener("change", () => {
            self.checked = this.checked;
        });
    }
    convertFromStandoffEditorBlock(block: StandoffEditorBlock) {
        if (block.type != BlockType.StandoffEditorBlock) {
            return;
        }
        const data = block.serialize();
        this.textbox.id = data.id || uuidv4();
        this.textbox.bind({
            type: BlockType.StandoffEditorBlock,
            text: data.text,
            standoffProperties: data.standoffProperties,
            blockProperties: data.blockProperties
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
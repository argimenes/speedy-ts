import { v4 as uuidv4 } from 'uuid';
import { updateElement } from "../library/svg";
import { AbstractBlock } from './abstract-block';
import { IAbstractBlockConstructor, BlockType, IBlockDto, IBlock, CARET, IBindingHandlerArgs, InputEventSource } from '../library/types';
import { UniverseBlock } from '../universe-block';

export class ImageBlock extends AbstractBlock {
    image: HTMLImageElement;
    constructor(args: IAbstractBlockConstructor) {
        super(args);
        this.type = BlockType.ImageBlock;
        this.image = document.createElement("IMG") as HTMLImageElement;
        this.inputEvents = this.getInputEvents();
        this.attachEventHandlers();
    }
    getInputEvents() {
        return [
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "Enter"
                },
                action: {
                    name: "Create a new text block underneath.",
                    description: "",
                    handler: async (args: IBindingHandlerArgs) => {
                        const imageBlock = args.block as ImageBlock;
                        const manager = imageBlock.manager as UniverseBlock;
                        const newBlock = manager.createStandoffEditorBlock();
                        newBlock.addEOL();
                        manager.addBlockAfter(newBlock, imageBlock);
                        setTimeout(() => {
                            manager.setBlockFocus(newBlock);
                            newBlock.setCaret(0, CARET.LEFT);
                        });
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Mouse,
                    match: "click"
                },
                action: {
                    name: "Set focus to the current block.",
                    description: "",
                    handler: async (args: IBindingHandlerArgs) => {
                        const block = args.block as ImageBlock;
                        const manager = block.manager as UniverseBlock;
                        manager.setBlockFocus(block);
                    }
                }
            }
        ];
    }
    attachEventHandlers() {
        this.container.addEventListener("click", this.handleClick.bind(this));
        this.container.addEventListener("keydown", this.handleKeyDown.bind(this));
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
            const args = {
                block: this,
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
    handleClick(e: MouseEvent) {
        const onClick = this.inputEvents.find(x => (x.trigger.match as string).toLowerCase() == "click");
        if (!onClick) return;
        onClick.action.handler({ block: this, caret: {} as any });
    }
    build() {
        if (this.metadata.url) {
            updateElement(this.image, {
                attribute: {
                    src: this.metadata.url
                },
                style: {
                    width: this.metadata.width || "100%",
                    height: this.metadata.height || "auto",
                }
            });
        }
        this.container.appendChild(this.image);
    }
    bind(data: IBlockDto) {
        this.id = data.id || uuidv4();
        if (data.blockProperties) {
            this.addBlockProperties(data.blockProperties);
            this.applyBlockPropertyStyling();
        }
    }
    serialize() {
        return {
            id: this.id,
            type: this.type,
            metadata: this.metadata,
            blockProperties: this.blockProperties?.map(x => x.serialize()) || [],
            children: this.blocks?.map(x => x.serialize()) || []
        } as IBlockDto;
    }
    deserialize(json: any): IBlock {
        throw new Error("Method not implemented.");
    }    
}
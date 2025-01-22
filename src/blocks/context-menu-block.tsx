import { Component } from "solid-js";
import { IBlockDto, IBlock, IAbstractBlockConstructor, BlockType, InputEventSource, IBindingHandlerArgs } from "../library/types";
import { AbstractBlock } from "./abstract-block";
import { render } from "solid-js/web";
import { updateElement } from "../library/svg";
import { UniverseBlock } from "../universe-block";

export interface IContextMenuBlockConstructor extends IAbstractBlockConstructor
{
    source?: IBlock;
}

export class ContextMenuBlock extends AbstractBlock {
    source?: IBlock;
    constructor(args: IContextMenuBlockConstructor) {
        super(args);
        this.type = BlockType.ContextMenuBlock;        
        this.source = args.source;
        this.inputEvents = [
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "Escape"
                },
                action: {
                    name: "Close the context menu",
                    handler: async (args: IBindingHandlerArgs) => {
                        const _this = args.block as ContextMenuBlock;
                        _this.destroy();                        
                    }
                }
            }
        ];
        this.setupPosition();
        const node = this.render();
        this.container.appendChild(node);
    }
    setupPosition() {
        const { x, y } = this.metadata.position;
        const { w, h } = this.metadata.size;
        updateElement(this.container, {
            classList: ["block-window", "context-menu-window"],
            style: {
                position: "absolute",
                width: `${w}px`,
                height: `${h}px`,
                transform: `translate(${x}px,${y}px)`,
                "z-index": this.manager.getHighestZIndex()
            }
        });
    }
    static getBlockBuilder() {
        return {
            type: BlockType.ContextMenuBlock,
            builder: async (container: HTMLElement, dto: IBlockDto, manager: UniverseBlock) => {
                const block = new ContextMenuBlock({ manager, ...dto });
                await manager.buildChildren(block, dto);
                return block;
            }
        };
    }
    render() {
        const node = document.createElement("DIV") as HTMLDivElement;
        render(() => <View block={this} />, node);
        return node;
    }
    serialize(): IBlockDto {
        return {
            type: this.type,
            metadata: this.metadata
        };
    }
    deserialize(json: any | any[]): IBlock {
        return this;
    }    
    destroy() {
        this.container.remove();
        this.manager.deregisterBlock(this.id);
    }
    switchThemeTo(theme: string) {
        const win = this.source;
        if (theme == "normal") {
            const glass = win.blockProperties.find(x => x.type == "block/theme/glass");
            if (glass) this.removeBlockProperty(glass);
            win.addBlockProperties([{ type: "block/theme/paper" }]);
            win.applyBlockPropertyStyling();
        } else if (theme == "glass") {
            const paper = win.blockProperties.find(x => x.type == "block/theme/paper");
            if (paper) win.removeBlockProperty(paper);
            win.addBlockProperties([{ type: "block/theme/glass" }]);
            win.applyBlockPropertyStyling();
        } else {
            // do nothing
        }
    }
}

type ViewProps = {
    block: ContextMenuBlock;
}

const View : Component<ViewProps> = ({ block }) => {
    const normalClicked = (e: Event) => {
        e.preventDefault();
        block.switchThemeTo("normal");
    }
    const glassClicked = (e: Event) => {
        e.preventDefault();
        block.switchThemeTo("glass");
    }
    return (
        <>
            <h3>
                Window Theme
            </h3>
            <ul>
                <li>
                    <button class="btn btn-default" onClick={normalClicked}>Normal</button>
                </li>
                <li>
                    <button class="btn btn-default" onClick={glassClicked}>Glass</button>
                </li>
            </ul>
        </>
    );
}
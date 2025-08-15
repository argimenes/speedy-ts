import { updateElement } from "../library/svg";
import { BlockType, IAbstractBlockConstructor, IBindingHandlerArgs, IBlock, IBlockDto, InputEventSource } from "../library/types";
import { UniverseBlock } from "../universe-block";
import { AbstractBlock } from "./abstract-block";

export interface ISurfaceBlockConstructor extends IAbstractBlockConstructor {}
export interface ISideBlockConstructor extends IAbstractBlockConstructor {}

export class SurfaceBlock extends AbstractBlock {
    constructor(args: ISurfaceBlockConstructor) {
        super(args);
        this.type = BlockType.SurfaceBlock;
    }
    getActiveSide() {
        return this.blocks.find(x => x.metadata.active) as SideBlock;
    }
    getInactiveSide() {
        return this.blocks.find(x => !x.metadata.active) as SideBlock;
    }
    toggleActiveSides() {
        const activeSide = this.getActiveSide();
        const inactiveSide = this.getInactiveSide();
        activeSide.setInactive();
        inactiveSide.setActive();
        this.updateSides();
    }
    updateSides() {
        this.blocks.forEach((side: SideBlock) => side.update());
    }
    static getBlockBuilder() {
        return {
            type: BlockType.SurfaceBlock,
            builder: async (container: HTMLElement, dto: IBlockDto, manager: UniverseBlock) => {
                const block = new SurfaceBlock({
                    ...dto, manager
                });
                await manager.buildChildren(block, dto);
                block.container.classList.add("surface-block");
                block.updateSides();
                container.appendChild(block.container);
                return block;
            }
        };
    }
    serialize(): IBlockDto {
        return {
            id: this.id,
            type: this.type,
            metadata: this.metadata,
            blockProperties: this.blockProperties
        }
    }
    deserialize(json: any | any[]): IBlock {
        return this;
    }    
}

export class SideBlock extends AbstractBlock {
    constructor(args: ISideBlockConstructor) {
        super(args);
        this.type = BlockType.SideBlock;
        this.metadata = args.metadata || {};
        //this.inputEvents = this.getInputEvents();
    }
    getInputEvents() {
        const self = this;
        return [
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Mouse,
                    match: "click"
                },
                action: {
                    name: "",
                    description: "",
                    handler: async (args: IBindingHandlerArgs) => {
                        const block = args.block as SideBlock;
                        block.toggle();
                    }
                }
            }
        ]
    }
    static getBlockBuilder() {
        return {
            type: BlockType.SideBlock,
            builder: async (container: HTMLElement, dto: IBlockDto, manager: UniverseBlock) => {
                const block = new SideBlock({
                    ...dto, manager
                });
                await manager.buildChildren(block, dto);
                block.container.classList.add("side-block");
                block.container.addEventListener("dblclick", (e) => {
                    e.preventDefault();
                    block.toggle();
                });
                container.appendChild(block.container);
                return block;
            }
        };
    }
    toggle() {
        const parent = this.relation.parent as SurfaceBlock;
        parent.toggleActiveSides();
    }
    setInactive() {
        this.metadata.active = false;
    }
    setActive() {
        this.metadata.active = true;
    }
    update() {
        const active = this.metadata.active || false;
        if (active) {
            this.container.classList.add("active");
        } else {
            this.container.classList.remove("active");
        }
    }
    serialize(): IBlockDto {
        return {
            id: this.id,
            type: this.type,
            metadata: this.metadata,
            blockProperties: this.blockProperties
        }
    }
    deserialize(json: any | any[]): IBlock {
        return this;
    }    
}
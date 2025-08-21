import { v4 as uuidv4 } from 'uuid';
import { AbstractBlock } from './abstract-block';
import { IAbstractBlockConstructor, BlockType, IBlockDto, IBlock } from '../library/types';
import { UniverseBlock } from '../universe-block';
import { setElement } from '../library/svg';
import { InfiniteCanvas } from '../library/infinite-canvas';

export class CanvasBlock extends AbstractBlock {
    canvas: HTMLDivElement;
    viewport: HTMLDivElement;
    minimap: HTMLCanvasElement;
    control: InfiniteCanvas;
    constructor(args: IAbstractBlockConstructor) {
        super(args);
        this.type = BlockType.CanvasBlock;
        this.canvas = document.createElement("DIV") as HTMLDivElement;
        this.viewport = document.createElement("DIV") as HTMLDivElement;
        this.minimap = document.createElement("CANVAS") as HTMLCanvasElement;
    }
    static getBlockBuilder() {
        return {
            type: BlockType.CanvasBlock,
            builder: async (container: HTMLElement, dto: IBlockDto, manager: UniverseBlock) => {
                const block = new CanvasBlock({ manager, ...dto });
                if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
                block.applyBlockPropertyStyling();
                await manager.buildChildren(block, dto);
                block.build();
                container.appendChild(block.container);
                return block;
            }
        };
    }
    build() {
        setElement(this.minimap, {
            classList: ["minimap"],
            style: {
                width: "200px",
                height: "150px"
            }
        });
        setElement(this.canvas, { classList: ["canvas"] });
        setElement(this.viewport, { classList: ["viewport"] });
        this.viewport.appendChild(this.canvas);
        this.viewport.appendChild(this.minimap);
        this.container.appendChild(this.viewport);
        this.control = new InfiniteCanvas(this.viewport, this.canvas, this.minimap);
        this.control.addBox();
        this.control.addBox();
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
        return this;
    }
}
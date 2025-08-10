import { v4 as uuidv4 } from 'uuid';
import { updateElement } from "../library/svg";
import { AbstractBlock } from './abstract-block';
import { IAbstractBlockConstructor, BlockType, IBlockDto, IBlock } from '../library/types';
import { UniverseBlock } from '../universe-block';

export class PocketBlock extends AbstractBlock {
    constructor(args: IAbstractBlockConstructor) {
        super(args);
        this.type = BlockType.PocketBlock;
        this.inputEvents = this.getInputEvents();
        this.setBlockSchemas(this.getBlockSchemas());
    }
    getBlockSchemas() {
        return [
            
        ]
    }
    static getBlockBuilder() {
        return {
            type: BlockType.PocketBlock,
            builder: async (container: HTMLElement, dto: IBlockDto, manager: UniverseBlock) => {
                const block = new PocketBlock({ manager, ...dto });
                if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
                block.applyBlockPropertyStyling();
                block.build();
                await manager.buildChildren(block, dto);
                container.appendChild(block.container);
                return block;
            }
        };
    }
    getInputEvents() {
        return [
            
        ];
    }
    build() {
        updateElement(this.container, { classList: ["pocket-block"] });
        this.update();
    }
    update() {
        const height = this.metadata.height;
        if (height) {
            updateElement(this.container, {
                style: {
                    "height": height + "px",
                }
            });
        }
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
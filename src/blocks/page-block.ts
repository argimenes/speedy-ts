import { AbstractBlock } from './abstract-block';
import { IAbstractBlockConstructor, BlockType, IBlockDto, IBlock } from '../library/types';
import { UniverseBlock } from '../universe-block';

export class PageBlock extends AbstractBlock {
    constructor(args: IAbstractBlockConstructor) {
        super(args);
        this.type = BlockType.PageBlock;
    }
    static getBlockBuilder() {
        return {
            type: BlockType.PageBlock,
            builder: async (container: HTMLElement, dto: IBlockDto, manager: UniverseBlock) => {
                let test = {...dto, type: BlockType.PageBlock };
                const block = new PageBlock({ manager, ...test });
                if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
                block.applyBlockPropertyStyling();
                await manager.buildChildren(block, dto);
                container.appendChild(block.container);
                return block;
            }
        };
    }
    setFocus() {
        this.container.focus();
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
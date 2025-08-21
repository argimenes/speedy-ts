import { AbstractBlock } from './abstract-block';
import { IAbstractBlockConstructor, BlockType, IBlockDto, IBlock } from '../library/types';
import { UniverseBlock } from '../universe-block';
import { setElement } from '../library/svg';

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
                const page = new PageBlock({ manager, ...test });
                if (dto?.blockProperties) page.addBlockProperties(dto.blockProperties);
                page.applyBlockPropertyStyling();
                await manager.buildChildren(page, dto);
                setElement(page.container, { classList: ["page-container"] });
                container.appendChild(page.container);
                return page;
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
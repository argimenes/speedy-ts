import { v4 as uuidv4 } from 'uuid';
import { AbstractBlock } from './abstract-block';
import { IAbstractBlockConstructor, BlockType, IBlockDto, IBlock } from '../library/types';
import { UniverseBlock } from '../universe-block';

export class WorkspaceBlock extends AbstractBlock {
    iframe: HTMLDivElement;
    player: any;
    constructor(args: IAbstractBlockConstructor) {
        super(args);
        this.type = BlockType.WorkspaceBlock;
    }
    static getBlockBuilder() {
        return {
            type: BlockType.WorkspaceBlock,
            builder: async (container: HTMLElement, blockDto: IBlockDto, manager: UniverseBlock) => {
                const workspace = new WorkspaceBlock({ manager, ...blockDto });
                await manager.buildChildren(workspace, blockDto);
                container.appendChild(workspace.container);
                return workspace;
            }
        };
    }
    build() {
        
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
        return null;   
    }    
}
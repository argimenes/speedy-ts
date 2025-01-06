import { v4 as uuidv4 } from 'uuid';
import { AbstractBlock } from './abstract-block';
import { IAbstractBlockConstructor, BlockType, IBlockDto, IBlock } from '../library/types';

export class WorkspaceBlock extends AbstractBlock {
    iframe: HTMLDivElement;
    player: any;
    constructor(args: IAbstractBlockConstructor) {
        super(args);
        this.type = BlockType.WorkspaceBlock;
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
    destroy() {
        
    }
    async destroyAsync(): Promise<void> {
        
    }
}
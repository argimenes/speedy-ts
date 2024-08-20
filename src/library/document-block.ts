import { v4 as uuidv4 } from 'uuid';
import { AbstractBlock } from './abstract-block';
import { IAbstractBlockConstructor, BlockType, IMainListBlockDto as IDocumentBlockDto, IBlockDto, IBlock } from './types';
import { StandoffEditorBlock } from './standoff-editor-block';

export class DocumentBlock extends AbstractBlock {
    index: IBlock[];
    constructor(args: IAbstractBlockConstructor) {
        super(args);
        this.type = BlockType.DocumentBlock;
        this.index = [];
    }
    indexDocumentTree() {
        const rootBlock = this as IBlock;
      
        const queue = [rootBlock];
        const indexedBlocks = [];
      
        while (queue.length > 0) {
          const currentBlock = queue.shift() as IBlock;
          indexedBlocks.push(currentBlock);
      
          if (currentBlock.blocks && Array.isArray(currentBlock.blocks)) {
            queue.push(...currentBlock.blocks);
          }
        }
        console.log("indexDocumentTree", { rootBlock, indexedBlocks: indexedBlocks
            .filter(x => x.type == BlockType.StandoffEditorBlock)
            .map((x,i) => ({
            i, id: x.id, text: (x as StandoffEditorBlock).serialize().text
        })) });

        this.index = indexedBlocks.filter(x => x.type == BlockType.StandoffEditorBlock);

        return indexedBlocks;
    }
    bind(data: IDocumentBlockDto) {
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
    destroy(): void {
        if (this.container) this.container.remove();
    }

}
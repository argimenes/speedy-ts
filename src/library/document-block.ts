import { v4 as uuidv4 } from 'uuid';
import { AbstractBlock } from './abstract-block';
import { IAbstractBlockConstructor, BlockType, IMainListBlockDto as IDocumentBlockDto, IBlockDto, IBlock } from './types';
import { StandoffEditorBlock } from './standoff-editor-block';

export interface IndexedBlock {
    block: IBlock;
    index: number;
    depth: number;
    path: number[];
}

export class DocumentBlock extends AbstractBlock {
    index: IndexedBlock[];
    constructor(args: IAbstractBlockConstructor) {
        super(args);
        this.type = BlockType.DocumentBlock;
        this.index = [];
    }
    indexDocumentTree(): IndexedBlock[] {
        const rootBlock = this as IBlock;

        let indexedBlocks = [];
        if (!rootBlock) return [];
    
        const queue: { block: IBlock; depth: number; path: number[] }[] = [{ block: rootBlock, depth: 0, path: [] }];
    
        while (queue.length > 0) {
          const { block, depth, path } = queue.shift()!;
          const index = indexedBlocks.length;
    
          const indexedBlock: IndexedBlock = {
            block,
            index,
            depth,
            path: [...path, index],
          };
    
        indexedBlocks.push(indexedBlock);
    
          if (block.blocks && Array.isArray(block.blocks)) {
            queue.push(...block.blocks.map((child, i) => ({
              block: child,
              depth: depth + 1,
              path: [...indexedBlock.path, i],
            } as IndexedBlock)));
          }
        }

        this.index = indexedBlocks.filter(x => x.block.type == BlockType.StandoffEditorBlock);

        console.log("indexDocumentTree2", { indexedBlocks, index: this.index, rootBlock });
    
        return indexedBlocks;
    }
    // indexDocumentTree__OLD() {
    //     const rootBlock = this as IBlock;
      
    //     const queue = [rootBlock];
    //     const indexedBlocks = [];
      
    //     while (queue.length > 0) {
    //       const currentBlock = queue.shift() as IBlock;
    //       indexedBlocks.push(currentBlock);
      
    //       if (currentBlock.blocks && Array.isArray(currentBlock.blocks)) {
    //         queue.push(...currentBlock.blocks);
    //       }
    //     }
    //     console.log("indexDocumentTree", { rootBlock, indexedBlocks: indexedBlocks
    //         .filter(x => x.type == BlockType.StandoffEditorBlock)
    //         .map((x,i) => ({
    //         i, id: x.id, text: (x as StandoffEditorBlock).serialize().text
    //     })) });

    //     this.index = indexedBlocks.filter(x => x.type == BlockType.StandoffEditorBlock);

    //     return indexedBlocks;
    // }
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
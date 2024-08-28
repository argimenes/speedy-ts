import { v4 as uuidv4 } from 'uuid';
import { AbstractBlock } from './abstract-block';
import { IAbstractBlockConstructor, BlockType, IMainListBlockDto as IDocumentBlockDto, IBlockDto, IBlock } from './types';

export interface IndexedBlock {
  block: IBlock;
  index: number;
  depth: number;
  path: string;
}

export class DocumentBlock extends AbstractBlock {
    index: IndexedBlock[];
    constructor(args: IAbstractBlockConstructor) {
        super(args);
        this.type = BlockType.DocumentBlock;
        this.index = [];
    }
    generateIndex(): IndexedBlock[] {
      const result: IndexedBlock[] = [];
      function traverse(block: IBlock, depth: number = 0, path: string = '0'): void {
          // Visit the current node
          result.push({ block, index: result.length, depth, path });
          // Recursively traverse all children
          block.blocks.forEach((child, index) => {
              traverse(child, depth + 1, `${path}.${index + 1}`);
          });
      }
      traverse(this);
      this.index = result.filter(x => x.block.type == BlockType.StandoffEditorBlock);
      console.log("generateIndex", { index: this.index, result, root: this });
      return result;
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
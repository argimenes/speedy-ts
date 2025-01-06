import { v4 as uuidv4 } from 'uuid';
import { AbstractBlock } from './abstract-block';
import { IAbstractBlockConstructor, BlockType, IMainListBlockDto as IDocumentBlockDto, IBlockDto, IBlock, CARET } from '../library/types';
import { StandoffEditorBlock } from './standoff-editor-block';

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
    setFocus() {
        const workspace = this.manager;
        if (this.metadata?.focus?.blockId) {
            const block = this.getBlock(this.metadata.focus.blockId);
            workspace.setBlockFocus(block);
            if (this.metadata.focus.caret) {
                (block as StandoffEditorBlock)?.setCaret(this.metadata.focus.caret, CARET.LEFT);
            }
        } else {
            const textBlock = workspace.registeredBlocks.find(x => x.type == BlockType.StandoffEditorBlock) as StandoffEditorBlock;
            if (textBlock) {
                workspace.setBlockFocus(textBlock);
                textBlock.moveCaretStart();
            }
        }
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
      this.index = result.filter(x => x.block.type == BlockType.StandoffEditorBlock || x.block.type == BlockType.CheckboxBlock);
      return result;
    }
    bind(data: IDocumentBlockDto) {
        this.id = data.id || uuidv4();
        if (data.blockProperties) {
            this.addBlockProperties(data.blockProperties);
            this.applyBlockPropertyStyling();
        }
        this.metadata = data.metadata || {};
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
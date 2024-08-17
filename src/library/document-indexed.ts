import { AbstractBlock } from "./abstract-block";
import { GUID, IBlock } from "./types";

  interface IndexedBlock extends IBlock {
    index: number;
    depth: number;
    path: number[];
  }
  
export  class DocumentIndexer {
    private indexedBlocks: IndexedBlock[];
  
    constructor() {
      this.indexedBlocks = [];
    }
  
    indexDocumentTree(rootBlock: IBlock): IndexedBlock[] {
        this.indexedBlocks = [];
        if (!rootBlock) return [];
    
        const queue: { block: IBlock; depth: number; path: number[] }[] = [{ block: rootBlock, depth: 0, path: [] }];
    
        while (queue.length > 0) {
          const { block, depth, path } = queue.shift()!;
          const index = this.indexedBlocks.length;
    
          const indexedBlock: IndexedBlock = {
            ...block,
            index,
            depth,
            path: [...path, index],
          };
    
          this.indexedBlocks.push(indexedBlock);
    
          if (block.blocks && Array.isArray(block.blocks)) {
            queue.push(...block.blocks.map((child, i) => ({
              block: child,
              depth: depth + 1,
              path: [...indexedBlock.path, i],
            })));
          }
        }
    
        return this.indexedBlocks;
      }
  
    findBlockByIndex(index: number): IndexedBlock | undefined {
      return this.indexedBlocks.find(block => block.index === index);
    }
  
    findBlockByPath(path: number[]): IndexedBlock | undefined {
      return this.indexedBlocks.find(block => 
        block.path.length === path.length && 
        block.path.every((value, index) => value === path[index])
      );
    }
  
    getBlocksBetweenIndices(startIndex: number, endIndex: number): IndexedBlock[] {
      return this.indexedBlocks.slice(startIndex, endIndex + 1);
    }
  }
  
  // Example usage:
//   const rootBlock: AbstractBlock = {
//     type: 'root',
//     content: 'Root',
//     blocks: [
//       { type: 'text', content: 'Paragraph 1' },
//       {
//         type: 'list',
//         content: 'List',
//         blocks: [
//           { type: 'listItem', content: 'List Item 1' },
//           { type: 'listItem', content: 'List Item 2' },
//           {
//             type: 'list',
//             content: 'Nested List',
//             blocks: [
//               { type: 'listItem', content: 'Nested List Item 1' }
//             ]
//           }
//         ]
//       },
//       { type: 'text', content: 'Paragraph 2' }
//     ]
//   };
  
//   const indexer = new DocumentIndexer();
//   const indexedBlocks = indexer.indexDocumentTree(rootBlock);
  
//   // Print the indexed blocks
//   indexedBlocks.forEach(block => {
//     console.log(`Index: ${block.index}, Depth: ${block.depth}, Path: [${block.path.join(', ')}], Type: ${block.type}, Content: ${block.content}`);
//   });
  
//   // Example of finding a block
//   const blockAtIndex3 = indexer.findBlockByIndex(3);
//   console.log('Block at index 3:', blockAtIndex3);
  
//   const blockAtPath210 = indexer.findBlockByPath([2, 1, 0]);
//   console.log('Block at path [2, 1, 0]:', blockAtPath210);
  
//   const blocksBetween2And4 = indexer.getBlocksBetweenIndices(2, 4);
//   console.log('Blocks between indices 2 and 4:', blocksBetween2And4);
import { createStore } from "solid-js/store";
import { Block } from "./types";

export interface BlockActions {
  addBlockBefore: (targetId: string, newBlock: Omit<Block, 'id'>) => string;
  addBlockAfter: (targetId: string, newBlock: Omit<Block, 'id'>) => string;
  replaceBlock: (targetId: string, newBlock: Omit<Block, 'id'>) => void;
  deleteBlock: (targetId: string) => void;
}

export function createDocumentStore(initialBlocks: Block[]) {
  const [blocks, setBlocks] = createStore<Block[]>(initialBlocks);

  const actions: BlockActions = {
    addBlockBefore(targetId: string, newBlock: Omit<Block, 'id'>) {
      const newId = crypto.randomUUID();
      
      function addBeforeRecursive(blocks: Block[]): Block[] {
        return blocks.map(block => {
          if (block.id === targetId) {
            return [
              { ...newBlock, id: newId },
              block
            ];
          }
          if (block.children) {
            return {
              ...block,
              children: addBeforeRecursive(block.children)
            };
          }
          return block;
        }).flat();
      }

      setBlocks(blocks => addBeforeRecursive(blocks));
      return newId;
    },

    addBlockAfter(targetId: string, newBlock: Omit<Block, 'id'>) {
      const newId = crypto.randomUUID();
      
      function addAfterRecursive(blocks: Block[]): Block[] {
        return blocks.map(block => {
          if (block.id === targetId) {
            return [
              block,
              { ...newBlock, id: newId }
            ];
          }
          if (block.children) {
            return {
              ...block,
              children: addAfterRecursive(block.children)
            };
          }
          return block;
        }).flat();
      }

      setBlocks(blocks => addAfterRecursive(blocks));
      return newId;
    },

    replaceBlock(targetId: string, newBlock: Omit<Block, 'id'>) {
      function replaceRecursive(blocks: Block[]): Block[] {
        return blocks.map(block => {
          if (block.id === targetId) {
            return {
              ...newBlock,
              id: block.id,
              children: block.children // Preserve children
            };
          }
          if (block.children) {
            return {
              ...block,
              children: replaceRecursive(block.children)
            };
          }
          return block;
        });
      }

      setBlocks(blocks => replaceRecursive(blocks));
    },

    deleteBlock(targetId: string) {
      function deleteRecursive(blocks: Block[]): Block[] {
        return blocks.filter(block => block.id !== targetId)
          .map(block => ({
            ...block,
            children: block.children ? deleteRecursive(block.children) : undefined
          }));
      }

      setBlocks(blocks => deleteRecursive(blocks));
    }
  };

  return [blocks, actions] as const;
}
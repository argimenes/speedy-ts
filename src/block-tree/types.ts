// types.ts
export type BlockType = 'text' | 'heading' | 'list' | 'image' // etc.

export interface Block {
  id: string;
  type: BlockType;
  content?: string;
  children?: Block[];
}
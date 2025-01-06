import { v4 as uuidv4 } from 'uuid';
import { AbstractBlock } from './abstract-block';
import { IAbstractBlockConstructor, BlockType, BlockState, IMainListBlockDto as IDocumentBlockDto, IBlockDto, IBlock, CARET, InputEventSource, EventType } from '../library/types';
import { StandoffEditorBlock } from './standoff-editor-block';

const maxHistoryItems = 30;

export interface IndexedBlock {
  block: IBlock;
  index: number;
  depth: number;
  path: string;
}

export class DocumentBlock extends AbstractBlock {
    undoStack: IBlockDto[];
    redoStack: IBlockDto[];
    index: IndexedBlock[];
    state: string;
    lastChange: number;
    constructor(args: IAbstractBlockConstructor) {
        super(args);
        this.type = BlockType.DocumentBlock;
        this.index = [];
        this.undoStack = [];
        this.redoStack = [];
        this.inputEvents = this.getStandoffPropertyEvents();
        this.lastChange = Date.now();
    }
    getStandoffPropertyEvents() {
        const self = this;
        return [
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: ["Mac:Meta-Z","Windows:Control-Z"]
                },
                action: {
                    name: "Undo",
                    description: "",
                    handler: async (args) => {
                        await self.undoHistory();
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: ["Mac:Meta-D","Windows:Control-D"]
                },
                action: {
                    name: "Redo",
                    description: "",
                    handler: async (args) => {
                        self.redoHistory();
                    }
                }
            }
        ]
    }
    setupSubscriptions() {
        this.subscribeTo(EventType.beforeChange, this.addToHistory.bind(this));
    }
    minimalTimeElapsedSinceLastChange() {
        if (this.state == BlockState.loading) {
            return false;
        }
        const now = Date.now();
        const ms = now - this.lastChange;
        if (ms < 1000) {
            return false;
        }
        this.updateLastChange();
        return true;
    }
    updateLastChange() {
        this.lastChange = Date.now();
    }
    takeSnapshot(dto?: IBlockDto) {
        const len = this.undoStack.length;
        if (len == 10) {
            this.undoStack.shift();
        }
        dto = dto || this.serialize();
        this.undoStack.push(dto);
    }
    addToHistory() {
        if (!this.minimalTimeElapsedSinceLastChange()) {
            //console.log("bounced: addToHistory");
            return;
        }
        this.takeSnapshot();
    }
    clearHistory() {
        this.undoStack = [];
        this.redoStack = [];
    }
    async redoHistory() {
        const last = this.redoStack.pop();
        if (!last) return;
        if (this.undoStack.length == maxHistoryItems) {
            this.undoStack.shift();
        }
        const dto = this.serialize();
        this.undoStack.push(dto);
        await this.manager.loadDocument(last);
    }
    async undoHistory() {
        const last = this.undoStack.pop();
        if (!last) return;
        if (this.redoStack.length == maxHistoryItems) {
            this.redoStack.shift();
        }
        const dto = this.serialize();
        this.redoStack.push(last);
        this.redoStack.push(dto);
        // await this.destroyAll();
        await this.manager.loadDocument(last);
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
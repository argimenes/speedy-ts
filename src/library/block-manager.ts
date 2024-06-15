import { KEYS, Platform, TPlatformKey } from "./keyboard";
import { InputEventSource, InputEvent, BlockType, CARET, GUID, IBindingHandlerArgs, IBlock,
    IBlockManager, IBlockRelation, IRange, IStandoffPropertySchema, Mode, DIRECTION, StandoffEditorBlock,
    StandoffEditorBlockDto, StandoffProperty, Commit, Cell, BlockProperty, Command, ISelection, Word, RowPosition,
    BlockPropertyDto, IBlockPropertySchema, 
    IBlockDto,
    IMainListBlockDto,
    IStandoffEditorBlockDto} from "./standoff-editor-block";
import { createUnderline, updateElement } from "./svg";
import { v4 as uuidv4 } from 'uuid';
import { MarginBlock, RightMarginBlock } from "./margin-block";
import { MainListBlock } from "./main-list-block";
import { IndentedListBlock } from "./indented-list-block";
import { pipeToNodeWritable } from "solid-js/web";
import { TabBlock, TabRowBlock } from "./tabs-block";
import { GridBlock, GridCellBlock, GridRowBlock } from "./gird-block";

export enum CssClass {
    LineBreak = "codex__line-break"
}
export interface IEdge {
    sourceId: string;
    name: string;
    targetId: string;
}
export interface IAddEdge extends IEdge {
    
}
export interface IBatchRelateArgs {
    toDelete?: IEdge[];
    toAdd?: IEdge[];
}

export interface IBlockManagerConstructor {
    id?: GUID;
    container?: HTMLDivElement;
}
export interface IBlockRange {
    start: IBlock;
    end: IBlock;
}
export interface IBlockSelection extends IBlockRange {
    direction: DIRECTION;
}

enum PointerDirection {
    Undo,
    Redo
}
export class BlockManager implements IBlockManager {
    id: string;
    type: BlockType;
    container: HTMLDivElement;
    blocks: IBlock[];
    relation: Record<string, IBlock>;
    metadata: Record<string,any>;
    focus?: IBlock;
    selections: IBlockSelection[];
    commits: Commit[];
    pointer: number;
    direction: PointerDirection;
    owner?: IBlock | undefined;
    blockProperties: BlockProperty[];
    blockSchemas: IBlockPropertySchema[];
    constructor(props?: IBlockManagerConstructor) {
        this.id = props?.id || uuidv4();
        this.type = BlockType.IndentedListBlock;
        this.container = props?.container || document.createElement("DIV") as HTMLDivElement;
        this.blocks = [this];
        this.metadata = {};
        this.relation = {};
        this.selections = [];
        this.commits = [];
        this.pointer = 0;
        this.direction = PointerDirection.Undo;
        this.blockProperties= [];
        this.blockSchemas=[];
    }
    addBlockProperties(properties: BlockPropertyDto[]) {
        const self = this;
        const props = properties.map(x => new BlockProperty({ type: x.type, block: self, schema: self.blockSchemas.find(x2 => x2.type == x.type) as IBlockPropertySchema }));
        this.blockProperties.push(...props);
    }
    applyBlockPropertyStyling() {
        this.blockProperties.forEach(p => {
            p.applyStyling();
        });
    }
    updateView() {
        this.blocks.forEach(x => x.updateView());
    }
    batchRelate(batch: IBatchRelateArgs) {
        const self = this;
        if (batch.toAdd) {
            batch.toAdd.forEach(change => {
                const source = self.getBlock(change.sourceId);
                const target = self.getBlock(change.targetId);
                source.relation[change.name] = target;
            });
        }
        if (batch.toDelete) {
            batch.toDelete.forEach(change => {
                const source = self.getBlock(change.sourceId);
                delete source.relation[change.name];
            })
        }
        this.commit({
            redo: {
                id: this.id,
                name: "batchRelate",
                value: { toAdd: batch.toAdd, toDelete: batch.toDelete }
            },
            undo: {
                id: this.id,
                name: "batchRelate",
                value: { toAdd: batch.toDelete, toDelete: batch.toAdd }
            }
        });
    }
    redo() {
        this.direction = PointerDirection.Redo;
        this.executeCommandAtPointer();
        this.pointer++;
    }
    undo() {
        this.direction = PointerDirection.Undo;
        this.executeCommandAtPointer();
        this.pointer--;
    }
    executeCommandAtPointer() {
        const commit = this.commits[this.pointer];
        const cmd = this.direction == PointerDirection.Undo ? commit.undo : commit.redo;
        if (!cmd) return;
        this.executeCommand(cmd as Command);
    }
    executeCommand(command: Command) {
        const value = command.value as any;
        switch (command.name) {
            case "bind": {
                let block = this.getBlock(command.id) as StandoffEditorBlock;
                block.bind(value);
                return;
            }
            case "unbind": {
                let block = this.getBlock(command.id) as StandoffEditorBlock;
                block.unbind();
                return;
            }
            case "insertTextAtIndex": {
                let block = this.getBlock(command.id) as StandoffEditorBlock;
                block.insertTextAtIndex(value.text, value.index);
                return;
            }
            case "setCaret": {
                let block = this.getBlock(command.id) as StandoffEditorBlock;
                block.setCaret(value.index, value.offset);
                return;
            }
            case "removeCellAtIndex": {
                let block = this.getBlock(command.id) as StandoffEditorBlock;
                block.removeCellAtIndex(value.index, value.updateCaret);
                return;
            }
            case "removeCellsAtIndex": {
                let block = this.getBlock(command.id) as StandoffEditorBlock;
                block.removeCellsAtIndex(value.index, value.length, value.updateCaret);
                return;
            }
            case "createStandoffEditorBlock": {
                let block = this.getBlock(command.id) as BlockManager;
                block.createStandoffEditorBlock();
                return;
            }
            case "uncreateStandoffEditorBlock": {
                let block = this.getBlock(command.id) as BlockManager;
                block.uncreateStandoffEditorBlock(value.id);
                return;
            }
            default: {
                console.log("Command not handled.", { command });
                break;
            }
        }
    }
    addRelation(name: string) {

    }
    removeRelation(name: string) {

    }
    setFocus() {

    }
    setBlockFocus(block: IBlock) {
        this.focus = block;
        block.setFocus();
    }
    getBlockSchemas() {
        return [
            {
                type: "block/font-size/three-quarters",
                name: "3/4 the regular font size",
                decorate: {
                    blockClass: "block_font-size_three-quarters"
                }
            },
            {
                type: "block/marginalia/left",
                name: "Left margin block",
                description: "Handles the alignment of a left margin block to the one to its right.",
                decorate: {
                    blockClass: "block_marginalia_left"
                }
            },
            {
                type: "block/marginalia/right",
                name: "Right margin block",
                description: "Handles the alignment of a right margin block to the one to its left.",
                decorate: {
                    blockClass: "block_marginalia_right"
                }
            },
            {
                type: "block/alignment/right",
                name: "Right Alignment",
                description: "Align text in the block to the right.",
                decorate: {
                    blockClass: "block_alignment_right"
                }
            },
            {
                type: "block/alignment/centre",
                name: "Centre Alignment",
                description: "Align text in the block to the middle.",
                decorate: {
                    blockClass: "block_alignment_centre"
                }
            },
            {
                type: "block/alignment/left",
                name: "Left Alignment",
                description: "Align text in the block to the left",
                decorate: {
                    blockClass: "block_alignment_left"
                }
            },
            {
                type: "block/alignment/justify",
                name: "Justified Alignment",
                description: "Justifies the alignment of the text.",
                decorate: {
                    blockClass: "block_alignment_justify"
                }
            },
            {
                type: "block/animation/sine-wave",
                name: "Sine Wave",
                description: "Animates the paragraph as a text sine wave.",
                animation: {
                    init: (p: BlockProperty) => {
                        const manager = p.block.owner as BlockManager;
                        manager.animateSineWave(p);
                    }
                }
            },
            {
                type: "block/blue-and-white",
                name: "Blue and White",
                decorate: {
                    blockClass: "block_blue_and_white"
                }
            }
        ]
    }
    animateSineWave(p: BlockProperty) {
        let pos = 0;
        let startTime = 0;
        let previousTime = 0;
        let pausedTime = 0;
        let paused = false;
        const block = p.block as StandoffEditorBlock;
        const width = block.cache.offset.w;
        const height = block.cache.offset.h;
        const centerY = height / 2;
        const amplitude = height * 0.1;
        const speed = 150;
        const degrees = 45;
        const cells = block.cells;
        const text = cells.map(c => {
            let w = c.cache.offset.w;
            const data = {
                cell: c, width: w, position: pos
            };
            pos += w;
            return data;
        });
        const scrollText = (dt: number) => {
            text.forEach((charObj) => {
              charObj.position += dt * speed;
          
              if (charObj.position > width) {
                charObj.position = -charObj.width;
              }
          
              const y = Math.sin(charObj.position / degrees) * amplitude;
              updateElement(charObj.cell.element as HTMLSpanElement, {
                style: {
                    position: "absolute",
                    x: charObj.position + "px",
                    y: (centerY + y) + "px"
                }
              });
            }); 
          };
        const getTime = () => {
            return paused 
                 ? pausedTime 
                 : Date.now() - startTime;
          };
        const animate = () => {
            const now = getTime();
            const dt = (now - previousTime) * 0.001 // delta time in seconds.
            previousTime = now;
            scrollText(dt);
            if (!paused) {
                requestAnimationFrame(animate);
            }
        };
        animate();
    }
    getEditorEvents() {
        const events: InputEvent[] = [
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "Shift-Control-ArrowLeft"
                },
                action: {
                    name: "Create a left margin block.",
                    description: `
                        Let's describe how this works ...
                    `,
                    handler: (args: IBindingHandlerArgs) => {
                        const { caret } = args;
                        const block = args.block as StandoffEditorBlock;
                        const manager = block.owner as BlockManager;
                        let leftMargin = block.relation.leftMargin as MarginBlock;
                        if (!leftMargin) {
                            leftMargin = manager.createMarginBlock();
                            const child = manager.createStandoffEditorBlock();
                            child.addEOL();
                            manager.batchRelate({
                                toAdd: [
                                    { sourceId: leftMargin.id, name: "firstChild", targetId: child.id },
                                    { sourceId: child.id, name: "parent", targetId: leftMargin.id },
                                ]
                            });
                            leftMargin.container.classList.add("block-window");
                            child.container.classList.add("block-window");
                            child.addBlockProperties([ { type: "block/alignment/left" } ]);
                            child.applyBlockPropertyStyling();
                            leftMargin.addBlockProperties([ { type: "block/marginalia/left" } ]);
                            leftMargin.applyBlockPropertyStyling();
                            manager.stageLeftMarginBlock(leftMargin, block);
                            child.setCaret(0, CARET.LEFT);
                            manager.setBlockFocus(child);
                            // updateElement(leftMargin.container, {
                            //     style: {
                            //         top: block.cache.offset.y + "px",
                            //         left: "-200px"
                            //     }
                            // });
                            // const hand = document.createElement("SPAN") as HTMLSpanElement;
                            // hand.innerHTML = "☞";
                            // updateElement(hand, {
                            //     style: {
                            //         "font-size": "1.5rem",
                            //         position: "absolute",
                            //         top: 0,
                            //         right: 0
                            //     }
                            // });
                            // manager.blocks.push(leftMargin);
                            // manager.blocks.push(child);
                            // // leftMargin.relation.firstChild = child;
                            // // child.relation.parent = leftMargin;
                            // manager.batchRelate({
                            //     toAdd: [
                            //         { sourceId: block.id, name: "leftMargin", targetId: leftMargin.id },
                            //         { sourceId: leftMargin.id, name: "parent", targetId: block.id },
                            //     ]
                            // });
                            // // block.relation.leftMargin = leftMargin;
                            // // leftMargin.relation.parent = block;
                            // block.container.parentElement?.appendChild(leftMargin.container);
                            // leftMargin.container.appendChild(child.container);
                            
                            return;
                        } else {
                            const child = leftMargin.relation.firstChild as StandoffEditorBlock;
                            child.setCaret(0, CARET.LEFT);
                            manager.setBlockFocus(child);
                        }
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "Shift-Control-ArrowRight"
                },
                action: {
                    name: "Create a right margin block.",
                    description: `
                        Let's describe how this works ...
                    `,
                    handler: (args: IBindingHandlerArgs) => {
                        const { caret } = args;
                        const block = args.block as StandoffEditorBlock;
                        const manager = block.owner as BlockManager;
                        let rightMargin = block.relation.rightMargin as MarginBlock;
                        if (!rightMargin) {
                            rightMargin = this.createMarginBlock();
                            rightMargin.relation.parent = block;
                            block.relation.rightMargin = rightMargin;
                            manager.blocks.push(rightMargin);
                            const offset = block.cache.offset;
                            updateElement(rightMargin.container, {
                                style: {
                                    top: offset.y + "px",
                                    left: (offset.x + offset.w + 20) + "px"
                                }
                            });
                            block.container.parentElement?.appendChild(rightMargin.container);
                            rightMargin.container.classList.add("block-window");
                            rightMargin.addBlockProperties([
                                { type: "block/marginalia/right" },
                                { type: "block/alignment/left" },
                            ]);
                            rightMargin.applyBlockPropertyStyling();
                            const firstChild = this.createStandoffEditorBlock();
                            rightMargin.relation.firstChild = firstChild;
                            firstChild.relation.parent = rightMargin;
                            rightMargin.container.appendChild(firstChild.container);
                            firstChild.addEOL();
                            firstChild.setCaret(0, CARET.LEFT);
                            rightMargin.setFocus();
                            
                        } else {
                            const firstChild = rightMargin.relation.firstChild as StandoffEditorBlock;
                            if (!firstChild) return;
                            firstChild.setCaret(0, CARET.LEFT);
                            firstChild.setFocus();
                        }
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "Enter"
                },
                action: {
                    name: "Move cursor to the start of the next text block. If one doesn't exist, create it.",
                    description: `
                        
                    `,
                    handler: (args: IBindingHandlerArgs) => {
                        const { caret } = args;
                        const block = args.block as StandoffEditorBlock;
                        const manager = block.owner as BlockManager;
                        let next = block.relation.next as StandoffEditorBlock;
                        if (!next) {
                            next = manager.createStandoffEditorBlock();
                            const blockData = block.serialize();
                            next.addBlockProperties(blockData.blockProperties || []);
                            next.applyBlockPropertyStyling();
                            manager.blocks.push(next);
                            next.relation.previous = block;
                            block.relation.next = next;
                            next.addEOL();
                            /**
                             * This should be done by fetching the container on the root MainList
                             */
                            block.container.insertAdjacentElement("afterend", next.container);
                            next.setCaret(0, CARET.LEFT);
                            manager.setBlockFocus(next);
                        } else {
                            next.setCaret(0, CARET.LEFT);
                            manager.setBlockFocus(next);
                        }
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "Tab"
                },
                action: {
                    name: "Indent the current text block if it hasn't already been indented.",
                    description: `
                        
                    `,
                    handler: (args: IBindingHandlerArgs) => {
                        const { caret } = args;
                        const block = args.block as StandoffEditorBlock;
                        const manager = block.owner as BlockManager;
                        const parent = block.relation.parent;
                        if (parent) {
                            /**
                             * Quit if this is the first child of another block.
                             */
                            return;
                        }
                        const previous = block.relation.previous;
                        if (!previous) {
                            /**
                             * Quit if this is the first block.
                             */
                            return;
                        }
                        const indentedList = manager.createIndentedListBlock();
                        /**
                         * Convert the previous block into a parent of the indented list block.
                         */
                        const next = block.relation.next;
                        previous.relation.firstChild = indentedList;
                        indentedList.relation.parent = previous;
                        block.relation.parent = indentedList;
                        indentedList.relation.firstChild = block;
                        previous.relation.next = next;
                        next.relation.previous = previous;
                        delete block.relation.previous;
                        delete block.relation.next;
                        previous.blocks.push(indentedList);
                        indentedList.blocks.push(block);
                        manager.blocks.push(indentedList);
                        const level = indentedList.metadata.indentLevel || 0 as number;
                        indentedList.metadata.indentLevel = level + 1;
                        indentedList.container.appendChild(block.container);
                        previous.container.appendChild(indentedList.container);
                        manager.renderIndent(indentedList);
                        block.setCaret(0, CARET.LEFT);
                        manager.setBlockFocus(block);
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "Shift-ArrowRight"
                },
                action: {
                    name: "Move the selection one character to the right.",
                    description: `
                        
                    `,
                    handler: (args: IBindingHandlerArgs) => {
                        const { caret } = args;
                        const block = args.block as StandoffEditorBlock;
                        const range = block.getSelection();
                        if (!range) {
                            const selection = {
                                start: caret.right,
                                end: caret.right,
                                direction: DIRECTION.RIGHT
                            } as ISelection;
                            block.setSelection(selection);
                        } else {
                            const selection = {
                                start: range.start,
                                end: range.end.next,
                                direction: DIRECTION.RIGHT
                            } as ISelection;
                            block.setSelection(selection);
                        };
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "Shift-ArrowLeft"
                },
                action: {
                    name: "Move the selection one character to the left.",
                    description: `
                        
                    `,
                    handler: (args: IBindingHandlerArgs) => {
                        const { caret } = args;
                        const block = args.block as StandoffEditorBlock;
                        const range = block.getSelection();
                        if (!range) {
                            // Ignore for now.
                            return;
                        } else {
                            const selection = {
                                start: range.start,
                                end: range.end.previous,
                                direction: DIRECTION.LEFT
                            } as ISelection;
                            block.setSelection(selection);
                        };
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "Home"
                },
                action: {
                    name: "Move the caret to the left of the first character.",
                    description: `
                        
                    `,
                    handler: (args: IBindingHandlerArgs) => {
                        const { caret } = args;
                        const block = args.block as StandoffEditorBlock;
                        const first = block.cells[0];
                        if (!first) return;
                        block.setCaret(0, CARET.LEFT);
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "End"
                },
                action: {
                    name: "Move the caret to the right of the last character.",
                    description: `
                        
                    `,
                    handler: (args: IBindingHandlerArgs) => {
                        const { caret } = args;
                        const block = args.block as StandoffEditorBlock;
                        const last = block.cells[block.cells.length-1];
                        if (!last) return;
                        block.setCaret(last.index, CARET.LEFT);
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "Backspace"
                },
                action: {
                    name: "Delete the character to the left",
                    description: `
                        Delete the character to the left and move the cursor to the left of the character to the right.
                        If at the start of the block (i.e., no character to the left) then issues an event
                        named "DELETE_CHARACTER_FROM_START_OF_BLOCK" (?).
                    `,
                    handler: (args: IBindingHandlerArgs) => {
                        const { caret } = args;
                        const block = args.block as StandoffEditorBlock;
                        const selection = block.getSelection();
                        if (selection) {
                            const len = (selection.end.index - selection.start.index) + 1;
                            block.removeCellsAtIndex(selection.start.index, len, true);
                            return;
                        }
                        const manager = block.owner as BlockManager;
                        if (!caret.left) {
                            let previous = block.relation.previous;
                            if (previous) {
                                manager.deleteBlock(previous.id);
                                if (caret.right.isEOL) {
                                
                                }
                            }
                            
                            return;
                        }
                        block.removeCellAtIndex(caret.left.index, true);
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "Control-Backspace"
                },
                action: {
                    name: "Deletes leftwards one word at a time.",
                    description: `
                        
                    `,
                    handler: (args: IBindingHandlerArgs) => {
                        /**
                         * Not working properly yet.
                         */
                        const { caret } = args;
                        const block = args.block as StandoffEditorBlock;
                        if (!caret.left) {
                            return;
                        }
                        const i = caret.left.index;
                        const text = block.getText();
                        const words = block.getWordsFromText(text);
                        const nearest = this.findNearestWord(i, words);
                        if (!nearest) {
                            return;
                        }
                        const start = !nearest.previous ? 0 : nearest.previous.start;
                        const len = (i - start) + 1;
                        block.removeCellsAtIndex(start, len);
                        block.setCaret(start, CARET.LEFT);
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "Delete"
                },
                action: {
                    name: "Delete the character to the right",
                    description: `
                        Delete the character to the right and move the cursor to the left of the character to the right.
                        If at the start of the block (i.e., no character to the left) then issues an event
                        named "DELETE_CHARACTER_FROM_START_OF_BLOCK" (?).
                    `,
                    handler: (args: IBindingHandlerArgs) => {
                        const { caret } = args;
                        const block = args.block as StandoffEditorBlock;
                        const last = block.cells[-1];
                        if (caret.right == last) {
                            // TBC: merge with the next block.
                            return;
                        }
                        block.removeCellAtIndex(caret.right.index, true);
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "Control-Delete"
                },
                action: {
                    name: "Delete all the characters to the right, up to the end of the text block.",
                    description: `
                        
                    `,
                    handler: (args: IBindingHandlerArgs) => {
                        /**
                         * NB: not working as expected. Check the removeCellsAtIndex method chain carefully.
                         */
                        const { caret } = args;
                        const block = args.block as StandoffEditorBlock;
                        if (caret.right.isEOL) {
                            return;
                        }
                        const last = block.getLastCell();
                        const si = caret.right.index;
                        const len = last.index - si;
                        block.removeCellsAtIndex(si, len);
                        block.setCaret(si, CARET.RIGHT);
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "Control-Y"
                },
                action: {
                    name: "Delete the current text block.",
                    description: `
                        
                    `,
                    handler: (args: IBindingHandlerArgs) => {
                        const block = args.block as StandoffEditorBlock;
                        const manager = block.owner as BlockManager;
                        // const previous = manager.getPreviousOf(block.id);
                        // const next = manager.getNextOf(block.id);
                        // const parent = manager.getParentOf(block.id);
                        // const leftMargin = manager.getLeftMarginOf(block.id);
                        // const rightMargin = manager.getRightMarginOf(block.id);
                        // if (!parent && !previous && !next) {
                        //     return;
                        // }
                        // if (leftMargin) {
                        //     const batch: IBatchRelateArgs = {};
                        //     batch.toDelete = [
                        //         { sourceId: block.id, name: RelationType.has_left_margin, targetId: leftMargin.id },
                        //         { sourceId: leftMargin.id, name: RelationType.has_left_margin_parent, targetId: block.id }
                        //     ];
                        //     manager.batchRelate(batch);
                        // }
                        // if (rightMargin) {
                        //     const batch: IBatchRelateArgs = {};
                        //     batch.toDelete = [
                        //         { sourceId: block.id, name: RelationType.has_right_margin, targetId: rightMargin.id },
                        //         { sourceId: rightMargin.id, name: RelationType.has_right_margin_parent, targetId: block.id }
                        //     ];
                        //     manager.batchRelate(batch);
                        // }
                        // if (parent) {
                        //     const batch: IBatchRelateArgs = {};
                        //     batch.toDelete = [
                        //         { sourceId: parent.id, name: RelationType.has_first_child, targetId: block.id },
                        //         { sourceId: block.id, name: RelationType.has_parent, targetId: parent.id }
                        //     ];
                        //     if (next) {
                        //         batch.toAdd = [
                        //             { sourceId: parent.id, name: RelationType.has_first_child, targetId: next.id },
                        //             { sourceId: next.id, name: RelationType.has_parent, targetId: parent.id },
                        //         ]
                        //     }
                        //     manager.batchRelate(batch);
                        // }
                        // if (previous) {
                        //     const batch: IBatchRelateArgs = {};
                        //     batch.toDelete = [
                        //         { sourceId: previous.id, name: RelationType.has_next, targetId: block.id },
                        //         { sourceId: block.id, name: RelationType.has_previous, targetId: previous.id }
                        //     ];
                        //     if (next) {
                        //         batch.toAdd = [
                        //             { sourceId: previous.id, name: RelationType.has_next, targetId: next.id },
                        //             { sourceId: next.id, name: RelationType.has_previous, targetId: previous.id },
                        //         ]
                        //     }
                        //     manager.batchRelate(batch);
                        // }
                        // if (next && !previous && !parent) {
                        //     const batch: IBatchRelateArgs = {};
                        //     batch.toDelete = [
                        //         { sourceId: block.id, name: RelationType.has_next, targetId: next.id },
                        //         { sourceId: next.id, name: RelationType.has_previous, targetId: block.id }
                        //     ];
                        //     manager.batchRelate(batch);
                        // }
                        // manager.deleteBlock(block.id);
                        // manager.updateView();
                        // if (next) {
                        //     manager.setBlockFocus(next);
                        //     next.setCaret(0, CARET.LEFT);
                        //     return;
                        // }
                        // if (previous) {
                        //     manager.setBlockFocus(previous);
                        //     previous.setCaret(0, CARET.LEFT);
                        //     return;
                        // }
                        // if (parent) {
                        //     manager.setBlockFocus(parent);
                        //     parent.setCaret(0, CARET.LEFT);
                        //     return;
                        // }
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "ArrowUp"
                },
                action: {
                    name: "Move the cursor up one text block. If one isn't found, move to the start of the block.",
                    description: `
                        
                    `,
                    handler: (args: IBindingHandlerArgs) => {
                        const { caret } = args;
                        const block = args.block as StandoffEditorBlock;
                        const manager = block.owner as BlockManager;
                        if (block.cache.caret.x == null) {
                            block.cache.caret.x = caret.right.cache.offset.x;
                        }
                        const match = block.getCellInRow(caret.right, RowPosition.Previous);
                        if (match) {
                            block.setCaret(match.cell.index, match.caret);
                            return;
                        }
                        let previous = block.relation.previous as StandoffEditorBlock;
                        if (previous) {
                            const last = previous.getLastCell();
                            previous.setCaret(last.index, CARET.LEFT);
                            manager.setBlockFocus(previous);
                            return;
                        }
                        let parent = block.relation.parent;
                        if (!parent) {
                            block.setCaret(0, CARET.LEFT);
                            return;
                        }
                        if (parent.type == BlockType.IndentedListBlock) {
                            let previous = parent.relation.previous as StandoffEditorBlock;
                            if (previous) {
                                const last = previous.getLastCell();
                                previous.setCaret(last.index, CARET.LEFT);
                                return;
                            }
                        }
                        if (parent.type == BlockType.MarginBlock) {
                            let marginParent = parent.relation.parent as StandoffEditorBlock;
                            if (marginParent) {
                                const last = marginParent.getLastCell();
                                marginParent.setCaret(last.index, CARET.LEFT);
                                return;
                            }
                        }
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "Shift-ArrowDown"
                },
                action: {
                    name: "Move the cursor down one nested row. If one isn't found, do nothing.",
                    description: `
                        
                    `,
                    handler: (args: IBindingHandlerArgs) => {
                        const { caret } = args;
                        const block = args.block as StandoffEditorBlock;
                        const manager = block.owner as BlockManager;
                        let next = block.relation.next as IndentedListBlock;
                        if (next?.type != BlockType.IndentedListBlock) {
                            return;
                        }
                        const first = next.relation.firstChild as StandoffEditorBlock;
                        first.setCaret(0, CARET.LEFT);
                        manager.setBlockFocus(first);
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "ArrowDown"
                },
                action: {
                    name: "Move the cursor down one row. If one isn't found, move to the next block.",
                    description: `
                        
                    `,
                    handler: (args: IBindingHandlerArgs) => {
                        const { caret } = args;
                        const block = args.block as StandoffEditorBlock;
                        const manager = block.owner as BlockManager;
                        if (block.cache.caret.x == null) {
                            block.cache.caret.x = caret.right.cache.offset.x;
                        }
                        const match = block.getCellBelow(caret.right);
                        if (match) {
                            block.setCaret(match.cell.index, CARET.LEFT);
                            return;
                        }
                        // const match = block.getCellInRow(caret.right, RowPosition.Next);
                        // if (match) {
                        //     block.setCaret(match.cell.index, match.caret);
                        //     return;
                        // }
                        let next = block.relation.next as StandoffEditorBlock;
                        if (!next) {
                            block.setCaret(block.getLastCell().index, CARET.LEFT);
                            return;
                        }
                        if(next.type == BlockType.StandoffEditorBlock) {
                            next.setCaret(0, CARET.LEFT);
                            manager.setBlockFocus(next);
                            return;
                        }
                        if (next.type == BlockType.IndentedListBlock) {
                            const first = next.relation.firstChild as StandoffEditorBlock;
                            first.setCaret(0, CARET.LEFT);
                            manager.setBlockFocus(first);
                        }
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "ArrowLeft"
                },
                action: {
                    name: "Move the cursor back one cell ...",
                    description: `
                        ... Or skip to the end of the previous block.
                    `,
                    handler: (args: IBindingHandlerArgs) => {
                        /**
                         * Move the cursor back one cell ...
                         */
                        const { caret } = args;
                        const block = args.block as StandoffEditorBlock;
                        const manager = block.owner as BlockManager;
                        block.cache.caret.x = null;
                        if (caret.left) {
                            block.setCaret(caret.left.index);
                            return;
                        }
                        /**
                         * Or skip to the end of the previous block.
                         */
                        const previous = block.relation.previous as StandoffEditorBlock;
                        if (previous?.type == BlockType.StandoffEditorBlock) {
                            const last = previous.getLastCell();
                            previous.setCaret(last.index, CARET.LEFT);
                            manager.setBlockFocus(previous);
                            return;
                        }
                        let indentedList = block.relation.parent as IndentedListBlock;
                        if (indentedList?.type == BlockType.IndentedListBlock) {
                            const previous = indentedList.relation.parent as StandoffEditorBlock;
                            const last = previous.getLastCell();
                            previous.setCaret(last.index);
                            manager.setBlockFocus(previous);
                            return;
                        }
                        
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "Control-ArrowLeft"
                },
                action: {
                    name: "Skip back to the start of the previous word.",
                    description: `
                        
                    `,
                    handler: (args: IBindingHandlerArgs) => {
                        const { caret } = args;
                        const block = args.block as StandoffEditorBlock;
                        if (!caret.left) {
                            return;
                        }
                        const i = caret.left.index;
                        const text = block.getText();
                        const words = block.getWordsFromText(text);
                        const nearest = this.findNearestWord(i, words);
                        if (!nearest) {
                            block.setCaret(0, CARET.LEFT);
                            return;
                        }
                        const start = i >= nearest.start ? nearest.start : nearest.previous?.start;
                        block.setCaret(start as number, CARET.LEFT);
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "ArrowRight"
                },
                action: {
                    name: "Move the cursor forward one cell ...",
                    description: `
                        ... Or skip to the end of the previous block.
                    `,
                    handler: (args: IBindingHandlerArgs) => {
                        /**
                         * Move the cursor right one cell ...
                         */
                        const { caret } = args;
                        const block = args.block as StandoffEditorBlock;
                        block.cache.caret.x = null;
                        const sel = block.getSelection() as IRange;
                        const manager = block.owner as BlockManager;
                        const len = block.cells.length;
                        if (sel) block.clearSelection();
                        const ri = sel ? sel.end.index : caret.right.index;
                        if (ri < len - 1) {
                            block.setCaret(ri + 1);
                            return;
                        }
                        const next = block.relation.next as IndentedListBlock;
                        if (next?.type == BlockType.IndentedListBlock) {
                            const first = next.relation.firstChild as StandoffEditorBlock;
                            first.setCaret(0, CARET.LEFT)
                            manager.setBlockFocus(first);
                            return;
                        }
                        if (next?.type == BlockType.StandoffEditorBlock) {
                            (next as StandoffEditorBlock).setCaret(0, CARET.LEFT);
                            manager.setBlockFocus(next);
                            return;
                        }
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "Control-ArrowRight"
                },
                action: {
                    name: "Skip back to the start of the previous word.",
                    description: `
                        
                    `,
                    handler: (args: IBindingHandlerArgs) => {
                        const { caret } = args;
                        const block = args.block as StandoffEditorBlock;
                        if (caret.right.isEOL) {
                            return;
                        }
                        const i = caret.right.index;
                        const last = block.getLastCell();
                        const text = block.getText();
                        const words = block.getWordsFromText(text);
                        const nearest = this.findNearestWord(i, words);
                        if (!nearest) {
                            block.setCaret(0, CARET.LEFT);
                            return;
                        }
                        const start = !nearest.next ? last.index : nearest.next.start;
                        block.setCaret(start as number, CARET.LEFT);
                    }
                }
            },
        ];
        return events;
    }
    findNearestWord(index: number, words: Word[]) {
        const lastIndex = words.length - 1;
        for (let i = lastIndex; i >= 0; i--) {
            let word = words[i];
            if (index >= word.start) return word;
        }
        return null;
    }
    getStandoffPropertyEvents() {
        const events: InputEvent[] = [
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "Control-I"
                },
                action: {
                    name: "Italicise",
                    description: "Italicises text in the selection. If no text is selected, switches to/from italics text mode.",
                    handler: (args: IBindingHandlerArgs) => {
                        const block = args.block as StandoffEditorBlock;
                        const selection = block.getSelection();
                        if (selection) {
                            block.createStandoffProperty("style/italics", selection);
                        } else {
                            // TBC
                        }      
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "Control-L"
                },
                action: {
                    name: "Blue and White",
                    description: `
                        Sets the background of the block to blue, and font to white.
                    `,
                    handler: (args: IBindingHandlerArgs) => {
                        const block = args.block as StandoffEditorBlock;
                        block.createBlockProperty("block/blue-and-white");     
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "Control-B"
                },
                action: {
                    name: "Bold",
                    description: "Emboldens text in the selection. If no text is selected, switches to/from embolden text mode.",
                    handler: (args: IBindingHandlerArgs) => {
                        const block = args.block as StandoffEditorBlock;
                        const selection = block.getSelection();
                        if (selection) {
                            block.createStandoffProperty("style/bold", selection);
                        } else {
                            // TBC
                        }      
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "Control-E"
                },
                action: {
                    name: "Entity reference",
                    description: "Links to an entity in the graph database.",
                    handler: (args: IBindingHandlerArgs) => {
                        const block = args.block as StandoffEditorBlock;
                        const selection = block.getSelection();
                        if (selection) {
                            block.createStandoffProperty("codex/entity-reference", selection);
                        } else {
                            // TBC
                        }      
                    }
                }
            }
        ];
        return events;
    }
    getStandoffSchemas() {
        return [
            {
                type: "style/italics",
                name: "Italics",
                decorate: {
                    cssClass: "style_italics"
                }
            },
            {
                type: "style/bold",
                name: "Bold",
                decorate: {
                    cssClass: "style_bold"
                }
            },
            {
                type: "codex/block-reference",
                name: "Block reference",
                event: {
                    beforeStyling: async (args: any) => {
                        // TBC : will show some interface where a block can be retrieved
                    }
                },
                render: {
                    destroy: ({ properties }) => {
                        properties.forEach(p => p.cache.underline?.remove())
                    },
                    update: (args) => {
                        const owner = args.block.owner as BlockManager;
                        owner.renderUnderlines("codex/block-reference", args.properties, args.block, "orange", 1);
                    }
                }
            },
            {
                type: "codex/entity-reference",
                name: "Entity reference",
                event: {
                    beforeStyling: async (args: any) => {
                        // TBC : will show a panel where the entity can be searched for
                    }
                },
                render: {
                    destroy: ({ properties }) => {
                        properties.forEach(p => p.cache.underline?.remove())
                    },
                    update: (args) => {
                        const owner = args.block.owner as BlockManager;
                        owner.renderUnderlines("codex/entity-reference", args.properties, args.block, "purple", 3);
                    }
                }
            }
        ] as IStandoffPropertySchema[];
    }
    deserialize(json: any) {
        return {} as IBlock;
    }
    deserializeBlock(data: any) {
        switch (data.type) {
            case BlockType.StandoffEditorBlock: {
                const block = this.createStandoffEditorBlock();
                block.bind(data);
                return block;
            };
            default: return {} as IBlock;
        }
    }
    serialize(){
        return {
            id: this.id,
            type: this.type,
            metadata: this.metadata,
            relation: this.relation,
            blockProperties: this.blockProperties.map(x => x.serialize()),
            blocks: this.blocks.map(x => x.serialize())
        }                                                                                  
    }
    renderUnderlines(type: string, properties: StandoffProperty[], block: StandoffEditorBlock, colour: string, offsetY: number) {
        const overlay = block.getOrSetOverlay(type);
        const cw = block.cache?.offset?.w || block.container.offsetWidth;
        const underlines = properties.map(p =>
            createUnderline(p, {
                stroke: colour,
                containerWidth: cw,
                offsetY: offsetY
            })) as SVGElement[];
        const frag = document.createDocumentFragment();
        frag.append(...underlines);
        updateElement(overlay.container, {
            classList: ["overlay"],
            style: {
                position: "absolute",
                width: "100%",
                top: 0,
                left: 0
            },
            parent: block.container,
            children: [frag]
        });
    }
    getPlatformKey(codes: TPlatformKey[]) {
        return codes.find(x=> x.platform == Platform.Windows);
    }
    getBlock(id: GUID) {
        return this.blocks.find(x => x.id == id) as IBlock;
    }
    commit(msg: Commit) {
        this.commits.push(msg);
    }
    deleteBlock(blockId: GUID) {
        const block = this.getBlock(blockId) as StandoffEditorBlock;
        const i = this.blocks.findIndex(x => x.id == blockId);
        this.blocks.splice(i, 1);
        block.destroy();
        this.commit({
            redo: {
                id: this.id,
                name: "deleteBlock",
                value: {
                    blockId
                }
            }
        });
    }
    mergeBlocks(firstBlockId: GUID, secondBlockId: GUID) {
        this.commit({
            redo: {
                id: this.id,
                name: "mergeBlocks",
                value: {
                    firstBlockId, secondBlockId
                }
            }
        });
        /**
         * The following isn't really correct because we would also need to update the block references for each
         * Standoff- and BlockProperty object to point to 'first' AND we need to propagate these changes to the
         * StandoffProperty objects on 'second' to the objects in the data store, also.
         * 
         * So this is really no more than a high-level sketch of what's involved in merging two blocks.
         * 
         * We would also need to update relationships between first, second, and the 'next' block after 'second' (if there is one).
         * It should look roughly as follows:
         * 
         * CREATE:
         *      (first)-[:has_next]->(next), (next)-[:has_previous]->(first)
         * 
         * DELETE:
         *      (first)-[:has_next]->(second), (second)-[:has_previous]->(first), (second)-[:has_next]->(next)
         * 
         * None of this takes into account the case where 'second' is a *child block* in a nested list.
         */
        const first = this.getBlock(firstBlockId) as StandoffEditorBlock;
        const second = this.getBlock(secondBlockId) as StandoffEditorBlock;
        const lastIndex = (first?.cells.length as number) -1;
        first?.removeCellAtIndex(lastIndex);
        first?.cells.push(...second?.cells as Cell[]);
        first?.standoffProperties.push(...second?.standoffProperties as StandoffProperty[]);
        first?.blockProperties.push(...second?.blockProperties as BlockProperty[]);
        first?.updateView();
        this.deleteBlock(secondBlockId);
    }
    reset() {
        this.container.innerHTML = "";
        this.blocks = [];
        this.id = uuidv4();
    }
    storeCommit(commit: Commit) {        
        this.commits.push(commit);
        this.pointer++;
    }
    stageRightMarginBlock(rightMargin: MarginBlock, mainBlock: StandoffEditorBlock) {
        this.batchRelate({
            toAdd: [
                { sourceId: mainBlock.id, name: "rightMargin", targetId: rightMargin.id },
                { sourceId: rightMargin.id, name: "parent", targetId: mainBlock.id }
            ]
        });
        updateElement(mainBlock.container, {
            style: {
                position: "relative"
            }
        });
        updateElement(rightMargin.container, {
            style: {
                position: "absolute",
                top: mainBlock.cache.offset.h,
                width: "200px",
                "max-width": "200px",
                right: "-250px"
            }
        });
        const hand = document.createElement("SPAN") as HTMLSpanElement;
        hand.innerHTML = "☜";
        updateElement(hand, {
            style: {
                "font-size": "2rem",
                position: "absolute",
                top: "-3px",
                left: "-15px"
            }
        });
        rightMargin.container.appendChild(hand);
    }
    stageLeftMarginBlock(leftMargin: MarginBlock, mainBlock: StandoffEditorBlock) {
        this.batchRelate({
            toAdd: [
                { sourceId: mainBlock.id, name: "leftMargin", targetId: leftMargin.id },
                { sourceId: leftMargin.id, name: "parent", targetId: mainBlock.id }
            ]
        });
        updateElement(mainBlock.container, {
            style: {
                position: "relative"
            }
        });
        updateElement(leftMargin.container, {
            style: {
                position: "absolute",
                top: mainBlock.cache.offset.h,
                width: "200px",
                "max-width": "200px",
                left: "-250px"
            }
        });
        const hand = document.createElement("SPAN") as HTMLSpanElement;
        hand.innerHTML = "☞";
        updateElement(hand, {
            style: {
                "font-size": "2rem",
                position: "absolute",
                top: "-3px",
                right: "-15px"
            }
        });
        leftMargin.container.appendChild(hand);
    }
    recursivelyBuildBlock(container: HTMLDivElement, blockDto: IBlockDto) {
        console.log("recursivelyBuildBlock", { container, blockDto });
        const self = this;
        if (blockDto.type == BlockType.StandoffEditorBlock) {
            const textBlock = this.createStandoffEditorBlock();
            textBlock.bind(blockDto as IStandoffEditorBlockDto);
            if (blockDto.relation?.leftMargin) {
                const leftMargin = this.recursivelyBuildBlock(textBlock.container, blockDto.relation.leftMargin) as MarginBlock;
                this.stageLeftMarginBlock(leftMargin, textBlock);
            }
            if (blockDto.relation?.rightMargin) {
                const rightMargin = this.recursivelyBuildBlock(textBlock.container, blockDto.relation.rightMargin) as MarginBlock;
                this.stageRightMarginBlock(rightMargin, textBlock);
            }
            if (blockDto.children) {
                blockDto.children.forEach((b,i) => {
                    let block = self.recursivelyBuildBlock(textBlock.container, b) as IBlock;
                    textBlock.blocks.push(block);
                    if (i == 0) {
                        block.relation.parent = textBlock;
                        textBlock.relation.firstChild = block;
                    }
                    if (i > 0) {
                        let previous = textBlock.blocks[i-1];
                        block.relation.previous = previous;
                        previous.relation.next = block;
                    }
                });
            }
            container.appendChild(textBlock.container);
            return textBlock;
        }
        if (blockDto.type == BlockType.MarginBlock) {
            const marginBlock = this.createMarginBlock();
            marginBlock.addBlockProperties([ { type: "block/marginalia/left" } ]);
            marginBlock.applyBlockPropertyStyling();
            if (blockDto.children) {
                blockDto.children.forEach((b,i) => { 
                    let block = self.recursivelyBuildBlock(marginBlock.container, b) as IBlock;
                    marginBlock.blocks.push(block);
                    if (i == 0) {
                        self.batchRelate({
                            toAdd: [
                                { sourceId: marginBlock.id, name: "parent", targetId: block.id },
                                { sourceId: block.id, name: "firstChild", targetId: marginBlock.id },
                            ]
                        });
                    }
                    if (i > 0) {
                        let previous = marginBlock.blocks[i-1];
                        self.batchRelate({
                            toAdd: [
                                { sourceId: block.id, name: "previous", targetId: previous.id },
                                { sourceId: previous.id, name: "next", targetId: block.id },
                            ]
                        });
                    }
                });
            }
            container.appendChild(marginBlock.container);
            return marginBlock;
        }
        if (blockDto.type == BlockType.RightMarginBlock) {
            const rmb = this.createRightMarginBlock();
            rmb.addBlockProperties([ { type: "block/marginalia/right" } ]);
            rmb.applyBlockPropertyStyling();
            if (blockDto.children) {
                blockDto.children.forEach((b,i) => { 
                    let block = self.recursivelyBuildBlock(rmb.container, b) as IBlock;
                    rmb.blocks.push(block);
                    if (i == 0) {
                        self.batchRelate({
                            toAdd: [
                                { sourceId: rmb.id, name: "parent", targetId: block.id },
                                { sourceId: block.id, name: "firstChild", targetId: rmb.id },
                            ]
                        });
                    }
                    if (i > 0) {
                        let previous = rmb.blocks[i-1];
                        self.batchRelate({
                            toAdd: [
                                { sourceId: block.id, name: "previous", targetId: previous.id },
                                { sourceId: previous.id, name: "next", targetId: block.id },
                            ]
                        });
                    }
                });
            }
            container.appendChild(rmb.container);
            return rmb;
        }
        if (blockDto.type == BlockType.GridBlock) {
            const gridBlock = this.createGridBlock();
            
            if (blockDto.children) {
                blockDto.children.forEach((b,i) => {
                    let row = self.recursivelyBuildBlock(gridBlock.container, b) as GridRowBlock;
                    gridBlock.blocks.push(row);
                    if (i == 0) {
                        self.batchRelate({
                            toAdd: [
                                { sourceId: gridBlock.id, name: "parent", targetId: gridBlock.blocks[0].id },
                                { sourceId: gridBlock.blocks[0].id, name: "firstChild", targetId: gridBlock.id },
                            ]
                        });
                    }
                    if (i > 0) {
                        let previous = gridBlock.blocks[i-1];
                        self.batchRelate({
                            toAdd: [
                                { sourceId: row.id, name: "previous", targetId: previous.id },
                                { sourceId: previous.id, name: "next", targetId: row.id },
                            ]
                        });
                    }
                });
            }
            container.appendChild(gridBlock.container);
            return gridBlock;
        }
        if (blockDto.type == BlockType.GridRowBlock) {
            const grid = this.createGridRowBlock();
            const rowLen = blockDto.children?.length || 0;
            const width = 100 /rowLen;
            if (blockDto.children) {
                blockDto.children.forEach((b,i) => {
                    let row = self.recursivelyBuildBlock(grid.container, b) as GridRowBlock;
                    grid.blocks.push(row);
                    if (i == 0) {
                        self.batchRelate({
                            toAdd: [
                                { sourceId: grid.id, name: "parent", targetId: row.blocks[0].id },
                                { sourceId: row.blocks[0].id, name: "firstChild", targetId: grid.id },
                            ]
                        });
                    }
                    if (i > 0) {
                        let previous = row.blocks[i-1];
                        self.batchRelate({
                            toAdd: [
                                { sourceId: row.id, name: "previous", targetId: previous.id },
                                { sourceId: previous.id, name: "next", targetId: row.id },
                            ]
                        });
                    }
                });
            }
            container.appendChild(grid.container);
            return grid;
        }
        if (blockDto.type == BlockType.GridCellBlock) {
            const cell = this.createGridCellBlock();
            if (blockDto.children) {
                blockDto.children.forEach((b,i) => {
                    let block = self.recursivelyBuildBlock(cell.container, b) as GridCellBlock;
                    if (b.width) block.container.style.width = b.width;
                    if (i == 0) {
                        self.batchRelate({
                            toAdd: [
                                { sourceId: cell.id, name: "parent", targetId: cell.blocks[0].id },
                                { sourceId: cell.blocks[0].id, name: "firstChild", targetId: cell.id },
                            ]
                        });
                    }
                    if (i > 0) {
                        let previous = cell.blocks[i-1];
                        self.batchRelate({
                            toAdd: [
                                { sourceId: cell.id, name: "previous", targetId: previous.id },
                                { sourceId: previous.id, name: "next", targetId: cell.id },
                            ]
                        });
                    }
                });
            }
            container.appendChild(cell.container);
            return cell;
        }
        if (blockDto.type == BlockType.TabRowBlock) {
            const rowBlock = this.createTabRowBlock();
            if (blockDto.children) {
                blockDto.children.forEach((b,i) => {
                    let block = self.recursivelyBuildBlock(rowBlock.container, b) as TabBlock;
                    if (b.name) block.name = b.name;
                    rowBlock.blocks.push(block);
                    if (i == 0) {
                        self.batchRelate({
                            toAdd: [
                                { sourceId: rowBlock.id, name: "parent", targetId: rowBlock.blocks[0].id },
                                { sourceId: rowBlock.blocks[0].id, name: "firstChild", targetId: rowBlock.id },
                            ]
                        });
                    }
                    if (i > 0) {
                        let previous = rowBlock.blocks[i-1];
                        self.batchRelate({
                            toAdd: [
                                { sourceId: block.id, name: "previous", targetId: previous.id },
                                { sourceId: previous.id, name: "next", targetId: block.id },
                            ]
                        });
                    }
                });
            }
            rowBlock.renderLabels();
            rowBlock.blocks[0]?.setActive();
            container.appendChild(rowBlock.container);
            return rowBlock;
        }
        if (blockDto.type == BlockType.TabBlock) {
            const tabBlock = this.createTabBlock();
            if (blockDto.children) {
                blockDto.children.forEach((b,i) => {
                    let block = self.recursivelyBuildBlock(tabBlock.panel, b) as IBlock;
                    tabBlock.blocks.push(block);
                    if (i == 0) {
                        self.batchRelate({
                            toAdd: [
                                { sourceId: tabBlock.id, name: "parent", targetId: tabBlock.blocks[0].id },
                                { sourceId: tabBlock.blocks[0].id, name: "firstChild", targetId: tabBlock.id },
                            ]
                        });
                    }
                    if (i > 0) {
                        let previous = tabBlock.blocks[i-1];
                        self.batchRelate({
                            toAdd: [
                                { sourceId: block.id, name: "previous", targetId: previous.id },
                                { sourceId: previous.id, name: "next", targetId: block.id },
                            ]
                        });
                    }
                });
            }
            container.appendChild(tabBlock.container);
            return tabBlock;
        }
        if (blockDto.type == BlockType.IndentedListBlock) {
            const indentedListBlock = this.createIndentedListBlock();
            if (blockDto.children) {
                blockDto.children.forEach((b,i) => {
                    let block = self.recursivelyBuildBlock(indentedListBlock.container, b) as IBlock;
                    indentedListBlock.blocks.push(block);
                    updateElement(block.container, {
                        style: {
                            display: "list-item",
                            "list-style": "square"
                        }
                    });
                    if (i == 0) {
                        self.batchRelate({
                            toAdd: [
                                { sourceId: block.id, name: "parent", targetId: indentedListBlock.id },
                                { sourceId: indentedListBlock.id, name: "firstChild", targetId: block.id },
                            ]
                        });
                    }
                    if (i > 0) {
                        let previous = indentedListBlock.blocks[i-1];
                        self.batchRelate({
                            toAdd: [
                                { sourceId: block.id, name: "previous", targetId: previous.id },
                                { sourceId: previous.id, name: "next", targetId: block.id },
                            ]
                        });
                    }
                });
            }
            const level = indentedListBlock.metadata.indentLevel || 0 as number;
            indentedListBlock.metadata.indentLevel = level + 1;
            this.renderIndent(indentedListBlock);
            container.appendChild(indentedListBlock.container);
            return indentedListBlock;
        }
        return null;
    }
    getDocument() {
        const dto= {
            id: this.id,
            type: BlockType.MainListBlock,
            children: []
        } as IMainListBlockDto;
        const mainBlock = this.blocks.find(x => x.type == BlockType.MainListBlock);
        if (!mainBlock) return dto;
        mainBlock.blocks.forEach(b => {
            let block = b.serialize();
            dto.children?.push(block);
        });
        return dto;
    }
    loadDocument(dto: IMainListBlockDto) {
        console.log("loadDocument", { dto });
        if (dto.type != BlockType.MainListBlock) {
            console.error("Expected doc.type to be a MainListBlock");
            return;
        }
        this.id = dto.id || uuidv4();
        const container = document.createElement("DIV") as HTMLDivElement;
        const mainBlock = this.createMainListBlock();
        mainBlock.bind(dto);
        let blocks: IBlock[] = [];
        if (dto.children) {
            const len = dto.children.length;
            for (let i = 0; i <= len - 1; i++) {
                let block = this.recursivelyBuildBlock(container, dto.children[i]) as IBlock;
                console.log("loadDocument", { block });
                blocks.push(block);
                if (i > 0) {
                    let previous = blocks[i - 1];
                    previous.relation.next = block;
                    block.relation.previous = previous;
                }
            }
        }
        container.appendChild(mainBlock.container);
        this.container.appendChild(container);
    }
    renderIndent(block: IBlock) {
        /**
         * Currently assumes that these are StandoffTextBlocks on the same BlockManager,
         * rather than IBlocks.
         */
        const defaultWidth = 40;
        const level = block.metadata.indentLevel as number;
        updateElement(block.container, {
            style: {
                "margin-left": (level * defaultWidth) + "px"
            }
        });
    }
    createMainListBlock() {
        const blockSchemas = this.getBlockSchemas();
        const block = new MainListBlock({
            owner: this
        });
        block.setBlockSchemas(blockSchemas);
        block.applyBlockPropertyStyling();
        this.commit({
            redo: {
                id: this.id,
                name: "createMainListBlock"
            },
            undo: {
                id: this.id,
                name: "uncreateMainListBlock",
                value: { id: block.id }
            }
        });
        this.blocks.push(block);
        return block;
    }
    createIndentedListBlock() {
        const blockSchemas = this.getBlockSchemas();
        const block = new IndentedListBlock({
            owner: this
        });
        block.setBlockSchemas(blockSchemas);
        block.applyBlockPropertyStyling();
        this.commit({
            redo: {
                id: this.id,
                name: "createIndentedListBlock"
            },
            undo: {
                id: this.id,
                name: "uncreateIndentedListBlock",
                value: { id: block.id }
            }
        });
        this.blocks.push(block);
        return block;
    }
    createTabBlock(){
        const blockSchemas = this.getBlockSchemas();
        const block = new TabBlock({
            owner: this
        });
        block.setBlockSchemas(blockSchemas);
        block.applyBlockPropertyStyling();
        this.commit({
            redo: {
                id: this.id,
                name: "createTabBlock"
            },
            undo: {
                id: this.id,
                name: "uncreateTabBlock",
                value: { id: block.id }
            }
        });
        this.blocks.push(block);
        return block;
    }
    createGridCellBlock() {
        const blockSchemas = this.getBlockSchemas();
        const block = new GridCellBlock({
            owner: this
        });
        block.setBlockSchemas(blockSchemas);
        block.applyBlockPropertyStyling();
        this.commit({
            redo: {
                id: this.id,
                name: "createGridCellBlock"
            },
            undo: {
                id: this.id,
                name: "uncreateGridCellBlock",
                value: { id: block.id }
            }
        });
        this.blocks.push(block);
        return block;
    }
    createGridRowBlock() {
        const blockSchemas = this.getBlockSchemas();
        const block = new GridRowBlock({
            owner: this
        });
        block.setBlockSchemas(blockSchemas);
        block.applyBlockPropertyStyling();
        this.commit({
            redo: {
                id: this.id,
                name: "createGridRowBlock"
            },
            undo: {
                id: this.id,
                name: "uncreateGridRowBlock",
                value: { id: block.id }
            }
        });
        this.blocks.push(block);
        return block;
    }
    createGridBlock() {
        const blockSchemas = this.getBlockSchemas();
        const block = new GridBlock({
            owner: this
        });
        block.setBlockSchemas(blockSchemas);
        block.applyBlockPropertyStyling();
        this.commit({
            redo: {
                id: this.id,
                name: "createGridBlock"
            },
            undo: {
                id: this.id,
                name: "uncreateGridBlock",
                value: { id: block.id }
            }
        });
        this.blocks.push(block);
        return block;
    }
    createTabRowBlock() {
        const blockSchemas = this.getBlockSchemas();
        const block = new TabRowBlock({
            owner: this
        });
        block.setBlockSchemas(blockSchemas);
        block.applyBlockPropertyStyling();
        this.commit({
            redo: {
                id: this.id,
                name: "createTabRowBlock"
            },
            undo: {
                id: this.id,
                name: "uncreateTabRowBlock",
                value: { id: block.id }
            }
        });
        this.blocks.push(block);
        return block;
    }
    createMarginBlock() {
        const blockSchemas = this.getBlockSchemas();
        const block = new MarginBlock({
            owner: this
        });
        block.setBlockSchemas(blockSchemas);
        block.applyBlockPropertyStyling();
        this.commit({
            redo: {
                id: this.id,
                name: "createMarginBlock"
            },
            undo: {
                id: this.id,
                name: "uncreateMarginBlock",
                value: { id: block.id }
            }
        });
        this.blocks.push(block);
        return block;
    }
    createRightMarginBlock() {
        const blockSchemas = this.getBlockSchemas();
        const block = new RightMarginBlock({
            owner: this
        });
        block.setBlockSchemas(blockSchemas);
        block.applyBlockPropertyStyling();
        this.commit({
            redo: {
                id: this.id,
                name: "createRightMarginBlock"
            },
            undo: {
                id: this.id,
                name: "uncreateRightMarginBlock",
                value: { id: block.id }
            }
        });
        this.blocks.push(block);
        return block;
    }
    createStandoffEditorBlock() {
        const standoffSchemas = this.getStandoffSchemas();
        const blockSchemas = this.getBlockSchemas();
        const standoffEvents = this.getStandoffPropertyEvents();
        const editorEvents = this.getEditorEvents();
        const block = new StandoffEditorBlock({
            owner: this
        });
        block.setSchemas(standoffSchemas);
        block.setBlockSchemas(blockSchemas);
        block.setEvents(standoffEvents);
        block.setEvents(editorEvents);
        block.setCommitHandler(this.storeCommit.bind(this));
        block.applyBlockPropertyStyling();
        this.commit({
            redo: {
                id: this.id,
                name: "createStandoffEditorBlock"
            },
            undo: {
                id: this.id,
                name: "uncreateStandoffEditorBlock",
                value: { id: block.id }
            }
        });
        this.blocks.push(block);
        return block;
    }
    private uncreateStandoffEditorBlock(id: GUID) {
        const block = this.getBlock(id) as IBlock;
        if (!block) {
            // Error: block not found.
            return;
        }
        block.container.innerHTML = "";
        const i = this.blocks.findIndex(x=> x.id == id);
        this.blocks.splice(i, 1);
    }
    appendSibling(anchor: HTMLElement, sibling: HTMLElement) {
        anchor.insertAdjacentElement("afterend", sibling);
    }
    startNewDocument() {
        
    }
}


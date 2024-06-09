import { KEYS, Platform, TPlatformKey } from "./keyboard";
import { AbstractBlock } from "./abstract-block";
import { InputEventSource, InputEvent, BlockType, CARET, GUID, IBindingHandlerArgs, IBlock, IBlockManager, IBlockRelation, IRange, IStandoffPropertySchema, Mode, DIRECTION, StandoffEditorBlock, StandoffEditorBlockDto, StandoffProperty, Commit, Cell, BlockProperty, Command, CellHtmlElement, ISelection, Word, RowPosition, BlockPropertyDto, IBlockPropertySchema, IDocumentDto } from "./standoff-editor-block";
import { createUnderline, updateElement } from "./svg";
import { v4 as uuidv4 } from 'uuid';
import { MarginBlock } from "./margin-block";
import { MainListBlock } from "./main-list-block";
import { IndentedListBlock } from "./indented-list-block";
import { nextHydrateContext } from "solid-js/types/render/hydration";

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

const RelationType = {
    "has_next":"has_next",
    "has_previous":"has_previous",
    "has_parent":"has_parent",
    "has_first_child":"has_first_child",
    "has_left_margin": "has_left_margin",
    "has_left_margin_parent": "has_left_margin_parent",
    "has_right_margin": "has_right_margin",
    "has_right_margin_parent": "has_right_margin_parent",
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
    relations: Record<string, IBlockRelation>;
    blocks: IBlock[];
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
        this.relations = {};
        this.blocks = [this];
        this.metadata = {};
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
    getRelation(name: string) {
        return this.relations[name];
    }
    applyBlockPropertyStyling() {
        this.blockProperties.forEach(p => {
            p.applyStyling();
        });
    }
    updateView() {
        this.blocks.forEach(x => x.updateView());
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
                        let leftMargin = manager.getLeftMarginOf(block.id);
                        if (!leftMargin) {
                            leftMargin = manager.createMarginBlock();
                            const child = manager.createStandoffEditorBlock();
                            manager.batchRelate({
                                toAdd: [
                                    { sourceId: block.id, name: RelationType.has_left_margin, targetId: leftMargin.id },
                                    { sourceId: leftMargin.id, name: RelationType.has_left_margin_parent, targetId: block.id },
                                    { sourceId: leftMargin.id, name: RelationType.has_first_child, targetId: child.id },
                                    { sourceId: child.id, name: RelationType.has_parent, targetId: leftMargin.id },
                                ]
                            });
                            
                            updateElement(leftMargin.container, {
                                style: {
                                    top: block.cache.offset.y + "px",
                                    left: "-200px"
                                }
                            });
                            child.addEOL();
                            leftMargin.container.classList.add("block-window");
                            child.container.classList.add("block-window");
                            child.addBlockProperties([
                                { type: "block/alignment/left" }
                            ]);
                            leftMargin.addBlockProperties([
                                { type: "block/marginalia/left" }
                            ]);
                            child.applyBlockPropertyStyling();
                            leftMargin.applyBlockPropertyStyling();
                            block.container.parentElement?.appendChild(leftMargin.container);
                            leftMargin.container.appendChild(child.container);
                            manager.blocks.push(leftMargin);
                            manager.blocks.push(child);
                            child.setCaret(0, CARET.LEFT);
                            manager.setBlockFocus(child);
                            return;
                        } else {
                            const childEdge = leftMargin.getRelation(RelationType.has_first_child);
                            const child = manager.getBlock(childEdge.targetId) as StandoffEditorBlock;
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
                        const rightMarginEdge = block.getRelation(RelationType.has_right_margin);
                        if (!rightMarginEdge) {
                            const rightMargin = manager.createStandoffEditorBlock();
                            manager.batchRelate({
                                toAdd: [
                                    { sourceId: rightMargin.id, name: RelationType.has_right_margin_parent, targetId: block.id },
                                    { sourceId: block.id, name: RelationType.has_right_margin, targetId: rightMargin.id },
                                ]
                            });
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
                            rightMargin.addEOL();
                            rightMargin.setCaret(0, CARET.LEFT);
                            rightMargin.setFocus();
                            
                        } else {
                            const rightMargin = manager.getBlock(rightMarginEdge.targetId) as StandoffEditorBlock;
                            if (!rightMargin) return;
                            rightMargin.setCaret(0, CARET.LEFT);
                            rightMargin.setFocus();
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
                        const nextEdge = block.getRelation(RelationType.has_next);
                        const parent = manager.getParentOf(block.id);
                        if (!nextEdge) {
                            const next = manager.createStandoffEditorBlock();
                            const blockData = block.serialize();
                            next.addBlockProperties(blockData.blockProperties || []);
                            next.applyBlockPropertyStyling();
                            manager.blocks.push(next);
                            manager.batchRelate({
                                toAdd: [
                                    { sourceId: block.id, name: RelationType.has_next, targetId: next.id },
                                    { sourceId: next.id, name: RelationType.has_previous, targetId: block.id }
                                ]
                            });
                            next.addEOL();
                            /**
                             * This should be done by fetching the container on the root MainList
                             */
                            block.container.insertAdjacentElement("afterend", next.container);
                            next.setCaret(0, CARET.LEFT);
                            manager.setBlockFocus(next);
                        } else {
                            const next = manager.getBlock(nextEdge.targetId) as StandoffEditorBlock;
                            if (!next) return;
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
                        const parent = manager.getParentOf(block.id) as IndentedListBlock;
                        if (parent) return; // First child of another block.
                        const previous = manager.getPreviousOf(block.id);
                        if (!previous) return;
                        const indentedList = manager.createIndentedListBlock();
                        /**
                         * Convert the has_previous into a has_parent, etc.
                         */
                        const next = manager.getNextOf(block.id) as IBlock;
                        manager.batchRelate({
                            toDelete: [
                                { sourceId: block.id, name: RelationType.has_previous, targetId: previous.id },
                                { sourceId: previous.id, name: RelationType.has_next, targetId: block.id },
                                { sourceId: block.id, name: RelationType.has_next, targetId: next.id },
                                { sourceId: next.id, name: RelationType.has_previous, targetId: block.id }
                            ],
                            toAdd: [
                                { sourceId: previous.id, name: RelationType.has_first_child, targetId: indentedList.id },
                                { sourceId: indentedList.id, name: RelationType.has_parent, targetId: previous.id },

                                { sourceId: block.id, name: RelationType.has_parent, targetId: indentedList.id },
                                { sourceId: indentedList.id, name: RelationType.has_first_child, targetId: block.id },
                                
                            ]
                        });
                        indentedList.blocks.push(block);
                        manager.blocks.push(indentedList);
                        const level = indentedList.metadata.indentLevel || 0 as number;
                        indentedList.metadata.indentLevel = level + 1;
                        indentedList.container.appendChild(block.container);
                        previous.container.insertAdjacentElement("afterend", indentedList.container);
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
                            const previousEdge = block.getRelation(RelationType.has_previous);
                            if (previousEdge) {
                                const previous = manager.getBlock(previousEdge.targetId) as StandoffEditorBlock;
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
                        const previous = manager.getPreviousOf(block.id);
                        const next = manager.getNextOf(block.id);
                        const parent = manager.getParentOf(block.id);
                        const leftMargin = manager.getLeftMarginOf(block.id);
                        const rightMargin = manager.getRightMarginOf(block.id);
                        if (!parent && !previous && !next) {
                            return;
                        }
                        if (leftMargin) {
                            const batch: IBatchRelateArgs = {};
                            batch.toDelete = [
                                { sourceId: block.id, name: RelationType.has_left_margin, targetId: leftMargin.id },
                                { sourceId: leftMargin.id, name: RelationType.has_left_margin_parent, targetId: block.id }
                            ];
                            manager.batchRelate(batch);
                        }
                        if (rightMargin) {
                            const batch: IBatchRelateArgs = {};
                            batch.toDelete = [
                                { sourceId: block.id, name: RelationType.has_right_margin, targetId: rightMargin.id },
                                { sourceId: rightMargin.id, name: RelationType.has_right_margin_parent, targetId: block.id }
                            ];
                            manager.batchRelate(batch);
                        }
                        if (parent) {
                            const batch: IBatchRelateArgs = {};
                            batch.toDelete = [
                                { sourceId: parent.id, name: RelationType.has_first_child, targetId: block.id },
                                { sourceId: block.id, name: RelationType.has_parent, targetId: parent.id }
                            ];
                            if (next) {
                                batch.toAdd = [
                                    { sourceId: parent.id, name: RelationType.has_first_child, targetId: next.id },
                                    { sourceId: next.id, name: RelationType.has_parent, targetId: parent.id },
                                ]
                            }
                            manager.batchRelate(batch);
                        }
                        if (previous) {
                            const batch: IBatchRelateArgs = {};
                            batch.toDelete = [
                                { sourceId: previous.id, name: RelationType.has_next, targetId: block.id },
                                { sourceId: block.id, name: RelationType.has_previous, targetId: previous.id }
                            ];
                            if (next) {
                                batch.toAdd = [
                                    { sourceId: previous.id, name: RelationType.has_next, targetId: next.id },
                                    { sourceId: next.id, name: RelationType.has_previous, targetId: previous.id },
                                ]
                            }
                            manager.batchRelate(batch);
                        }
                        if (next && !previous && !parent) {
                            const batch: IBatchRelateArgs = {};
                            batch.toDelete = [
                                { sourceId: block.id, name: RelationType.has_next, targetId: next.id },
                                { sourceId: next.id, name: RelationType.has_previous, targetId: block.id }
                            ];
                            manager.batchRelate(batch);
                        }
                        manager.deleteBlock(block.id);
                        manager.updateView();
                        if (next) {
                            manager.setBlockFocus(next);
                            next.setCaret(0, CARET.LEFT);
                            return;
                        }
                        if (previous) {
                            manager.setBlockFocus(previous);
                            previous.setCaret(0, CARET.LEFT);
                            return;
                        }
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
                        const previousEdge = block.getRelation(RelationType.has_previous);
                        if (!previousEdge) {
                            block.setCaret(0, CARET.LEFT);
                            return;
                        }
                        const previous = manager.getBlock(previousEdge.targetId) as StandoffEditorBlock;
                        if (!previous) return;
                        previous.setCaret(0, CARET.LEFT);
                        manager.setBlockFocus(previous);
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
                        const nextEdit = block.getRelation(RelationType.has_next);
                        const len = block.cells.length;
                        if (!nextEdit) {
                            block.setCaret(len - 1, CARET.LEFT);
                            return;
                        }
                        const next = manager.getBlock(nextEdit.targetId) as StandoffEditorBlock;
                        if (!next) return;
                        next.setCaret(0, CARET.LEFT);
                        manager.setBlockFocus(next);
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
                        const previousEdge = block.getRelation(RelationType.has_previous);
                        const previous = manager.getBlock(previousEdge.targetId) as StandoffEditorBlock;
                        if (!previous) return;
                        const last = previous.getLastCell();
                        previous.setCaret(last.index);
                        manager.setBlockFocus(previous);
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
                        const next = manager.getNextOf(block.id);
                        if (!next) return;
                        next.setCaret(0, CARET.LEFT);
                        manager.setBlockFocus(next);
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
    getPreviousOf(blockId: string) {
        return this.getTargetBlock<StandoffEditorBlock>(blockId, RelationType.has_previous);
    }
    getFirstChild(blockId: string) {
        return this.getTargetBlock<StandoffEditorBlock>(blockId, RelationType.has_first_child);
    }
    getNextOf(blockId: string) {
        return this.getTargetBlock<StandoffEditorBlock>(blockId, RelationType.has_next);
    }
    getParentOf(blockId: string) {
        return this.getTargetBlock<MainListBlock>(blockId, RelationType.has_parent) as MainListBlock;
    }
    getRightMarginOf(blockId: string) {
        return this.getTargetBlock<MarginBlock>(blockId, RelationType.has_right_margin) as MarginBlock;
    }
    getLeftMarginOf(blockId: string) {
        return this.getTargetBlock<MarginBlock>(blockId, RelationType.has_left_margin) as MarginBlock;
    }
    getLeftMarginParent(blockId: string) {
        return this.getTargetBlock<StandoffEditorBlock>(blockId, RelationType.has_left_margin_parent);
    }
    getTargetBlock<T extends IBlock>(blockId: string, type: string) {
        const block = this.getBlock(blockId) as T;
        if (!block) return null;
        const edge = block.getRelation(type);
        if (edge) return this.getBlock(edge.targetId) as T;
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
            relations: this.relations,
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
    batchRelate(args: IBatchRelateArgs) {
        const self = this;
        if (args.toDelete) {
            args.toDelete.forEach(edge => {
                let block = self.getBlock(edge.sourceId);
                block?.removeRelation(edge.name, true);
            });
        }
        if (args.toAdd) {
            args.toAdd.forEach(edge => {
                let block = self.getBlock(edge.sourceId);
                block?.addRelation(edge.name, edge.targetId, true);
            })
        }
        this.commit({
            redo: {
                id: this.id,
                name: "batchRelate",
                value: args
            },
            undo: {
                id: this.id,
                name: "batchRelate",
                value: { toDelete: args.toAdd, toAdd: args.toDelete }
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
    testLoadDocument(doc: IDocumentDto) {
        this.id = doc.id;
        const self = this;
        doc.blocks.forEach(b => {
            if (b.type == BlockType.MainListBlock) {
                const block = self.createMainListBlock();
                block.bind(b);
                self.blocks.push(block);
            }
            if (b.type == BlockType.MarginBlock) {
                const block = self.createMarginBlock();
                self.blocks.push(block);
            }
            if (b.type == BlockType.IndentedListBlock) {
                const block = self.createIndentedListBlock();
                self.blocks.push(block);
            }
            if (b.type == BlockType.StandoffEditorBlock) {
                const block = self.createStandoffEditorBlock();
                self.blocks.push(block);
            }
        });
    }
    loadDocument(doc: StandoffEditorBlockDto) {
        this.reset();
        const paragraphs = doc.text.split(/\r?\n/);
        const mainList = this.createMainListBlock();
        let start = 0;
        for (let i = 0; i < paragraphs.length; i ++) {
            let textBlock = this.createStandoffEditorBlock();
            let text = paragraphs[i];
            let end = start + text.length + 1; // + 1 to account for the CR stripped from the text
            const props = doc.standoffProperties
                .filter(x=> x.start != undefined && x.end != undefined)
                .filter(x=> x.start >= start && x.end <= end)
             ;             
            start += text.length;
            let data = {
                text: text,
                standoffProperties: props as any[],
                blockProperties: [] as any[]
            };
            if (i == 0) {
                data = {...data, blockProperties: doc.blockProperties as any[] };
            }
            textBlock.bind(data);
            textBlock.addEOL();
            mainList.container.appendChild(textBlock.container);
            mainList.blocks.push(textBlock);
            this.blocks.push(textBlock);
        }
        const firstChild = mainList.blocks[0];
        const adds = [
            { sourceId: mainList.id, name: RelationType.has_first_child, targetId: firstChild.id },
            { sourceId: firstChild.id, name: RelationType.has_parent, targetId: mainList.id }
        ];
        if (paragraphs.length > 1) {
            for (let i = 0; i < paragraphs.length; i ++) { 
                // Setup previous/next relations between blocks.
            }
        }
        this.batchRelate({
            toAdd: adds
        });
        mainList.applyBlockPropertyStyling();
        this.container.appendChild(mainList.container);
        this.blocks.push(mainList);
        this.commit({
            redo: {
                id: this.id,
                name: "loadDocument",
                value: { doc }
            }
        })
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


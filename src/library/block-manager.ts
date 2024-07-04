import { createUnderline, updateElement } from "./svg";
import { v4 as uuidv4 } from 'uuid';
import { LeftMarginBlock, RightMarginBlock } from "./margin-block";
import { MainListBlock } from "./main-list-block";
import { IndentedListBlock } from "./indented-list-block";
import { TabBlock, TabRowBlock } from "./tabs-block";
import { GridBlock, GridCellBlock, GridRowBlock } from "./grid-block";
import { ImageBlock } from "./image-block";
import { VideoBlock } from "./video-block";
import { IframeBlock } from "./iframe-block";
import { Cell } from "./cell";
import _ from "underscore";
import LeaderLine from 'leader-line-new';
import { ClockPlugin, IPlugin } from "./plugins/clock";
import { AbstractBlock } from "./abstract-block";
import { BlockProperty } from "./block-property";
import { StandoffEditorBlock } from "./standoff-editor-block";
import { StandoffProperty } from "./standoff-property";
import { IBlockManager,InputEvent, BlockType, IBlock, InputAction, IBlockSelection, Commit, IBlockPropertySchema, IBlockManagerConstructor, InputEventSource, IBindingHandlerArgs, IBatchRelateArgs, Command, CARET, RowPosition, IRange, Word, DIRECTION, ISelection, IStandoffPropertySchema, GUID, IBlockDto, IStandoffEditorBlockDto, IMainListBlockDto, PointerDirection, Platform, TPlatformKey } from "./types";

export class BlockManager extends AbstractBlock implements IBlockManager {
    id: string;
    type: BlockType;
    container: HTMLDivElement;
    blocks: IBlock[];
    relation: Record<string, IBlock>;
    metadata: Record<string,any>;
    focus?: IBlock;
    modes: string[];
    inputEvents: InputEvent[];
    inputActions: InputAction[];
    selections: IBlockSelection[];
    commits: Commit[];
    pointer: number;
    direction: PointerDirection;
    blockProperties: BlockProperty[];
    blockSchemas: IBlockPropertySchema[];
    leaderLines: LeaderLine[];
    plugins: IPlugin[];
    constructor(props?: IBlockManagerConstructor) {
        super({ id: props?.id, container: props?.container });
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
        this.inputEvents = this.getGlobalInputEvents();
        this.inputActions = [];
        this.modes = ["global"];
        this.plugins = [];
        this.leaderLines = [];
        this.attachEventBindings();
    }
    deserialize(json: any): IBlock {
        throw new Error("Method not implemented.");
    }
    destroy() {
        this.blocks = [];
        this.inputEvents = [];
        this.inputActions = [];
        this.blockProperties = [];
        this.blockSchemas = [];
        this.modes = [];
        this.leaderLines = [];
        this.selections = [];
        this.container.remove();
    }
    attachEventBindings() {
        const self = this;
        document.body.addEventListener("keydown", function (e) {
            const ALLOW = true, FORBID = false;
            if (e.target != document.body) {
                return ALLOW;
            }
            const block = self.getBlockInFocus();
            self.handleKeyDown(e);
            return ALLOW;
        });
    }
    clearLeaderLines() {
        this.leaderLines.forEach(l => { 
            updateElement(l.start as HTMLElement, {
                style: {
                    border: "none"
                }
            })
            l.remove();
        });
    }
    drawLeaderLines(relation?: string, colour?: string) {
        const self = this;
        
        this.blocks.forEach(b => {
            for (let n in b.relation) {
                if (relation) {
                    if (n != relation) continue;
                }
                let target = b.relation[n];
                updateElement(b.container, {
                    style: {
                        border: "1px solid " + (colour || "orange")
                    }
                });
                self.leaderLines.push(new LeaderLine(
                    b.container,
                    target.container,
                    {endLabel: LeaderLine.pathLabel(n), color: (colour || "orange")}
                ));     
            }
        })
    }
    private handleKeyDown(e: KeyboardEvent) {
        e.preventDefault();
        const ALLOW = true, FORBID = false;
        const input = this.toKeyboardInput(e);
        const modifiers = ["Shift", "Alt", "Meta", "Control", "Option"];
        if (modifiers.some(x => x == input.key)) {
            return ALLOW;
        }
        const match = this.getFirstMatchingInputEvent(input);
        if (match) {
            const args = { block: this.getBlockInFocus() } as any;
            match.action.handler(args);
            return FORBID;
        }
        return ALLOW;
    }
    getGlobalInputEvents():InputEvent[] {
        const self = this;
        return [
            {
                mode: "global",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "Delete"
                },
                action: {
                    name: "Delete block currently in focus or selected.",
                    description: "",
                    handler: this.handleDeleteBlock.bind(this)
                }
            },
            {
                mode: "global",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "ArrowDown"
                },
                action: {
                    name: "Set focus to the block below.",
                    description: "",
                    handler: this.moveCaretDown.bind(this)
                }
            },
            {
                mode: "global",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "ArrowUp"
                },
                action: {
                    name: "Set focus to the block above.",
                    description: "",
                    handler: (args: IBindingHandlerArgs) => {
                        const block = args.block;
                        if (block.relation.previous) {
                            self.setBlockFocus(block.relation.previous);
                            return;
                        }
                    }
                }
            }
        ]
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
    setFocus() {

    }
    setBlockFocus(block: IBlock) {
        const oldFocus = this.focus;
        oldFocus?.container.classList.remove("focus-highlight");
        this.focus = block;
        this.focus.container.classList.add("focus-highlight");
        block.setFocus();
    }
    getImageBlockSchemas() {
        return []
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
                event: {
                    onInit: (p: BlockProperty) => {
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
            },
            {
                type: "block/background/image",
                name: "Set background image",
                event: {
                    onInit: (p: BlockProperty) => {
                        const url = p.value || (p.value = prompt("Background image url: ") || "");
                        if (!url) return;
                        const panel = p.block.container;
                        updateElement(panel, {
                            style: {
                                "background-size": "cover",
                                "background": "url(" + url + ") no-repeat center center fixed"
                            }
                        });
                    }
                }
            },
            {
                type: "block/background/colour",
                name: "Set background colour",
                event: {
                    onInit: (p: BlockProperty) => {
                        updateElement(p.block.container, {
                            style: {
                                "background-color": p.value
                            }
                        });
                    }
                }
            },
            {
                type: "block/font/colour",
                name: "Set font colour",
                event: {
                    onInit: (p: BlockProperty) => {
                        updateElement(p.block.container, {
                            style: {
                                "color": p.value
                            }
                        });
                    }
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
    getTabBlockEvents() {
        const events: InputEvent[] = [
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Mouse,
                    match: "click"
                },
                action: {
                    name: "Set focus to the current block.",
                    description: "",
                    handler: (args: IBindingHandlerArgs) => {
                        const block = args.block;
                        const manager = block.owner as BlockManager;
                        manager.setBlockFocus(block);
                    }
                }
            }
        ]
        return events;
    }
    getImageBlockEvents() {
        const events: InputEvent[] = [
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Mouse,
                    match: "click"
                },
                action: {
                    name: "Set focus to the current block.",
                    description: "",
                    handler: (args: IBindingHandlerArgs) => {
                        const block = args.block as ImageBlock;
                        const manager = block.owner as BlockManager;
                        manager.setBlockFocus(block);
                    }
                }
            }
        ]
        return events;
    }
    getEditorEvents() {
        const events: InputEvent[] = [
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Mouse,
                    match: "click"
                },
                action: {
                    name: "Set focus to the current block.",
                    description: "",
                    handler: (args: IBindingHandlerArgs) => {
                        const block = args.block as StandoffEditorBlock;
                        const manager = block.owner as BlockManager;
                        manager.setBlockFocus(block);
                    }
                }
            },
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
                        let leftMargin = block.relation.leftMargin as LeftMarginBlock;
                        if (!leftMargin) {
                            leftMargin = manager.createLeftMarginBlock();
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
                        let rightMargin = block.relation.rightMargin as RightMarginBlock;
                        if (!rightMargin) {
                            rightMargin = this.createRightMarginBlock();
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
                    handler: this.handleEnterKey.bind(this)
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
                    handler: this.handleTabKey.bind(this)
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
                    handler: this.moveSelectionOneCharacterRightwards.bind(this)
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
                    handler: this.moveSelectionOneCharacterLeftwards
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
                    handler: this.moveCaretToStartOfTextBlock.bind(this)
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
                    handler: this.moveCaretToEndOfTextBlock
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
                        if (parent.type == BlockType.LeftMarginBlock) {
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
                    handler: this.moveCaretDown.bind(this)
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
                    handler: this.moveCaretLeft.bind(this)
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
    getParentOfType(block: IBlock, type: BlockType) {
        let current = block;
        while (current) {
            let parent = current.relation.parent;
            if (parent) {
                if (parent.type == type) {
                    return current.relation.parent;
                }
                current = parent;
                continue;
            }
            current = current.relation.previous;
            continue;
        }
        return null;
    }
    getParent(block: IBlock) {
        let current = block;
        while (current) {
            if (current.relation.parent) {
                return current.relation.parent;
            }
            current = current.relation.previous;
        }
        return null;
    }
    findNearestWord(index: number, words: Word[]) {
        const lastIndex = words.length - 1;
        for (let i = lastIndex; i >= 0; i--) {
            let word = words[i];
            if (index >= word.start) return word;
        }
        return null;
    }
    moveSelectionOneCharacterRightwards(args: IBindingHandlerArgs) {
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
    moveSelectionOneCharacterLeftwards(args: IBindingHandlerArgs){
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
    moveCaretToStartOfTextBlock(args: IBindingHandlerArgs) {
        const { caret } = args;
        const block = args.block as StandoffEditorBlock;
        const first = block.cells[0];
        if (!first) return;
        block.setCaret(0, CARET.LEFT);
    }
    moveCaretToEndOfTextBlock(args: IBindingHandlerArgs) {
        const block = args.block as StandoffEditorBlock;
        const last = block.getLastCell();
        if (!last) return;
        block.setCaret(last.index, CARET.LEFT);
    }
    getStandoffPropertyEvents() {
        const events: InputEvent[] = [
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "Control-C"
                },
                action: {
                    name: "Clock",
                    description: "Turns the text range into a ticking clock",
                    handler: this.applyClockToText.bind(this)
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "Control-F"
                },
                action: {
                    name: "Flip",
                    description: "Flips the selected text upside down",
                    handler: this.applyFlipToText.bind(this)
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "Control-M"
                },
                action: {
                    name: "Mirror",
                    description: "Mirrors the selected text",
                    handler: this.applyMirrorToText.bind(this)
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "Control-I"
                },
                action: {
                    name: "Italicise",
                    description: "Italicises text in the selection. If no text is selected, switches to/from italics text mode.",
                    handler: this.applyItalicsToText.bind(this)
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
            // {
            //     mode: "default",
            //     trigger: {
            //         source: InputEventSource.Keyboard,
            //         match: "Control-B"
            //     },
            //     action: {
            //         name: "Bold",
            //         description: "Emboldens text in the selection. If no text is selected, switches to/from embolden text mode.",
            //         handler: this.applyBoldToText
            //     }
            // },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "Control-B"
                },
                action: {
                    name: "Blur",
                    description: "Blurs text",
                    handler: this.applyBlurToText.bind(this)
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
                    handler: this.applyEntityReferenceToText
                }
            }
        ];
        return events;
    }
    getStandoffSchemas() {
        const self = this;
        return [
            {
                type: "animation/clock",
                name: "Clock",
                description: "",
                event: {
                    onInit: (p: StandoffProperty) => {
                        const clock = new ClockPlugin({ property: p });
                        p.plugin = clock;
                        self.plugins.push(clock);
                        clock.start();
                    },
                    onDestroy: (p: StandoffProperty) => {
                        p.plugin?.destroy();
                        const i = self.plugins.findIndex(x => x == p.plugin);
                        self.plugins.splice(i, 1);
                    }
                }
            },
            {
                type: "style/blur",
                name: "Blur",
                wrap: {
                    cssClass: "style_blur"
                }
            },
            {
                type: "style/flip",
                name: "Flip",
                wrap: {
                    cssClass: "style_flipY"
                }
            },
            {
                type: "style/mirror",
                name: "Mirror",
                wrap: {
                    cssClass: "style_flipX"
                }
            },
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
    handleDeleteBlock(args: IBindingHandlerArgs) {
        const block = args.block;
        const i = this.blocks.findIndex(x => x.id == block.id);
        const { previous, next, parent, firstChild } = block.relation;
        if (previous) {
            previous.relation.next = next;
        }
        if (next) {
            next.relation.previous = previous;
        }
        if (parent) {
            if (next) {
                next.relation.parent = parent;
            }
        }
        if (firstChild) {
            if (previous) {
                previous.relation.next = firstChild;
            }
        }
        block.destroy();
        this.blocks.splice(i, 1); // delete
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
    stageRightMarginBlock(rightMargin: LeftMarginBlock, mainBlock: StandoffEditorBlock) {
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
    stageLeftMarginBlock(leftMargin: LeftMarginBlock, mainBlock: StandoffEditorBlock) {
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
    async listDocuments() {
        const res = await fetch("/api/listDocuments");
        const json = await res.json();
        return json.files as string[];
    }
    async loadServerDocument(filename: string) {
        const res = await fetch("/api/loadDocumentJson?filename=" + filename, { method: "GET" });
        const json = await res.json();
        console.log("loadServerDocument", { filename, json });
        if (!json.Success) {
            return;
        }
        this.loadDocument(json.Data.document);
    }
    async saveServerDocument(filename: string) {
        const data = this.getDocument();
        if (!filename) return;
        const res = await fetch("/api/saveDocumentJson", {
            headers: { "Content-Type": "application/json" },
            method: "POST",
            body: JSON.stringify({
                filename: filename,
                document: data
            })
        });
        const json = await res.json();
        console.log("saveServerDocument", { filename, json, data })
        if (!json.Success) {
            return;
        }
    }
    buildStandoffEditorBlock(container: HTMLDivElement, blockDto: IBlockDto) {
        const self = this;
        const textBlock = this.createStandoffEditorBlock();
        textBlock.bind(blockDto as IStandoffEditorBlockDto);
        if (blockDto.relation?.leftMargin) {
            const leftMargin = this.recursivelyBuildBlock(textBlock.container, blockDto.relation.leftMargin) as LeftMarginBlock;
            textBlock.relation.leftMargin = leftMargin;
            this.stageLeftMarginBlock(leftMargin, textBlock);
        }
        if (blockDto.relation?.rightMargin) {
            const rightMargin = this.recursivelyBuildBlock(textBlock.container, blockDto.relation.rightMargin) as RightMarginBlock;
            textBlock.relation.rightMargin = rightMargin;
            this.stageRightMarginBlock(rightMargin, textBlock);
        }
        if (blockDto.children) {
            blockDto.children.forEach((b,i) => {
                let block = self.recursivelyBuildBlock(textBlock.container, b) as IBlock;
                textBlock.blocks.push(block);
            });
        }
        this.addParentSiblingRelations(textBlock);
        container.appendChild(textBlock.container);
        return textBlock;
    }
    buildLeftMarginBlock(container: HTMLDivElement, blockDto: IBlockDto) {
        const self = this;
        const leftMargin = this.createLeftMarginBlock(blockDto);
        if (blockDto.children) {
            blockDto.children.forEach((b,i) => { 
                let block = self.recursivelyBuildBlock(leftMargin.container, b) as IBlock;
                leftMargin.blocks.push(block);
            });
        }
        this.addParentSiblingRelations(leftMargin);
        container.appendChild(leftMargin.container);
        return leftMargin;
    }
    buildImageBlock(container: HTMLDivElement, blockDto: IBlockDto) {
        const self = this;
        const image = this.createImageBlock(blockDto);
        image.build();
        if (blockDto.children) {
            blockDto.children.forEach((b,i) => { 
                let block = self.recursivelyBuildBlock(image.container, b) as IBlock;
                image.blocks.push(block);
            });
        }
        this.addParentSiblingRelations(image);
        container.appendChild(image.container);
        return image;
    }
    buildRightMarginBlock(container: HTMLDivElement, blockDto: IBlockDto) {
        const self = this;
        const rightMargin = this.createRightMarginBlock(blockDto);
        if (blockDto.children) {
            blockDto.children.forEach((b,i) => { 
                let block = self.recursivelyBuildBlock(rightMargin.container, b) as IBlock;
                rightMargin.blocks.push(block);
            });
        }
        this.addParentSiblingRelations(rightMargin);
        container.appendChild(rightMargin.container);
        return rightMargin;
    }
    buildGridBlock(container: HTMLDivElement, blockDto: IBlockDto) {
        const self = this;
        const gridBlock = this.createGridBlock();
        if (blockDto.children) {
            blockDto.children.forEach((b,i) => {
                let rowBlock = self.recursivelyBuildBlock(gridBlock.container, b) as GridRowBlock;
                gridBlock.blocks.push(rowBlock);
            });
        }
        this.addParentSiblingRelations(gridBlock);
        container.appendChild(gridBlock.container);
        return gridBlock;
    }
    buildGridRowBlock(container: HTMLDivElement, blockDto: IBlockDto) {
        const self = this;
        const rowBlock = this.createGridRowBlock();
        if (blockDto.children) {
            blockDto.children.forEach((b,i) => {
                let cellBlock = self.recursivelyBuildBlock(rowBlock.container, b) as GridCellBlock;
                if (b.metadata?.width) {
                    updateElement(cellBlock.container, {
                        style: {
                            width: b.metadata?.width
                        }
                    });
                }
                rowBlock.blocks.push(cellBlock);
            });
        }
        this.addParentSiblingRelations(rowBlock);
        container.appendChild(rowBlock.container);
        return rowBlock;
    }
    buildGridCellBlock(container: HTMLDivElement, blockDto: IBlockDto) {
        const self = this;
        const cellBlock = this.createGridCellBlock(blockDto);
        if (blockDto.children) {
            blockDto.children.forEach((b,i) => {
                let block = self.recursivelyBuildBlock(cellBlock.container, b) as IBlock;
                cellBlock.blocks.push(block);
            });
        }
        this.addParentSiblingRelations(cellBlock);
        container.appendChild(cellBlock.container);
        return cellBlock;
    }
    buildVideoBlock(container: HTMLDivElement, blockDto: IBlockDto){
        const self = this;
        const video = this.createVideoBlock(blockDto);
        if (blockDto.children) {
            blockDto.children.forEach((b,i) => {
                let tabBlock = self.recursivelyBuildBlock(video.container, b) as TabBlock;
                video.blocks.push(tabBlock);
            });
        }
        video.build();
        this.addParentSiblingRelations(video);
        container.appendChild(video.container);
        return video;
    }
    buildIframeBlock(container: HTMLDivElement, blockDto: IBlockDto){
        const self = this;
        const iframe = this.createIFrameBlock(blockDto);
        if (blockDto.children) {
            blockDto.children.forEach((b,i) => {
                let tabBlock = self.recursivelyBuildBlock(iframe.container, b) as TabBlock;
                iframe.blocks.push(tabBlock);
            });
        }
        iframe.build();
        this.addParentSiblingRelations(iframe);
        container.appendChild(iframe.container);
        return iframe;
    }
    buildTabRowBlock(container: HTMLDivElement, blockDto: IBlockDto) {
        const self = this;
        const rowBlock = this.createTabRowBlock(blockDto);
        if (blockDto.children) {
            blockDto.children.forEach((b,i) => {
                let tabBlock = self.recursivelyBuildBlock(rowBlock.container, b) as TabBlock;
                rowBlock.blocks.push(tabBlock);
            });
        }
        this.addParentSiblingRelations(rowBlock);
        rowBlock.renderLabels();
        (rowBlock.blocks[0] as TabBlock)?.setActive();
        container.appendChild(rowBlock.container);
        return rowBlock;
    }
    addTab({ tabId, name }: { tabId: string, name: string }) {
        const tab = this.getBlock(tabId) as TabBlock;
        const row = this.getParentOfType(tab, BlockType.TabRowBlock) as TabRowBlock;
        if (!row) return;
        const newTab = this.createTabBlock({
            type: BlockType.TabBlock,
            metadata: {
                name: name
            }
        }) as TabBlock;
        const textBlock = this.createStandoffEditorBlock({
            type: BlockType.StandoffEditorBlock,
            blockProperties:[
                { type: "block/alignment/left" }
            ]
        }) as StandoffEditorBlock;
        textBlock.addEOL();
        newTab.blocks.push(textBlock);
        row.blocks.push(newTab);
        this.addParentSiblingRelations(row);
        row.renderLabels();
        newTab.panel.appendChild(textBlock.container);
        row.container.appendChild(newTab.container);
        const label = newTab.container.querySelector(".tab-label") as HTMLSpanElement;
        row.setTabActive(newTab, label);
        this.setBlockFocus(textBlock);
        return newTab;
    }
    buildTabBlock(container: HTMLDivElement, blockDto: IBlockDto) {
        const self = this;
        const tabBlock = this.createTabBlock(blockDto);
        if (blockDto.children) {
            blockDto.children.forEach((b,i) => {
                let block = self.recursivelyBuildBlock(tabBlock.panel, b) as IBlock;
                tabBlock.blocks.push(block);
            });
        }
        this.addParentSiblingRelations(tabBlock);
        container.appendChild(tabBlock.container);
        return tabBlock;
    }
    buildIndentedListBlock(container: HTMLDivElement, blockDto: IBlockDto) {
        const self = this;
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
                });
            }
            this.addParentSiblingRelations(indentedListBlock);
            const level = indentedListBlock.metadata.indentLevel || 0 as number;
            indentedListBlock.metadata.indentLevel = level + 1;
            this.renderIndent(indentedListBlock);
            container.appendChild(indentedListBlock.container);
            return indentedListBlock;
    }
    addParentSiblingRelations<T extends AbstractBlock>(parent: T) {
        parent.blocks.forEach((block, i) => {
            if (i == 0) {
                block.relation.parent = parent;
                parent.relation.firstChild = block;
            }
            if (i > 0) {
                let previous = parent.blocks[i - 1];
                block.relation.previous = previous;
                previous.relation.next = block;
            }
        });
        return parent;
    }
    recursivelyBuildBlock(container: HTMLDivElement, blockDto: IBlockDto) {
        if (blockDto.type == BlockType.StandoffEditorBlock) {
            return this.buildStandoffEditorBlock(container, blockDto);
        }
        if (blockDto.type == BlockType.LeftMarginBlock) {
            return this.buildLeftMarginBlock(container, blockDto);
        }
        if (blockDto.type == BlockType.RightMarginBlock) {
            return this.buildRightMarginBlock(container, blockDto);
        }
        if (blockDto.type == BlockType.GridBlock) {
            return this.buildGridBlock(container, blockDto);
        }
        if (blockDto.type == BlockType.GridRowBlock) {
            return this.buildGridRowBlock(container, blockDto);
        }
        if (blockDto.type == BlockType.GridCellBlock) {
            return this.buildGridCellBlock(container, blockDto);
        }
        if (blockDto.type == BlockType.IFrameBlock) {
            return this.buildIframeBlock(container, blockDto);
        }
        if (blockDto.type == BlockType.TabRowBlock) {
            return this.buildTabRowBlock(container, blockDto);
        }
        if (blockDto.type == BlockType.TabBlock) {
            return this.buildTabBlock(container, blockDto);
        }
        if (blockDto.type == BlockType.IndentedListBlock) {
            return this.buildIndentedListBlock(container, blockDto);
        }
        if (blockDto.type == BlockType.ImageBlock) {
            return this.buildImageBlock(container, blockDto);
        }
        if (blockDto.type == BlockType.VideoBlock) {
            return this.buildVideoBlock(container, blockDto);
        }
        return null;
    }
    getBlockInFocus() {
        return this.focus;
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
        if (dto.type != BlockType.MainListBlock) {
            console.error("Expected doc.type to be a MainListBlock");
            return;
        }
        if (this.container.childNodes.length) {
            this.container.innerHTML = "";
        }
        if (this.blocks.length) {
            this.blocks = [];
        }
        this.id = dto.id || uuidv4();
        const container = document.createElement("DIV") as HTMLDivElement;
        const mainBlock = this.createMainListBlock();
        mainBlock.bind(dto);
        if (dto.children) {
            const len = dto.children.length;
            for (let i = 0; i <= len - 1; i++) {
                let block = this.recursivelyBuildBlock(container, dto.children[i]) as IBlock;
                mainBlock.blocks.push(block);
                if (i == 0) {
                    mainBlock.relation.firstChild = block;
                    block.relation.parent = mainBlock;
                }
                if (i > 0) {
                    let previous = mainBlock.blocks[i - 1];
                    previous.relation.next = block;
                    block.relation.previous = previous;
                }
            }
        }
        this.addParentSiblingRelations(mainBlock);
        container.appendChild(mainBlock.container);
        this.container.appendChild(container);
    }
    addPreviousBlock(newBlock: IBlock, sibling: IBlock) {
        const parent = sibling.relation.parent;
        parent.relation.firstChild = newBlock;
        newBlock.relation.parent = parent;
        newBlock.relation.next = sibling;
        sibling.relation.previous = newBlock;
        delete sibling.relation.parent;
        const i = parent.blocks.findIndex(x => x.id == newBlock.id);
        if (i > 0) {
            parent.blocks.splice(i - 1, 0, sibling);
        } else {
            parent.blocks = [newBlock, ...parent.blocks];
        }
        sibling.container.insertAdjacentElement("beforebegin", newBlock.container);
    }
    addNextBlock(newBlock: IBlock, sibling: IBlock) {
        sibling.container.insertAdjacentElement("afterend", newBlock.container);
        const parent = this.getParent(sibling);
        if (!parent) return;
        const i = parent.blocks.findIndex(x => x.id == sibling.id);
        parent.blocks.splice(i + 1, 0, newBlock);
        const next = sibling.relation.next;
        sibling.relation.next = newBlock;
        newBlock.relation.previous = sibling;
        if (next) {
            newBlock.relation.next = next;
            next.relation.previous = newBlock;
        }
    }
    createGrid(rows: number, cells: number) {
        const gridBlock = this.createGridBlock();
        const width = 100 / cells;
        for (let row = 1; row <= rows; row++) {
            const rowBlock = this.createGridRowBlock();
            for (let cell = 1; cell <= cells; cell++) {
                const cellBlock = this.createGridCellBlock({
                    type: BlockType.GridCellBlock,
                    metadata: {
                        width: (width-2) + "%"
                    }
                });
                const textBlock = this.createStandoffEditorBlock();
                textBlock.addEOL();
                cellBlock.blocks.push(textBlock);
                rowBlock.blocks.push(cellBlock);
                this.addParentSiblingRelations(cellBlock);
                cellBlock.container.appendChild(textBlock.container);
                rowBlock.container.appendChild(cellBlock.container);
            }
            this.addParentSiblingRelations(rowBlock);
            gridBlock.blocks.push(rowBlock);
            gridBlock.container.appendChild(rowBlock.container);
        }
        this.addParentSiblingRelations(gridBlock);
        return gridBlock;
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
    createMainListBlock(dto?: IBlockDto) {
        const blockSchemas = this.getBlockSchemas();
        const block = new MainListBlock({
            owner: this
        });
        if (dto?.metadata) block.metadata = dto.metadata;
        block.setBlockSchemas(blockSchemas);
        if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        block.applyBlockPropertyStyling();
        this.blocks.push(block);
        return block;
    }
    createIndentedListBlock(dto?: IBlockDto) {
        const blockSchemas = this.getBlockSchemas();
        const block = new IndentedListBlock({
            owner: this
        });
        if (dto?.metadata) block.metadata = dto.metadata;
        block.setBlockSchemas(blockSchemas);
        if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        block.applyBlockPropertyStyling();
        this.blocks.push(block);
        return block;
    }
    createTabBlock(dto?: IBlockDto){
        const blockSchemas = this.getBlockSchemas();
        const inputEvents = this.getTabBlockEvents();
        const block = new TabBlock({
            owner: this
        });
        block.inputEvents = inputEvents;
        if (dto?.metadata) block.metadata = dto.metadata;
        block.setBlockSchemas(blockSchemas);
        if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        block.applyBlockPropertyStyling();
        this.blocks.push(block);
        return block;
    }
    createGridCellBlock(dto?: IBlockDto) {
        const blockSchemas = this.getBlockSchemas();
        const block = new GridCellBlock({
            owner: this,
            id: dto?.id
        });
        if (dto?.metadata) block.metadata = dto.metadata;
        if (block.metadata.width) {
            updateElement(block.container, {
                style: {
                    width: block.metadata.width
                }
            });
        }
        updateElement(block.container, {
            style: {
                //"display": "table-cell",
                "vertical-align": "top"
            }
        });
        block.setBlockSchemas(blockSchemas);
        if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        block.applyBlockPropertyStyling();
        this.blocks.push(block);
        return block;
    }
    createGridRowBlock(dto?: IBlockDto) {
        const blockSchemas = this.getBlockSchemas();
        const block = new GridRowBlock({
            owner: this,
            id: dto?.id
        });
        if (dto?.metadata) block.metadata = dto.metadata;
        block.setBlockSchemas(blockSchemas);
        if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        block.applyBlockPropertyStyling();
        this.blocks.push(block);
        return block;
    }
    createGridBlock(dto?: IBlockDto) {
        const blockSchemas = this.getBlockSchemas();
        const block = new GridBlock({
            owner: this,
            id: dto?.id
        });
        if (dto?.metadata) block.metadata = dto.metadata;
        block.setBlockSchemas(blockSchemas);
        if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        block.applyBlockPropertyStyling();
        this.blocks.push(block);
        return block;
    }
    createTabRowBlock(dto?: IBlockDto) {
        const blockSchemas = this.getBlockSchemas();
        const inputEvents = this.getTabBlockEvents();
        const block = new TabRowBlock({
            owner: this
        });
        if (dto?.metadata) block.metadata = dto.metadata;
        block.inputEvents = inputEvents;
        block.setBlockSchemas(blockSchemas);
        if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        block.applyBlockPropertyStyling();
        this.blocks.push(block);
        return block;
    }
    createLeftMarginBlock(dto?: IBlockDto) {
        const blockSchemas = this.getBlockSchemas();
        const block = new LeftMarginBlock({
            owner: this
        });
        if (dto?.metadata) block.metadata = dto.metadata;
        block.setBlockSchemas(blockSchemas);
        block.addBlockProperties([ { type: "block/marginalia/left" } ]);
        if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        block.applyBlockPropertyStyling();
        this.blocks.push(block);
        return block;
    }
    createIFrameBlock(dto?: IBlockDto) {
        const blockSchemas = this.getBlockSchemas();
        const block = new IframeBlock({
            owner: this
        });
        if (dto?.metadata) block.metadata = dto.metadata;
        block.setBlockSchemas(blockSchemas);
        if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        block.applyBlockPropertyStyling();
        this.blocks.push(block);
        return block;
    }
    createVideoBlock(dto?: IBlockDto) {
        const blockSchemas = this.getBlockSchemas();
        const block = new VideoBlock({
            owner: this
        });
        if (dto?.metadata) block.metadata = dto.metadata;
        block.setBlockSchemas(blockSchemas);
        if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        block.applyBlockPropertyStyling();
        this.blocks.push(block);
        return block;
    }
    createImageBlock(dto?: IBlockDto) {
        const blockSchemas = this.getImageBlockSchemas();
        const inputEvents = this.getImageBlockEvents();
        const block = new ImageBlock({
            owner: this
        });
        block.inputEvents = inputEvents;
        if (dto?.metadata) block.metadata = dto.metadata;
        block.setBlockSchemas(blockSchemas);
        if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        block.applyBlockPropertyStyling();
        this.blocks.push(block);
        return block;
    }
    createRightMarginBlock(dto?: IBlockDto) {
        const blockSchemas = this.getBlockSchemas();
        const block = new RightMarginBlock({
            owner: this
        });
        if (dto?.metadata) block.metadata = dto.metadata;
        block.setBlockSchemas(blockSchemas);
        block.addBlockProperties([ { type: "block/marginalia/right" } ]);
        if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        block.applyBlockPropertyStyling();
        this.blocks.push(block);
        return block;
    }
    addImageBlock(sibling: IBlock, url: string) {
        const image = this.createImageBlock({
            type: BlockType.ImageBlock,
            metadata: {
                url: url
            }
        }) as ImageBlock;
        image.build();
        this.addNextBlock(sibling, image);
    }
    addVideoBlock(sibling: IBlock, url: string) {
        const video = this.createVideoBlock({
            type: BlockType.VideoBlock,
            metadata: {
                url: url
            }
        }) as VideoBlock;
        video.build();
        this.addNextBlock(sibling, video);
    }
    addIFrameBlock(sibling: IBlock, url: string) {
        const iframe = this.createIFrameBlock({
            type: BlockType.IFrameBlock,
            metadata: {
                url: url
            }
        }) as IframeBlock;
        iframe.build();
        this.addNextBlock(sibling, iframe);
    }
    createStandoffEditorBlock(dto?: IBlockDto) {
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
        if (dto?.metadata) block.metadata = dto.metadata;
        if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        block.applyBlockPropertyStyling();
        this.blocks.push(block);
        return block;
    }
    handleEnterKey(args: IBindingHandlerArgs) {
        const { caret } = args;
        const block = args.block as StandoffEditorBlock;
        const next = block.relation.next;
        const parent = block.relation.parent;
        const newBlock = this.createStandoffEditorBlock();
        const blockData = block.serialize();
        newBlock.addBlockProperties(blockData.blockProperties || []);
        newBlock.applyBlockPropertyStyling();
        newBlock.addEOL();
        const insertAbove = parent && caret.left == null;
        if (insertAbove) {
            this.addPreviousBlock(newBlock, block);
        } else {
            this.addNextBlock(newBlock, block);
        }
        newBlock.setCaret(0, CARET.LEFT);
        this.setBlockFocus(newBlock);
    }
    handleTabKey(args: IBindingHandlerArgs) {
        const block = args.block as StandoffEditorBlock;
        const parent = block.relation.parent;
        if (parent) {
            /**
             * Quit if this is the first child of another block.
             */
            return;
        }
        const list = this.createIndentedListBlock();
        const previous = block.relation.previous;
        const next = block.relation.next;
        /**
         * Convert the previous block into a parent of the indented list block.
         */
        previous.relation.firstChild = list;
        list.relation.parent = previous;
        list.relation.firstChild = block;
        block.relation.parent = list;
        delete block.relation.previous;
        previous.relation.next = next;
        delete block.relation.next;
        if (next) {
            next.relation.previous = previous;
        }
        previous.blocks.push(list);
        list.blocks.push(block);
        const listParent = this.getParentOfType(block, BlockType.IndentedListBlock) as IndentedListBlock;
        const level = listParent?.metadata.indentLevel || 0 as number;
        list.metadata.indentLevel = level + 1;
        list.container.appendChild(block.container);
        previous.container.appendChild(list.container);
        this.renderIndent(list);
        // block.setCaret(0, CARET.LEFT);
        // this.setBlockFocus(block);
    }
    applyImageBackgroundToBlock(args: IBindingHandlerArgs) {
        const block = args.block as StandoffEditorBlock;
        block.addBlockProperties([{ type: "block/background/image" }]);
        block.applyBlockPropertyStyling();
    }
    applyClockToText(args: IBindingHandlerArgs) {
        const block = args.block as StandoffEditorBlock;
        const selection = block.getSelection();
        if (selection) {
            block.createStandoffProperty("animation/clock", selection);
        } else {
            // TBC
        }      
    }
    applyMirrorToText(args: IBindingHandlerArgs) {
        const block = args.block as StandoffEditorBlock;
        const selection = block.getSelection();
        if (selection) {
            block.createStandoffProperty("style/mirror", selection);
        } else {
            // TBC
        }      
    }
    applyFlipToText(args: IBindingHandlerArgs) {
        const block = args.block as StandoffEditorBlock;
        const selection = block.getSelection();
        if (selection) {
            block.createStandoffProperty("style/flip", selection);
        } else {
            // TBC
        }      
    }
    applyItalicsToText(args: IBindingHandlerArgs) {
        const block = args.block as StandoffEditorBlock;
        const selection = block.getSelection();
        if (selection) {
            block.createStandoffProperty("style/italics", selection);
        } else {
            // TBC
        }      
    }
    applyBoldToText(args: IBindingHandlerArgs) {
        this.applyStandoffProperty(args.block as StandoffEditorBlock, "style/bold") 
    }
    applyBlurToText(args: IBindingHandlerArgs) {
        this.applyStandoffProperty(args.block as StandoffEditorBlock, "style/blur") 
    }
    applyStandoffProperty(block: StandoffEditorBlock, type: string) {
        const selection = block.getSelection();
        if (selection) {
            block.createStandoffProperty(type, selection);
        } else {
            // TBC
        }  
    }
    applyEntityReferenceToText(args: IBindingHandlerArgs) {
        const block = args.block as StandoffEditorBlock;
        const selection = block.getSelection();
        if (selection) {
            block.createStandoffProperty("codex/entity-reference", selection);
        } else {
            // TBC
        }      
    }
    moveCaretLeft(args: IBindingHandlerArgs) {
        /**
         * Move the cursor back one cell ...
         */
        const { caret } = args;
        if (args.block.type != BlockType.StandoffEditorBlock) {
            const predecessor = args.block.relation.previous || args.block.relation.parent;
            if (predecessor) {
                this.setBlockFocus(predecessor);
            }
            return;
        }
        const block = args.block as StandoffEditorBlock;
        block.cache.caret.x = null;
        if (caret.left) {
            block.setCaret(caret.left.index);
            return;
        }
        /**
         * Or skip to the end of the previous block.
         */
        if (block.relation.previous?.type == BlockType.StandoffEditorBlock) {
            const previous = block.relation.previous as StandoffEditorBlock;
            const last = previous.getLastCell();
            previous.setCaret(last.index, CARET.LEFT);
            this.setBlockFocus(previous);
            return;
        }
        if (block.relation.previous?.type == BlockType.IndentedListBlock) {
            const previous = block.relation.previous as IndentedListBlock;
            const child = previous.relation.firstChild as StandoffEditorBlock;
            const last = child.getLastCell();
            child.setCaret(last.index, CARET.LEFT);
            this.setBlockFocus(child);
            return;
        }
        if (block.relation.parent?.type == BlockType.IndentedListBlock) {
            const parent = block.relation.parent as IndentedListBlock;
            if (parent.relation.previous?.type == BlockType.StandoffEditorBlock) {
                const sibling = parent.relation.previous as StandoffEditorBlock;
                const last = sibling.getLastCell();
                sibling.setCaret(last.index, CARET.LEFT);
                this.setBlockFocus(sibling);
                return;
            }
            if (parent.relation.parent?.type == BlockType.StandoffEditorBlock) {
                const grandParent = parent.relation.parent as StandoffEditorBlock;
                const last = grandParent.getLastCell();
                grandParent.setCaret(last.index, CARET.LEFT);
                this.setBlockFocus(grandParent);
                return;
            }
            return;
        }
    }
    findNearestNephew(block: IBlock): IBlock {
        /**
         * Unsure about this algorithm ... might get trapped in the first nephew branch rather than the last.
         */
        let previous = block.relation.previous;
        if (!previous) return block;
        let firstChild = block.relation.firstChild;
        if (firstChild) return this.findNearestNephew(firstChild);
        let next = block.relation.next;
        if (next) return this.findNearestNephew(next);
        return block;
    }
    swapCells(left: GridCellBlock, right: GridCellBlock) {
        const row = this.getParentOfType(left, BlockType.GridRowBlock) as GridRowBlock;
        if (!row)return;
        const li = row.blocks.findIndex(x => x.id == left.id), ri = row.blocks.findIndex(x => x.id == right.id);
        row.blocks[ri] = left;
        row.blocks[li] = right;
        left.container.insertAdjacentElement("beforebegin", right.container);
    }
    findNearestUncle(block: IBlock): IBlock {
        let previous = block.relation.previous;
        if (previous) return this.findNearestUncle(previous);
        let parent = block.relation.parent;
        if (parent) return this.findNearestUncle(parent);
        let uncle = block.relation.next;
        if (uncle) return uncle;
        return block;
    }
    addImageLeft(block: IBlock, url: string) {
        const parent = this.getParent(block);
        const previous = block.relation.previous;
        const next = block.relation.next;
        const grid = this.createGridBlock();
        const row = this.createGridRowBlock();
        const cell1 = this.createGridCellBlock({
            type: BlockType.GridCellBlock,
            metadata: {
                width: "48%"
            }
        });
        const cell2 = this.createGridCellBlock({
            type: BlockType.GridCellBlock,
            metadata: {
                width: "48%"
            }
        });
        const image = this.createImageBlock({
            type: BlockType.ImageBlock,
            metadata: {
                url
            }
        });
        image.build();
        cell1.blocks = [image];
        cell2.blocks = [block];
        row.blocks = [cell1, cell2];
        grid.blocks = [row];
        this.addParentSiblingRelations(cell1);
        this.addParentSiblingRelations(cell2);
        this.addParentSiblingRelations(row);
        this.addParentSiblingRelations(grid);
        if (previous) {
            previous.relation.next = grid;
            grid.relation.previous = previous;
        }
        if (next) {
            next.relation.previous = grid;
            grid.relation.next = next;
        }
        cell1.container.append(image.container);
        row.container.append(cell1.container);
        row.container.append(cell2.container);
        grid.container.append(row.container);
        const i = parent?.blocks.findIndex(x => x.id == block.id) as number;
        parent?.blocks.splice(i, 1);
        parent?.blocks.splice(i, 0, grid);
        this.appendSibling(block.container, grid.container);
        cell2.container.append(block.container);
    }
    addImageRight(block: IBlock, url: string) {
        const parent = this.getParent(block);
        const previous = block.relation.previous;
        const next = block.relation.next;
        const grid = this.createGridBlock();
        const row = this.createGridRowBlock();
        const cell1 = this.createGridCellBlock({
            type: BlockType.GridCellBlock,
            metadata: {
                width: "48%"
            }
        });
        const cell2 = this.createGridCellBlock({
            type: BlockType.GridCellBlock,
            metadata: {
                width: "48%"
            }
        });
        const image = this.createImageBlock({
            type: BlockType.ImageBlock,
            metadata: {
                url
            }
        });
        image.build();
        cell1.blocks = [block];
        cell2.blocks = [image];
        row.blocks = [cell1, cell2];
        grid.blocks = [row];
        this.addParentSiblingRelations(cell1);
        this.addParentSiblingRelations(cell2);
        this.addParentSiblingRelations(row);
        this.addParentSiblingRelations(grid);
        if (previous) {
            previous.relation.next = grid;
            grid.relation.previous = previous;
        }
        if (next) {
            next.relation.previous = grid;
            grid.relation.next = next;
        }
        cell2.container.append(image.container);
        row.container.append(cell1.container);
        row.container.append(cell2.container);
        grid.container.append(row.container);
        const i = parent?.blocks.findIndex(x => x.id == block.id) as number;
        parent?.blocks.splice(i, 1);
        parent?.blocks.splice(i, 0, grid);
        this.appendSibling(block.container, grid.container);
        cell1.container.append(block.container);
    }
    moveCaretDown(args: IBindingHandlerArgs) {
        const { caret } = args;
        const block = args.block;
        if (args.block.type == BlockType.StandoffEditorBlock) {
            const textBlock = args.block as StandoffEditorBlock;
            if (textBlock.cache.caret.x == null) {
                textBlock.cache.caret.x = caret.right.cache.offset.x;
            }
            const match = textBlock.getCellBelow(caret.right);
            if (match) {
                textBlock.setCaret(match.cell.index, CARET.LEFT);
                return;
            }
            
        }
        if(block.relation.firstChild) {
            let firstChild = block.relation.firstChild;
            if (firstChild.type == BlockType.StandoffEditorBlock) {
                (firstChild as StandoffEditorBlock).setCaret(0, CARET.LEFT);
            }
            this.setBlockFocus(firstChild);
            return;
        }
        if (block.relation.next) {
            let next = block.relation.next as StandoffEditorBlock;
            if (next.type == BlockType.StandoffEditorBlock) {
                next.setCaret(next.getLastCell().index, CARET.LEFT); 
            }
            this.setBlockFocus(next);
            return;
        }
        const uncle = this.findNearestUncle(block);
        if (uncle) {
            if (uncle.type == BlockType.StandoffEditorBlock) {
                (uncle as StandoffEditorBlock).setCaret(0, CARET.LEFT);
            }
            this.setBlockFocus(uncle);
            return;
        }
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


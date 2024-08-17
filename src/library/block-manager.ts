import axios from 'axios';
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
import _ from "underscore";
import { AbstractBlock } from "./abstract-block";
import { BlockProperty } from "./block-property";
import { StandoffEditorBlock } from "./standoff-editor-block";
import { StandoffProperty } from "./standoff-property";
import { IBlockManager,InputEvent, BlockType, IBlock, InputAction, IBlockSelection, Commit, IBlockPropertySchema, IBlockManagerConstructor, InputEventSource, IBindingHandlerArgs, IBatchRelateArgs, Command, CARET, RowPosition, IRange, Word, DIRECTION, ISelection, IStandoffPropertySchema, GUID, IBlockDto, IStandoffEditorBlockDto, IMainListBlockDto, PointerDirection, Platform, TPlatformKey, IPlainTextBlockDto, ICodeMirrorBlockDto, IEmbedDocumentBlockDto, IPlugin, Caret, StandoffPropertyDto, BlockPropertyDto } from "./types";
import { PlainTextBlock } from "./plain-text-block";
import { CodeMirrorBlock } from "./code-mirror-block";
import { ClockPlugin } from "./plugins/clock";
import { TextProcessor } from "./text-processor";
import { EmbedDocumentBlock } from "./embed-document-block";
import { SearchEntitiesWindow } from "../components/search-entities";
import { renderToNode } from "./common";
import { MonitorBlock, StandoffEditorBlockMonitor } from "../components/monitor";
import { TableBlock, TableCellBlock, TableRowBlock } from './tables-blocks';

const isStr = (value: any) => typeof (value) == "string";
const isNum = (value: any) => typeof (value) == "number";
 
export class BlockManager extends AbstractBlock implements IBlockManager {
    id: string;
    type: BlockType;
    container: HTMLElement;
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
    plugins: IPlugin[];
    highestZIndex: number;
    clipboard: Record<string, any>[];
    constructor(props?: IBlockManagerConstructor) {
        super({ id: props?.id, container: props?.container });
        this.id = props?.id || uuidv4();
        this.type = BlockType.IndentedListBlock;
        this.container = props?.container || document.createElement("DIV") as HTMLElement;
        this.blocks = [this];
        this.metadata = {};
        this.relation = {};
        this.selections = [];
        this.commits = [];
        this.pointer = 0;
        this.direction = PointerDirection.Undo;
        this.blockProperties= [];
        this.blockSchemas=[];
        this.inputEvents = this.getEditorEvents();
        this.inputActions = [];
        this.modes = ["global","default"];
        this.highestZIndex = this.getHighestZIndex();
        this.plugins = [];
        this.clipboard = [];
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
        this.selections = [];
        this.container.remove();
    }
    findParentBlock(el: HTMLElement) {
        let current = el;
        while (current) {
            let match = this.blocks.find(x=> x.container == current);
            if (match) return match;
            current = current.parentElement as HTMLElement;
        }
        return null;
    }
    async handleMouseInputEvents(e: MouseEvent) {
        console.log("handleMouseInputEvents", { manager: this, e });
        if (!this.container.contains(e.target as HTMLElement)) {
            return;
        }
        const parentBlock = this.findParentBlock(e.target as HTMLElement);
        if (!parentBlock) {
            console.log("Could not find a container parent.")
            return;
        }
        const input = this.toMouseInput(e);
        this.setBlockFocus(parentBlock);
        if (parentBlock.type == BlockType.StandoffEditorBlock) {
            const textBlock = parentBlock as StandoffEditorBlock;
            const caret = textBlock.getCaret();
            if (caret) {
                textBlock.lastCaret = {
                    index: caret.right.index,
                    offset: CARET.LEFT
                }
            }
        }
        const blocks = [parentBlock, this];
        for (let i = 0; i < blocks.length; i++) {
            const b = blocks[i];
            if (!b.getFirstMatchingInputEvent) continue;
            const match = b.getFirstMatchingInputEvent(input);
            if (match) {
                const args = {
                    block: parentBlock,
                    e
                } as any;
                await match.action.handler(args);
            }
        }
    }
    async handleKeyboardInputEvents(e: KeyboardEvent) {
        if (!this.container.contains(e.target as HTMLElement)) {
            return;
        }
        const ALLOW = true, FORBID = false;
        const input = this.toKeyboardInput(e);
        const modifiers = ["Shift", "Alt", "Meta", "Control", "Option"];
        if (modifiers.some(x => x == input.key)) {
            return ALLOW;
        }
        const focusedBlock = this.getBlockInFocus() as IBlock;
        const isStandoffBlock = focusedBlock.type == BlockType.StandoffEditorBlock;
        const blocks = [focusedBlock, this];
        for (let i = 0; i < blocks.length; i++) {
            const b = blocks[i];
            if (!b.getFirstMatchingInputEvent) continue;
            const match = b.getFirstMatchingInputEvent(input);
            if (match) {
                let passthrough = false;
                const caret = isStandoffBlock ? (focusedBlock as StandoffEditorBlock).getCaret() : undefined;
                const selection = isStandoffBlock ? (focusedBlock as StandoffEditorBlock).getSelection() : undefined
                const args = {
                    block: focusedBlock,
                    caret,
                    selection,
                    allowPassthrough: () => passthrough = true,
                    e
                } as IBindingHandlerArgs;
                await match.action.handler(args);
                if (passthrough) {
                    return ALLOW;
                } else {
                    e.preventDefault();
                    return FORBID;
                }
            }
        }
        if (isStandoffBlock) {
            const _focus = focusedBlock as StandoffEditorBlock;
            if (input.key.length == 1) {
                _focus.insertCharacterAtCaret(input);
                e.preventDefault();        
                return FORBID;
            }
        }
        return ALLOW;
    }
    async attachEventBindings() {
        document.body.addEventListener("keydown", this.handleKeyboardInputEvents.bind(this));
        document.body.addEventListener("click", this.handleMouseInputEvents.bind(this));
        document.body.addEventListener("dblclick", this.handleMouseInputEvents.bind(this));
        document.body.addEventListener("contextmenu", this.handleMouseInputEvents.bind(this));
        document.body.addEventListener("copy", this.handleOnCopyEvent.bind(this));
        document.body.addEventListener("paste", this.handleOnPasteEvent.bind(this));
        document.body.addEventListener("beforeinput", (e) => {
            const focusedBlock = this.getBlockInFocus() as StandoffEditorBlock;
            const isStandoffBlock = focusedBlock.type == BlockType.StandoffEditorBlock;
            if (e.data == ". ") {
                // MacOS
                e.preventDefault();
                if (isStandoffBlock) {
                    const caret = focusedBlock.getCaret() as Caret;
                    const i = caret.left ? caret.left.index : 0;
                    focusedBlock.insertTextAtIndex(" ", i + 1);
                }
                return false;
            }
        });
    }
    async handleOnCopyEvent(e: ClipboardEvent) {
        await this.handleCustomEvent(e, InputEventSource.Custom, "copy");
    }
    async handleOnPasteEvent(e: ClipboardEvent) {
        await this.handleCustomEvent(e, InputEventSource.Custom, "paste");
    }
    async handleCustomEvent(e: Event, source: InputEventSource, match: string) {
        const focusedBlock = this.getBlockInFocus() as StandoffEditorBlock;
        const isStandoffBlock = focusedBlock.type == BlockType.StandoffEditorBlock;
        const customEvents = this.inputEvents.filter(x => x.trigger.source == source);
        const found = customEvents.find(x => x.trigger.match == match);
        if (found) {
            e.preventDefault();
            if (isStandoffBlock) {
                const caret = focusedBlock.getCaret() as Caret;
                const selection = focusedBlock.getSelection() as IRange;
                await found.action.handler({ block: focusedBlock, caret, e, selection });
                return;
            }
            await found.action.handler({ block: focusedBlock, e });
        }
    }
    getPlainTextInputEvents():InputEvent[] {
        const self = this;
        return [
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "ArrowDown"
                },
                action: {
                    name: "Set focus to the block below.",
                    description: "",
                    handler: async (args: any) => {
                        const { characterIndex, textLength, allowPassthrough } = args;
                        if (characterIndex.start >= textLength - 10) {
                            self.moveCaretDown(args);
                            return;
                        }
                        allowPassthrough && allowPassthrough();
                    }
                }
            },
        ]
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
                    handler: this.moveCaretUp.bind(this)
                }
            }
        ] as InputEvent[];
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
        this.container.focus();
    }
    setBlockFocus(block: IBlock) {
        const oldFocus = this.focus;
        oldFocus?.container.classList.remove("focus-highlight");
        this.focus = block;
        this.focus.container.classList.add("focus-highlight");
        block.setFocus();
    }
    getImageBlockSchemas() {
        const self = this;
        return [
            {
                type: "block/position",
                name: "Block position",
                event: {
                    onInit: (p: BlockProperty) => {
                        const container = p.block.container;
                        const {x, y, position } = p.metadata;
                        updateElement(container, {
                            style: {
                                position: position || "absolute",
                                left: x + "px",
                                top: y + "px",
                                "z-index": self.getHighestZIndex()
                            }
                        });
                    }
                }
            },
            {
                type: "block/size",
                name: "Block size",
                event: {
                    onInit: (p: BlockProperty) => {
                        const container = p.block.container;
                        const {width, height} = p.metadata;
                        updateElement(container, {
                            style: {
                                height: isStr(height) ? height : height + "px",
                                width: isStr(width) ? width : width + "px"
                            }
                        });
                    }
                }
            }
        ]
    }
    getBlockSchemas() {
        const self = this;
        return [
            {
                type: "block/position",
                name: "Block position",
                event: {
                    onInit: (p: BlockProperty) => {
                        const container = p.block.container;
                        const {x, y, position } = p.metadata;
                        updateElement(container, {
                            style: {
                                position: position || "absolute",
                                left: x + "px",
                                top: y + "px",
                                "z-index": self.getHighestZIndex()
                            }
                        });
                    }
                }
            },
            {
                type: "block/size",
                name: "Block dimensions",
                event: {
                    onInit: (p: BlockProperty) => {
                        const container = p.block.container;
                        const {width, height} = p.metadata;
                        updateElement(container, {
                            style: {
                                height: isStr(height) ? height : height + "px",
                                width: isStr(width) ? width : width + "px",
                                "overflow-y": "auto",
                                "overflow-x": "hidden"
                            }
                        });
                        const minWidth = p.metadata["min-width"];
                        if (minWidth) {
                            updateElement(container, {
                            style: {
                                "min-width": minWidth + "px"
                            }
                        });
                        }
                    }
                }
            },
            {
                type: "block/font/size/half",
                name: "Half-sized font",
                decorate: {
                    blockClass: "font_size_half"
                }
            },
            {
                type: "block/font/size/three-quarters",
                name: "3/4 the regular font size",
                decorate: {
                    blockClass: "block_font-size_three-quarters"
                }
            },
            {
                type: "block/margin/top/20px",
                name: "Top margin - 20",
                decorate: {
                    blockClass: "block_margin_top_20px"
                }
            },
            {
                type: "block/margin/top/40px",
                name: "Top margin - 40",
                decorate: {
                    blockClass: "block_margin_top_40px"
                }
            },
            {
                type: "block/font/size/h1",
                name: "H1",
                decorate: {
                    blockClass: "block_font-size_h1"
                }
            },
            {
                type: "block/font/size/h2",
                name: "H2",
                decorate: {
                    blockClass: "block_font-size_h2"
                }
            },
            {
                type: "block/font/size/h3",
                name: "H3",
                decorate: {
                    blockClass: "block_font-size_h3"
                }
            },
            {
                type: "block/font/size/h4",
                name: "h4",
                decorate: {
                    blockClass: "block_font-size_h4"
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
                type: "block/alignment/center",
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
                    handler: async (args: IBindingHandlerArgs) => {
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
                    handler: async (args: IBindingHandlerArgs) => {
                        const block = args.block as ImageBlock;
                        const manager = block.owner as BlockManager;
                        manager.setBlockFocus(block);
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
                    name: "Create a new text block underneath.",
                    description: "",
                    handler: async (args: IBindingHandlerArgs) => {
                        const imageBlock = args.block as ImageBlock;
                        const manager = imageBlock.owner as BlockManager;
                        const newBlock = manager.createStandoffEditorBlock();
                        manager.addNextBlock(newBlock, imageBlock);
                        setTimeout(() => {
                            manager.setBlockFocus(newBlock);
                            newBlock.setCaret(0, CARET.LEFT);
                        })
                    }
                }
            }
        ]
        return events;
    }
    async handleContextMenuClicked(args: IBindingHandlerArgs) {
        const { caret } = args;
        const block = args.block as StandoffEditorBlock;
        const anchor = caret.left || caret.right;
        block.setMarker(anchor, this.container);
        if (block.cache.monitor) {
            block.cache.monitor.remove();
            block.cache.monitor = undefined;
        }
        const props = block.getEnclosingProperties(anchor);
        if (!props.length) return;
        const monitor = new MonitorBlock({ owner: this });
        const component = StandoffEditorBlockMonitor({
            monitor,
            properties: props,
            onDelete: (p) => {
                p.destroy();
            },
            onClose: () => {
                block.cache.monitor?.remove();
            }
        });
        const node = block.cache.monitor = renderToNode(component) as HTMLDivElement;
        const offset = anchor.cache.offset;
        const top = offset.cy + offset.y + offset.h + 5;
        const left = offset.x;
        updateElement(node, {
            style: {
                position: "absolute",
                top: top + "px",
                left: left + "px",
                "z-index": this.getHighestZIndex()
            },
            parent: this.container
        });
        this.blocks.push(monitor);
        this.setBlockFocus(monitor);
    }
    getEditorEvents() {
        const events: InputEvent[] = [
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "Control-C"
                },
                action: {
                    name: "Copy",
                    description: "",
                    handler: async (args) => {
                        args.allowPassthrough && args.allowPassthrough();
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Mouse,
                    match: "contextmenu"
                },
                action: {
                    name: "NOP",
                    description: "",
                    handler: async (args) => {
                        // Suppress the right-click.
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Mouse,
                    match: "click"
                },
                action: {
                    name: "Set focus to the current block.",
                    description: "",
                    handler: async (args: IBindingHandlerArgs) => {
                        const block = args.block as StandoffEditorBlock;
                        const manager = block.owner as BlockManager;
                        manager.setBlockFocus(block);
                        if (block.cache.monitor) {
                            block.cache.monitor.remove();
                            block.cache.monitor = undefined;
                        }
                        block.unsetMarker();
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
                    handler: this.handleCreateLeftMargin.bind(this)
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
                    handler: this.handleCreateRightMargin.bind(this)
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
                    match: "Backspace"
                },
                action: {
                    name: "Delete the character to the left",
                    description: `
                        Delete the character to the left and move the cursor to the left of the character to the right.
                        If at the start of the block (i.e., no character to the left) then issues an event
                        named "DELETE_CHARACTER_FROM_START_OF_BLOCK" (?).
                    `,
                    handler: this.handleBackspaceForStandoffEditorBlock.bind(this)
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "Shift-Backspace"
                },
                action: {
                    name: "Delete the entire block.",
                    description: ``,
                    handler: async (args: IBindingHandlerArgs) => {
                        const block = args.block;
                        const manager = block.owner as BlockManager;
                        const next = block.relation.next;
                        const previous = block.relation.previous;
                        const parent= block.relation.parent;
                        manager.deleteBlock(block.id);
                        const switchToBlock = previous || next || parent;
                        if (!switchToBlock) return;
                        manager.setBlockFocus(switchToBlock);
                        if (switchToBlock.type == BlockType.StandoffEditorBlock) (switchToBlock as StandoffEditorBlock).moveCaretStart();
                        return;
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "Shift-Delete"
                },
                action: {
                    name: "Delete the entire block.",
                    description: ``,
                    handler: async (args: IBindingHandlerArgs) => {
                        const block = args.block;
                        const manager = block.owner as BlockManager;
                        const next = block.relation.next;
                        const previous = block.relation.previous;
                        const parent= block.relation.parent;
                        manager.deleteBlock(block.id);
                        const switchToBlock = next || previous || parent;
                        if (!switchToBlock) return;
                        manager.setBlockFocus(switchToBlock);
                        if (switchToBlock.type == BlockType.StandoffEditorBlock) (switchToBlock as StandoffEditorBlock).moveCaretStart();
                        return;
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Custom,
                    match: "paste"
                },
                action: {
                    name: "Paste",
                    description: "Pastes plain text",
                    handler: this.handlePasteForStandoffEditorBlock.bind(this)
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Custom,
                    match: "copy"
                },
                action: {
                    name: "Copy",
                    description: "Copies standoff text",
                    handler: this.handleCopyForStandoffEditorBlock.bind(this)
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "Control-V"
                },
                action: {
                    name: "Paste",
                    description: "Pastes plain text",
                    handler: async (args) => {
                        args.allowPassthrough && args.allowPassthrough();
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "Meta-C"
                },
                action: {
                    name: "Copy passthrough",
                    description: "Pastes plain text",
                    handler: async (args) => {
                        args.allowPassthrough && args.allowPassthrough();
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "Meta-V"
                },
                action: {
                    name: "Paste",
                    description: "Pastes plain text",
                    handler: async (args) => {
                        args.allowPassthrough && args.allowPassthrough();
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "Control-S"
                },
                action: {
                    name: "Save document",
                    description: "",
                    handler: async (args: IBindingHandlerArgs) => {
                        const manager = args.block.owner as BlockManager;
                        let filename = manager.metadata.filename;
                        if (!filename) {
                            filename = prompt("Filename?");
                            manager.metadata.filename = filename;
                        }
                        await manager.saveServerDocument(filename);
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
                    handler: this.handleDeleteForStandoffEditorBlock.bind(this)
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
                    handler: async (args: IBindingHandlerArgs) => {
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
                            block.moveCaretStart();
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
                    handler: async (args: IBindingHandlerArgs) => {
                        const { caret } = args;
                        const block = args.block as StandoffEditorBlock;
                        const manager = block.owner as BlockManager;
                        let next = block.relation.next as IndentedListBlock;
                        if (next?.type != BlockType.IndentedListBlock) {
                            return;
                        }
                        const first = next.relation.firstChild as StandoffEditorBlock;
                        first.moveCaretStart();
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
                    handler: async (args: IBindingHandlerArgs) => {
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
                            block.moveCaretStart();
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
                    handler: async (args: IBindingHandlerArgs) => {
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
                            first.moveCaretStart();
                            manager.setBlockFocus(first);
                            return;
                        }
                        if (next?.type == BlockType.StandoffEditorBlock) {
                            (next as StandoffEditorBlock).moveCaretStart();
                            manager.setBlockFocus(next);
                            return;
                        }
                    }
                }
            }
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
    async moveSelectionOneCharacterRightwards(args: IBindingHandlerArgs) {
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
    async moveSelectionOneCharacterLeftwards(args: IBindingHandlerArgs){
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
    async moveCaretToStartOfTextBlock(args: IBindingHandlerArgs) {
        const block = args.block as StandoffEditorBlock;
        block.moveCaretStart();
    }
    async moveCaretToEndOfTextBlock(args: IBindingHandlerArgs) {
        const block = args.block as StandoffEditorBlock;
        block.moveCaretEnd();
    }
    getStandoffPropertyEvents() {
        const events: InputEvent[] = [
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
                    handler: async (args: IBindingHandlerArgs) => {
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
                            block.moveCaretStart();
                            return;
                        }
                        const start = !nearest.next ? last.index : nearest.next.start;
                        block.setCaret(start as number, CARET.LEFT);
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
                    handler: async (args: IBindingHandlerArgs) => {
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
                    match: "Control-Backspace"
                },
                action: {
                    name: "Deletes leftwards one word at a time.",
                    description: `
                        
                    `,
                    handler: async (args: IBindingHandlerArgs) => {
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
                    match: "Control-Shift-M"
                },
                action: {
                    name: "Monitor panel",
                    description: "",
                    handler: this.handleContextMenuClicked.bind(this)
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "Control-K"
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
                    handler: async (args: IBindingHandlerArgs) => {
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
                    match: "Control-T"
                },
                action: {
                    name: "To tab/add tab",
                    description: "Either wraps the text in a new tab, or creates a new tab",
                    handler: this.handleCreateNewTab.bind(this)
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "Alt-T"
                },
                action: {
                    name: "To tab/add tab",
                    description: "Either wraps the text in a new tab, or creates a new tab",
                    handler: this.handleCreateNewTab.bind(this)
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "Control-Shift-T"
                },
                action: {
                    name: "To tab/add tab",
                    description: "Either wraps the text in a new tab, or creates a new tab",
                    handler: async (args: IBindingHandlerArgs) => {
                        const block = args.block as StandoffEditorBlock;
                        const self = block.owner as BlockManager;
                        const parent = self.getParent(block) as IBlock;
                        if (!parent) return;
                        if (parent.type == BlockType.TabBlock) {
                            const previous = parent.relation.previous;
                            self.addTab({ tabId: parent.id, name: "...", copyTextBlockId: block.id });
                        } else {
                            self.convertBlockToTab(block.id);
                        }
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "Control-Enter"
                },
                action: {
                    name: "ENTER break",
                    description: "Breaks out of current container",
                    handler: async (args: IBindingHandlerArgs) => {
                        const block = args.block as StandoffEditorBlock;
                        const manager = block.owner as BlockManager;
                        const tab = manager.getParentOfType(block, BlockType.TabBlock) as TabBlock;
                        if (!tab) return;
                        const tabRow = manager.getParent(tab) as TabRowBlock;
                        if (!tabRow) return;
                        const newBlock = manager.createStandoffEditorBlock();
                        newBlock.addEOL();
                        manager.addNextBlock(newBlock, tabRow);
                        setTimeout(() => {
                            manager.setBlockFocus(newBlock);
                            newBlock.setCaret(0, CARET.LEFT);
                        }, 1);
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
                    handler: this.applyEntityReferenceToText.bind(this)
                }
            }
        ];
        return events;
    }
    getStandoffSchemas() {
        const self = this;
        return [
            {
                type: "cell/micro-document",
                name: "Cell-sized document",
                description: "",
                event: {
                    onInit: async (p:StandoffProperty) => {
                        const manager = new BlockManager();
                        const container = p.start.element as HTMLSpanElement;
                        updateElement(container, {
                            style: {
                                display: "inline-block",
                                zoom: 0.08
                            }
                        });
                        await manager.loadServerDocument(p.value);
                        container.innerHTML = "";
                        updateElement(manager.container, {
                            style: {
                                maxWidth: p.start.cache.offset.w,
                                maxHeight: p.start.cache.offset.h,
                                "overflow": "hidden"
                            }
                        });
                        container.appendChild(manager.container);
                    },
                    onDestroy: (p: StandoffProperty) => {
                        const span = p.start.element as HTMLSpanElement;
                        updateElement(span, {
                            display: "inline",
                            zoom: 1
                        });
                        span.innerHTML = p.start.text;
                    }
                }
            },
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
                type: "reference/url",
                name: "URL",
                decorate: {
                    cssClass: "reference_url"
                },
                event: {
                    onDoubleClick: async (args: any) => {
                        const url = args.property.metadata.url;
                        window.open(url, '_blank')?.focus();
                    }
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
                        owner.renderUnderlines("codex/block-reference", args.properties, args.block, "orange", 3);
                    }
                }
            },
            {
                type: "codex/entity-reference",
                name: "Entity reference",
                event: {
                    beforeStyling: async (args: any) => {
                        // TBC : will show a panel where the entity can be searched for
                    },
                    onDoubleClick: async (args: any) => {
                        const prop = args.property;
                        alert(prop.value);
                    }
                },
                render: {
                    destroy: ({ properties }) => {
                        properties.forEach(p => p.cache.underline?.remove())
                    },
                    update: (args) => {
                        const owner = args.block.owner as BlockManager;
                        owner.renderUnderlines("codex/entity-reference", args.properties, args.block, "purple", 1);
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
        block.wrapper.appendChild(frag);
        // updateElement(overlay.container, {
        //     classList: ["overlay"],
        //     style: {
        //         position: "relative",
        //         width: "100%",
        //         top: 0,
        //         left: 0
        //     },
        //     parent: block.container,
        //     children: [frag]
        // });
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
    async handleDeleteBlock(args: IBindingHandlerArgs) {
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
        const previous = block.relation.previous;
        const next = block.relation.next;
        const parent = block.relation.parent;
        if (previous) {
            previous.relation.next = next;
        }
        if (next) {
            next.relation.previous = previous;
            parent && (next.relation.parent = parent);
        }
        if (parent) {
            parent.relation.firstChild = next;
        }
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
        updateElement(mainBlock.container, {
            style: {
                position: "relative"
            }
        });
        updateElement(rightMargin.container, {
            style: {
                position: "absolute",
                top: 0,
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
        updateElement(mainBlock.container, {
            style: {
                position: "relative"
            }
        });
        updateElement(leftMargin.container, {
            style: {
                position: "absolute",
                top: 0,
                width: "200px",
                "max-width": "200px",
                left: "-250px",
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
    async listTemplates() {
        const res = await fetch("/api/listDocuments?folder=templates");
        const json = await res.json();
        return json.files as string[];
    }
    async loadServerTemplate(filename: string) {
        const res = await fetch("/api/loadDocumentJson?folder=templates&filename=" + filename, { method: "GET" });
        const json = await res.json();
        console.log("loadServerTemplate", { filename, json });
        if (!json.Success) {
            return;
        }
        this.loadDocument(json.Data.document);
        
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
    async buildStandoffEditorBlock(container: HTMLElement, blockDto: IBlockDto) {
        const textBlock = this.createStandoffEditorBlock(blockDto);
        textBlock.bind(blockDto as IStandoffEditorBlockDto);
        if (blockDto.relation?.leftMargin) {
            const leftMargin = await this.recursivelyBuildBlock(textBlock.container, blockDto.relation.leftMargin) as LeftMarginBlock;
            textBlock.relation.leftMargin = leftMargin;
            leftMargin.relation.marginParent = textBlock;
            this.stageLeftMarginBlock(leftMargin, textBlock);
        }
        if (blockDto.relation?.rightMargin) {
            const rightMargin = await this.recursivelyBuildBlock(textBlock.container, blockDto.relation.rightMargin) as RightMarginBlock;
            textBlock.relation.rightMargin = rightMargin;
            rightMargin.relation.marginParent = textBlock;
            this.stageRightMarginBlock(rightMargin, textBlock);
        }
        await this.buildChildren(textBlock, blockDto);
        container.appendChild(textBlock.container);
        return textBlock;
    }
    async buildLeftMarginBlock(container: HTMLElement, blockDto: IBlockDto) {
        const leftMargin = this.createLeftMarginBlock(blockDto);
        await this.buildChildren(leftMargin, blockDto);
        container.appendChild(leftMargin.container);
        return leftMargin;
    }
    async buildImageBlock(container: HTMLElement, blockDto: IBlockDto) {
        const image = this.createImageBlock(blockDto);
        image.build();
        await this.buildChildren(image, blockDto);
        container.appendChild(image.container);
        return image;
    }
    async buildRightMarginBlock(container: HTMLElement, blockDto: IBlockDto) {
        const rightMargin = this.createRightMarginBlock(blockDto);
        await this.buildChildren(rightMargin, blockDto);
        container.appendChild(rightMargin.container);
        return rightMargin;
    }
    async buildCodeMirrorBlock(container: HTMLElement, blockDto: ICodeMirrorBlockDto) {
        const cm = this.createCodeMirrorBlock(blockDto);
        await this.buildChildren(cm, blockDto);
        if (blockDto.text)  {
            cm.bind(blockDto.text);
        }
        container.appendChild(cm.container);
        return cm;
    }
    async buildPlainTextBlock(container: HTMLElement, blockDto: IPlainTextBlockDto) {
        const plainText = this.createPlainTextBlock(blockDto);
        await this.buildChildren(plainText, blockDto);
        if (blockDto.text)  {
            plainText.bind(blockDto.text);
        }
        container.appendChild(plainText.container);
        return plainText;
    }
    async buildTableBlock(container: HTMLElement, blockDto: IBlockDto) {
        const table = this.createTableBlock(blockDto);
        await this.buildChildren(table, blockDto);
        container.appendChild(table.container);
        return table;
    }
    async buildTableRowBlock(container: HTMLElement, blockDto: IBlockDto) {
        const table = this.createTableRowBlock(blockDto);
        await this.buildChildren(table, blockDto);
        container.appendChild(table.container);
        return table;
    }
    async buildTableCellBlock(container: HTMLElement, blockDto: IBlockDto) {
        const table = this.createTableCellBlock(blockDto);
        await this.buildChildren(table, blockDto);
        container.appendChild(table.container);
        return table;
    }
    async buildGridBlock(container: HTMLElement, blockDto: IBlockDto) {
        const gridBlock = this.createGridBlock(blockDto);
        await this.buildChildren(gridBlock, blockDto);
        container.appendChild(gridBlock.container);
        return gridBlock;
    }
    async buildGridRowBlock(container: HTMLElement, blockDto: IBlockDto) {
        const rowBlock = this.createGridRowBlock(blockDto);
        await this.buildChildren(rowBlock, blockDto, (b) => {
            if (b.metadata?.width) {
                updateElement(b.container, {
                    style: {
                        width: b.metadata?.width
                    }
                });
            }
        });
        container.appendChild(rowBlock.container);
        return rowBlock;
    }
    async buildGridCellBlock(container: HTMLElement, blockDto: IBlockDto) {
        const cellBlock = this.createGridCellBlock(blockDto);
        await this.buildChildren(cellBlock, blockDto);
        container.appendChild(cellBlock.container);
        return cellBlock;
    }
    async buildEmbedDocumentBlock(container: HTMLElement, blockDto: IEmbedDocumentBlockDto){
        const embed = this.createEmbedDocumentBlock(blockDto);
        await this.buildChildren(embed, blockDto);
        embed.filename = blockDto.filename;
        if (embed.filename) {
            const manager = new BlockManager();
            await manager.loadServerDocument(embed.filename);
            embed.container.appendChild(manager.container);
            updateElement(embed.container, {
                style: {
                    zoom: 0.5,
                    "overflow-x": "hidden",
                    "overflow-y": "scroll"
                }
            })
        }
        container.appendChild(embed.container);
        return embed;
    }
    async buildVideoBlock(container: HTMLElement, blockDto: IBlockDto){
        const video = this.createVideoBlock(blockDto);
        await this.buildChildren(video, blockDto);
        video.build();
        container.appendChild(video.container);
        return video;
    }
    async buildChildren(parent: AbstractBlock, blockDto: IBlockDto, update?: (b: IBlock) => void) {
        if (blockDto.children) {
            const len = blockDto.children.length;
            for (let i = 0; i < len; i++) {
                let childDto = blockDto.children[i];
                let block = await this.recursivelyBuildBlock(parent.container, childDto) as IBlock;
                parent.blocks.push(block);
                update && update(block);
            }
        }
        this.addParentSiblingRelations(parent);
    }
    async buildIframeBlock(container: HTMLElement, blockDto: IBlockDto){
        const iframe = this.createIFrameBlock(blockDto);
        await this.buildChildren(iframe, blockDto);
        iframe.build();
        container.appendChild(iframe.container);
        return iframe;
    }
    async buildTabRowBlock(container: HTMLElement, blockDto: IBlockDto) {
        const rowBlock = this.createTabRowBlock(blockDto);
        await this.buildChildren(rowBlock, blockDto);
        rowBlock.renderLabels();
        const activeBlock = rowBlock.blocks.find(x => x.metadata.active) as TabBlock;
        if (activeBlock) {
            rowBlock.setTabActive(activeBlock);
        } else {
            rowBlock.setTabActive(rowBlock.blocks[0] as TabBlock);
        }
        container.appendChild(rowBlock.container);
        return rowBlock;
    }
    addTab({ tabId, name, copyTextBlockId }: { tabId: string, name: string, copyTextBlockId?: string }) {
        const tab = this.getBlock(tabId) as TabBlock;
        const row = this.getParentOfType(tab, BlockType.TabRowBlock) as TabRowBlock;
        if (!row) return;
        const newTab = this.createTabBlock({
            type: BlockType.TabBlock,
            metadata: {
                name: name
            }
        }) as TabBlock;
        let textBlock: StandoffEditorBlock;
        if (copyTextBlockId) {
            const block = this.getBlock(copyTextBlockId) as StandoffEditorBlock;
            const dto = block.serialize();
            textBlock = this.createStandoffEditorBlock(dto);
        } else {
            textBlock = this.createStandoffEditorBlock({
                type: BlockType.StandoffEditorBlock,
                blockProperties:[
                    { type: "block/alignment/left" }
                ]
            }) as StandoffEditorBlock;
        }
        textBlock.addEOL();
        newTab.blocks.push(textBlock);
        row.blocks.push(newTab);
        this.addParentSiblingRelations(row);
        textBlock.relation.parent = newTab;
        newTab.relation.firstChild = textBlock;
        tab.relation.next = newTab;
        newTab.relation.previous = tab;
        row.renderLabels();
        newTab.panel.appendChild(textBlock.container);
        row.container.appendChild(newTab.container);
        const label = newTab.container.querySelector(".tab-label") as HTMLSpanElement;
        row.setTabActive(newTab);
        setTimeout(() => {
            this.setBlockFocus(textBlock);
            textBlock.setCaret(0, CARET.LEFT);
        }, 1);
        return newTab;
    }
    async buildTabBlock(container: HTMLElement, blockDto: IBlockDto) {
        const tabBlock = this.createTabBlock(blockDto);
        await this.buildChildren(tabBlock, blockDto, (b) => tabBlock.panel.appendChild(b.container));
        container.appendChild(tabBlock.container);
        return tabBlock;
    }
    async buildIndentedListBlock(container: HTMLElement, blockDto: IBlockDto) {
        const indentedListBlock = this.createIndentedListBlock();
        await this.buildChildren(indentedListBlock, blockDto, (b) =>
            updateElement(b.container, {
            style: {
                display: "list-item",
                "list-style": "square"
            }
        }));
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
    async recursivelyBuildBlock(container: HTMLElement, blockDto: IBlockDto) {
        if (blockDto.type == BlockType.StandoffEditorBlock) {
            return await this.buildStandoffEditorBlock(container, blockDto);
        }
        if (blockDto.type == BlockType.LeftMarginBlock) {
            return await this.buildLeftMarginBlock(container, blockDto);
        }
        if (blockDto.type == BlockType.RightMarginBlock) {
            return await this.buildRightMarginBlock(container, blockDto);
        }
        if (blockDto.type == BlockType.TableBlock) {
            return await this.buildTableBlock(container, blockDto);
        }
        if (blockDto.type == BlockType.TableRowBlock) {
            return await this.buildTableRowBlock(container, blockDto);
        }
        if (blockDto.type == BlockType.TableCellBlock) {
            return await this.buildTableCellBlock(container, blockDto);
        }
        if (blockDto.type == BlockType.GridBlock) {
            return await this.buildGridBlock(container, blockDto);
        }
        if (blockDto.type == BlockType.GridRowBlock) {
            return await this.buildGridRowBlock(container, blockDto);
        }
        if (blockDto.type == BlockType.GridCellBlock) {
            return await this.buildGridCellBlock(container, blockDto);
        }
        if (blockDto.type == BlockType.IFrameBlock) {
            return this.buildIframeBlock(container, blockDto);
        }
        if (blockDto.type == BlockType.TabRowBlock) {
            return await this.buildTabRowBlock(container, blockDto);
        }
        if (blockDto.type == BlockType.TabBlock) {
            return await this.buildTabBlock(container, blockDto);
        }
        if (blockDto.type == BlockType.PlainTextBlock) {
            return await this.buildPlainTextBlock(container, blockDto as IPlainTextBlockDto);
        }
        if (blockDto.type == BlockType.CodeMirrorBlock) {
            return await this.buildCodeMirrorBlock(container, blockDto as ICodeMirrorBlockDto);
        }
        if (blockDto.type == BlockType.IndentedListBlock) {
            return await this.buildIndentedListBlock(container, blockDto);
        }
        if (blockDto.type == BlockType.ImageBlock) {
            return await this.buildImageBlock(container, blockDto);
        }
        if (blockDto.type == BlockType.VideoBlock) {
            return await this.buildVideoBlock(container, blockDto);
        }
        if (blockDto.type == BlockType.EmbedDocumentBlock) {
            return await this.buildEmbedDocumentBlock(container, blockDto as IEmbedDocumentBlockDto);
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
    async loadDocument(dto: IMainListBlockDto) {
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
        const container = document.createElement("DIV") as HTMLElement;
        const mainBlock = this.createMainListBlock();
        mainBlock.bind(dto);
        if (dto.children) {
            const len = dto.children.length;
            for (let i = 0; i <= len - 1; i++) {
                let block = await this.recursivelyBuildBlock(container, dto.children[i]) as IBlock;
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

        const textBlock = this.blocks.find(x => x.type == BlockType.StandoffEditorBlock) as StandoffEditorBlock;
        if (textBlock) {
            this.setBlockFocus(textBlock);
            textBlock.moveCaretStart();
        }
    }
    insertItem<T>(list: T[], index: number, item: T) {
        list.splice(index, 0, item);
    }
    addPreviousBlock(newBlock: IBlock, sibling: IBlock) {
        const previous = sibling.relation.previous;
        if (previous) {
            previous.relation.next = newBlock;
            newBlock.relation.previous = previous;
        }
        newBlock.relation.next = sibling;
        sibling.relation.previous = newBlock;
        const parent = this.getParent(sibling) as IBlock;
        const siblingIndex = parent.blocks.findIndex(x => x.id == sibling.id);
        if (siblingIndex > 0) {
            this.insertItem(parent.blocks, siblingIndex - 1, newBlock);
        } else {
            this.insertItem(parent.blocks, 0, newBlock);
            parent.relation.firstChild = sibling;
            sibling.relation.parent = parent;
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
    createTable(rows: number, cells: number) {
        const table = this.createTableBlock();
        const width = 100 / cells;
        for (let row = 1; row <= rows; row++) {
            const row = this.createTableRowBlock();
            for (let cell = 1; cell <= cells; cell++) {
                const cell = this.createTableCellBlock({
                    type: BlockType.TableCellBlock,
                    metadata: {
                        width: "50px"
                    }
                });
                const textBlock = this.createStandoffEditorBlock();
                textBlock.addEOL();
                cell.blocks.push(textBlock);
                row.blocks.push(cell);
                this.addParentSiblingRelations(cell);
                cell.container.appendChild(textBlock.container);
                row.container.appendChild(cell.container);
            }
            this.addParentSiblingRelations(row);
            table.blocks.push(row);
            table.container.appendChild(row.container);
        }
        this.addParentSiblingRelations(table);
        return table;
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
    createPlainTextBlock(dto?: IPlainTextBlockDto) {
        const blockSchemas = this.getBlockSchemas();
        const events = this.getPlainTextInputEvents();
        const block = new PlainTextBlock({
            owner: this,
            id: dto?.id
        });
        if (dto?.metadata) block.metadata = dto.metadata;
        block.setBlockSchemas(blockSchemas);
        block.setEvents(events);
        if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        block.applyBlockPropertyStyling();
        this.blocks.push(block);
        return block;
    }
    createTableBlock(dto?: IBlockDto) {
        const blockSchemas = this.getBlockSchemas();
        const block = new TableBlock({
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
    createTableRowBlock(dto?: IBlockDto) {
        const blockSchemas = this.getBlockSchemas();
        const block = new TableRowBlock({
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
    createTableCellBlock(dto?: IBlockDto) {
        const blockSchemas = this.getBlockSchemas();
        const block = new TableCellBlock({
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
    createEmbedDocumentBlock(dto?: IBlockDto) {
        const blockSchemas = this.getBlockSchemas();
        const block = new EmbedDocumentBlock({
            owner: this
        });
        if (dto?.metadata) block.metadata = dto.metadata;
        block.setBlockSchemas(blockSchemas);
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
    randomIntFromInterval(min: number, max: number) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }
    getRandomIpsum() {
        const lines = [
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut tempor velit a leo euismod sagittis. Vivamus ullamcorper eu ex sollicitudin sollicitudin. Aliquam erat volutpat. Ut eu felis at dolor facilisis maximus. Ut ac hendrerit erat. Suspendisse auctor mi sapien. Aliquam risus arcu, sollicitudin a urna sit amet, ultrices dapibus sem. Sed eleifend facilisis dolor, in feugiat metus interdum sit amet.",
            "Proin id massa nibh. Aliquam consectetur nisl quis hendrerit vestibulum. Phasellus urna sapien, ultrices at turpis at, aliquam finibus justo. Sed id dui arcu. Donec id mauris lectus. Quisque nunc sapien, maximus nec diam vitae, viverra vestibulum lacus. Quisque elementum metus in condimentum eleifend. Vestibulum et ante non libero posuere consectetur. Pellentesque metus lorem, suscipit nec est in, condimentum tincidunt purus. Praesent in justo facilisis, finibus mauris nec, ultricies turpis.",
            "Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Maecenas in felis ac ex laoreet lobortis vitae eget velit. Morbi condimentum lorem eu hendrerit mattis. Curabitur ut nibh tincidunt, tincidunt justo sit amet, convallis lectus. Donec ultricies purus et faucibus luctus. Donec tristique libero turpis, eget faucibus nibh faucibus eget. Nulla sed finibus dolor. Duis vitae consequat arcu. Integer aliquam finibus accumsan.",
            "Phasellus pretium elementum ipsum quis aliquam. Maecenas nisl lorem, hendrerit nec ultricies a, porta a tellus. Donec venenatis pellentesque ante ut laoreet. Phasellus velit metus, convallis eget bibendum quis, tempus vitae velit. Etiam scelerisque aliquam felis quis molestie. Nunc euismod, nulla non pharetra dapibus, lectus magna suscipit sem, vitae efficitur libero ante sit amet nisi. Suspendisse et nunc non lacus vehicula vestibulum.",
            "Quisque augue nunc, fringilla ac ante vel, elementum tincidunt dui. Nullam tempor augue vel dapibus bibendum. Duis id eros in ante euismod fringilla nec eu sapien. Nulla facilisi. Nulla quis molestie massa, a elementum sem. Ut malesuada eros non maximus consectetur. Pellentesque at tellus sem. Aliquam facilisis maximus interdum. Proin sollicitudin dapibus magna, interdum laoreet justo."
        ];
        const i = this.randomIntFromInterval(0, lines.length - 1);
        return lines[i];
    }
    testLoadDocument(rows: number) {
        const nextDoc: IBlockDto = {
            type: BlockType.MainListBlock,
            children: []
        };
        for (let i = 0; i < rows; i++) {
            const tb = {
                type: BlockType.StandoffEditorBlock,
                text: this.getRandomIpsum(),
                standoffProperties: [
                    { type: "style/italics", start: 20, end: 30 },
                    { type: "style/bold", start: 25, end: 35 },
                    { type: "codex/entity-reference", start: 27, end: 37 },
                    { type: "codex/block-reference", start: 19, end: 29 },
                ]
            };
            nextDoc.children?.push(tb);
        }
        this.loadDocument(nextDoc);
    }
    addImageBlock(sibling: IBlock, url: string) {        
        const image = this.createImageBlock({
            type: BlockType.ImageBlock,
            metadata: {
                url: url
            }
        }) as ImageBlock;
        image.build();
        this.addNextBlock(image, sibling);
        return image;
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
        //block.setEvents(editorEvents);
        block.setCommitHandler(this.storeCommit.bind(this));
        const textProcessor = new TextProcessor({ editor: block });
        const custom = [
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Custom,
                    match: "onTextChanged"
                },
                action: {
                    name: "",
                    description: "",
                    handler: async (args: IBindingHandlerArgs) => {
                        console.log("onTextChanged", { args });
                        await textProcessor.process(args);
                    }
                }
            }
        ];
        block.setEvents(custom);
        if (dto?.metadata) block.metadata = dto.metadata;
        if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        block.applyBlockPropertyStyling();
        this.blocks.push(block);
        return block;
    }
    async handleEnterKey(args: IBindingHandlerArgs) {
        const { caret } = args;
        const block = args.block as StandoffEditorBlock;
        const atStart = caret.left == null;
        const atEnd = caret.right.isEOL;
        const isInside = !atStart && !atEnd;
        if (isInside) {
            const ci = caret.left?.index as number;
            const split = this.splitBlock(block.id, ci + 1);
            this.setBlockFocus(split);
            split.moveCaretStart();
            return;
        }
        const newBlock = this.createStandoffEditorBlock();
        const blockData = block.serialize();
        newBlock.addBlockProperties(blockData.blockProperties || []);
        newBlock.applyBlockPropertyStyling();
        newBlock.addEOL();
        if (atStart) {
            this.addPreviousBlock(newBlock, block);
            this.setBlockFocus(block);
            block.moveCaretStart();
        } else if (atEnd) {
            this.addNextBlock(newBlock, block);
            this.setBlockFocus(newBlock);
            newBlock.moveCaretStart();
        }
    }
    async handleTabKey(args: IBindingHandlerArgs) {
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
    async applyImageBackgroundToBlock(args: IBindingHandlerArgs) {
        const block = args.block as StandoffEditorBlock;
        block.addBlockProperties([{ type: "block/background/image" }]);
        block.applyBlockPropertyStyling();
    }
    async applyClockToText(args: IBindingHandlerArgs) {
        const block = args.block as StandoffEditorBlock;
        const selection = block.getSelection();
        if (selection) {
            block.createStandoffProperty("animation/clock", selection);
        } else {
            // TBC
        }      
    }
    async applyMirrorToText(args: IBindingHandlerArgs) {
        const block = args.block as StandoffEditorBlock;
        const selection = block.getSelection();
        if (selection) {
            block.createStandoffProperty("style/mirror", selection);
        } else {
            // TBC
        }      
    }
    async applyFlipToText(args: IBindingHandlerArgs) {
        const block = args.block as StandoffEditorBlock;
        const selection = block.getSelection();
        if (selection) {
            block.createStandoffProperty("style/flip", selection);
        } else {
            // TBC
        }      
    }
    async applyItalicsToText(args: IBindingHandlerArgs) {
        const block = args.block as StandoffEditorBlock;
        const selection = block.getSelection();
        if (selection) {
            block.createStandoffProperty("style/italics", selection);
        } else {
            // TBC
        }      
    }
    async applyBoldToText(args: IBindingHandlerArgs) {
        this.applyStandoffProperty(args.block as StandoffEditorBlock, "style/bold") 
    }
    async applyBlurToText(args: IBindingHandlerArgs) {
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
    async applyEntityReferenceToText(args: IBindingHandlerArgs) {
        const self = this;
        const block = args.block as StandoffEditorBlock;
        const selection = block.getSelection();
        if (!selection) return;
        const jsx = SearchEntitiesWindow({
            onSelected: (item: any) => {
                if (selection) {
                    const prop = block.createStandoffProperty("codex/entity-reference", selection) as StandoffProperty;
                    prop.value = item.Value;
                }
                node.remove();
                self.setBlockFocus(block);
                block.setCaret(block.lastCaret.index, block.lastCaret.offset);
            },
            onClose: () => {
                node.remove();
                self.setBlockFocus(block);
                block.setCaret(block.lastCaret.index, block.lastCaret.offset);
            }
        });
        const node = renderToNode(jsx);
        const top = selection ? selection.start.cache.offset.y : block.cache.offset.y;
        const left = selection ? selection.start.cache.offset.x : block.cache.offset.x;
        updateElement(node, {
            style: {
                position: "absolute",
                top: (top + 30) + "px",
                left: left + "px",
                "z-index": this.getHighestZIndex(),
                width: "300px",
                height: "50px"
            }
        });
        this.container.appendChild(node);
    }
    getHighestZIndex() {
        return ++this.highestZIndex;
    }
    async moveCaretLeft(args: IBindingHandlerArgs) {
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
    setMultiColumns(id: GUID, cols: number) {
        const block = this.getBlock(id);
        updateElement(block.container, {
            style: {
                "column-count": cols
            }
        });
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
    mergeBlocks(sourceId: GUID, targetId: GUID) {
        const source = this.getBlock(sourceId) as StandoffEditorBlock;
        const target = this.getBlock(targetId) as StandoffEditorBlock;
        let text = source.getText();
        const len = text.length;
        text = text.substring(0, len-1); // Remove trailing EOL
        const ci = target.getText().length - 1;
        const props = source.standoffProperties
            .map(x => x.serialize())
            .map(x => {
                return { ...x, start: x.start + ci, end: x.end + ci } as StandoffPropertyDto
        });
        target.removeEOL();
        target.insertTextAtIndex(text, ci);
        target.addStandoffPropertiesDto(props);
        target.applyStandoffPropertyStyling();
        this.deleteBlock(sourceId);
    }
    splitBlock(blockId: GUID, ci: number) {
        const block = this.getBlock(blockId) as StandoffEditorBlock;
        let text = block.getText();
        const len = text.length;
        text = text.substring(0, len - 1); // Remove trailing EOL
        const props = block.standoffProperties;

        const second = text.substring(ci);
        const secondProps = props.filter(x => x.end.index >= ci || x.start.index >= ci)
            .map(x => x.serialize())
            .map(x => {
                return { ...x, start: x.start < ci ? 0 : x.start - ci, end: x.end - ci} as StandoffPropertyDto;
            });
        const secondBlock = this.createStandoffEditorBlock();
        secondBlock.bind({
            type: BlockType.StandoffEditorBlock,
            text: second,
            blockProperties: block.blockProperties.map(x=> x.serialize()),
            standoffProperties: secondProps
        });
        this.addNextBlock(secondBlock, block);
        secondBlock.applyStandoffPropertyStyling();

        const lastCell = block.cells[ci];
        props.filter(x => x.end.index < ci)
             .forEach(x => {
                x.end = x.end.index < ci ? x.end : lastCell;
                x.removeStyling();
                x.applyStyling();
        });
        const remaining = text.length - ci;
        block.removeCellsAtIndex(ci, remaining);
        block.reindexCells();
        block.updateView();
        block.applyStandoffPropertyStyling();

        return secondBlock;
    }
    splitLines(t: string) {
        return t.split(/\r\n|\r|\n/);
    }
    async saveImageToServer(file: File) {
        let formData = new FormData();
        await formData.append('image', file);
        const data = await axios
            .post(`http://localhost:3002/upload`, formData , {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            })
            .then((res): any => {
                return res.data;
            });
        return data;
    }
    async getImageDimensions(file: File) {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        await new Promise(resolve => img.onload = resolve);
        const dimensions = {
            width: img.width,
            height: img.height
        };
        URL.revokeObjectURL(img.src);
        return dimensions;
    }
    async handlePasteForStandoffEditorBlock(args: IBindingHandlerArgs) {
        document.body.focus();
        const caret = args.caret as Caret;
        const block = args.block as StandoffEditorBlock;
        const e = args.e as ClipboardEvent;
        const clipboardData = e.clipboardData as DataTransfer; // || window.clipboardData;
        const json = clipboardData.getData('application/json');
        const text = clipboardData.getData('text');
        //const html = clipboardData.getData("text/html");
        if (clipboardData.files.length) {
            const file = clipboardData.files[0];
            const dimensions = await this.getImageDimensions(file);
            const save = await this.saveImageToServer(file);
            console.log("handlePasteForStandoffEditorBlock", { save, file });
            const fileData = save[0];
            const image = this.addImageBlock(block, fileData.path);
            image.addBlockProperties([
                {
                    type: "block/size",
                    metadata: {
                        height: dimensions.height,
                        width: dimensions.width
                    }
                } as BlockPropertyDto
            ]);
            image.applyBlockPropertyStyling();
            return;
        }
        console.log("handlePasteForStandoffEditorBlock", { e, json, text })
        const ci = caret.left ? caret.left.index + 1 : 0;
        if (text) {
            const item = {
                data: {
                    text: text
                }
            };
            this.pastePlainTextItem(block.id, ci, item);
        }
        if (json) {
            const item = JSON.parse(json);
            this.pasteCodexItem(block.id, ci, item);
        }
        // if (html) {
        //     const converted = this.convertHtmlToStandoff(html);
        //     const item = {
        //         data: {
        //             text: converted.text,
        //             standoffProperties: converted.standoffProperties
        //         }
        //     };
        //     this.pasteCodexItem(block.id, ci, item);
        // }
    }
    pasteCodexItem(targetBlockId: GUID, ci: number, item: any) {
        const block = this.getBlock(targetBlockId) as StandoffEditorBlock;
        const text = item.data.text;
        const props = item.data.standoffProperties
            .map(x => {
                return {...x, start: x.start + ci, end: x.end + ci} as StandoffPropertyDto
            });
        block.insertTextAtIndex(text, ci);
        block.addStandoffPropertiesDto(props);
        block.applyStandoffPropertyStyling();
    }
    pastePlainTextItem(targetBlockId: GUID, ci: number, item: any) {
        const block = this.getBlock(targetBlockId) as StandoffEditorBlock;
        const text = item.data.text;
        const lines = this.splitLines(text);
        let currentBlock = block;
        let temp = [block];
        const len = lines.length;
        for (let i = 0; i < len; i++) {
            if (i == 0) {
                block.insertTextAtIndex(lines[0], ci);
                continue;
            }
            currentBlock = temp[i-1];
            const newBlock = this.createStandoffEditorBlock();
            newBlock.bind({
                type: BlockType.StandoffEditorBlock,
                text: lines[i]
            });
            if (lines[i].length == 0) {
                newBlock.addEOL();
            }
            this.addNextBlock(newBlock, currentBlock);
            temp.push(newBlock);
        }
        if (len == 1) {
            currentBlock.setCaret(ci + text.length, CARET.LEFT);
            return;
        }
        const lastBlock = temp[len-1];
        this.setBlockFocus(lastBlock);
        const lastCell = lastBlock.getLastCell();
        lastBlock.setCaret(lastCell.index, CARET.LEFT);
    }
    async moveCaretUp(args: IBindingHandlerArgs) {
        const { caret } = args;
        const block = args.block;
        if (args.block.type == BlockType.StandoffEditorBlock) {
            const textBlock = args.block as StandoffEditorBlock;
            if (textBlock.cache.caret.x == null) {
                textBlock.cache.caret.x = caret.right.cache.offset.x;
            }
            const match = textBlock.getCellAbove(caret.right);
            if (match) {
                textBlock.setCaret(match.cell.index, CARET.LEFT);
                return;
            }
            
        }
        if (block.relation.previous) {
            let previous = block.relation.previous as StandoffEditorBlock;
            if (previous.type == BlockType.StandoffEditorBlock) {
                previous.moveCaretEnd();
            }
            this.setBlockFocus(previous);
            return;
        }
    }
    async moveCaretDown(args: IBindingHandlerArgs) {
        const block = args.block;
        block.handleArrowDown({ manager: this });
        // if (args.block.type == BlockType.StandoffEditorBlock) {
        //     const textBlock = args.block as StandoffEditorBlock;
        //     if (textBlock.cache.caret.x == null) {
        //         textBlock.cache.caret.x = caret.right.cache.offset.x;
        //     }
        //     const match = textBlock.getCellBelow(caret.right);
        //     if (match) {
        //         textBlock.setCaret(match.cell.index, CARET.LEFT);
        //         return;
        //     }
            
        // }
        // if(block.relation.firstChild) {
        //     let firstChild = block.relation.firstChild;
        //     if (firstChild.type == BlockType.StandoffEditorBlock) {
        //         (firstChild as StandoffEditorBlock).moveCaretStart();
        //     }
        //     this.setBlockFocus(firstChild);
        //     return;
        // }
        // if (block.relation.next) {
        //     let next = block.relation.next as StandoffEditorBlock;
        //     if (next.type == BlockType.StandoffEditorBlock) {
        //         next.setCaret(next.getLastCell().index, CARET.LEFT); 
        //     }
        //     this.setBlockFocus(next);
        //     return;
        // }
        // const uncle = this.findNearestUncle(block);
        // if (uncle) {
        //     if (uncle.type == BlockType.StandoffEditorBlock) {
        //         (uncle as StandoffEditorBlock).moveCaretStart();
        //     }
        //     this.setBlockFocus(uncle);
        //     return;
        // }
    }
    async embedDocument(sibling: IBlock, filename: string) {
        const parent = this.getParent(sibling) as AbstractBlock;
        const manager = new BlockManager();
        await manager.loadServerDocument(filename);
        updateElement(manager.container, {
            style: {
                zoom: 0.5,
                "overflow-x": "hidden",
                "overflow-y": "scroll"
            }
        });
        this.addNextBlock(manager, sibling);
        this.addParentSiblingRelations(parent);
        this.setBlockFocus(manager.blocks[0]);
    }
    addCodeMirrorBlock(sibling: IBlock) {
        const parent = this.getParent(sibling) as AbstractBlock;
        const cm = this.createCodeMirrorBlock();
        this.addParentSiblingRelations(parent);
        this.addNextBlock(cm, sibling);
        this.setBlockFocus(cm);
        return cm;
    }
    createCodeMirrorBlock(dto?: ICodeMirrorBlockDto) {
        const block = new CodeMirrorBlock({
            type: BlockType.CodeMirrorBlock,
            text: dto?.text || ""
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
    async handleCopyForStandoffEditorBlock(args: IBindingHandlerArgs) {
        const block = args.block as StandoffEditorBlock;
        const selection = args.selection as IRange;
        const text = block.getText();
        const allProps = block.standoffProperties.map(x => x.serialize());
        const si = selection.start.index, ei = selection.end.index;
        const textSelection = text.substring(selection.start.index, selection.end.index + 1);
        const len = textSelection.length;
        const overlappingProps = allProps.filter(x => x.end >= si || x.start <= ei || (si <= x.start && x.end <= ei));
        const standoffProperties = overlappingProps.map(x => {
            const si2 = x.start < si ? 0 : x.start - si;
            const ei2 = x.end > ei ? len : x.end - si;
            return {...x, start: si2, end: ei2 }
        });
        const data = {
            source: "Codex", format: "StandoffEditorBlock",
            context: { blockId: block.id, selection: { start: si, end: ei } },
            data: { text: textSelection, standoffProperties }
        };
        const e = args.e as ClipboardEvent;
        e.clipboardData?.setData("application/json", JSON.stringify(data));
        this.clipboard.push(data);
        console.log("Copy .. dump", {  block, text, data, si, ei });
    }
    async handleBackspaceForStandoffEditorBlock(args: IBindingHandlerArgs) {
        const self = this;
        const { caret } = args;
        const block = args.block as StandoffEditorBlock;
        const selection = block.getSelection();
        if (selection) {
            const len = (selection.end.index - selection.start.index) + 1;
            block.removeCellsAtIndex(selection.start.index, len, true);
            return;
        }
        if (block.isEmpty()) {
            const previous = block.relation.previous;
            if (previous) {
                this.deleteBlock(block.id);
                this.setBlockFocus(previous);
                if (previous.type == BlockType.StandoffEditorBlock) {
                    (previous as StandoffEditorBlock).moveCaretEnd();
                }
                return;
            }
            const parent = block.relation.parent;
            if (parent) {
                this.deleteBlock(block.id);
                this.setBlockFocus(parent);
                return;
            }
        }
        const atStart = !caret.left;
        if (atStart) {
            if (block.relation.previous?.type == BlockType.StandoffEditorBlock) {
                const previous = block.relation.previous as StandoffEditorBlock;
                if (previous.isEmpty()) {
                    this.deleteBlock(block.relation.previous.id);
                    this.setBlockFocus(block);
                    block.moveCaretStart();
                    return;
                }
                const li = previous.getLastCell().index;
                this.mergeBlocks(block.id, previous.id);
                setTimeout(() => {
                    self.setBlockFocus(previous);
                    previous.setCaret(li, CARET.LEFT);
                }, 1);
                return;
            } else {
                this.setBlockFocus(block.relation.previous);
                return;
            }
        }
        const ci = caret.left?.index as number;
        block.removeCellAtIndex(ci, true);
    }
    convertHtmlToStandoff(html: string) {
        // let doc = HTMLSource.fromRaw(html).convertTo(OffsetSource).canonical();
        // const text = doc.content;
        // const standoffProperties = doc.annotations.map(x => {
        //     return {
        //         type: this.toCodexAnnotationType(x.type),
        //         start: x.start,
        //         end: x.end,
        //         metadata: x.attributes
        //     } as StandoffPropertyDto
        // }).filter(x => x.type != "unknown");
        // return {
        //     text,
        //     standoffProperties,
        //     doc
        // };
    }
    toCodexAnnotationType(offsetSourceType: string) {
        switch (offsetSourceType) {
            case "italic": return "style/italics";
            case "bold": return "style/bold";
            case "link": return "reference/url";
            default: return offsetSourceType;
        }
    }
    async handleDeleteForStandoffEditorBlock(args: IBindingHandlerArgs) {
        const self = this;
        const { caret } = args;
        const block = args.block as StandoffEditorBlock;
        const cri = caret.right.index;
        if (caret.right.isEOL) {
            if (block.relation.next) {
                if (block.relation.next.type == BlockType.StandoffEditorBlock) {
                    const next = block.relation.next as StandoffEditorBlock;
                    if (next.isEmpty()) {
                        this.deleteBlock(next.id);
                        setTimeout(() => {
                            self.setBlockFocus(block);
                            block.moveCaretEnd();
                        }, 1);
                    } else {
                        this.mergeBlocks(next.id, block.id);
                        setTimeout(() => {
                            self.setBlockFocus(block);
                            block.setCaret(cri, CARET.LEFT);
                        }, 1);
                    }
                } else {
                    this.setBlockFocus(block.relation.next);
                }
            }
        } else {
            block.removeCellAtIndex(caret.right.index, true);
        }
    }
    async handleCreateLeftMargin(args: IBindingHandlerArgs){
        const block = args.block as StandoffEditorBlock;
        const manager = block.owner as BlockManager;
        let leftMargin = block.relation.leftMargin as LeftMarginBlock;
        /**
         * If there is no LeftMarginBlock already then create one and add
         * a StandoffEditorBlock to it.
         */
        if (!leftMargin) {
            leftMargin = manager.createLeftMarginBlock();
            const child = manager.createStandoffEditorBlock();
            child.addEOL();
            child.addBlockProperties([ { type: "block/alignment/left" }, { type: "block/font/size/three-quarters" } ]);
            child.applyBlockPropertyStyling();
            leftMargin.relation.marginParent = block;
            block.relation.leftMargin = leftMargin;
            leftMargin.relation.firstChild = child;
            child.relation.parent = leftMargin;
            leftMargin.blocks.push(child);
            manager.blocks.push(leftMargin);
            manager.blocks.push(child);
            leftMargin.container.appendChild(child.container);
            manager.stageLeftMarginBlock(leftMargin, block);
            block.container.appendChild(leftMargin.container);
            setTimeout(() => {
                manager.setBlockFocus(child);
                child.moveCaretStart();
            }, 1);
            return;
        } else {
            const child = leftMargin.relation.firstChild as StandoffEditorBlock;
            setTimeout(() => {
                manager.setBlockFocus(child);
                child.moveCaretStart();
            }, 1);
        }
    }
    async handleCreateRightMargin(args: IBindingHandlerArgs){
        const block = args.block as StandoffEditorBlock;
        const manager = block.owner as BlockManager;
        let rightMargin = block.relation.rightMargin as RightMarginBlock;
        /**
         * If there is no LeftMarginBlock already then create one and add
         * a StandoffEditorBlock to it.
         */
        if (!rightMargin) {
            rightMargin = manager.createRightMarginBlock();
            const child = manager.createStandoffEditorBlock();
            child.addEOL();
            child.addBlockProperties([ { type: "block/alignment/left" }, { type: "block/font/size/three-quarters" } ]);
            child.applyBlockPropertyStyling();
            rightMargin.relation.marginParent = block;
            block.relation.rightMargin = rightMargin;
            rightMargin.relation.firstChild = child;
            child.relation.parent = rightMargin;
            rightMargin.blocks.push(child);
            manager.blocks.push(rightMargin);
            manager.blocks.push(child);
            rightMargin.container.appendChild(child.container);
            manager.stageRightMarginBlock(rightMargin, block);
            block.container.appendChild(rightMargin.container);
            setTimeout(() => {
                manager.setBlockFocus(child);
                child.moveCaretStart();
            }, 1);
            return;
        } else {
            const child = rightMargin.relation.firstChild as StandoffEditorBlock;
            setTimeout(() => {
                manager.setBlockFocus(child);
                child.moveCaretStart();
            }, 1);
        }
    }
    convertBlockToTab(blockId: GUID) {
        const block = this.getBlock(blockId) as IBlock;
        if (!block) return;
        const tabRow = this.createTabRowBlock();
        const tab = this.createTabBlock({
            type: BlockType.TabBlock,
            metadata: {
                name: "1"
            }
        });
        const parent = this.getParent(block) as IBlock;
        const bi = parent.blocks.findIndex(x=> x.id == block.id);
        parent.blocks.splice(bi, 1);
        tab.blocks.push(block);
        tabRow.blocks.push(tab);
        parent.blocks.splice(bi, 0, tabRow);
        tabRow.renderLabels();
        (tabRow.blocks[0] as TabBlock)?.setActive();
        const previous = block.relation.previous;
        if (previous) {
            previous.relation.next = tabRow;
            tabRow.relation.previous = previous;
        }
        const next = block.relation.next;
        if (next) {
            next.relation.previous = tabRow;
            tabRow.relation.next = next;
        }
        const _parent = block.relation.parent;
        if (_parent) {
            _parent.relation.firstChild = tabRow;
            tabRow.relation.parent = _parent;
        }
        tabRow.relation.firstChild = tab;
        tab.relation.parent = tabRow;
        delete block.relation.previous;
        tab.relation.firstChild = block;
        block.relation.parent = tab;
        /**
         * Sort out all the tab panel stuff, rendering the label, etc.
         */
        block.container.insertAdjacentElement("afterend", tabRow.container);
        tabRow.container.appendChild(tab.container);
        tab.panel.appendChild(block.container);
        setTimeout(() => {
            this.setBlockFocus(block);
            if (block.type == BlockType.StandoffEditorBlock) {
                const _block = block as StandoffEditorBlock;
                const caret = _block.lastCaret;
                _block.setCaret(caret.index, CARET.LEFT);
            }
        }, 1);
    }
    addTabRowAfter(blockId: GUID) {
        const target = this.getBlock(blockId) as IBlock;
        if (!target) return;
        /**
         * Create a TabRow, add a TabBlock to it, and a StandoffTextEditor, then set the focus to the editor.
         */
    }
    explodeTabs(blockId: GUID) {
        const target = this.getBlock(blockId) as IBlock;
        if (!target) return;
        const tabRow = this.getParentOfType(target, BlockType.TabRowBlock);
        if (!tabRow) return;
        /**
         * Extract all of the blocks inside each tab and put them as siblings of 'tabRow'.
         * Then delete all of the TabBlocks inside 'tabRow', then 'tabRow' itself, leaving the contents
         * disgorged into the document.
         */
    }
    tryParseInt(value: string): [boolean, number|null] {
        try {
            return [true, parseInt(value)]
        } catch {
            return [false, null];
        }
    }
    async handleCreateNewTab(args: IBindingHandlerArgs) {
        const block = args.block as StandoffEditorBlock;
        const self = block.owner as BlockManager;
        const parent = self.getParent(block) as IBlock;
        if (!parent) return;
        if (parent.type == BlockType.TabBlock) {
            const previousTabName = parent.metadata.name || "";
            const [parsed, tabNum] = this.tryParseInt(previousTabName);
            const newTabName = parsed ? ((tabNum as number) + 1) + "" : "...";
            self.addTab({ tabId: parent.id, name: newTabName });
        } else {
            self.convertBlockToTab(block.id);
        }
    }
    appendSibling(anchor: HTMLElement, sibling: HTMLElement) {
        anchor.insertAdjacentElement("afterend", sibling);
    }
    startNewDocument() {
        
    }
}


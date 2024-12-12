import axios from 'axios';
import { createUnderline, updateElement } from "./svg";
import { v4 as uuidv4 } from 'uuid';
import { DocumentBlock } from "./document-block";
import { IndentedListBlock } from "./indented-list-block";
import { TabBlock, TabRowBlock } from "./tabs-block";
import { GridBlock, GridCellBlock, GridRowBlock } from "./grid-block";
import { ImageBlock } from "./image-block";
import { VideoBlock } from "./video-block";
import { IframeBlock } from "./iframe-block";
import { AbstractBlock } from "./abstract-block";
import { BlockProperty } from "./block-property";
import { StandoffEditorBlock } from "./standoff-editor-block";
import { StandoffProperty } from "./standoff-property";
import { IBlockManager,InputEvent, BlockType, IBlock, InputAction, IBlockSelection, Commit, IBlockPropertySchema, IBlockManagerConstructor, InputEventSource, IBindingHandlerArgs, IBatchRelateArgs, Command, CARET, RowPosition, IRange, Word, DIRECTION, ISelection, IStandoffPropertySchema, GUID, IBlockDto, IStandoffEditorBlockDto, IMainListBlockDto, PointerDirection, Platform, TPlatformKey, IPlainTextBlockDto, ICodeMirrorBlockDto, IEmbedDocumentBlockDto, IPlugin, Caret, StandoffPropertyDto, BlockPropertyDto, FindMatch, StandoffEditorBlockDto } from "./types";
import { PlainTextBlock } from "./plain-text-block";
import { CodeMirrorBlock } from "./code-mirror-block";
import { ClockPlugin } from "./plugins/clock";
import { TextProcessor } from "./text-processor";
import { EmbedDocumentBlock } from "./embed-document-block";
import { SearchEntitiesBlock } from "../components/search-entities";
import { renderToNode } from "./common";
import { MonitorBlock, StandoffEditorBlockMonitor } from "../components/monitor";
import { TableBlock, TableCellBlock, TableRowBlock } from './tables-blocks';
import { classList } from 'solid-js/web';
import { FindReplaceBlock } from '../components/find-replace';
import { ControlPanelBlock } from '../components/control-panel';
import { AnnotationPanelBlock } from '../components/annotation-panel';
import { CheckboxBlock } from './checkbox-block';
import _ from 'underscore';

const isStr = (value: any) => typeof (value) == "string";
const isNum = (value: any) => typeof (value) == "number";

const passoverClass = "block-modal";

const EventType = {
    "beforeChange": "beforeChange",
    "afterChange": "afterChange",
    "addToHistory":"addToHistory"
};
type BlockManagerEvent = Record<string, ((data?: {}) => void)[]>
const DocumentState = {
    "initalising": "initialising",
    "initalised": "initialised",
    "loading": "loading",
    "loaded": "loaded"
};

export class BlockManager extends AbstractBlock implements IBlockManager {
    //id: string;
    //type: BlockType;
    //container: HTMLElement;
    //blocks: IBlock[];
    //relation: Record<string, IBlock>;
    //metadata: Record<string,any>;
    lastFocus?: IBlock;
    focus?: IBlock;
    // modes: string[];
    // inputEvents: InputEvent[];
    // inputActions: InputAction[];
    selections: IBlockSelection[];
    commits: Commit[];
    pointer: number;
    direction: PointerDirection;
    // blockProperties: BlockProperty[];
    // blockSchemas: IBlockPropertySchema[];
    plugins: IPlugin[];
    highestZIndex: number;
    clipboard: Record<string, any>[];
    registeredBlocks: IBlock[];
    textProcessor: TextProcessor;
    events: BlockManagerEvent;
    undoStack: IBlockDto[];
    redoStack: IBlockDto[];
    lastChange: number;
    state: string;
    constructor(props?: IBlockManagerConstructor) {
        super({ id: props?.id, container: props?.container });
        this.state = DocumentState.initalising;
        this.id = props?.id || uuidv4();
        this.type = BlockType.BlockManagerBlock;
        this.container = props?.container || document.createElement("DIV") as HTMLElement;
        this.blocks = [];
        this.metadata = {};
        this.relation = {};
        this.selections = [];
        this.commits = [];
        this.pointer = 0;
        this.direction = PointerDirection.Undo;
        this.blockProperties= [];
        this.blockSchemas=[];
        this.inputEvents = this.getBlockManagerEvents();
        this.inputActions = [];
        this.modes = ["global","default"];
        this.highestZIndex = this.getHighestZIndex();
        this.plugins = [];
        this.clipboard = [];
        this.manager = this;
        this.registeredBlocks = [this];
        this.textProcessor = new TextProcessor();
        this.attachEventBindings();
        this.setupControlPanel();
        this.events = {};
        this.undoStack = [];
        this.redoStack = [];
        this.setupSubscriptions();
        this.lastChange = Date.now();
        this.state = DocumentState.initalised;
    }
    setupSubscriptions() {
        this.subscribeTo(EventType.beforeChange, this.addToHistory.bind(this));
    }
    subscribeTo(eventName: string, handler: () => void) {
        const evt = this.events[eventName];
        if (!evt) {
            this.events[eventName] = [handler];
            return;
        }
        evt.push(handler);
    }
    publish(eventName: string, data?: {}) {
        const evt = this.events[eventName];
        if (!evt) return;
        evt.forEach((e,i) => {
            try {
                e(data);
            } catch (ex) {
                console.log("publish", { eventName, handler: e, i })
            }
        });
    }
    addToHistory() {
        if (!this.minimalTimeElapsedSinceLastChange()) {
            //console.log("bounced: addToHistory");
            return;
        }
        this.takeSnapshot();
    }
    takeSnapshot(dto?: IBlockDto) {
        const len = this.undoStack.length;
        if (len == 10) {
            this.undoStack.shift();
        }
        dto = dto || this.getDocument();
        this.undoStack.push(dto);
    }
    redoHistory() {
        const last = this.redoStack.pop();
        if (!last) return;
        if (this.undoStack.length == 10) {
            this.undoStack.shift();
        }
        const dto = this.getDocument();
        this.undoStack.push(dto);
        this.loadDocument(last);
        console.log("redoHistory", { undoStack: this.undoStack, redoStack: this.redoStack });
    }
    undoHistory() {
        const last = this.undoStack.pop();
        if (!last) return;
        if (this.redoStack.length == 10) {
            this.redoStack.shift();
        }
        const dto = this.getDocument();
        this.redoStack.push(last);
        this.redoStack.push(dto);
        this.loadDocument(last);
        console.log("undoHistory", { undoStack: this.undoStack, redoStack: this.redoStack });
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
            let match = this.registeredBlocks.find(x=> x.container == current);
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
            if (!(b as any).getFirstMatchingInputEvent) continue;
            const match = (b as any).getFirstMatchingInputEvent(input);
            if (match) {
                const args = {
                    block: parentBlock,
                    e
                } as any;
                await match.action.handler(args);
            }
        }
    }
    isPassoverBlock(element: HTMLElement) {
        let current = element;
        while (current) {
            if (current.classList.contains(passoverClass)) return true;
            current = current.parentElement as HTMLElement;
        }
        return false;
    }
    getBlockFromElement(el: HTMLElement) {
        let current = el;
        while (current) {
            let match = this.registeredBlocks.find(x=> x.container == current);
            if (match) return match;
            current = current.parentElement as HTMLElement;
        }
        return null;
    }
    async handleKeyboardInputEvents(e: KeyboardEvent) {
        const ALLOW = true, FORBID = false;
        const target = e.target as HTMLElement;
        const input = this.toKeyboardInput(e);
        const modifiers = ["Shift", "Alt", "Meta", "Control", "Option"];
        if (modifiers.some(x => x == input.key)) {
            return ALLOW;
        }
        let focusedBlock = this.getBlockInFocus() as IBlock;
        if (!focusedBlock) {
            console.log("handleKeyboardInputEvents", { message: "Focus block not found.", e });
            if (this.isPassoverBlock(target)) {
                focusedBlock = this.getBlockFromElement(target) as IBlock;
                if (!focusedBlock) return ALLOW;
            } else {
                return ALLOW;
            }
        }
        if (!focusedBlock.container.contains(e.target as HTMLElement)) {
            console.log("handleKeyboardInputEvents", { message: "Input received from outside of @focusedBlock", focusedBlock, target: e.target });
        }
        const isStandoffBlock = focusedBlock.type == BlockType.StandoffEditorBlock;
        const blocks = [focusedBlock, this];
        for (let i = 0; i < blocks.length; i++) {
            const b = blocks[i];
            if (!(b as any).getFirstMatchingInputEvent) continue;
            const match = (b as any).getFirstMatchingInputEvent(input);
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
        document.body.addEventListener("contextmenu", this.handleOnContextMenuEvent.bind(this));
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
    async handleOnContextMenuEvent(e: ClipboardEvent) {
        await this.handleCustomEvent(e, InputEventSource.Custom, "contextmenu");
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
            }
        ] as InputEvent[];
    }
    
    updateView() {
        //this.blocks.forEach(x => x.updateView());
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
        console.log("setBlockFocus", { oldFocus: this.focus, newFocus: block });
        const oldFocus = this.focus;
        oldFocus?.container.classList.remove("focus-highlight");
        this.focus = block;
        this.focus.container.classList.add("focus-highlight");
        this.lastFocus = oldFocus;
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
                type: "block/font/size",
                name: "Specified size",
                event: {
                    onInit: (p: BlockProperty) => {
                        updateElement(p.block.container, {
                            style: {
                                "font-size": p.value
                            }
                        });
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
                        const manager = p.block.manager as BlockManager;
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
                        const manager = block.manager as BlockManager;
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
                        const manager = block.manager as BlockManager;
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
                        const manager = imageBlock.manager as BlockManager;
                        const newBlock = manager.createStandoffEditorBlock();
                        newBlock.addEOL();
                        manager.addBlockAfter(newBlock, imageBlock);
                        setTimeout(() => {
                            manager.setBlockFocus(newBlock);
                            newBlock.setCaret(0, CARET.LEFT);
                        });
                    }
                }
            }
        ]
        return events;
    }
    async handleAnnotationMonitorClicked(args: IBindingHandlerArgs) {
        const self = this;
        const caret = args.caret as Caret;
        const block = args.block as StandoffEditorBlock;
        const anchor = caret.left || caret.right;
        // block.setMarker(anchor, this.container);
        if (block.cache.monitor) {
            block.cache.monitor.remove();
            block.cache.monitor = undefined;
        }
        const props = block.getEnclosingProperties(anchor);
        if (!props.length) return;
        const monitor = new MonitorBlock({ manager: this });
        const component = StandoffEditorBlockMonitor({
            monitor,
            properties: props,
            onDelete: (p) => {
                p.destroy();
            },
            onClose: () => {
                block.cache.monitor?.remove();
                self.deregisterBlock(monitor.id);
                block.setCaret(anchor.index, CARET.LEFT);
                self.setBlockFocus(block);
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
        block.removeFocus();
        monitor.setFocus();
        this.registerBlock(monitor);
        this.setBlockFocus(monitor);
    }
    getBlockManagerEvents() {
        const events: InputEvent[] = [
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Custom,
                    match: "contextmenu"
                },
                action: {
                    name: "Monitor panel",
                    description: "",
                    handler: this.loadAnnotationMenu.bind(this)
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
                    name: "Create a new text block. Move text to the right of the caret into the new block.",
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
                    name: "Indent the current block.",
                    description: `
                        
                    `,
                    handler: this.indentBlock.bind(this)
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "Shift-Tab"
                },
                action: {
                    name: "De-indent the current block.",
                    description: `
                        
                    `,
                    handler: this.deindentBlock.bind(this)
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
                        const manager = block.manager as BlockManager;
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
                        const manager = block.manager as BlockManager;
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
                    match: ["Mac:Meta-C","Windows:Control-C"]
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
                    match: ["Mac:Meta-V","Windows:Control-V"]
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
                    match: ["Windows:Control-S","Mac:Meta-S"]
                },
                action: {
                    name: "Save document",
                    description: "",
                    handler: async (args: IBindingHandlerArgs) => {
                        args.e?.preventDefault();
                        const manager = args.block.manager as BlockManager;
                        const document = manager.blocks[0];
                        let filename = document.metadata.filename;
                        if (!filename) {
                            filename = prompt("Filename?");
                            document.metadata.filename = filename;
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
                    match: "Control-Shift-ArrowUp"
                },
                action: {
                    name: "Move the focus block up one block.",
                    description: `
                        
                    `,
                    handler: this.handleMoveBlockUp.bind(this)
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "Control-Shift-ArrowDown"
                },
                action: {
                    name: "Move the focus block down one block.",
                    description: `
                        
                    `,
                    handler: this.handleMoveBlockDown.bind(this)
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "Shift-ArrowUp"
                },
                action: {
                    name: "Move the cursor up one row. If one isn't found, do nothing.",
                    description: `
                        
                    `,
                    handler: async (args: IBindingHandlerArgs) => {
                        const block = args.block as StandoffEditorBlock;
                        const caret = args.caret as Caret;
                        const selection = block.getSelection() as IRange;
                        console.log("Shift-ArrowUp", { selection, caret, lastCell: block.getLastCell() });
                        if (!selection) {
                            const row = block.getCellInRow(caret.right, RowPosition.Previous);
                            if (!row) {
                                block.setSelection({ start: block.cells[0], end: caret.right, direction: DIRECTION.RIGHT } as ISelection);
                            } else {
                                block.setSelection({ start: row.cell, end: caret.right, direction: DIRECTION.RIGHT } as ISelection);
                            }
                            return;
                        }
                        const row = block.getCellInRow(selection.end, RowPosition.Previous);
                        if (!row) {
                            block.setSelection({ start: block.cells[0], end: selection.end, direction: DIRECTION.RIGHT } as ISelection);
                            return;
                        }
                        block.setSelection({ start: selection.start, end: row.cell, direction: DIRECTION.RIGHT } as ISelection);
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
                    name: "Move the cursor down one row. If one isn't found, do nothing.",
                    description: `
                        
                    `,
                    handler: async (args: IBindingHandlerArgs) => {
                        const block = args.block as StandoffEditorBlock;
                        const caret = args.caret as Caret;
                        const selection = block.getSelection() as IRange;
                        console.log("Shift-ArrowDown", { selection, caret, lastCell: block.getLastCell() });
                        if (!selection) {
                            const row = block.getCellInRow(caret.right, RowPosition.Next);
                            if (!row) {
                                block.setSelection({ start: caret.right, end: block.getLastCell(), direction: DIRECTION.RIGHT } as ISelection);
                            } else {
                                block.setSelection({ start: caret.right, end: row.cell, direction: DIRECTION.RIGHT } as ISelection);
                            }
                            return;
                        }
                        const row = block.getCellInRow(selection.end, RowPosition.Next);
                        if (!row) {
                            block.setSelection({ start: selection.start, end: block.getLastCell(), direction: DIRECTION.RIGHT } as ISelection);
                            return;
                        }
                        block.setSelection({ start: selection.start, end: row.cell, direction: DIRECTION.RIGHT } as ISelection);
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
                    name: "Move the cursor down one row. If one isn't found, move to the next block.",
                    description: `
                        
                    `,
                    handler: this.moveCaretUp.bind(this)
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
                        const caret = args.caret as Caret;
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
                    handler: this.moveCaretRight.bind(this)
                }
            }
        ];
        return events;
    }
    getParentOfType(block: IBlock, type: BlockType) {
        let current = block;
        while (current) {
            let parent = current.relation.parent;
            if (!parent) return null;
            if (parent.type == type) return parent;
            current = parent;
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
        const caret = args.caret as Caret;
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
        const self = this;
        const events: InputEvent[] = [
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
                        await self.textProcessor.process(args);
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
                    handler: async (args: IBindingHandlerArgs) => {
                        const caret = args.caret as Caret;
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
                        const caret = args.caret as Caret;
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
                        const caret = args.caret as Caret;
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
                    match: ["Mac:Meta-U","Windows:Control-U"]
                },
                action: {
                    name: "Show the annotation menu.",
                    description: `
                        
                    `,
                    handler: this.loadAnnotationMenu.bind(this)
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
                    match: ["Mac:Meta-Z","Windows:Control-Z"]
                },
                action: {
                    name: "Undo",
                    description: "",
                    handler: async (args) => {
                        self.undoHistory();
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
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: ["Mac:Meta-/","Windows:Control-/"]
                },
                action: {
                    name: "Monitor panel",
                    description: "",
                    handler: this.handleAnnotationMonitorClicked.bind(this)
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
            // {
            //     mode: "default",
            //     trigger: {
            //         source: InputEventSource.Keyboard,
            //         match: "Control-F"
            //     },
            //     action: {
            //         name: "Flip",
            //         description: "Flips the selected text upside down",
            //         handler: this.applyFlipToText.bind(this)
            //     }
            // },
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
                        const self = block.manager as BlockManager;
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
                        const manager = block.manager as BlockManager;
                        const structure = manager.getParentOfType(block, BlockType.TabRowBlock)
                            || manager.getParentOfType(block, BlockType.GridBlock)
                            || manager.getParentOfType(block, BlockType.TableBlock)
                            || manager.getParentOfType(block, BlockType.IndentedListBlock)
                        ;
                        if (!structure) return;
                        const newBlock = manager.createStandoffEditorBlock();
                        newBlock.addEOL();
                        manager.addBlockAfter(newBlock, structure);
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
                    match: ["Meta-E", "Control-Shift-E"]
                },
                action: {
                    name: "Entity reference",
                    description: "Links to an entity in the graph database.",
                    handler: this.applyEntityReferenceToText.bind(this)
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "Control-F"
                },
                action: {
                    name: "Find",
                    description: "Highlights all text matches.",
                    handler: this.handleFind.bind(this)
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
                type: "style/strikethrough",
                name: "Strikethrough",
                decorate: {
                    cssClass: "style_strikethrough"
                }
            },
            {
                type: "style/highlight",
                name: "Highlight",
                decorate: {
                    cssClass: "style_highlight"
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
                type: "style/underline",
                name: "Underline",
                decorate: {
                    cssClass: "style_underline"
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
                type: "codex/search/highlight",
                name: "Find text highlight",
                decorate: {
                    cssClass: "codex-search-highlight"
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
                        const owner = args.block.manager as BlockManager;
                        owner.renderUnderlines("codex/block-reference", args.properties, args.block, "green", 3);
                    }
                }
            },
            {
                type: "codex/trait-reference",
                name: "Trait reference",
                event: {
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
                        const owner = args.block.manager as BlockManager;
                        owner.renderUnderlines("codex/trait-reference", args.properties, args.block, "blue", 3);
                    }
                }
            },
            {
                type: "codex/claim-reference",
                name: "Claim reference",
                event: {
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
                        const owner = args.block.manager as BlockManager;
                        owner.renderUnderlines("codex/claim-reference", args.properties, args.block, "red", 1);
                    }
                }
            },
            {
                type: "codex/meta-relation-reference",
                name: "Meta-Relation reference",
                event: {
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
                        const owner = args.block.manager as BlockManager;
                        owner.renderUnderlines("codex/meta-relation-reference", args.properties, args.block, "orange", 3);
                    }
                }
            },
            {
                type: "codex/time-reference",
                name: "Time reference",
                event: {
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
                        const owner = args.block.manager as BlockManager;
                        owner.renderUnderlines("codex/time-reference", args.properties, args.block, "cyan", 3);
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
                        const owner = args.block.manager as BlockManager;
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
        return this.registeredBlocks.find(x => x.id == id) as IBlock;
    }
    commit(msg: Commit) {
        this.commits.push(msg);
    }
    async handleDeleteBlock(args: IBindingHandlerArgs) {
        const block = args.block;
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
    }
    async handleMoveBlockDown(args: IBindingHandlerArgs) {
        const block = args.block;
        
        this.moveBlockDown(block);
        this.setBlockFocus(block);
        if (block.type == BlockType.StandoffEditorBlock) {
            const caret = args.caret as Caret;
            (block as StandoffEditorBlock).setCaret(caret?.right.index, CARET.LEFT);
        }
    }
    makeCheckbox(block: IBlock) {
        this.triggerBeforeChange();
        const root = this.getParentOfType(block, BlockType.DocumentBlock);
        const parent = block.relation.parent as AbstractBlock;
        const checkbox = this.createCheckboxBlock();
        this.addBlockBefore(checkbox, block);
        checkbox.blocks.push(block);
        const i = parent.blocks.findIndex(x => x.id == block.id);
        parent.blocks.splice(i, 1);
        checkbox.wrapper.appendChild(block.container);
        updateElement(block.container, {
            style: {
                display: "inline-block"
            }
        });
        this.reindexAncestorDocument(root);
        this.addParentSiblingRelations(checkbox);
        this.addParentSiblingRelations(parent);
    }
    async handleMoveBlockUp(args: IBindingHandlerArgs) {
        const block = args.block;
        this.moveBlockUp(args.block);
        this.setBlockFocus(block);
        if (block.type == BlockType.StandoffEditorBlock) {
            const caret = args.caret as Caret;
            (block as StandoffEditorBlock).setCaret(caret?.right.index, CARET.LEFT);
        }
    }
    moveBlockUp(block: IBlock) {
        this.triggerBeforeChange();
        const root = this.getParentOfType(block, BlockType.DocumentBlock) as DocumentBlock;
        const i = root.index.findIndex(x => x.block.id == block.id);
        if (i <= 0) {
            return;
        }
        let previous = root.index[i-1].block;
        if (block.relation.parent?.type == BlockType.CheckboxBlock) {
            if (previous.relation?.parent.type == BlockType.CheckboxBlock) {
                previous = root.index[i-2].block;
            }
            this.insertBlockBefore(previous, block.relation.parent);
            return;            
        }
        this.insertBlockBefore(previous, block);
    }
    triggerBeforeChange() {
        this.publish(EventType.beforeChange);
    }
    moveBlockDown(block: IBlock) {
        this.triggerBeforeChange();
        const root = this.getParentOfType(block, BlockType.DocumentBlock) as DocumentBlock;
        const i = root.index.findIndex(x => x.block.id == block.id);
        const maxIndex = root.index.length - 1;
        if (i >= maxIndex) {
            return;
        }
        let next = root.index[i+1].block;
        if (block.relation.parent?.type == BlockType.CheckboxBlock) {
            if (next.relation?.parent.type == BlockType.CheckboxBlock) {
                next = root.index[i+2].block;
            }
            this.insertBlockAfter(next, block.relation.parent);
            return;            
        }
        this.insertBlockAfter(next, block);
    }
    removeBlockFrom(parent: AbstractBlock, block: IBlock, skipIndexation?: boolean) {
        const i = parent.blocks.findIndex(x => x.id == block.id);
        parent.blocks.splice(i, 1);
        this.deregisterBlock(block.id);
        if (!skipIndexation) this.reindexAncestorDocument(parent);
    }
    insertBlockAfter(anchor: IBlock, block: IBlock, skipIndexation?: boolean) {
        console.log("insertBlockAfter", { anchor, block, skipIndexation });
        this.registerBlock(block);
        const anchorParent = anchor.relation.parent;
        const parent = block.relation.parent;
        const hasSameParent = anchorParent.id == parent.id;
        if (hasSameParent) {
            const i = this.getIndexOfBlock(block);
            parent.blocks.splice(i, 1);
            const ai = this.getIndexOfBlock(anchor);
            parent.blocks.splice(ai + 1, 0, block);
            anchor.container.insertAdjacentElement("afterend", block.container);
            this.generatePreviousNextRelations(parent);
            if (!skipIndexation) this.reindexAncestorDocument(anchor);
        } else {
            const i = this.getIndexOfBlock(block);
            parent.blocks.splice(i, 1);
            const ai = this.getIndexOfBlock(anchor);
            anchorParent.blocks.splice(ai + 1, 0, block);
            anchor.container.insertAdjacentElement("afterend", block.container);
            if (!skipIndexation) this.reindexAncestorDocument(block);
            block.relation.parent = anchorParent;
            this.generatePreviousNextRelations(parent);
            this.generatePreviousNextRelations(anchorParent);
            if (!skipIndexation) this.reindexAncestorDocument(anchor);
        }
    }
    insertBlockBefore(anchor: IBlock, block: IBlock, skipIndexation?: boolean) {
        console.log("insertBlockBefore", { anchor, block, skipIndexation });
        this.registerBlock(block);
        const anchorParent = anchor.relation.parent;
        const parent = block.relation.parent;
        const hasSameParent = anchorParent.id == parent.id;
        if (hasSameParent) {
            const i = this.getIndexOfBlock(block);
            parent.blocks.splice(i, 1);
            const ai = this.getIndexOfBlock(anchor);
            parent.blocks.splice(ai, 0, block);
            anchor.container.insertAdjacentElement("beforebegin", block.container);
            this.generatePreviousNextRelations(parent);
            if (!skipIndexation) this.reindexAncestorDocument(anchor);
        } else {
            const i = this.getIndexOfBlock(block);
            parent.blocks.splice(i, 1);
            const ai = this.getIndexOfBlock(anchor);
            anchorParent.blocks.splice(ai, 0, block);
            anchor.container.insertAdjacentElement("beforebegin", block.container);
            if (!skipIndexation) this.reindexAncestorDocument(block);
            block.relation.parent = anchorParent;
            this.generatePreviousNextRelations(parent);
            this.generatePreviousNextRelations(anchorParent);
            if (!skipIndexation) this.reindexAncestorDocument(anchor);
        }
    }
    insertBlockAt(parent: IBlock, block: IBlock, atIndex: number, skipIndexation?: boolean) {
        this.triggerBeforeChange();
        console.log("insertBlockAt", { parent, block, atIndex, skipIndexation });
        if (parent.blocks.length == 0) {
            parent.blocks.push(block);
        } else {
            parent.blocks.splice(atIndex, 0, block);
        }
        block.relation.parent = parent;
        this.generatePreviousNextRelations(parent);
        this.registerBlock(block);
        if (!skipIndexation) this.reindexAncestorDocument(block);
    }
    deregisterBlock(id: GUID) {
        const i = this.registeredBlocks.findIndex(x=> x.id == id);
        if (i >= 0) this.registeredBlocks.splice(i, 1);
    }
    deleteBlock(blockId: GUID) {
        this.triggerBeforeChange();
        const block = this.getBlock(blockId) as StandoffEditorBlock;
        const parent = block.relation.parent as AbstractBlock;
        const i = this.getIndexOfBlock(block);
        this.removeBlockAt(parent, i);
        block.destroy();
    }
    generatePreviousNextRelations(parent: IBlock) {
        const len = parent.blocks.length;
        for(let i = 0; i < len; i++) {
            let block = parent.blocks[i];
            if (i > 0) {
                block.relation.previous = parent.blocks[i-1];
                block.relation.previous.relation.next = block;
            }
        }
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
    stageRightMarginBlock(rightMargin: DocumentBlock, mainBlock: IBlock) {
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
    stageLeftMarginBlock(leftMargin: DocumentBlock, mainBlock: IBlock) {
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
        const dto = json.Data.document as IBlockDto;
        this.clearHistory();
        this.loadDocument(dto);
        this.takeSnapshot(dto);
    }
    clearHistory() {
        this.undoStack = [];
        this.redoStack = [];
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
    async buildCheckboxBlock(container: HTMLElement, blockDto: IBlockDto) {
        const todo = this.createCheckboxBlock(blockDto);
        await this.buildChildren(todo, blockDto, (child) => {
            updateElement(child.container, {
                style: {
                    display: "inline-block"
                }
            });
            todo.wrapper.appendChild(child.container);
        });
        container.appendChild(todo.container);
        return todo;
    }
    async buildCheckboxBlock_OLD(container: HTMLElement, blockDto: IBlockDto) {
        const checkboxBlock = this.createCheckboxBlock(blockDto);
        await this.buildChildren(checkboxBlock, blockDto);
        container.appendChild(checkboxBlock.container);
        return checkboxBlock;
    }
    async buildStandoffEditorBlock(container: HTMLElement, blockDto: IBlockDto) {
        const textBlock = this.createStandoffEditorBlock(blockDto);
        textBlock.bind(blockDto as IStandoffEditorBlockDto);
        
        await this.buildChildren(textBlock, blockDto);
        container.appendChild(textBlock.container);
        return textBlock;
    }
    async buildDocumentBlock(container: HTMLElement, blockDto: IBlockDto) {
        const documentBlock = this.createDocumentBlock(blockDto);
        await this.buildChildren(documentBlock, blockDto);
        container.appendChild(documentBlock.container);
        return documentBlock;
    }
    async buildLeftMarginBlock(container: HTMLElement, blockDto: IBlockDto) {
        const leftMargin = this.createLeftMarginBlock(blockDto);
        leftMargin.addBlockProperties([ { type: "block/marginalia/left" } ]);
        leftMargin.applyBlockPropertyStyling();
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
    addBlockTo(parent: IBlock, block: IBlock, skipIndexation?: boolean) {
        this.triggerBeforeChange();
        parent.blocks.push(block);
        this.registerBlock(block);
        this.generatePreviousNextRelations(parent);
        if (!skipIndexation) this.reindexAncestorDocument(parent);
    }
    async buildChildren(parent: AbstractBlock, blockDto: IBlockDto, update?: (b: IBlock) => void) {
        if (blockDto.children) {
            const len = blockDto.children.length;
            for (let i = 0; i < len; i++) {
                let childDto = blockDto.children[i];
                let block = await this.recursivelyBuildBlock(parent.container, childDto) as IBlock;
                block.relation.parent = parent;
                this.addBlockTo(parent, block);
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
        this.addBlockTo(newTab, textBlock);
        this.addBlockTo(row, newTab);
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
                classList: ["list-item-numbered"]
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
    async handleBuildingMarginBlocks(anchor: IBlock, blockDto: IBlockDto) {
        if (blockDto.relation?.leftMargin) {
            const leftMargin = await this.recursivelyBuildBlock(anchor.container, blockDto.relation.leftMargin) as DocumentBlock;
            anchor.relation.leftMargin = leftMargin;
            leftMargin.relation.marginParent = anchor;
            this.stageLeftMarginBlock(leftMargin, anchor);
            leftMargin.generateIndex();
        }
        if (blockDto.relation?.rightMargin) {
            const rightMargin = await this.recursivelyBuildBlock(anchor.container, blockDto.relation.rightMargin) as DocumentBlock;
            anchor.relation.rightMargin = rightMargin;
            rightMargin.relation.marginParent = anchor;
            this.stageRightMarginBlock(rightMargin, anchor);
            rightMargin.generateIndex();
        }
    }
    async recursivelyBuildBlock(container: HTMLElement, blockDto: IBlockDto) {
        if (blockDto.type == BlockType.CheckboxBlock) {
            return await this.buildCheckboxBlock(container, blockDto);
        }
        if (blockDto.type == BlockType.StandoffEditorBlock) {
            return await this.buildStandoffEditorBlock(container, blockDto);
        }
        if (blockDto.type == BlockType.DocumentBlock) {
            return await this.buildDocumentBlock(container, blockDto);
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
            type: BlockType.DocumentBlock,
            children: []
        } as IMainListBlockDto;
        const mainBlock = this.registeredBlocks.find(x => x.type == BlockType.DocumentBlock);
        if (!mainBlock) return dto;
        mainBlock.blocks.forEach(b => {
            let block = b.serialize();
            dto.children?.push(block);
        });
        const block = this.getBlockInFocus();
        if (block) {
            dto.metadata = dto.metadata || {};
            dto.metadata.focus = {
                blockId: block.id
            };
            if (block.type == BlockType.StandoffEditorBlock) {
                dto.metadata.focus.caret = (block as StandoffEditorBlock).getCaret()?.right?.index;
            }
        }
        return dto;
    }
    async loadDocument(dto: IMainListBlockDto) {
        if (dto.type != BlockType.DocumentBlock && dto.type != BlockType.BlockManagerBlock) {
            console.error("Expected doc.type to be a MainListBlock");
            return;
        }
        this.state = DocumentState.loading;
        
        if (this.container.childNodes.length) {
            this.container.innerHTML = "";
        }
        if (this.blocks.length) {
            this.blocks = [];
            this.registeredBlocks = [];
        }
        this.id = dto.id || uuidv4();
        const container = document.createElement("DIV") as HTMLElement;
        const documentBlock = this.createDocumentBlock();
        this.addBlockTo(this, documentBlock, true);
        documentBlock.bind(dto);
        if (dto.children) {
            const len = dto.children.length;
            for (let i = 0; i <= len - 1; i++) {
                let block = await this.recursivelyBuildBlock(container, dto.children[i]) as IBlock;
                await this.handleBuildingMarginBlocks(block, dto.children[i]);
                this.addBlockTo(documentBlock, block, true);
                block.relation.parent = documentBlock;
                if (i > 0) {
                    let previous = documentBlock.blocks[i - 1];
                    previous.relation.next = block;
                    block.relation.previous = previous;
                }
            }
        }
        this.addParentSiblingRelations(documentBlock);
        container.appendChild(documentBlock.container);
        this.container.appendChild(container);

        documentBlock.generateIndex();

        if (dto?.metadata?.focus?.blockId) {
            const block = this.getBlock(dto.metadata.focus.blockId);
            this.setBlockFocus(block);
            if (dto.metadata.focus.caret) {
                (block as StandoffEditorBlock)?.setCaret(dto.metadata.focus.caret, CARET.LEFT);
            }
        } else {
            const textBlock = this.registeredBlocks.find(x => x.type == BlockType.StandoffEditorBlock) as StandoffEditorBlock;
            if (textBlock) {
                this.setBlockFocus(textBlock);
                textBlock.moveCaretStart();
            }
        }

        this.state = DocumentState.loaded;
    }
    minimalTimeElapsedSinceLastChange() {
        if (this.state == DocumentState.loading) {
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
    insertItem<T>(list: T[], index: number, item: T) {
        list.splice(index, 0, item);
    }
    addPreviousBlock(newBlock: IBlock, sibling: IBlock) {
        sibling.container.insertAdjacentElement("beforebegin", newBlock.container);
        const previous = sibling.relation.previous;
        if (previous) {
            previous.relation.next = newBlock;
            newBlock.relation.previous = previous;
        }
        newBlock.relation.next = sibling;
        sibling.relation.previous = newBlock;
        //const parent = this.getParent(sibling) as IBlock;
        const parent = sibling.relation.parent;
        const si = this.getIndexOfBlock(sibling);
        if (si > 0) {
            this.insertBlockAt(parent, newBlock, si);
        } else {
            this.insertBlockAt(parent, newBlock, 0);
            parent.relation.firstChild = sibling;
            //sibling.relation.parent = parent;
        }
    }
    addBlockBefore(newBlock: IBlock, anchor: IBlock) {
        this.triggerBeforeChange();
        console.log("addBlockBefore", { newBlock, anchor });
        anchor.container.insertAdjacentElement('beforebegin', newBlock.container);
        const parent = anchor.relation.parent;
        if (!parent) {
            console.log("addBlockBefore", { message: "Expected to find a parent block of @anchor", anchor, newBlock });
            return;
        }
        const ai = this.getIndexOfBlock(anchor);
        this.insertBlockAt(parent, newBlock, ai);
    }
    addBlockAfter(newBlock: IBlock, anchor: IBlock) {
        this.triggerBeforeChange();
        console.log("addBlockAfter", { newBlock, anchor });
        anchor.container.insertAdjacentElement("afterend", newBlock.container);
        const parent = anchor.relation.parent;
        if (!parent) {
            console.log("addBlockAfter", { message: "Expected to find a parent block of @anchor", anchor, newBlock });
            return;
        }
        const ai = this.getIndexOfBlock(anchor);
        this.insertBlockAt(parent, newBlock, ai + 1);
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
                this.addBlockTo(cell, textBlock);
                this.addBlockTo(row, cell);
                cell.container.appendChild(textBlock.container);
                row.container.appendChild(cell.container);
            }
            this.addBlockTo(table, row);
            table.container.appendChild(row.container);
        }
        this.generatePreviousNextRelations(table);
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
                this.addBlockTo(cellBlock, textBlock);
                this.addBlockTo(rowBlock, cellBlock);
                cellBlock.container.appendChild(textBlock.container);
                rowBlock.container.appendChild(cellBlock.container);
            }
            this.addBlockTo(gridBlock, rowBlock);
            gridBlock.container.appendChild(rowBlock.container);
        }
        this.generatePreviousNextRelations(gridBlock);
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
    createDocumentBlock(dto?: IBlockDto) {
        const blockSchemas = this.getBlockSchemas();
        const block = new DocumentBlock({
            manager: this
        });
        if (dto?.metadata) block.metadata = dto.metadata;
        block.setBlockSchemas(blockSchemas);
        if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        block.applyBlockPropertyStyling();
        return block;
    }
    createIndentedListBlock(dto?: IBlockDto) {
        const blockSchemas = this.getBlockSchemas();
        const block = new IndentedListBlock({
            manager: this
        });
        if (dto?.metadata) block.metadata = dto.metadata;
        block.setBlockSchemas(blockSchemas);
        if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        block.applyBlockPropertyStyling();
        return block;
    }
    createTabBlock(dto?: IBlockDto){
        const blockSchemas = this.getBlockSchemas();
        const inputEvents = this.getTabBlockEvents();
        const block = new TabBlock({
            manager: this
        });
        block.inputEvents = inputEvents;
        if (dto?.metadata) block.metadata = dto.metadata;
        block.setBlockSchemas(blockSchemas);
        if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        block.applyBlockPropertyStyling();
        return block;
    }
    createGridCellBlock(dto?: IBlockDto) {
        const blockSchemas = this.getBlockSchemas();
        const block = new GridCellBlock({
            manager: this,
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
        this.addBlockTo(this, block);
        return block;
    }
    createGridRowBlock(dto?: IBlockDto) {
        const blockSchemas = this.getBlockSchemas();
        const block = new GridRowBlock({
            manager: this,
            id: dto?.id
        });
        if (dto?.metadata) block.metadata = dto.metadata;
        block.setBlockSchemas(blockSchemas);
        if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        block.applyBlockPropertyStyling();
        this.addBlockTo(this, block);
        return block;
    }
    createPlainTextBlock(dto?: IPlainTextBlockDto) {
        const blockSchemas = this.getBlockSchemas();
        const events = this.getPlainTextInputEvents();
        const block = new PlainTextBlock({
            manager: this,
            id: dto?.id
        });
        if (dto?.metadata) block.metadata = dto.metadata;
        block.setBlockSchemas(blockSchemas);
        block.setEvents(events);
        if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        block.applyBlockPropertyStyling();
        this.addBlockTo(this, block);
        return block;
    }
    createTableBlock(dto?: IBlockDto) {
        const blockSchemas = this.getBlockSchemas();
        const block = new TableBlock({
            manager: this,
            id: dto?.id
        });
        if (dto?.metadata) block.metadata = dto.metadata;
        block.setBlockSchemas(blockSchemas);
        if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        block.applyBlockPropertyStyling();
        this.addBlockTo(this, block);
        return block;
    }
    createTableRowBlock(dto?: IBlockDto) {
        const blockSchemas = this.getBlockSchemas();
        const block = new TableRowBlock({
            manager: this,
            id: dto?.id
        });
        if (dto?.metadata) block.metadata = dto.metadata;
        block.setBlockSchemas(blockSchemas);
        if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        block.applyBlockPropertyStyling();
        this.addBlockTo(this, block);
        return block;
    }
    createTableCellBlock(dto?: IBlockDto) {
        const blockSchemas = this.getBlockSchemas();
        const block = new TableCellBlock({
            manager: this,
            id: dto?.id
        });
        if (dto?.metadata) block.metadata = dto.metadata;
        block.setBlockSchemas(blockSchemas);
        if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        block.applyBlockPropertyStyling();
        this.addBlockTo(this, block);
        return block;
    }
    createGridBlock(dto?: IBlockDto) {
        const blockSchemas = this.getBlockSchemas();
        const block = new GridBlock({
            manager: this,
            id: dto?.id
        });
        if (dto?.metadata) block.metadata = dto.metadata;
        block.setBlockSchemas(blockSchemas);
        if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        block.applyBlockPropertyStyling();
        this.addBlockTo(this, block);
        return block;
    }
    createTabRowBlock(dto?: IBlockDto) {
        const blockSchemas = this.getBlockSchemas();
        const inputEvents = this.getTabBlockEvents();
        const block = new TabRowBlock({
            manager: this
        });
        if (dto?.metadata) block.metadata = dto.metadata;
        block.inputEvents = inputEvents;
        block.setBlockSchemas(blockSchemas);
        if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        block.applyBlockPropertyStyling();
        return block;
    }
    createLeftMarginBlock(dto?: IBlockDto) {
        const blockSchemas = this.getBlockSchemas();
        const block = new DocumentBlock({
            manager: this
        });
        if (dto?.metadata) block.metadata = dto.metadata;
        block.setBlockSchemas(blockSchemas);
        block.addBlockProperties([ { type: "block/marginalia/left" } ]);
        if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        block.applyBlockPropertyStyling();
        return block;
    }
    createEmbedDocumentBlock(dto?: IBlockDto) {
        const blockSchemas = this.getBlockSchemas();
        const block = new EmbedDocumentBlock({
            manager: this
        });
        if (dto?.metadata) block.metadata = dto.metadata;
        block.setBlockSchemas(blockSchemas);
        if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        block.applyBlockPropertyStyling();
        this.addBlockTo(this, block);
        return block;
    }
    createIFrameBlock(dto?: IBlockDto) {
        const blockSchemas = this.getBlockSchemas();
        const block = new IframeBlock({
            manager: this
        });
        if (dto?.metadata) block.metadata = dto.metadata;
        block.setBlockSchemas(blockSchemas);
        if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        block.applyBlockPropertyStyling();
        this.addBlockTo(this, block);
        return block;
    }
    createVideoBlock(dto?: IBlockDto) {
        const blockSchemas = this.getBlockSchemas();
        const block = new VideoBlock({
            manager: this
        });
        if (dto?.metadata) block.metadata = dto.metadata;
        block.setBlockSchemas(blockSchemas);
        if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        block.applyBlockPropertyStyling();
        this.addBlockTo(this, block);
        return block;
    }
    createImageBlock(dto?: IBlockDto) {
        const blockSchemas = this.getImageBlockSchemas();
        const inputEvents = this.getImageBlockEvents();
        const block = new ImageBlock({
            manager: this
        });
        block.inputEvents = inputEvents;
        if (dto?.metadata) block.metadata = dto.metadata;
        block.setBlockSchemas(blockSchemas);
        if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        block.applyBlockPropertyStyling();
        this.addBlockTo(this, block);
        return block;
    }
    createRightMarginBlock(dto?: IBlockDto) {
        const blockSchemas = this.getBlockSchemas();
        const block = new DocumentBlock({
            manager: this
        });
        if (dto?.metadata) block.metadata = dto.metadata;
        block.setBlockSchemas(blockSchemas);
        block.addBlockProperties([ { type: "block/marginalia/right" } ]);
        if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        block.applyBlockPropertyStyling();
        this.addBlockTo(this, block);
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
            type: BlockType.DocumentBlock,
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
    addImageBlock(anchor: IBlock, url: string) {        
        const image = this.createImageBlock({
            type: BlockType.ImageBlock,
            metadata: {
                url: url
            }
        }) as ImageBlock;
        image.build();
        this.addBlockAfter(image, anchor);
        return image;
    }
    addVideoBlock(anchor: IBlock, url: string) {
        const video = this.createVideoBlock({
            type: BlockType.VideoBlock,
            metadata: {
                url: url
            }
        }) as VideoBlock;
        video.build();
        this.addBlockAfter(video, anchor);
    }
    addIFrameBlock(anchor: IBlock, url: string) {
        const iframe = this.createIFrameBlock({
            type: BlockType.IFrameBlock,
            metadata: {
                url: url
            }
        }) as IframeBlock;
        iframe.build();
        this.addBlockAfter(iframe, anchor);
    }
    createCheckboxBlock(dto?: IBlockDto) {
        const block = new CheckboxBlock({ manager: this, ...dto });
        return block;
    }
    createStandoffEditorBlock(dto?: IBlockDto) {
        const standoffSchemas = this.getStandoffSchemas();
        const blockSchemas = this.getBlockSchemas();
        const standoffEvents = this.getStandoffPropertyEvents();
        const textBlock = new StandoffEditorBlock({
            id: dto?.id,
            manager: this
        });
        textBlock.setSchemas(standoffSchemas);
        textBlock.setBlockSchemas(blockSchemas);
        textBlock.setEvents(standoffEvents);
        textBlock.setCommitHandler(this.storeCommit.bind(this));
        if (dto?.metadata) textBlock.metadata = dto.metadata;
        if (dto?.blockProperties) textBlock.addBlockProperties(dto.blockProperties);
        textBlock.applyBlockPropertyStyling();
        return textBlock;
    }
    async handleEnterKey(args: IBindingHandlerArgs) {
        const caret = args.caret as Caret;
        const block = args.block as StandoffEditorBlock;
        if (block.type != BlockType.StandoffEditorBlock) {
            const blockData = block.serialize();
            const newBlock = this.createStandoffEditorBlock();
            newBlock.relation.parent = block.relation.parent;
            newBlock.addBlockProperties(blockData.blockProperties || []);
            newBlock.applyBlockPropertyStyling();
            newBlock.addEOL();
            this.addBlockAfter(newBlock, block);
            this.setBlockFocus(newBlock);
            newBlock.moveCaretStart();
            return;
        }
        const textBlock = block as StandoffEditorBlock;
        const atStart = caret.left == null;
        const atEnd = caret.right.isEOL;
        const isInside = !atStart && !atEnd;
        if (isInside) {
            const ci = caret.left?.index as number;
            const split = this.splitBlock(textBlock.id, ci + 1);
            this.setBlockFocus(split);
            split.moveCaretStart();
            return;
        }
        const newBlock = this.createStandoffEditorBlock();
        const blockData = textBlock.serialize();
        newBlock.relation.parent = block.relation.parent;
        newBlock.addBlockProperties(blockData.blockProperties || []);
        newBlock.applyBlockPropertyStyling();
        newBlock.addEOL();
        if (atStart) {
            this.addPreviousBlock(newBlock, textBlock);
            this.setBlockFocus(textBlock);
            block.moveCaretStart();
        } else if (atEnd) {
            this.addBlockAfter(newBlock, textBlock);
            this.setBlockFocus(newBlock);
            newBlock.moveCaretStart();
        }
        const list = this.getParentOfType(block, BlockType.IndentedListBlock);
        if (list) {
            updateElement(newBlock.container, {
                classList: ["list-item-numbered"]
            });
        }
    }
    async deindentBlock(args: IBindingHandlerArgs) {
        /**
         * Rules:
         * - If the parent of the block is not a IndentedListBlock, ignore.
         * - If block is not the first item, ignore.
         * 
         * Outcome:
         * - Move the current block from 'first child' to 'next' of the parent block.
         * - Update the links between the children of the new parent
         */
        const block = args.block as StandoffEditorBlock;
        const listParent = block.relation.parent;
        if (listParent.type != BlockType.IndentedListBlock) {
            return;
        }
        if (block.id != listParent.blocks[0].id) {
            return;
        }
        const parent = listParent.relation.parent;
        this.insertBlockAfter(parent, block);
        if (block.metadata.indentLevel) {
            block.metadata.indentLevel--;
        }
        this.renderIndent(block);
        this.reindexAncestorDocument(parent);
    }
    async indentBlock(args: IBindingHandlerArgs) {
        const block = args.block as StandoffEditorBlock;
        const parent = block.relation.parent;
        if (parent.blocks[0].id == block.id && parent.type == BlockType.IndentedListBlock) {
            /**
             * Quit if this is the first child of another block.
             */
            console.log("handleTabKey", { error: "Cannot indent the first item in a list.", block, parent });
            return;
        }
        const list = this.createIndentedListBlock();
        const previous = block.relation.previous;
        if (!previous) {
            console.log("handleTabKey", { error: "Expected to find a previous block." })
            return;
        }
        this.addBlockTo(list, block);
        this.addBlockTo(parent, list);
        const firstListParent = this.getParentOfType(block, BlockType.IndentedListBlock) as IndentedListBlock;
        const level = firstListParent?.metadata.indentLevel || 0 as number;
        list.metadata.indentLevel = level + 1;
        list.container.appendChild(block.container);
        updateElement(list.container, {
            classList: ["list-item-numbered"]
        });
        previous.container.appendChild(list.container);
        this.renderIndent(list);
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
    async handleFind(args: IBindingHandlerArgs) {
        const source = args.block as StandoffEditorBlock;
        const findReplace = new FindReplaceBlock({ manager: this, source });
        const node = await findReplace.render();
        const selection = source.getSelection() as ISelection;
        const caret = args.caret as Caret;
        const top = selection
            ? selection.start.cache.offset.y + selection.start.cache.offset.h + 10
            : caret.right.cache.offset.y + caret.right.cache.offset.h + 10;
        const left = selection
            ? selection.start.cache.offset.x
            : caret.right.cache.offset.x;
        updateElement(node, {
            style: {
                top: top + "px",
                left: left + "px"
            },
            classList: [passoverClass]
        });
        findReplace.container.appendChild(node);
        source.container.appendChild(findReplace.container);
        this.registerBlock(findReplace);
        this.setBlockFocus(findReplace);
    }
    async setupControlPanel() {
        const panel = new ControlPanelBlock({ manager: this });
        const node = await panel.render() as HTMLElement;
        panel.container.appendChild(node);
        document.body.appendChild(panel.container);
        this.registerBlock(panel);
        this.setBlockFocus(panel);
        panel.setFocus();
    }
    async loadAnnotationMenu(args: IBindingHandlerArgs) {
        const self = this;
        const block = args.block as StandoffEditorBlock;
        const caret = args.caret as Caret;
        let selection = block.getSelection() as ISelection;
        if (!selection) {
            const word = block.getWordAtIndex(caret.right.index);
            if (!word) return;
            selection = { start: block.cells[word.start], end: block.cells[word.end], direction: DIRECTION.RIGHT } as ISelection;
        }
        block.addStandoffPropertiesDto([{
            type: "codex/search/highlight", start: selection.start.index, end: selection.end.index, clientOnly: true
        }]);
        block.applyStandoffPropertyStyling();
        block.clearSelection();
        const panel = new AnnotationPanelBlock({
            source: block,
            selection,
            events: {
                onClose: () => {
                    self.deregisterBlock(panel.id);
                    block.removeStandoffPropertiesByType("codex/search/highlight");
                    block.manager?.setBlockFocus(block);
                    block.setCaret(block.lastCaret.index, block.lastCaret.offset);
                }
            }
        });
        const node = await panel.render();
        const top = 0;
        const left = caret.right.cache.offset.x - 10;
        updateElement(node, {
            style: {
                top: top + "px",
                left: left + "px"
            },
            classList: [passoverClass]
        });
        panel.container.appendChild(node);
        block.container.appendChild(panel.container);
        this.registerBlock(panel);
        this.setBlockFocus(panel);
    }
    async applyEntityReferenceToText(args: IBindingHandlerArgs) {
        const self = this;
        const block = args.block as StandoffEditorBlock;
        const caret = args.caret as Caret;
        let selection = block.getSelection() as ISelection;
        if (!selection) {
            const word = block.getWordAtIndex(caret.right.index);
            if (!word) return;
            selection = { start: block.cells[word.start], end: block.cells[word.end], direction: DIRECTION.RIGHT } as ISelection;
        }
        block.addStandoffPropertiesDto([{
            type: "codex/search/highlight", start: selection.start.index, end: selection.end.index, clientOnly: true
        }]);
        block.applyStandoffPropertyStyling();
        const searchBlock = new SearchEntitiesBlock({
            source: block,
            selection,
            onClose: async (search: SearchEntitiesBlock) => {
                let block = search.source;
                block.removeStandoffPropertiesByType("codex/search/highlight");
                block.manager?.setBlockFocus(block);
                block.setCaret(block.lastCaret.index, block.lastCaret.offset);
            },
            onBulkSubmit: async (item: any, matches: FindMatch[]) => {
                if (matches.length == 0) {
                    matches.push({ start: selection.start.index, block, end: selection.end.index, match: "" });
                }
                const rows = _.groupBy(matches, m => m.block.id);
                _.each(rows, (items) => {
                    let block = items[0].block;
                    let props = items.map(m => ({
                        type: "codex/entity-reference",
                        value: item.Value,
                        start: m.start,
                        end: m.end,
                    }));
                    block.addStandoffPropertiesDto(props);
                    block.removeStandoffPropertiesByType("codex/search/highlight");
                    block.applyStandoffPropertyStyling();
                });
                // matches.forEach(m => {
                //     let prop = {
                //         type: "codex/entity-reference",
                //         value: item.Value,
                //         start: m.start,
                //         end: m.end,
                //     };
                //     m.block.addStandoffPropertiesDto([prop]);
                //     m.block.removeStandoffPropertiesByType("codex/search/highlight");
                //     m.block.applyStandoffPropertyStyling();
                // })
            }
        });
        const node = await searchBlock.render();
        const top = 0;
        const left = caret.right.cache.offset.x - 10;
        updateElement(node, {
            style: {
                top: top + "px",
                left: left + "px"
            },
            classList: [passoverClass]
        });
        searchBlock.container.appendChild(node);
        block.container.appendChild(searchBlock.container);
        this.registerBlock(searchBlock);
        this.setBlockFocus(searchBlock);
        block.removeFocus();
        searchBlock.setFocus();
    }
    async updateEntityReferencesGraph(filename: string) {
        const self = this;
        const textBlocks = this.registeredBlocks
            .filter(x => x.type == BlockType.StandoffEditorBlock)
            .map(x => x.serialize() as unknown as StandoffEditorBlockDto);
        const data = textBlocks.map(x => ({
            document: {
                id: self.id,
                filename: filename
            },
            standoffProperties: x.standoffProperties
                .filter(p => p.type == "codex/entity-reference" )
                .map(p => ({
                    id: uuidv4(),
                    documentId: self.id,
                    blockId: x.id,
                    type: "StandoffProperty",
                    name: "codex/entity-reference",
                    start: p.start,
                    end: p.end,
                    value: p.value,
                    text: p.text
                }))
        }));
        console.log({ data });

        const res = await fetch("api/graph/update-entity-references", {
            headers: { "Content-Type": "application/json" },
            method: "POST",
            body: JSON.stringify(data)
        });
        const json = await res.json();
        if (!json.Success) return;
    }
    getHighestZIndex() {
        return ++this.highestZIndex;
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
        const parent = this.getParent(block) as AbstractBlock;
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
        const i = this.getIndexOfBlock(block);
        this.removeBlockAt(parent, i);
        this.insertBlockAt(parent, grid, i);
        this.appendSibling(block.container, grid.container);
        cell2.container.append(block.container);
    }
    getIndexOfBlockById(id: GUID) {
        const block = this.getBlock(id);
        const parent = this.getParent(block) as IBlock;
        if (!parent) {
            console.log("getIndexOfBlockById", { msg: "Expected to find a parent block.", block });
            return -1;
        }
        return parent.blocks.findIndex(x => x.id == block.id) as number;
    }
    getIndexOfBlock(block: IBlock) {
        //const parent = this.getParent(block) as IBlock;
        const parent = block.relation.parent;
        if (!parent) {
            console.log("getIndexOfBlock", { msg: "Expected to find a parent block.", block });
            return -1;
        }
        return parent.blocks.findIndex(x => x.id == block.id) as number;
    }
    addImageRight(block: IBlock, url: string) {
        const parent = this.getParent(block) as AbstractBlock;
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
        const i = this.getIndexOfBlock(block);
        this.removeBlockAt(parent, i, true);
        this.insertBlockAt(parent, grid, i);
        this.appendSibling(block.container, grid.container);
        cell1.container.append(block.container);
    }
    mergeBlocks(sourceId: GUID, targetId: GUID) {
        this.triggerBeforeChange();
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
        console.log("splitBlock", { blockId, ci });
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
        secondBlock.relation.parent = block.relation.parent;
        secondBlock.bind({
            type: BlockType.StandoffEditorBlock,
            text: second,
            blockProperties: block.blockProperties.map(x=> x.serialize()),
            standoffProperties: secondProps
        });
        this.addBlockAfter(secondBlock, block);
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
        //document.body.focus();
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
            // image.addBlockProperties([
            //     {
            //         type: "block/size",
            //         metadata: {
            //             height: dimensions.height,
            //             width: dimensions.width
            //         }
            //     } as BlockPropertyDto
            // ]);
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
            .map((x:any) => {
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
            this.addBlockAfter(newBlock, currentBlock);
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
        args.block.handleArrowUp({ manager: this });
    }
    async moveCaretDown(args: IBindingHandlerArgs) {
        args.block.handleArrowDown({ manager: this });
    }
    async moveCaretRight(args: IBindingHandlerArgs) {
        args.block.handleArrowRight({ manager: this });
    }
    async moveCaretLeft(args: IBindingHandlerArgs) {
        args.block.handleArrowLeft({ manager: this });
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
        this.addBlockAfter(manager, sibling);
        this.addParentSiblingRelations(parent);
        this.setBlockFocus(manager.blocks[0]);
    }
    addCodeMirrorBlock(sibling: IBlock) {
        const parent = this.getParent(sibling) as AbstractBlock;
        const cm = this.createCodeMirrorBlock();
        this.addParentSiblingRelations(parent);
        this.addBlockAfter(cm, sibling);
        this.setBlockFocus(cm);
        return cm;
    }
    createCodeMirrorBlock(dto?: ICodeMirrorBlockDto) {
        const block = new CodeMirrorBlock({
            manager: this,
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
        const i = this.getIndexOfBlock(block);
        this.removeBlockAt(this, i);
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
        const caret = args.caret as Caret;
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
        const caret = args.caret as Caret;
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
    removeBlockAt(parent: AbstractBlock, atIndex: number, skipIndexation?: boolean) {
        this.triggerBeforeChange();
        const block = parent.blocks[atIndex];
        parent.blocks.splice(atIndex, 1);
        this.generatePreviousNextRelations(parent);
        this.deregisterBlock(block.id);
        if (!skipIndexation) this.reindexAncestorDocument(block);
    }
    reindexAncestorDocument(descendant: IBlock) {
        const root = this.getParentOfType(descendant, BlockType.DocumentBlock) as DocumentBlock;
        if (root) {
            root.generateIndex();
        }
    }
    async handleCreateLeftMargin(args: IBindingHandlerArgs){
        const block = args.block as StandoffEditorBlock;
        const manager = block.manager as BlockManager;
        let leftMargin = block.relation.leftMargin as DocumentBlock;
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
            this.addBlockTo(leftMargin, child);
            this.registerBlock(leftMargin);
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
    registerBlock(block: IBlock) {
        if (this.registeredBlocks.findIndex(x=> x.id == block.id) >= 0) {
            return;
        }
        this.registeredBlocks.push(block);
    }
    async handleCreateRightMargin(args: IBindingHandlerArgs){
        const block = args.block as StandoffEditorBlock;
        const manager = block.manager as BlockManager;
        let rightMargin = block.relation.rightMargin as DocumentBlock;
        /**
         * If there is no LeftMarginBlock already then create one and add
         * a StandoffEditorBlock to it.
         */
        if (!rightMargin) {
            rightMargin = manager.createRightMarginBlock();
            this.registerBlock(rightMargin);
            const child = manager.createStandoffEditorBlock();
            child.addEOL();
            child.addBlockProperties([ { type: "block/alignment/left" }, { type: "block/font/size/three-quarters" } ]);
            child.applyBlockPropertyStyling();
            rightMargin.relation.marginParent = block;
            block.relation.rightMargin = rightMargin;
            rightMargin.relation.firstChild = child;
            child.relation.parent = rightMargin;
            this.addBlockTo(rightMargin, child);
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
        const parent = this.getParent(block) as AbstractBlock;
        const bi = parent.blocks.findIndex(x=> x.id == block.id);
        //parent.blocks.splice(bi, 1);
        this.removeBlockAt(parent, bi);
        this.addBlockTo(tab, block);
        this.addBlockTo(tabRow, tab);
        this.insertBlockAt(parent, tabRow, bi);
        //parent.blocks.splice(bi, 0, tabRow);
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
        const self = block.manager as BlockManager;
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


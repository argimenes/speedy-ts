import axios from 'axios';
import { createRainbow, createUnderline, drawAnimatedSelection, drawClippedRectangle, drawSpikySelection, updateElement } from "./library/svg";
import { v4 as uuidv4 } from 'uuid';
import { DocumentBlock } from "./blocks/document-block";
import { IndentedListBlock } from "./blocks/indented-list-block";
import { TabBlock, TabRowBlock } from "./blocks/tabs-block";
import { GridBlock, GridCellBlock, GridRowBlock } from "./blocks/grid-block";
import { ImageBlock } from "./blocks/image-block";
import { VideoBlock } from "./blocks/video-block";
import { IframeBlock } from "./blocks/iframe-block";
import { BlockProperty } from "./library/block-property";
import { StandoffEditorBlock } from "./blocks/standoff-editor-block";
import { StandoffProperty } from "./library/standoff-property";
import { IUniverseBlock,InputEvent, BlockType, IBlock, IBlockSelection, Commit, IUniverseBlockConstructor as IUniverseBlockConstructor, InputEventSource, IBindingHandlerArgs, IBatchRelateArgs, Command, CARET, RowPosition, IRange, Word, DIRECTION, ISelection, IStandoffPropertySchema, GUID, IBlockDto, IStandoffEditorBlockDto, IMainListBlockDto, PointerDirection, Platform, TPlatformKey, IPlainTextBlockDto, ICodeMirrorBlockDto, IEmbedDocumentBlockDto, IPlugin, Caret, StandoffPropertyDto,  FindMatch, StandoffEditorBlockDto, BlockState, EventType, passoverClass, isStr, DocumentHistory } from "./library/types";
import { PlainTextBlock } from "./blocks/plain-text-block";
import { ClockPlugin } from "./library/plugins/clock";
import { EmbedDocumentBlock } from "./blocks/embed-document-block";
import { fetchGet } from "./library/common";
import { TableBlock, TableCellBlock, TableRowBlock } from './blocks/tables-blocks';
import { ControlPanelBlock } from './components/control-panel';
import _ from 'underscore';
import { EntitiesListBlock } from './components/entities-list';
import { WindowBlock } from './blocks/window-block';
import { AbstractBlock } from './blocks/abstract-block';
import { CheckboxBlock } from './blocks/checkbox-block';
import { CodeMirrorBlock } from './blocks/code-mirror-block';
import { WorkspaceBlock } from './blocks/workspace-block';
import { DocumentWindowBlock } from './blocks/document-window-block';
import { ImageBackgroundBlock } from './blocks/image-background-block';

export class UniverseBlock extends AbstractBlock implements IUniverseBlock {
    lastFocus?: IBlock;
    focus?: IBlock;
    selections: IBlockSelection[];
    commits: Commit[];
    pointer: number;
    direction: PointerDirection;
    plugins: IPlugin[];
    highestZIndex: number;
    clipboard: Record<string, any>[];
    registeredBlocks: IBlock[];
    state: string;
    history: Record<string, DocumentHistory>;
    constructor(props?: IUniverseBlockConstructor) {
        super({ id: props?.id, container: props?.container });
        this.state = BlockState.initalising;
        this.id = props?.id || uuidv4();
        this.type = BlockType.UniverseBlock;
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
        this.highestZIndex = 0;
        this.plugins = [];
        this.clipboard = [];
        this.manager = this;
        this.history = {};
        this.registeredBlocks = [this];
        this.attachEventBindings();
        this.setupControlPanel();
        this.blockEvents = {};
        this.state = BlockState.initalised;
    }
    async destroyAll() {
        await this.registeredBlocks.forEach(async (x: any) => {
            if (x.destroy && !x.destroyAsync) { 
                //x.destroy();
                return;
            }
            if (x.destroyAsync) {
                await x.destroyAsync();
            }
        });
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
        const blocks = this.getAncestors(parentBlock);
        console.log("handleMouseInputEvents", { blocks })
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
        const blocks = this.getAncestors(focusedBlock);
        console.log("handleKeyboardInputEvents", { blocks })
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
                let block = this.getBlock(command.id) as UniverseBlock;
                block.createStandoffEditorBlock();
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
        const win = this.getParentOfType(block, BlockType.WindowBlock);
        if (win) {
            console.log({ win, container: win.container });
            updateElement(win.container, {
                style: {
                    "z-index": this.getHighestZIndex()
                }
            });
        }
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
                        const manager = block.manager as UniverseBlock;
                        manager.setBlockFocus(block);
                    }
                }
            }
        ]
        return events;
    }
    getBlockManagerEvents() {
        const events: InputEvent[] = [
            
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
    getAncestors(block: IBlock) {
        const list = [block];
        let current = block;
        while (current) {
            let parent = current.relation.parent;
            if (parent) {
                list.push(parent);
            }
            current = parent;
        }
        return list;
    }
    getAllStandoffPropertiesByType(type: string) {
        const blocks = this.registeredBlocks
            .filter(x => x.type == BlockType.StandoffEditorBlock) as StandoffEditorBlock[];
        const props: StandoffProperty[] = [];
        blocks.forEach(b => {
            if (!b.standoffProperties.length) return;
            const entities = b.standoffProperties.filter(x => x.type == type);
            if (!entities) return;
            props.push(...entities);
        });
        return props;
    }
    async getEntities() {
        const props = this.getAllStandoffPropertiesByType("codex/entity-reference");
        const ids = _.unique(props.map(x => x.value)).join(",");
        const res = await fetch('/api/getEntitiesJson', {
            method: 'POST',
            body: JSON.stringify({ ids }),
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const json = await res.json();
        if (!json.Success) return [];
        return json.Data.entities;
    }
    findNearestWord(index: number, words: Word[]) {
        const lastIndex = words.length - 1;
        for (let i = lastIndex; i >= 0; i--) {
            let word = words[i];
            if (index >= word.start) return word;
        }
        return null;
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
                        const manager = new UniverseBlock();
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
                type: "style/superscript",
                name: "Superscript",
                decorate: {
                    cssClass: "style_superscript"
                }
            },
            {
                type: "style/subscript",
                name: "Subscript",
                decorate: {
                    cssClass: "style_subscript"
                }
            },
            {
                type: "style/uppercase",
                name: "Uppercase",
                decorate: {
                    cssClass: "style_uppercase"
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
                        const owner = args.block.manager as UniverseBlock;
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
                        const owner = args.block.manager as UniverseBlock;
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
                        const owner = args.block.manager as UniverseBlock;
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
                        const owner = args.block.manager as UniverseBlock;
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
                        const owner = args.block.manager as UniverseBlock;
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
                        const owner = args.block.manager as UniverseBlock;
                        owner.renderUnderlines("codex/entity-reference", args.properties, args.block, "purple", 1);
                    }
                }
            },
            {
                type: "style/highlighter",
                name: "Highlighter",
                render: {
                    destroy: ({ properties }) => {
                        properties.forEach(p => p.cache.highlight?.remove())
                    },
                    update: (args) => {
                        const manager = args.block.manager as UniverseBlock;
                        manager.renderHighlight(args.properties, args.block, "yellow");
                    }
                }
            },
            {
                type: "style/rainbow",
                name: "Rainbow",
                render: {
                    destroy: ({ properties }) => {
                        properties.forEach(p => p.cache.underline?.remove())
                    },
                    update: (args) => {
                        const manager = args.block.manager as UniverseBlock;
                        manager.renderRainbow("style/rainbow", args.properties, args.block);
                    }
                }
            },
            {
                type: "style/rectangle",
                name: "Rectangle",
                render: {
                    destroy: ({ properties }) => {
                        properties.forEach(p => p.cache.highlight?.remove())
                    },
                    update: (args) => {
                        const manager = args.block.manager as UniverseBlock;
                        manager.renderRectangle(args.properties, args.block, "red");
                    }
                }
            },
            {
                type: "style/spiky",
                name: "Spiky",
                render: {
                    destroy: ({ properties }) => {
                        properties.forEach(p => p.cache.highlight?.remove())
                    },
                    update: (args) => {
                        const manager = args.block.manager as UniverseBlock;
                        manager.renderSpiky(args.properties, args.block, "red");
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
    renderSpiky(properties: StandoffProperty[], block: StandoffEditorBlock, colour: string) {
        const highlights = properties.map(p => {
            return drawSpikySelection(p, {
                stroke: colour || "red",
                strokeWidth: "3"
            });
        }) as SVGElement[];
        const frag = document.createDocumentFragment();
        frag.append(...highlights);
        block.wrapper.appendChild(frag);
    }
    renderRectangle(properties: StandoffProperty[], block: StandoffEditorBlock, colour: string) {
        const highlights = properties.map(p => {
            return drawAnimatedSelection(p, {
                stroke: colour || "red",
                strokeWidth: "3"
            });
        }) as SVGElement[];
        const frag = document.createDocumentFragment();
        frag.append(...highlights);
        block.wrapper.appendChild(frag);
    }
    renderHighlight(properties: StandoffProperty[], block: StandoffEditorBlock, colour: string) {
        const highlights = properties.map(p => {
            return drawClippedRectangle(p, {
                fill: colour || "yellow"
            });
        }) as SVGElement[];
        const frag = document.createDocumentFragment();
        frag.append(...highlights);
        block.wrapper.appendChild(frag);
    }
    renderRainbow(type: string, properties: StandoffProperty[], block: StandoffEditorBlock) {
        const cw = block.cache?.offset?.w || block.container.offsetWidth;
        const underlines = properties.map(p => {
            if (p.cache.offsetY == -1) {
                const overlaps = block.getEnclosingPropertiesBetweenIndexes(p.start.index, p.end.index);
                const existingLines = overlaps
                    .filter(x => x.id != p.id && typeof x.cache?.offsetY != "undefined");
                const highestY = (_.max(existingLines, x => x.cache.offsetY) as StandoffProperty).cache?.offsetY;
                if (existingLines.length == 0) {
                    p.cache.offsetY = 0;
                } else {
                    p.cache.offsetY = highestY >= 0 ? highestY + 2 : 0;
                }
            }
            return createRainbow(p, {
                containerWidth: cw,
                offsetY: p.cache.offsetY
            });
        }) as SVGElement[];
        const frag = document.createDocumentFragment();
        frag.append(...underlines);
        block.wrapper.appendChild(frag);
    }
    renderUnderlines(type: string, properties: StandoffProperty[], block: StandoffEditorBlock, colour: string, offsetY: number) {
        const cw = block.cache?.offset?.w || block.container.offsetWidth;
        const underlines = properties.map(p => {
            if (p.cache.offsetY == -1) {
                const overlaps = block.getEnclosingPropertiesBetweenIndexes(p.start.index, p.end.index);
                const existingLines = overlaps
                    .filter(x => x.id != p.id && typeof x.cache?.offsetY != "undefined");
                const highestY = (_.max(existingLines, x => x.cache.offsetY) as StandoffProperty).cache?.offsetY;
                if (existingLines.length == 0) {
                    p.cache.offsetY = 0;
                } else {
                    p.cache.offsetY = highestY >= 0 ? highestY + 2 : 0;
                }
            }
            return createUnderline(p, {
                stroke: colour,
                containerWidth: cw,
                offsetY: p.cache.offsetY
            });
        }) as SVGElement[];
        const frag = document.createDocumentFragment();
        frag.append(...underlines);
        block.wrapper.appendChild(frag);
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
    async loadEntitiesList(args: IBindingHandlerArgs) {
        const block = args.block as StandoffEditorBlock;
        const component = new EntitiesListBlock({
            manager: this,
            source: block
        });
        const node = await component.render();
        updateElement(node, {
            style: {
                position: "fixed",
                top: "20px",
                left: "20px",
                width: "250px",
                "max-height": "720px",
                height: "auto",
                "overflow-y": "auto",
                "overflow-x": "hidden",
                "z-index": this.getHighestZIndex()
            },
            parent: document.body
        });
        block.removeFocus();
        this.registerBlock(component);
        this.setBlockFocus(component);
        component.setFocus();
    }
    removeBlockFrom(parent: AbstractBlock, block: IBlock, skipIndexation?: boolean) {
        const i = parent.blocks.findIndex(x => x.id == block.id);
        parent.blocks.splice(i, 1);
        this.deregisterBlock(block.id);
        /**
         * We should also deregister all child blocks ...
         */
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
    deregisterBlock(id: GUID) {
        const i = this.registeredBlocks.findIndex(x=> x.id == id);
        if (i >= 0) this.registeredBlocks.splice(i, 1);
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
                //position: "relative"
            }
        });
        // updateElement(rightMargin.container, {
        //     style: {
        //         position: "absolute",
        //         top: 0,
        //         width: "200px",
        //         "max-width": "200px",
        //         right: "-250px"
        //     }
        // });
        const hand = document.createElement("SPAN") as HTMLSpanElement;
        hand.innerHTML = "☜";
        updateElement(hand, {
            style: {
                "font-size": "2rem",
                position: "absolute",
                top: "0",
                left: "0"
            }
        });
        rightMargin.container.appendChild(hand);
    }
    stageLeftMarginBlock(leftMargin: DocumentBlock, mainBlock: IBlock) {
        updateElement(mainBlock.container, {
            style: {
                //position: "relative"
            }
        });
        // updateElement(leftMargin.container, {
        //     style: {
        //         position: "absolute",
        //         top: 0,
        //         width: "200px",
        //         "max-width": "200px",
        //         left: "-250px",
        //     }
        // });
        const hand = document.createElement("SPAN") as HTMLSpanElement;
        hand.innerHTML = "☞";
        updateElement(hand, {
            style: {
                "font-size": "2rem",
                position: "absolute",
                top: "0px",
                right: "0px"
            }
        });
        leftMargin.container.appendChild(hand);
    }
    async listFolders() {
        const res = await fetch("/api/listFolders");
        const json = await res.json();
        return json.folders as string[];
    }
    async listDocuments(folder: string = ".") {
        const res = await fetchGet("/api/listDocuments", { folder });
        const json = await res.json();
        return json.files as string[];
    }
    async listTemplates() {
        const res = await fetchGet("/api/listDocuments", { folder: "templates" });
        const json = await res.json();
        return json.files as string[];
    }
    async loadServerTemplate(filename: string, folder: string = "templates") {
        const res = await fetchGet("/api/loadDocumentJson", { folder, filename });
        const json = await res.json();
        console.log("loadServerTemplate", { filename, json });
        if (!json.Success) {
            return;
        }
        this.loadDocument(json.Data.document);
    }
    async loadServerDocument(filename: string, folder: string = ".") {
        const res = await fetchGet("/api/loadDocumentJson", { filename, folder });
        const json = await res.json();
        console.log("loadServerDocument", { filename, folder, json });
        if (!json.Success) {
            return;
        }
        const dto = json.Data.document as IBlockDto;
        dto.metadata = { ...this.metadata, filename, folder };
        const doc = await this.addDocumentToWorkspace(dto);
        const entities = await this.getEntities();
        const props = this.getAllStandoffPropertiesByType("codex/entity-reference");
        props.forEach(p => {
            let entity = entities.find(e => e.Guid == p.value);
            if (!entity) return;
            p.cache.entity = entity;
        });
        
    }
    async saveServerDocument(filename: string, folder: string = ".") {
        const focus = this.getBlockInFocus();
        const docRoot = this.getParentOfType(focus, BlockType.DocumentBlock);
        const dto = docRoot.serialize();
        if (!filename) return;
        const res = await fetch("/api/saveDocumentJson", {
            headers: { "Content-Type": "application/json" },
            method: "POST",
            body: JSON.stringify({
                folder: folder,
                filename: filename,
                document: dto
            })
        });
        const json = await res.json();
        if (!json.Success) {
            return;
        }
    }
    async buildWorkspaceBlock(container: HTMLElement, blockDto: IBlockDto) {
        const workspace = this.createWorkspaceBlock(blockDto);
        await this.buildChildren(workspace, blockDto);
        container.appendChild(workspace.container);
        return workspace;
    }
    async buildImageBackgroundBlock(container: HTMLElement, blockDto: IBlockDto) {
        const bg = this.createImageBackgroundBlock(blockDto);
        await this.buildChildren(bg, blockDto, (child) => {
            bg.container.appendChild(child.container);
        });
        container.appendChild(bg.container);
        return bg;
    }
    async buildDocumentWindowBlock(container: HTMLElement, blockDto: IBlockDto) {
        const wind = this.createDocumentWindowBlock(blockDto);
        await this.buildChildren(wind, blockDto, (child) => {
            wind.container.appendChild(child.container);
        });
        container.appendChild(wind.container);
        return wind;
    }
    async buildWindowBlock(container: HTMLElement, blockDto: IBlockDto) {
        const wind = this.createWindowBlock(blockDto);
        await this.buildChildren(wind, blockDto, (child) => {
            // updateElement(child.container, {
            //     style: {
            //         display: "inline-block"
            //     }
            // });
            wind.container.appendChild(child.container);
        });
        container.appendChild(wind.container);
        return wind;
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
            const manager = new UniverseBlock();
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
    addBlockTo(parent: AbstractBlock, block: IBlock, skipIndexation?: boolean) {
        parent.blocks.push(block);
        this.registerBlock(block);
        this.addParentSiblingRelations(parent);
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
        if (blockDto.type == BlockType.DocumentBlock) {
            return await this.buildDocumentBlock(container, blockDto);
        }
        if (blockDto.type == BlockType.WorkspaceBlock) {
            return await this.buildWorkspaceBlock(container, blockDto);
        }
        if (blockDto.type == BlockType.ImageBackgroundBlock) {
            return await this.buildImageBackgroundBlock(container, blockDto);
        }
        if (blockDto.type == BlockType.DocumentWindowBlock) {
            return await this.buildDocumentWindowBlock(container, blockDto);
        }
        if (blockDto.type == BlockType.WindowBlock) {
            return await this.buildWindowBlock(container, blockDto);
        }
        if (blockDto.type == BlockType.CheckboxBlock) {
            return await this.buildCheckboxBlock(container, blockDto);
        }
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
    async loadWindow(dto: IBlockDto) {
        this.state = BlockState.loading;
        
        if (this.container.childNodes.length) {
            this.container.innerHTML = "";
        }
        if (this.blocks.length) {
            this.blocks = [];
            this.registeredBlocks = [];
        }
        const container = document.createElement("DIV") as HTMLElement;
        const windowBlock = this.createWindowBlock();
        this.addBlockTo(this, windowBlock, true);
        await this.loadDocument(dto.children[0]);
        this.container = windowBlock.container;
    }
    clearWorkspace() {
        if (this.container.childNodes.length) {
            this.container.innerHTML = "";
        }
        if (this.blocks.length) {
            this.blocks = [];
            this.registeredBlocks = [];
        }
    }
    setDocumentFocus(doc: DocumentBlock) {
        if (doc.metadata?.focus?.blockId) {
            const block = this.getBlock(doc.metadata.focus.blockId);
            this.setBlockFocus(block);
            if (doc.metadata.focus.caret) {
                (block as StandoffEditorBlock)?.setCaret(doc.metadata.focus.caret, CARET.LEFT);
            }
        } else {
            const textBlock = this.registeredBlocks.find(x => x.type == BlockType.StandoffEditorBlock) as StandoffEditorBlock;
            if (textBlock) {
                this.setBlockFocus(textBlock);
                textBlock.moveCaretStart();
            }
        }
    }
    async createWorkspace() {
        const dto = {
            type: BlockType.WorkspaceBlock,
            children: [
                {
                    type: BlockType.ImageBackgroundBlock,
                    metadata: {
                        url: "https://upload.wikimedia.org/wikipedia/commons/c/c5/Aurora_borealis_above_Lyngenfjorden%2C_2012_March_%28cropped%29.jpg"
                    }
                }
            ]
        };
        const container = document.createElement("DIV") as HTMLDivElement;
        const workspace = await this.recursivelyBuildBlock(container, dto) as WorkspaceBlock;
        this.container.appendChild(workspace.container);
        this.addBlockTo(this, workspace);
        this.addParentSiblingRelations(workspace);
        return workspace;
    }
    async addDocumentToWorkspace(dto: IMainListBlockDto) {
        const container = document.createElement("DIV") as HTMLDivElement;
        const win = await this.recursivelyBuildBlock(container, {
            type: BlockType.DocumentWindowBlock,
            metadata: {
                title: dto.metadata?.filename
            }
        }) as WindowBlock;
        const doc = await this.recursivelyBuildBlock(win.container, dto) as DocumentBlock;
        const workspace = this.registeredBlocks.find(x => x.type == BlockType.WorkspaceBlock) as AbstractBlock;
        const background = workspace.blocks[0];
        const count = this.registeredBlocks.filter(x => x.type == BlockType.DocumentWindowBlock).length;
        const buffer = count * 20;
        this.addBlockTo(win, doc);
        this.addBlockTo(background as AbstractBlock, win);
        updateElement(doc.container, {
            classList: ["document-container"]
        });
        updateElement(win.container, {
            style: {
                position: "absolute",
                top: buffer + 20 + "px",
                left: 100 + buffer + "px",
                "z-index": this.getHighestZIndex(),
                backgroundColor: "#efefef",
            }
        });
        workspace.container.appendChild(win.container);
        this.addParentSiblingRelations(win);
        this.addParentSiblingRelations(workspace);
        doc.generateIndex();
        doc.setFocus();
        this.takeSnapshot(doc.id);
        return doc;
    }
    takeSnapshot(id: string) {
        const block = this.getBlock(id);
        let dto = block.serialize();
        let history = this.history[id];
        if (!history) {
            this.history[id] = {
                id,
                undoStack: [dto],
                redoStack: [],
                lastChange: Date.now()
            };
            return;
        }
        const len = history.undoStack.length;
        if (len == 30) {
            history.undoStack.shift();
        }
        history.undoStack.push(dto);
    }
    async loadDocument(dto: IMainListBlockDto, container?: HTMLDivElement) {
        if (dto.type != BlockType.DocumentBlock) {
            console.error("Expected doc.type to be BlockType.DocumentBlock.");
            return;
        }
        container = container || document.createElement("DIV") as HTMLDivElement;
        const doc = await this.recursivelyBuildBlock(container, dto) as DocumentBlock;
        doc.generateIndex();
        doc.setFocus();
    }
    insertItem<T>(list: T[], index: number, item: T) {
        list.splice(index, 0, item);
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
        const block = new DocumentBlock({
            manager: this
        });
        if (dto?.metadata) block.metadata = dto.metadata;
        if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        block.applyBlockPropertyStyling();
        updateElement(block.container, { classList: ["document-container"] });
        return block;
    }
    createIndentedListBlock(dto?: IBlockDto) {
        const block = new IndentedListBlock({
            manager: this
        });
        if (dto?.metadata) block.metadata = dto.metadata;
        if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        block.applyBlockPropertyStyling();
        return block;
    }
    createTabBlock(dto?: IBlockDto){
        const inputEvents = this.getTabBlockEvents();
        const block = new TabBlock({
            manager: this
        });
        block.inputEvents = inputEvents;
        if (dto?.metadata) block.metadata = dto.metadata;
        if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        block.applyBlockPropertyStyling();
        return block;
    }
    createGridCellBlock(dto?: IBlockDto) {
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
                "vertical-align": "top"
            }
        });
        if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        block.applyBlockPropertyStyling();
        this.addBlockTo(this, block);
        return block;
    }
    createGridRowBlock(dto?: IBlockDto) {
        const block = new GridRowBlock({
            manager: this,
            id: dto?.id
        });
        if (dto?.metadata) block.metadata = dto.metadata;
        if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        block.applyBlockPropertyStyling();
        this.addBlockTo(this, block);
        return block;
    }
    createPlainTextBlock(dto?: IPlainTextBlockDto) {
        const events = this.getPlainTextInputEvents();
        const block = new PlainTextBlock({
            manager: this,
            id: dto?.id
        });
        if (dto?.metadata) block.metadata = dto.metadata;
        block.setEvents(events);
        if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        block.applyBlockPropertyStyling();
        this.addBlockTo(this, block);
        return block;
    }
    createTableBlock(dto?: IBlockDto) {
        const block = new TableBlock({
            manager: this,
            id: dto?.id
        });
        if (dto?.metadata) block.metadata = dto.metadata;
        if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        block.applyBlockPropertyStyling();
        this.addBlockTo(this, block);
        return block;
    }
    createTableRowBlock(dto?: IBlockDto) {
        const block = new TableRowBlock({
            manager: this,
            id: dto?.id
        });
        if (dto?.metadata) block.metadata = dto.metadata;
        if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        block.applyBlockPropertyStyling();
        this.addBlockTo(this, block);
        return block;
    }
    createTableCellBlock(dto?: IBlockDto) {
        const block = new TableCellBlock({
            manager: this,
            id: dto?.id
        });
        if (dto?.metadata) block.metadata = dto.metadata;
        if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        block.applyBlockPropertyStyling();
        this.addBlockTo(this, block);
        return block;
    }
    createGridBlock(dto?: IBlockDto) {
        const block = new GridBlock({
            manager: this,
            id: dto?.id
        });
        if (dto?.metadata) block.metadata = dto.metadata;
        if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        block.applyBlockPropertyStyling();
        this.addBlockTo(this, block);
        return block;
    }
    createTabRowBlock(dto?: IBlockDto) {
        const inputEvents = this.getTabBlockEvents();
        const block = new TabRowBlock({
            manager: this
        });
        if (dto?.metadata) block.metadata = dto.metadata;
        block.inputEvents = inputEvents;
        if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        block.applyBlockPropertyStyling();
        return block;
    }
    createLeftMarginBlock(dto?: IBlockDto) {
        const block = new DocumentBlock({
            manager: this
        });
        if (dto?.metadata) block.metadata = dto.metadata;
        block.addBlockProperties([ { type: "block/marginalia/left" } ]);
        if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        block.applyBlockPropertyStyling();
        return block;
    }
    createEmbedDocumentBlock(dto?: IBlockDto) {
        const block = new EmbedDocumentBlock({
            manager: this
        });
        if (dto?.metadata) block.metadata = dto.metadata;
        if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        block.applyBlockPropertyStyling();
        this.addBlockTo(this, block);
        return block;
    }
    createIFrameBlock(dto?: IBlockDto) {
        const block = new IframeBlock({
            manager: this
        });
        if (dto?.metadata) block.metadata = dto.metadata;
        if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        block.applyBlockPropertyStyling();
        this.addBlockTo(this, block);
        return block;
    }
    createVideoBlock(dto?: IBlockDto) {
        const block = new VideoBlock({
            manager: this
        });
        if (dto?.metadata) block.metadata = dto.metadata;
        if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        block.applyBlockPropertyStyling();
        this.addBlockTo(this, block);
        return block;
    }
    createImageBlock(dto?: IBlockDto) {
        const blockSchemas = this.getImageBlockSchemas();
        const block = new ImageBlock({
            manager: this
        });
        if (dto?.metadata) block.metadata = dto.metadata;
        block.setBlockSchemas(blockSchemas);
        if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        block.applyBlockPropertyStyling();
        this.addBlockTo(this, block);
        return block;
    }
    createRightMarginBlock(dto?: IBlockDto) {
        const block = new DocumentBlock({
            manager: this
        });
        if (dto?.metadata) block.metadata = dto.metadata;
        block.addBlockProperties([ { type: "block/marginalia/right" }, { type: "block/alignment/right" } ]);
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
    createWorkspaceBlock(dto?: IBlockDto) {
        const block = new WorkspaceBlock({ ...dto });
        return block;
    }
    createImageBackgroundBlock(dto?: IBlockDto) {
        const block = new ImageBackgroundBlock({ manager: this, ...dto });
        return block;
    }
    createDocumentWindowBlock(dto?: IBlockDto) {
        const block = new DocumentWindowBlock({ manager: this, ...dto });
        return block;
    }
    createWindowBlock(dto?: IBlockDto) {
        const block = new WindowBlock({ manager: this, ...dto });
        return block;
    }
    createCheckboxBlock(dto?: IBlockDto) {
        const block = new CheckboxBlock({ manager: this, ...dto });
        return block;
    }
    createStandoffEditorBlock(dto?: IBlockDto) {
        const standoffSchemas = this.getStandoffSchemas();
        const textBlock = new StandoffEditorBlock({
            id: dto?.id,
            manager: this
        });
        textBlock.setSchemas(standoffSchemas);
        textBlock.setCommitHandler(this.storeCommit.bind(this));
        if (dto?.metadata) textBlock.metadata = dto.metadata;
        if (dto?.blockProperties) textBlock.addBlockProperties(dto.blockProperties);
        textBlock.applyBlockPropertyStyling();
        return textBlock;
    }
    async applyImageBackgroundToBlock(args: IBindingHandlerArgs) {
        const block = args.block as StandoffEditorBlock;
        block.addBlockProperties([{ type: "block/background/image" }]);
        block.applyBlockPropertyStyling();
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
    applyStandoffProperty(block: StandoffEditorBlock, type: string) {
        const selection = block.getSelection();
        if (selection) {
            block.createStandoffProperty(type, selection);
        } else {
            // TBC
        }  
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
    undoHistory(id: string) {
        const history = this.history[id];
        const last = history.undoStack.pop();
        if (!last) return;
        if (history.redoStack.length == 30) {
            history.redoStack.shift();
        }
        const block = this.getBlock(id);
        const dto = block.serialize();
        history.redoStack.push(last);
        history.redoStack.push(dto);
        return last;
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
    createCodeMirrorBlock(dto?: ICodeMirrorBlockDto) {
        const block = new CodeMirrorBlock({
            manager: this,
            type: BlockType.CodeMirrorBlock,
            text: dto?.text || ""
        });
        return block;
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
    reindexAncestorDocument(descendant: IBlock) {
        const root = this.getParentOfType(descendant, BlockType.DocumentBlock) as DocumentBlock;
        if (root) {
            root.generateIndex();
        }
    }
    registerBlock(block: IBlock) {
        if (this.registeredBlocks.findIndex(x=> x.id == block.id) >= 0) {
            return;
        }
        this.registeredBlocks.push(block);
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
    appendSibling(anchor: HTMLElement, sibling: HTMLElement) {
        anchor.insertAdjacentElement("afterend", sibling);
    }
    startNewDocument() {
        
    }
}


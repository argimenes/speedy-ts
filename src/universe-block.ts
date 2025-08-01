import axios from 'axios';
import { updateElement } from "./library/svg";
import { v4 as uuidv4 } from 'uuid';
import { PageBlock } from "./blocks/page-block";
import { IndentedListBlock } from "./blocks/indented-list-block";
import { TabBlock, TabRowBlock } from "./blocks/tabs-block";
import { GridBlock, GridCellBlock, GridRowBlock } from "./blocks/grid-block";
import { ImageBlock } from "./blocks/image-block";
import { YouTubeVideoBlock } from "./blocks/youtube-video-block";
import { IframeBlock } from "./blocks/iframe-block";
import { BlockProperty } from "./library/block-property";
import { StandoffEditorBlock } from "./blocks/standoff-editor-block";
import { IUniverseBlock,InputEvent, BlockType, IBlock, IBlockSelection, Commit, IUniverseBlockConstructor as IUniverseBlockConstructor, InputEventSource, IBindingHandlerArgs, IBatchRelateArgs, Command, CARET, RowPosition, IRange, Word, DIRECTION, ISelection, IStandoffPropertySchema, GUID, IBlockDto, IStandoffEditorBlockDto, IMainListBlockDto, PointerDirection, Platform, TPlatformKey, IPlainTextBlockDto, ICodeMirrorBlockDto, IEmbedDocumentBlockDto, IPlugin, Caret, StandoffPropertyDto,  FindMatch, StandoffEditorBlockDto, BlockState, EventType, passoverClass, isStr, DocumentHistory, IMenuButtonBindingHandlerArgs, BlockPropertyDto } from "./library/types";
import { PlainTextBlock } from "./blocks/plain-text-block";
import { EmbedDocumentBlock } from "./blocks/embed-document-block";
import { fetchGet, flattenTree } from "./library/common";
import { TableBlock, TableCellBlock, TableRowBlock } from './blocks/tables-blocks';
import { ControlPanelBlock } from './components/control-panel';
import _ from 'underscore';
import { EntitiesListBlock } from './blocks/entities-list-block';
import { WindowBlock } from './blocks/window-block';
import { AbstractBlock } from './blocks/abstract-block';
import { CheckboxBlock } from './blocks/checkbox-block';
import { CodeMirrorBlock } from './blocks/code-mirror-block';
import { WorkspaceBlock } from './blocks/workspace-block';
import { DocumentWindowBlock } from './blocks/document-window-block';
import { ImageBackgroundBlock } from './blocks/image-background-block';
import { VideoBackgroundBlock } from './blocks/video-background-block';
import { UnknownBlock } from './blocks/unknown-block';
import { ErrorBlock } from './blocks/error-block';
import { CanvasBackgroundBlock } from './blocks/canvas-background-block';
import { BlockMenuBlock } from './components/block-menu';
import { posix } from 'path';
import { CanvasBlock } from './blocks/canvas-block';
import { DocumentTabBlock, DocumentTabRowBlock } from './blocks/document-tabs-block';
import { MembraneBlock } from './blocks/membrane-block';

export type BlockBuilder =
    (container: HTMLElement, dto: IBlockDto, manager: UniverseBlock) => Promise<IBlock>;

export class UniverseBlock extends AbstractBlock implements IUniverseBlock {
    lastFocus?: IBlock;
    focus?: IBlock;
    selections: GUID[];
    commits: Commit[];
    pointer: number;
    direction: PointerDirection;
    plugins: IPlugin[];
    highestZIndex: number;
    clipboard: Record<string, any>[];
    registeredBlocks: IBlock[];
    state: string;
    history: Record<string, DocumentHistory>;
    blockBuilders: { type: BlockType, builder: BlockBuilder }[];
    constructor(props?: IUniverseBlockConstructor) {
        super({ manager: null, id: props?.id, container: props?.container });
        this.state = BlockState.initalising;
        this.id = props?.id || uuidv4();
        this.type = BlockType.UniverseBlock;
        this.container = props?.container || document.createElement("DIV") as HTMLElement;
        this.blocks = [];
        this.metadata = {
            defaultFolder: "uploads"    
        };
        this.relation = {};
        this.selections = [];
        this.commits = [];
        this.pointer = 0;
        this.direction = PointerDirection.Undo;
        this.blockProperties= [];
        this.blockSchemas=[];
        this.inputEvents = this.getInputEvents();
        this.inputActions = [];
        this.modes = ["global","default"];
        this.highestZIndex = 0;
        this.plugins = [];
        this.clipboard = [];
        this.manager = this;
        this.history = {};
        this.registeredBlocks = [this];
        this.attachEventBindings();
        //this.setupControlPanel();
        this.blockEvents = {};
        this.state = BlockState.initalised;
        this.blockBuilders = [];
    }
    addBlockBuilders(items: { type: BlockType, builder: BlockBuilder }[]) {
        const self = this;
        items.forEach(item => self.addBlockBuilder(item));
    }
    addBlockBuilder(item: { type: BlockType, builder: BlockBuilder }) {
        this.blockBuilders.push(item);
    }
    setFolder(folder: string) {
        this.metadata.folder = folder;
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
        return this;
    }
    destroy() {
        this.registeredBlocks = [];
        this.history = {};
        this.blocks = [];
        this.inputEvents = [];
        this.inputActions = [];
        this.blockProperties = [];
        this.blockSchemas = [];
        this.modes = [];
        this.selections = [];
        this.container.remove();
    }
    findNearestBlockByElement(el: HTMLElement) {
        let current = el;
        while (current) {
            let match = this.registeredBlocks.find(x=> x.container == current);
            if (match) return match;
            current = current.parentElement as HTMLElement;
        }
        return null;
        /**
            const blockId = el.closest('[data-block-id]')?.dataset.blockId;
            const match = this.registeredBlocks.find(x=> x.id == blockId);
            return match;
         */
    }
    async handleMouseInputEvents(e: MouseEvent) {
        console.log("handleMouseInputEvents", { manager: this, e });
        if (!this.container.contains(e.target as HTMLElement)) {
            return;
        }

        const blockEl = (e.target as HTMLElement).closest("[data-client-id]") as HTMLElement | null;
        if (blockEl) {
            console.log("block-id from DOM:", blockEl.dataset.blockId);
            console.log("client-id from DOM:", blockEl.dataset.clientId);
            console.log("block DOM is inside active tab?", !!blockEl.closest(".tab.active"));
        }

        const parentBlock = this.findNearestBlockByElement(e.target as HTMLElement);
        if (!parentBlock) {
            console.log("Could not find a container parent.")
            return;
        }
        if ((parentBlock as AbstractBlock).suppressEventHandlers) {
            console.log("Skipping this block.")
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
            const match = (b as any).getFirstMatchingInputEvent(input, InputEventSource.Mouse);
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
            console.log("handleKeyboardInputEvents", {
                message: "Input received from outside of @focusedBlock",
                focusedBlock,
                target: e.target,
                targetElementBlockId: e.target.dataset.blockId,
                targetElementBlockType: e.target.dataset.blockType,
                registeredBlocks: this.registeredBlocks
            });
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
    getWorkspace() {
        return this.blocks[0] as WorkspaceBlock;
    }
    getBackground() {
        return this.blocks[0].blocks[0] as AbstractBlock;
    }
    deactivateBlockSelection(blockId: GUID) {
        const block = this.getBlock(blockId);
        block.container.classList.remove("block-selection");
    }
    activateBlockSelection(blockId: GUID) {
        const block = this.getBlock(blockId);
        block.container.classList.add("block-selection");
    }
    hasSelections() {
        return this.selections?.length > 0;
    }
    toggleBlockSelection(blockId: GUID) {
        if (this.selections.some(x => x == blockId)) {
            this.selections = this.selections.filter(x => x != blockId);
            this.deactivateBlockSelection(blockId);
            return;
        }
        this.selections.push(blockId);
        this.activateBlockSelection(blockId);
    }
    deleteSelections() {
        const self = this;
        this.selections.forEach(id => {
            let block = self.getBlock(id);
            block.destroy();
        });
        this.selections = [];
    }
    async attachEventBindings() {
        document.body.addEventListener("keydown", this.handleKeyboardInputEvents.bind(this));
        document.body.addEventListener("keydown", this.handleOnTextChanged.bind(this));
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
    async handleOnTextChanged(e: ClipboardEvent) {
        await this.handleCustomEvent(e, InputEventSource.Custom, "onTextChanged", false);
    }
    async handleCustomEvent(e: Event, source: InputEventSource, match: string, preventDefault: boolean = true) {
        const ALLOW = true, FORBID = false;
        const focusedBlock = this.getBlockFromElement(e.target as HTMLElement);
        if (!focusedBlock) {
            console.error("handleCustomEvent", { e, source, match, preventDefault });
            return;
        }
        // const focusedBlock = this.getBlockInFocus() as StandoffEditorBlock;
        const blocks = this.getAncestors(focusedBlock);
        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i] as StandoffEditorBlock;
            const isStandoffBlock = focusedBlock.type == BlockType.StandoffEditorBlock;
            const customEvents = block.inputEvents.filter(x => x.trigger.source == source);
            const found = customEvents.find(x => x.trigger.match == match);
            if (found) {
                if (preventDefault) e.preventDefault();
                if (isStandoffBlock) {
                    const tb = focusedBlock as StandoffEditorBlock;
                    const caret = tb.getCaret() as Caret;
                    const selection = tb.getSelection() as IRange;
                    await found.action.handler({ block: focusedBlock, caret, e, selection });
                } else {
                    await found.action.handler({ block: focusedBlock, e });
                }
                return FORBID;
            }
        }
        return ALLOW;
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
    setFocus() {
        this.container.focus();
    }
    setBlockFocus(block: IBlock, skipLoop?: boolean) {
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
        if (!skipLoop) block.setFocus();
    }
    // getImageBlockSchemas() {
    //     const self = this;
    //     return [
    //         {
    //             type: "block/position",
    //             name: "Block position",
    //             event: {
    //                 onInit: (p: BlockProperty) => {
    //                     const container = p.block.container;
    //                     const {x, y, position } = p.metadata;
    //                     updateElement(container, {
    //                         style: {
    //                             position: position || "absolute",
    //                             left: x + "px",
    //                             top: y + "px",
    //                             "z-index": self.getHighestZIndex()
    //                         }
    //                     });
    //                 }
    //             }
    //         },
            
    //         {
    //             type: "block/size",
    //             name: "Block size",
    //             event: {
    //                 onInit: (p: BlockProperty) => {
    //                     const container = p.block.container;
    //                     const {width, height} = p.metadata;
    //                     updateElement(container, {
    //                         style: {
    //                             height: isStr(height) ? height : height + "px",
    //                             width: isStr(width) ? width : width + "px"
    //                         }
    //                     });
    //                 }
    //             }
    //         }
    //     ]
    // }
    
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
    getDocumentTabBlockEvents() {
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
    getInputEvents() {
        const _this = this;
        const events: InputEvent[] = [
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Custom,
                    match: "contextmenu"
                },
                action: {
                    name: "Context Menu.",
                    description: "",
                    handler: async (args: IBindingHandlerArgs) => {
                        const block = args.block;
                        const manager = block.manager as UniverseBlock;
                        manager.loadBlockMenu(args);
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: ["Mac:Meta-1","Win:Control-1"]
                },
                action: {
                    name: "Save workspace",
                    description: `
                        
                    `,
                    handler: async (args) => {
                        _this.saveWorkspace();
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: ["Mac:Meta-2","Win:Control-2"]
                },
                action: {
                    name: "Load workspace",
                    description: `
                        
                    `,
                    handler: async (args) => {
                        await _this.loadWorkspace();
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
        list.push(this);
        return list;
    }
    switchBackground(original: AbstractBlock, replacement: AbstractBlock) {
        original.replaceWith(replacement);
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
            children: this.blocks.map(x => x.serialize())
        } as IBlockDto                                                                           
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
    storeCommit(commit: Commit) {        
        this.commits.push(commit);
        this.pointer++;
    }
    stageRightMarginBlock(rightMargin: PageBlock, mainBlock: IBlock) {
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
                top: "0",
                left: "0"
            }
        });
        rightMargin.container.appendChild(hand);
    }
    stageLeftMarginBlock(leftMargin: PageBlock, mainBlock: IBlock) {
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
    async listWorkspaces() {
        const res = await fetchGet("/api/listWorkspaces", { folder: "workspaces" });
        const json = await res.json();
        return json.workspaces as string[];
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
        let dto = json.Data.document as IBlockDto;
        if (dto.type != BlockType.MembraneBlock) {
            dto = {
                type: BlockType.MembraneBlock,
                metadata: {
                    filename,
                    folder
                },
                children: [dto]
            };
        }
        await this.addMembraneToDocumentWindow(dto);
    }
    turnRightRotateBlockProperty() {
        const block = this.getBlockInFocus();
        if (!block) {
            return;
        }
        const amt = 90;
        const rotate = block.blockProperties?.find(x => x.type == "block/rotate");
        if (rotate) {
            const value = parseInt(rotate.value);
            let newValue = value + amt;
            if (newValue > 360) {
                newValue = amt;
            }
            rotate.value = newValue + "";
            block.applyBlockPropertyStyling();
            return;
        }
        const type = {
            type: "block/rotate",
            value: amt+"",
        } as BlockPropertyDto;
        block.addBlockProperties([type]);
        block.applyBlockPropertyStyling();
    }
    addOrDecreaseIndentBlockProperty() {
        const tb = this.getBlockInFocus() as StandoffEditorBlock;
        if (tb.type != BlockType.StandoffEditorBlock) {
            return;
        }
        const indent = tb.blockProperties?.find(x => x.type == "block/indent");
        if (indent) {
            const value = parseInt(indent.value);
            const newValue = value - 1;
            indent.value = newValue + "";
            tb.applyBlockPropertyStyling();
            tb.updateView();
            return;
        }
        const type = {
            type: "block/indent",
            value: "0",
        } as BlockPropertyDto;
        tb.addBlockProperties([type]);
        tb.applyBlockPropertyStyling();
        tb.updateView();
    }
    clearFormatting() {
        const tb = this.getBlockInFocus() as StandoffEditorBlock;
        if (tb.type != BlockType.StandoffEditorBlock) {
            return;
        }
        tb.blockProperties.forEach(p => tb.removeBlockProperty(p));
        tb.standoffProperties.forEach(sp => sp.destroy());
        tb.updateView();
    }
    addOrEditBlockStyle(type:string, value?: string) {
        const tb = this.getBlockInFocus() as StandoffEditorBlock;
        if (tb.type != BlockType.StandoffEditorBlock) {
            return;
        }
        const blockProp = tb.blockProperties?.find(x => x.type == type);
        if (blockProp) {
            blockProp.value = value;
            blockProp.applyStyling();
        } else {
            tb.addBlockProperties([{ type, value }]);
            tb.applyBlockPropertyStyling();
        }
        tb.updateView();
    }
    applyStyle(type: string) {
        const tb = this.getBlockInFocus() as StandoffEditorBlock;
        if (tb.type != BlockType.StandoffEditorBlock) {
            return;
        }
        this.applyStandoffProperty(tb, type);
    }
    turnLeftRotateBlockProperty() {
        const block = this.getBlockInFocus();
        if (!block) {
            return;
        }
        const amt = 90;
        const rotate = block.blockProperties?.find(x => x.type == "block/rotate");
        if (rotate) {
            const value = parseInt(rotate.value);
            let newValue = value - amt;
            if (newValue < 0) {
                newValue = 360 - amt;
            }
            rotate.value = newValue + "";
            block.applyBlockPropertyStyling();
            return;
        }
        const type = {
            type: "block/rotate",
            value: "-" + amt,
        } as BlockPropertyDto;
        block.addBlockProperties([type]);
        block.applyBlockPropertyStyling();
    }
    addOrIncreaseIndentBlockProperty() {
        const tb = this.getBlockInFocus() as StandoffEditorBlock;
        if (tb.type != BlockType.StandoffEditorBlock) {
            return;
        }
        const indent = tb.blockProperties?.find(x => x.type == "block/indent");
        if (indent) {
            indent.value = (parseInt(indent.value) + 1) + "";
            tb.applyBlockPropertyStyling();
            tb.updateView();
            return;
        }
        const type = {
            type: "block/indent",
            value: "1",
        } as BlockPropertyDto;
        tb.addBlockProperties([type]);
        tb.applyBlockPropertyStyling();
        tb.updateView();
    }
    async saveServerDocument(blockId: string, filename: string, folder: string) {
        const block = this.getBlock(blockId) as AbstractBlock;
        const dto = block.serialize();
        folder = folder || this.metadata.defaultFolder;
        const now = new Date();
        const suffix = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()} ${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}`;
        filename = filename || `Untitled - ${suffix}.json`;
        const win = this.getParentOfType(block, BlockType.DocumentWindowBlock) as DocumentWindowBlock;
        if (win) win.setTitle(filename);
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
            return false;
        }
        return true;
    }
    async buildUnknownBlock(container: HTMLElement, blockDto: IBlockDto) {
        const unkownBlock = new PageBlock({
            ...blockDto, manager: this
        });
        await this.buildChildren(unkownBlock, blockDto);
        container.appendChild(unkownBlock.container);
        return unkownBlock;
    }
    addBlockTo(parent: AbstractBlock, block: IBlock, skipIndexation?: boolean) {
        parent.blocks.push(block);
        this.registerBlock(block);
        this.generateParentSiblingRelations(parent);
        if (!skipIndexation) this.reindexAncestorDocument(parent);
    }
    async loadBlockMenu(args: IBindingHandlerArgs) {
        const block = args.block;
        const menu = new BlockMenuBlock({
            contextMenuEvent: args.e as MouseEvent,
            manager: this.manager,
            source: block
        });
        const e = args.e as MouseEvent;
        const menuHeight = 200;
        const menuWidth = 300;
        const node = menu.render();
        let x = e.clientX - 20;
        let y = e.clientY + 20;
        const xdiff = window.innerWidth - e.clientX;
        const ydiff = window.innerHeight - e.clientY;
        if (ydiff < menuHeight) {
            y = e.clientY - ydiff - 10;
        }
        if (xdiff < menuWidth) {
            x = e.clientX - xdiff - 10;
        }
        updateElement(menu.container, {
            style: {
                position: "absolute",
                top: y + "px",
                left: x + "px",
                width: "auto",
                height: "auto"
            },
            classList: [passoverClass]
        });
        console.log("loadBlockMenu", { 
            e,
            "Screen X/Y": `${e.screenX}, ${e.screenY}`,
            "Client X/Y": `${e.clientX}, ${e.clientY}`
        });
        menu.container.appendChild(node);
        document.body.appendChild(menu.container);
        menu.node.focus();
        // this.manager.registerBlock(menu);
        // this.manager.setBlockFocus(menu);
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
        this.generateParentSiblingRelations(parent);
    }
    generateParentSiblingRelations<T extends AbstractBlock>(parent: T) {
        parent.blocks.forEach((block, i) => {
            block.relation.parent = parent;
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
            const leftMargin = await this.recursivelyBuildBlock(anchor.container, blockDto.relation.leftMargin) as PageBlock;
            anchor.relation.leftMargin = leftMargin;
            leftMargin.relation.marginParent = anchor;
            this.stageLeftMarginBlock(leftMargin, anchor);
            leftMargin.generateIndex();
        }
        if (blockDto.relation?.rightMargin) {
            const rightMargin = await this.recursivelyBuildBlock(anchor.container, blockDto.relation.rightMargin) as PageBlock;
            anchor.relation.rightMargin = rightMargin;
            rightMargin.relation.marginParent = anchor;
            this.stageRightMarginBlock(rightMargin, anchor);
            rightMargin.generateIndex();
        }
    }
    getBlockBuilder(type: BlockType) {
        const item = this.blockBuilders.find(x => x.type == type);
        return item?.builder;
    }
    async recursivelyBuildBlock(container: HTMLElement, blockDto: IBlockDto) {
        const builder = this.getBlockBuilder(blockDto.type);
        if (builder) {
            try {
                const newBlock = await builder(container, blockDto, this);
                await this.handleBuildingMarginBlocks(newBlock, blockDto);
                return newBlock;
            } catch (ex) {
                console.error("recursivelyBuildBlock", { container, blockDto, ex, manager: this });
                return await ErrorBlock.getBlockBuilder().builder(container, blockDto, this);
            }
        }
        return await UnknownBlock.getBlockBuilder().builder(container, blockDto, this);
    }
    getBlockInFocus() {
        return this.focus;
    }
    getDocument() {
        const dto= {
            id: this.id,
            type: BlockType.PageBlock,
            children: []
        } as IMainListBlockDto;
        const mainBlock = this.registeredBlocks.find(x => x.type == BlockType.PageBlock);
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
    setDocumentFocus(doc: PageBlock) {
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
    async createYouTubeVideoBackgroundWorkspace() {
        const dto = {
            type: BlockType.WorkspaceBlock,
            children: [
                {
                    type: BlockType.YouTubeVideoBackgroundBlock,
                    metadata: {
                        url: "https://www.youtube.com/watch?v=Zsqep7_9_mw"
                    }
                }                
            ]
        };
        const container = document.createElement("DIV") as HTMLDivElement;
        const workspace = await this.recursivelyBuildBlock(container, dto) as WorkspaceBlock;
        this.container.appendChild(workspace.container);
        this.addBlockTo(this, workspace);
        this.generateParentSiblingRelations(workspace);
        return workspace;
    }
    async createCanvasWorkspace() {
        const dto = {
            type: BlockType.WorkspaceBlock,
            children: [
                {
                    type: BlockType.CanvasBackgroundBlock
                }                
            ]
        };
        const container = document.createElement("DIV") as HTMLDivElement;
        const workspace = await this.recursivelyBuildBlock(container, dto) as WorkspaceBlock;
        this.container.appendChild(workspace.container);
        this.addBlockTo(this, workspace);
        this.generateParentSiblingRelations(workspace);
        return workspace;
    }
    async switchToWebGLBackground() {
        const originalBackground = this.getBackground();
        const container = document.createElement("DIV") as HTMLDivElement;
        const canvasBackground = await this.recursivelyBuildBlock(container, { type: BlockType.CanvasBackgroundBlock }) as AbstractBlock;
        this.switchBackground(originalBackground, canvasBackground);
    }
    async switchToYouTubeVideoBackground() {
        const originalBackground = this.getBackground();
        const container = document.createElement("DIV") as HTMLDivElement;
        const videoBackground = await this.recursivelyBuildBlock(container, {
            type: BlockType.YouTubeVideoBackgroundBlock,
            metadata: {
                url: "https://www.youtube.com/watch?v=Zsqep7_9_mw"
            }
        }) as AbstractBlock;
        this.switchBackground(originalBackground, videoBackground);
    }
    async switchToVideoBackground() {
        const originalBackground = this.getBackground();
        const container = document.createElement("DIV") as HTMLDivElement;
        const videoBackground = await this.recursivelyBuildBlock(container, {
            type: BlockType.VideoBackgroundBlock,
            metadata: {
                //url: "/video-backgrounds/green-aurora.mp4"
                url: "/video-backgrounds/rain.mp4"
            }
        }) as AbstractBlock;
        this.switchBackground(originalBackground, videoBackground);
    }
    async switchToImageBackground() {
        const originalBackground = this.getBackground();
        const container = document.createElement("DIV") as HTMLDivElement;
        const videoBackground = await this.recursivelyBuildBlock(container, {
            type: BlockType.ImageBackgroundBlock,
            metadata: {
                url: "/image-backgrounds/pexels-visit-greenland-108649-360912.jpg"
            }
        }) as AbstractBlock;
        this.switchBackground(originalBackground, videoBackground);        
    }
    async createImageWorkspace() {
        const dto = {
            type: BlockType.WorkspaceBlock,
            children: [
                {
                    type: BlockType.ImageBackgroundBlock,
                    metadata: {
                        url: "/image-backgrounds/pexels-visit-greenland-108649-360912.jpg"
                    }
                }
            ]
        };
        const container = document.createElement("DIV") as HTMLDivElement;
        const workspace = await this.recursivelyBuildBlock(container, dto) as WorkspaceBlock;
        this.container.appendChild(workspace.container);
        this.addBlockTo(this, workspace);
        this.generateParentSiblingRelations(workspace);
        return workspace;
    }
    async createVideoWorkspace() {
        const dto = {
            type: BlockType.WorkspaceBlock,
            children: [
                {
                    type: BlockType.VideoBackgroundBlock,
                    metadata: {
                        url: "/video-backgrounds/green-aurora.mp4"
                    }
                }
            ]
        };
        const container = document.createElement("DIV") as HTMLDivElement;
        const workspace = await this.recursivelyBuildBlock(container, dto) as WorkspaceBlock;
        this.container.appendChild(workspace.container);
        this.addBlockTo(this, workspace);
        this.generateParentSiblingRelations(workspace);
        return workspace;
    }
    async loadWorkspace(filename: string = null) {
        const manager = this;
        filename = filename || prompt("Filename: ");
        const res = await fetchGet("/api/loadWorkspaceJson", { filename });
        const json = await res.json();
        if (!json.Success) {
            return;
        }
        const ws = this.blocks[0];
        ws.destroy();
        const dto = json.Data.workspace;
        const workspace = await this.recursivelyBuildBlock(this.container, dto);
        this.addBlockTo(this, workspace);
        this.generateParentSiblingRelations(this);
        setTimeout(() => {
            manager.registeredBlocks
                .filter(x => x.type == BlockType.PageBlock)
                .forEach(b => manager.takeSnapshot(b.id));
        }, 500);
    }
    flatten(root: IBlockDto): IBlockDto[] {
          const result: IBlockDto[] = [];
          function traverse(block: IBlockDto): void {
              result.push(block);
              block.children.forEach((child) => {
                  traverse(child);
              });
          }
          traverse(root);
          return result;
    }
    saveWorkspace() {
        const filename = prompt("Filename: ");
        const ws = this.serialize().children[0];
        ws.metadata = { ...ws.metadata, filename };
        let children = this.flatten(ws);
        const documents = children.filter(x => x.type == BlockType.PageBlock);
        documents.forEach(d => {
            d.metadata = { ...d.metadata, loadFromExternal: true };
            d.children = [];
        });
        console.log("saveWorkspace", { dto: ws, children, documents });
        fetch("/api/saveWorkspaceJson", {
            method: "POST",
            body: JSON.stringify({
                filename,
                workspace: ws
            }),
            headers: { "Content-Type": "application/json" }
        }).then();
    }
    async addMembraneToDocumentWindow(dto: IMainListBlockDto) {
        const container = document.createElement("DIV") as HTMLDivElement;
        const count = this.registeredBlocks.filter(x => x.type == BlockType.DocumentWindowBlock).length;
        const buffer = count * 20;
        const documentWindow = await this.recursivelyBuildBlock(container, {
            type: BlockType.DocumentWindowBlock,
            metadata: {
                title: dto.metadata?.filename,
                position: {
                    y: buffer + 20,
                    x: buffer + 100,
                },
                size: {
                    w: 840,
                    h: 620,
                },
                state: "normal",
                zIndex: this.getHighestZIndex()
            },
            blockProperties: [
              { type: "block/theme/paper" }
            ],
            children: [dto]
        }) as WindowBlock;
        const background = this.getBackground();
        this.addBlockTo(background, documentWindow);
        background.container.appendChild(documentWindow.container);
        this.generateParentSiblingRelations(background);
        const membrane = documentWindow.blocks[0] as MembraneBlock;
        const index = flattenTree(documentWindow);
        const documents = index.filter(x => x.block.type == BlockType.PageBlock).map(x => x.block as PageBlock);
        const _this = this;
        documents.forEach(async doc => {
            const entities = await doc.getEntities();
            const props = doc.getAllStandoffPropertiesByType("codex/entity-reference");
            props.forEach(p => {
                let entity = entities.find(e => e.Guid == p.value);
                if (!entity) return;
                p.cache.entity = entity;
            });
            _this.history[doc.id] = {
                id: doc.id,
                redoStack: [],
                undoStack: [],
                lastChange: Date.now()
            };
        });
        membrane.setFocus();
        return membrane;
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
        if (dto.type != BlockType.PageBlock) {
            console.error("Expected doc.type to be BlockType.DocumentBlock.");
            return;
        }
        container = container || document.createElement("DIV") as HTMLDivElement;
        const doc = await this.recursivelyBuildBlock(container, dto) as PageBlock;
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
        const block = new PageBlock({
            ...dto, manager: this
        });
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
    createDocumentTabBlock(dto?: IBlockDto){
        const inputEvents = this.getDocumentTabBlockEvents();
        const block = new DocumentTabBlock({
            manager: this
        });
        block.inputEvents = inputEvents;
        if (dto?.metadata) block.metadata = dto.metadata;
        if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        block.applyBlockPropertyStyling();
        return block;
    }
    async createTabBlock(dto: IBlockDto = {}){
        const builder = this.getBlockBuilder(BlockType.TabBlock);
        const block = await builder(this.newContainer(), dto, this) as TabBlock;
        return block;
        // const inputEvents = this.getTabBlockEvents();
        // const block = new TabBlock({
        //     manager: this
        // });
        // block.inputEvents = inputEvents;
        // if (dto?.metadata) block.metadata = dto.metadata;
        // if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        // block.applyBlockPropertyStyling();
        // return block;
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
        //this.addBlockTo(this, block);
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
        //this.addBlockTo(this, block);
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
        //this.addBlockTo(this, block);
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
        //this.addBlockTo(this, block);
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
        //this.addBlockTo(this, block);
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
        //this.addBlockTo(this, block);
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
        //this.addBlockTo(this, block);
        return block;
    }
    createDocumentTabRowBlock(dto?: IBlockDto) {
        const inputEvents = this.getDocumentTabBlockEvents();
        const block = new DocumentTabRowBlock({
            manager: this
        });
        if (dto?.metadata) block.metadata = dto.metadata;
        block.inputEvents = inputEvents;
        if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        block.applyBlockPropertyStyling();
        return block;
    }
    async createTabRowBlock(dto: IBlockDto = {}) {
        const builder = this.getBlockBuilder(BlockType.TabRowBlock);
        const rowBlock = await builder(this.newContainer(), dto, this) as TabRowBlock;
        return rowBlock;
        // const inputEvents = this.getTabBlockEvents();
        // const block = new TabRowBlock({
        //     manager: this
        // });
        // if (dto?.metadata) block.metadata = dto.metadata;
        // block.inputEvents = inputEvents;
        // if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        // block.applyBlockPropertyStyling();
        // return block;
    }
    createLeftMarginBlock(dto?: IBlockDto) {
        const block = new PageBlock({
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
        //this.addBlockTo(this, block);
        return block;
    }
    createIFrameBlock(dto?: IBlockDto) {
        const block = new IframeBlock({
            manager: this
        });
        if (dto?.metadata) block.metadata = dto.metadata;
        if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        block.applyBlockPropertyStyling();
        //this.addBlockTo(this, block);
        return block;
    }
    createCanvasBlock(dto?: IBlockDto) {
        const block = new CanvasBlock({
            manager: this
        });
        if (dto?.metadata) block.metadata = dto.metadata;
        if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        block.applyBlockPropertyStyling();
        this.addBlockTo(this, block);
        return block;
    }
    createVideoBlock(dto?: IBlockDto) {
        const block = new YouTubeVideoBlock({
            manager: this
        });
        if (dto?.metadata) block.metadata = dto.metadata;
        if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        block.applyBlockPropertyStyling();
        this.addBlockTo(this, block);
        return block;
    }
    createImageBlock(dto?: IBlockDto) {
        const block = new ImageBlock({
            manager: this
        });
        if (dto?.metadata) block.metadata = dto.metadata;
        if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
        block.applyBlockPropertyStyling();
        this.addBlockTo(this, block);
        return block;
    }
    createRightMarginBlock(dto?: IBlockDto) {
        const block = new PageBlock({
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
    createWorkspaceBlock(dto?: IBlockDto) {
        const block = new WorkspaceBlock({ manager: this, ...dto });
        return block;
    }
    createVideoBackgroundBlock(dto?: IBlockDto) {
        const block = new VideoBackgroundBlock({ manager: this, ...dto });
        return block;
    }
    createImageBackgroundBlock(dto?: IBlockDto) {
        const block = new ImageBackgroundBlock({ manager: this, ...dto });
        return block;
    }
    createDocumentWindowBlock(dto?: IBlockDto) {
        const block = new DocumentWindowBlock({ ...dto, manager: this, onClose: async (b) => b.destroy() });
        block.addBlockProperties(dto.blockProperties);
        return block;
    }
    createWindowBlock(dto?: IBlockDto) {
        const block = new WindowBlock({ manager: this, ...dto });
        block.addBlockProperties(dto.blockProperties);
        return block;
    }
    createCheckboxBlock(dto?: IBlockDto) {
        const block = new CheckboxBlock({ manager: this, ...dto });
        return block;
    }
    createStandoffEditorBlock(dto?: IBlockDto) {
        const textBlock = new StandoffEditorBlock({ manager: this, ...dto });
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
        console.log("undoHistory", { id, history, dto, last })
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
        const root = (this.getParentOfType(descendant, BlockType.PageBlock) as PageBlock) || descendant as PageBlock;
        if (root?.type == BlockType.PageBlock) {
            root.generateIndex();
        }
    }
    registerBlock(block: IBlock) {
        if (this.registeredBlocks.findIndex(x=> x.clientId == block.clientId) >= 0) {
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
}
import { v4 as uuidv4 } from 'uuid';
import _ from 'underscore';
import { updateElement } from '../library/svg';
import { BlockProperty } from '../library/block-property';
import { KEYS } from '../library/keyboard';
import { IBlock, BlockType, Overlay, InputAction, InputEvent, IBlockPropertySchema, Commit, IAbstractBlockConstructor, Platform, IInput, InputEventSource, BlockPropertyDto, GUID, IBlockDto, IMouseInput, IArrowNavigation, CARET, UniverseBlockEvent, IBindingHandlerArgs, Caret } from '../library/types';
import { UniverseBlock } from '../universe-block';
import { StandoffEditorBlock } from './standoff-editor-block';

const isMac = navigator.platform.toUpperCase().indexOf('MAC')>=0;
const isWindows = navigator.platform.toUpperCase().indexOf('WIN')>=0;
const platform = isMac ? Platform.Mac : isWindows ? Platform.Windows : Platform.Linux;
export const passoverClass = "block-modal";
export abstract class AbstractBlock implements IBlock {
    id: string;
    type: BlockType;
    blocks: IBlock[];
    overlays: Overlay[];
    /**
     * This will keep track of the last couple of key-combinations entered. The main purpose
     * is for triggering two-part bindings, such as 'CTRL-K, CTRL-D'.
     */
    inputBuffer: IInput[];
    inputEvents: InputEvent[];
    inputActions: InputAction[];
    modes: string[];
    suppressEventHandlers: boolean;
    blockProperties: BlockProperty[];
    blockSchemas: IBlockPropertySchema[];
    container: HTMLElement;
    relation: Record<string, IBlock>;
    canSerialize: boolean;
    manager?: UniverseBlock;
    /**
     * A place to store data about the Block, especially the kind that may not be relevant to every instance
     * of Block in every circumstance. For example, 'indentLevel: number' is relevant to a Block in a nested-list
     * but not a chain of paragraph-like blocks. For now, this is a catch-all for Block data that hasn't yet been
     * promoted to being a member of the class itself.
     */
    metadata: Record<string, any>;
    commitHandler: (commit: Commit) => void;
    blockEvents: UniverseBlockEvent;
    constructor(args: IAbstractBlockConstructor) {
        this.id = args?.id || uuidv4();
        this.manager = args.manager;
        this.relation = {};
        this.type = BlockType.AbstractBlock;
        this.container = args?.container || document.createElement("DIV") as HTMLDivElement;
        updateElement(this.container, {
            classList: ["abstract-block"],
            dataset: {
                "blockId": this.id,
                "blockType": args.type || "client-block"
            }
        });
        this.commitHandler = () => { };
        this.metadata = args.metadata || {};
        this.blockProperties = [];
        this.blockSchemas = args.blockSchemas || [];
        this.commitHandler = () => { };
        this.blocks=[];
        this.overlays = [];
        this.inputEvents = [];
        this.inputBuffer = [];
        this.inputActions = [];
        this.canSerialize = true;
        this.blockEvents = {};
        this.modes = ["default"];
    }
    subscribeTo(eventName: string, handler: () => void) {
        const evt = this.blockEvents[eventName];
        if (!evt) {
            this.blockEvents[eventName] = [handler];
            return;
        }
        evt.push(handler);
    }
    publish(eventName: string, data?: {}) {
        const evt = this.blockEvents[eventName];
        if (!evt) return;
        evt.forEach((e,i) => {
            try {
                e(data);
            } catch (ex) {
                console.log("publish", { eventName, handler: e, i })
            }
        });
    }
    getOrSetOverlay(name: string) {
        const overlay = this.overlays.find(x=> x.name == name);
        if (overlay) return overlay;
        return this.addOverlay(name);
    }
    removeOverlay(name: string) {
        const overlay = this.overlays.find(x => x.name == name);
        if (!overlay) return;
        overlay.container.remove();
    }
    removeBlockProperty(prop: BlockProperty) {
        prop.removeStyling();
        const bi = this.blockProperties.findIndex(x => x.id == prop.id);
        if (bi < 0) return;
        this.blockProperties.splice(bi, 1);
        if (!this.blockProperties?.length) this.blockProperties = [];
        prop.isDeleted = true;
    }
    addOverlay(name: string) {
        const blockIndex = 100;
        const container = document.createElement("DIV") as HTMLDivElement;
        const indexes = this.overlays.map(x=> x.index);
        const lastIndex = Math.max(...indexes);
        const newIndex = lastIndex + 1;
        updateElement(container, {
            attribute: {
                position: "absolute",
                x: 0,
                y: 0,
                width: "100%",
                height: "100%",
                "z-index": newIndex + blockIndex
            }
        })
        const overlay = { name, container, index: newIndex };
        this.overlays.push(overlay);
        return overlay;
    }
     setEvents(events: InputEvent[]){
        this.inputEvents.push(...events);
        const actions = events.map(x => x.action);
        this.inputActions.push(...actions);
    }
    protected getKeyCode(name: string) {
        const code = KEYS[name].find(x => x.platform == Platform.Windows)?.code as number;
        return code;
    }
    protected toChord(match: string, source: InputEventSource = InputEventSource.Keyboard) {
        let chord: IInput = {} as any;
        const _match = match.toUpperCase();
        chord.source = source;
        if ((_match.indexOf(":") >= 0)) {
            chord.platform = (_match.indexOf("MAC") >= 0) ? Platform.Mac : Platform.Windows;
        } else {
            chord.platform = platform;
        }
        chord.control = (_match.indexOf("CONTROL") >= 0);
        chord.option = (_match.indexOf("ALT") >= 0);
        chord.command = (_match.indexOf("META") >= 0);
        chord.shift = (_match.indexOf("SHIFT") >= 0);
        if (match.startsWith("'")) {
            chord.key = _match;
        } else {
            const parts = _match.split("-"), len = parts.length;
            chord.key = parts[len-1];
        }
        chord.leftButton = (_match.indexOf("CLICKLEFT") >= 0);
        chord.rightButton = (_match.indexOf("CLICKRIGHT") >= 0);
        // console.log("toChord", { match, chord, platform });
        return chord;
    }
    protected compareChords(input: IInput, trigger: IInput) {
        if (trigger.key.startsWith("'")) {
            const key = trigger.key.substring(1,2);
            if (input.key?.toUpperCase() == key.toUpperCase()) return true;
        }
        if (input.platform != trigger.platform) return false;
        if (input.command != trigger.command) return false;
        if (input.option != trigger.option) return false;
        if (input.shift != trigger.shift) return false;
        if (input.control != trigger.control) return false;
        if (trigger.source == InputEventSource.Keyboard) {
            if (input.key?.toUpperCase() != trigger.key?.toUpperCase()) return false;
        }
        if (trigger.source == InputEventSource.Mouse) {
            if (input.leftButton !== trigger.leftButton) return false;
            if (input.rightButton !== trigger.rightButton) return false;
        }
        return true;
    }
    protected getFirstMatchingInputEvent(input: IInput, source: InputEventSource = InputEventSource.Keyboard) {
        // console.log("getFirstMatchingInputEvent", { input });
        const self = this;
        const modeEvents = _.groupBy(this.inputEvents.filter(x => x.trigger.source == source), x => x.mode);
        const maxIndex = this.modes.length -1;
        for (let i = maxIndex; i >= 0; i--) {
            let mode = this.modes[i];
            let events = modeEvents[mode];
            if (!events) continue;
            // console.log("getFirstMatchingInputEvent", { events });
            let match = events.find(x => {
                if (Array.isArray(x.trigger.match)) {
                    const triggers = (x.trigger.match as string[]).map(m => self.toChord(m, source));
                    const found = triggers.some(t => self.compareChords(input, t));
                    return found;
                } else {
                    let trigger = self.toChord(x.trigger.match as string, source);
                    const found = self.compareChords(input, trigger);
                    return found;
                }
            });
            if (match) return match;
        }
        return null;
    }
    protected toMouseInput(e: MouseEvent): IMouseInput {
        const input: IMouseInput = {
            source: InputEventSource.Mouse,
            platform,
            shift: e.shiftKey,
            control: e.ctrlKey,
            command: e.metaKey,
            option: e.altKey,
            leftButton: e.button == 0,
            rightButton: e.button == 1
        };
        return input;
    }
    protected toKeyboardInput(e: KeyboardEvent): IInput {
        const input: IInput = {
            source: InputEventSource.Keyboard,
            platform,
            shift: e.shiftKey,
            control: e.ctrlKey,
            command: e.metaKey,
            option: e.altKey,
            key: e.key,
            keyCode: e.code ? parseInt(e.code) : 0
        };
        return input;
    }
    setBlockSchemas(schemas: IBlockPropertySchema[]) {
        this.blockSchemas.push(...schemas);
    }
    addBlockProperties(properties: BlockPropertyDto[]) {
        const self = this;
        const props = properties.map(x => new BlockProperty({
                type: x.type,
                block: self,
                value: x.value,
                metadata: x.metadata,
                schema: self.blockSchemas.find(x2 => x2.type == x.type) as IBlockPropertySchema
            }),
        );
        this.blockProperties = this.blockProperties || [];
        this.blockProperties.push(...props);
    }
    applyBlockPropertyStyling() {
        if (this.blockProperties) {
            this.blockProperties.forEach(p => {
                p.applyStyling();
            });
        }
    }
    getBlock(id: GUID) {
        return this.blocks.find(x => x.id == id) as IBlock;
    }
    setCommitHandler(handler: (commit: Commit) => void) {
        this.commitHandler = handler;
    }
    protected commit(msg: Commit) {
        this.commitHandler(msg);
    }
    // updateView() {

    // }
    setFocus(){
        this.container.focus({ });
    }
    handleArrowUp(args: IArrowNavigation) {
        if (this.relation.previous) {
            args.manager.setBlockFocus(this.relation.previous);
            return;
        }
        const parent = this.relation.parent;
        if (parent) {
            args.manager.setBlockFocus(parent);
        }
    }
    handleArrowDown(args: IArrowNavigation) {
        if (this.blocks.length) {
            args.manager.setBlockFocus(this.blocks[0]);
            return;
        }
        const next = this.relation.next;
        if (next) {
            args.manager.setBlockFocus(next);
            if (next.type == BlockType.StandoffEditorBlock) {
                setTimeout(() => (next as StandoffEditorBlock).setCaret(0, CARET.LEFT), 10);
            }
        }
    }
    handleArrowRight(args: IArrowNavigation) {
        if (this.blocks.length) {
            args.manager.setBlockFocus(this.blocks[0]);
            return;
        }
        const next = this.relation.next;
        if (next) {
            args.manager.setBlockFocus(next);
            if (next.type == BlockType.StandoffEditorBlock) {
                setTimeout(() => (next as StandoffEditorBlock).setCaret(0, CARET.LEFT), 10);
            }
        }
    }
    handleArrowLeft(args: IArrowNavigation) {
        if (this.relation.previous) {
            args.manager.setBlockFocus(this.relation.previous);
            return;
        }
        const parent = this.relation.parent;
        if (parent) {
            args.manager.setBlockFocus(parent);
        }
    }
    toNodeList(array: ChildNode[]) {
        const fragment = new DocumentFragment();
        for (const item of array) {
            fragment.appendChild(item);
        }
        return fragment.childNodes;
    };
    newContainer() {
        return document.createElement("DIV") as HTMLDivElement;
    }
    explode() {
        /**
         * Destroy the block but first disgorge all of its child blocks.
         */
        console.log("explode", { outerHTML: this.container.outerHTML });
        const parent = this.relation.parent as AbstractBlock;
        if (!parent) return;
        const i = parent.blocks.findIndex(x => x.id == this.id);
        parent.blocks.splice(i, 1, ...this.blocks);
        const parentElement = this.container.parentElement;
        const fragment = document.createDocumentFragment();
        while (this.container.firstChild) {
            fragment.appendChild(this.container.firstChild);
        }
        if (parentElement) {
            parentElement.insertBefore(fragment, this.container);
            this.container.remove();
        }
        this.manager.deregisterBlock(this.id);
        this.manager.generateParentSiblingRelations(parent);
        this.manager.reindexAncestorDocument(parent);
    }
    replaceWith(newBlock: AbstractBlock) {
        const parent = this.relation.parent as AbstractBlock;
        /**
         * Move all first-level block elements out of this.container into newBlock.container.
         */
        const blockContainers = this.container.querySelectorAll(':scope > .abstract-block');
        newBlock.blocks = [...this.blocks];
        newBlock.container.append(...blockContainers);
        /**
         * Replace this block in the parents.block array with newBlock.
         */
        const i = this.manager.getIndexOfBlock(this);
        parent.blocks.splice(i, 1, newBlock);
        /**
         * Drop newBlock next to this.container and remove the old block's descendants.
         */
        this.container.insertAdjacentElement("afterend", newBlock.container);
        this.container.remove();
        /**
         * Do the house keeping.
         */
        this.manager.registerBlock(newBlock);
        this.manager.generateParentSiblingRelations(parent);
    }
    abstract serialize():IBlockDto;
    abstract deserialize(json: any|any[]): IBlock;
    destroy() {
        if (this.blocks.length) {
            this.blocks.forEach(b => b.destroy());
            this.blocks = [];
        }
        this.manager.deregisterBlock(this.id);
        const parent = this.relation.parent as AbstractBlock;
        if (parent) {
            this.manager.removeBlockFrom(parent, this);
        }
        if (this.container) {
            this.container.remove();
        }
        console.log("destroy", { type: this.type, block: this, container: this.container })
    }
}
import { v4 as uuidv4 } from 'uuid';
import { Caret } from './cell';
import _ from 'underscore';
import { KEYS, Platform } from './keyboard';
import { updateElement } from './svg';

export interface IAbstractBlockConstructor {
    id?: string;
    container?: HTMLDivElement;
    owner?: IBlock;
}
export enum InputEventSource {
    Keyboard,
    Mouse
}
export type Command = {
    id: GUID;
    name: string;
    value?: Record<string,any>;
}
export type ReverseCommand = Command;
export type Commit = {
    redo: Command;
    undo?: ReverseCommand;
}
export type Trigger = {
    source: InputEventSource;
    match:  string|string[];
}
export interface ModeTrigger {
    mode: string;
    trigger: Trigger;
}
export type InputEvent = {
    mode: string;                   // "default"
    trigger: Trigger;
    action: InputAction;             // See the one below
}

export type InputAction = {
    name: string;                   // "copy"
    description?: string;           // "Copies text in the selection for pasting elsewhere."
    handler: BindingHandler;        // The function that carries out the task.
}
export abstract class AbstractBlock implements IBlock {
    id: string;
    type: BlockType;
    blocks: IBlock[];
    overlays: Overlay[];
    inputEvents: InputEvent[];
    inputActions: InputAction[];
    modes: string[];
    owner?: IBlock;
    blockProperties: BlockProperty[];
    blockSchemas: IBlockPropertySchema[];
    container: HTMLDivElement;
    relation: Record<string, IBlock>;
    metadata: Record<string, any>;
    commitHandler: (commit: Commit) => void;
    constructor(args: IAbstractBlockConstructor) {
        this.id = args?.id || uuidv4();
        this.owner = args.owner;
        this.relation = {};
        this.type = BlockType.RootBlock;
        this.container = args?.container || document.createElement("DIV") as HTMLDivElement;
        this.commitHandler = () => { };
        this.metadata = {};
        this.blockProperties =[];
        this.blockSchemas = [];
        this.commitHandler = () => { };
        this.blocks=[];
        this.overlays = [];
        this.inputEvents = [];
        this.inputActions = [];
        
        this.modes = ["default"];
    }
    
    getOrSetOverlay(name: string) {
        const overlay = this.overlays.find(x=> x.name == name);
        if (overlay) return overlay;
        return this.addOverlay(name);
    }
    removeOverlay(name: string) {
        const o = this.overlays.find(x => x.name == name);
        if (!o) return;
        o.container.remove();
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
    getKeyCode(name: string) {
        const code = KEYS[name].find(x => x.platform == Platform.Windows)?.code as number;
        return code;
    }
    protected toChord(match: string) {
        let chord: IKeyboardInput = {} as any;
        const _match = match.toUpperCase();
        chord.control = (_match.indexOf("CONTROL") >= 0);
        chord.option = (_match.indexOf("ALT") >= 0);
        chord.command = (_match.indexOf("META") >= 0);
        chord.shift = (_match.indexOf("SHIFT") >= 0);
        const parts = _match.split("-"), len = parts.length;
        chord.key = parts[len-1];
        return chord;
    }
    protected compareChords(input: IKeyboardInput, trigger: IKeyboardInput) {
        if (input.command != trigger.command) return false;
        if (input.option != trigger.option) return false;
        if (input.shift != trigger.shift) return false;
        if (input.control != trigger.control) return false;
        if (input.key.toUpperCase() != trigger.key.toUpperCase()) return false;
        return true;
    }
    protected getFirstMatchingInputEvent(input: IKeyboardInput) {
        const self = this;
        const modeEvents = _.groupBy(this.inputEvents.filter(x => x.trigger.source == InputEventSource.Keyboard), x => x.mode);
        const maxIndex = this.modes.length -1;
        for (let i = maxIndex; i >= 0; i--) {
            let mode = this.modes[i];
            let events = modeEvents[mode];
            let match = events.find(x => {
                let trigger = self.toChord(x.trigger.match as string);
                return self.compareChords(input, trigger);
            });
            if (match) return match;
        }
        return null;
    }
    protected toKeyboardInput(e: KeyboardEvent): IKeyboardInput {
        const input: IKeyboardInput = {
            shift: e.shiftKey,
            control: e.ctrlKey,
            command: e.metaKey,
            option: e.altKey,
            key: e.key,
            keyCode: parseInt(e.code || e.keyCode)
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
                schema: self.blockSchemas.find(x2 => x2.type == x.type) as IBlockPropertySchema
            }),
        );
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
    updateView() {

    }
    // removeRelation(name: string, skipCommit?: boolean) {
    //     const relation = this.getRelation(name);
    //     delete this.relations[name];
    //     if (!skipCommit) {
    //         this.commit({
    //             redo: {
    //                 id: this.id,
    //                 name: "removeRelation",
    //                 value: { name }
    //             },
    //             undo: {
    //                 id: this.id,
    //                 name: "addRelation",
    //                 value: {
    //                     name,
    //                     targetId: relation.targetId
    //                 }
    //             }
    //         });
    //     }
    // }
    // getRelation(name: string) {
    //     return this.relations[name];
    // }
    // setRelation(type: string, targetId: string) {
    //     this.relations[type] = { type, sourceId: this.id, targetId };
    //     this.commit({
    //         redo: {
    //             id: this.id,
    //             name: "setRelation",
    //             value: { type, targetId }
    //         },
    //         undo: {
    //             id: this.id,
    //             name: "removeRelation",
    //             value: { name: type }
    //         }
    //     })
    // }
    // addRelation(name: string, targetId: string, skipCommit?: boolean) {
    //     this.relations[name] = {
    //         type: name,
    //         sourceId: this.id,
    //         targetId: targetId
    //     };
    //     if (!skipCommit) {
    //         this.commit({
    //             redo: {
    //                 id: this.id,
    //                 name: "addRelation",
    //                 value: { name, targetId }
    //             },
    //             undo: {
    //                 id: this.id,
    //                 name: "removeRelation",
    //                 value: { name }
    //             }
    //         });
    //     }
    // }
    setFocus(){
        this.container.focus();
    }
    abstract serialize():IBlockDto;
    abstract deserialize(json: any|any[]): IBlock;
    abstract destroy(): void;
}
export type GUID = string;
export interface IBlockPropertySchema {
    type: string;
    event?: Record<string, BlockBindingHandler>;
    decorate?: {
        blockClass?: string;
    }
    animation?: {
        init: (p: BlockProperty) => void;
    }
}
export enum BlockType {
    RootBlock = "root-block",
    MainListBlock = "main-list-block",
    IndentedListBlock = "indented-list-block",
    TabRowBlock = "tab-row-block",
    TabBlock = "tab-block",
    StandoffEditorBlock = "standoff-editor-block",
    HTMLEditorBlock = "html-editor-block",
    IFrameBlock = "iframe-block",
    HTMLBlock = "html-block",
    PDFBlock = "pdf-block",
    GridBlock = "grid-block",
    GridRowBlock = "grid-row-block",
    GridCellBlock = "grid-cell-block",
    LeftMarginBlock = "left-margin-block",
    RightMarginBlock = "right-margin-block",
    ImageBlock = "image-block",
    VideoBlock = "video-block"
}
export interface IBlock {
    id: GUID;
    owner?: IBlock;
    type: BlockType;
    blockProperties: BlockProperty[];
    addBlockProperties: (props: BlockPropertyDto[]) => void;
    blocks: IBlock[];
    updateView: () => void;
    getBlock: (id: GUID) => IBlock;
    container: HTMLDivElement;
    relation: Record<string, IBlock>;
    //relations: Record<string, IBlockRelation>;
    // addRelation: (name: string, targetId: string, skipCommit?: boolean) => void;
    // getRelation: (name: string) => IBlockRelation;
    // removeRelation: (name: string, skipCommit?: boolean) => void;
    metadata: Record<string, any>;
    setFocus(): void;
    serialize(): IBlockDto;
    deserialize(json: any|any[]): IBlock;
    applyBlockPropertyStyling(): void;
    destroy(): void;
}

export interface IBlockRelation {
    name: string;
    sourceId: GUID;
    targetId: GUID;
}

export interface IBlockPropertyConstructor {
    id?: GUID;
    type: string;
    schema: IBlockPropertySchema;
    event?: Record<string, BlockBindingHandler>;
    block: IBlock;
    value?: string;
}
export interface IBindingHandlerArgs {
    block: IBlock;
    caret: Caret;
}
export type BindingHandler = (args: IBindingHandlerArgs) => void;
export type BlockBindingHandler = (block: BlockProperty) => void;
export type KeyboardBinding = Record<string, BindingHandler>;
export type MouseBinding = KeyboardBinding;
export type InputBindings = {
    keyboard: KeyboardBinding[];
    mouse: MouseBinding[];
}
export type Mode = Record<string, InputBindings>;
/**
 * A place to store collections of absolutely-positioned SVG elements that 
 * are overlaid on the text underneath, e.g., for overlapping underlines.
 */
export type Overlay = {
    index: number;
    name: string;
    container: HTMLDivElement;
}
export type BlockPropertyDto = {
    id?: GUID,
    blockGuid?: GUID,
    type: string,
    value?: string
}
export interface IKeyboardInput {
    control: boolean;
    shift: boolean;
    option: boolean;
    command: boolean;
    //function: boolean;
    key: string;
    keyCode: number;
}
export enum ActionKey {
    DEL,
    TAB,
    ENTER,
    ESC
}
export interface IBlockRelationDto extends IBlockRelation {}
export interface IBlockDto {
    id?: GUID;
    type: BlockType;
    relation?: Record<string, IBlockDto>;
    children?: IBlockDto[];
    metadata?: Record<string, any>;
    blockProperties?: BlockPropertyDto[];
}
export interface IMainListBlockDto extends IBlockDto {}
export class BlockProperty {
    id: GUID;
    type: string;
    schema: IBlockPropertySchema;
    event?: Record<string, BlockBindingHandler>;
    block: IBlock;
    value?: string;
    constructor({ id, type, block, schema, value, event }: IBlockPropertyConstructor) {
        this.id = id || uuidv4();
        this.type = type;
        this.schema = schema;
        this.event = event;
        this.block = block;
        this.value = value;
        this.onInit();
    }
    onInit() {
        if (this.schema?.event?.onInit) {
            this.schema?.event?.onInit(this);
        }
    }
    serialize() {
        return {
            id: this.id,
            type: this.type,
            value: this.value
        }
    }
    applyStyling() {
        const schema = this.schema;
        if (schema?.decorate?.blockClass) {
            this.block.container.classList.add(schema.decorate.blockClass);
        }
    }
    removeStyling() {
        const schema = this.schema;
        if (schema?.decorate?.blockClass) {
            this.block.container.classList.remove(schema.decorate.blockClass);
        }
    }
}

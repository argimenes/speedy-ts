import { UniverseBlock } from "../universe-block";
import { BlockProperty } from "./block-property";
import { Cell } from "./cell";
import { StandoffEditorBlock } from "../blocks/standoff-editor-block";
import { StandoffProperty } from "./standoff-property";

export type GUID = string;
export interface IBlockPropertySchema extends IPropertySchema {
    type: string;
    event?: Record<string, BlockBindingHandler>;
    decorate?: {
        blockClass?: string;
    }
    animation?: {
        init: (p: BlockProperty) => void;
    }
}
export interface ISetSource {
    setSource(url: string);
}
export interface IMainListBlockDto extends IBlockDto {

}
export const BlockState = {
    "initalising": "initialising",
    "initalised": "initialised",
    "loading": "loading",
    "loaded": "loaded"
};
export const EventType = {
    "beforeChange": "beforeChange",
    "afterChange": "afterChange",
    "addToHistory":"addToHistory"
};
export interface IStandoffEditorBlockMonitorUpdateArgs {
    caret: Caret;
    block: StandoffEditorBlock;
    properties: StandoffProperty[];
}
export interface IStandoffEditorBlockMonitor {
    update: (args: IStandoffEditorBlockMonitorUpdateArgs) => void;
}

export enum BlockType {
    ContextMenuBlock = "context-menu-block",
    CanvasBackgroundBlock = "canvas-background-block",
    VideoBackgroundBlock = "video-background-block",
    ImageBackgroundBlock = "image-background-block",
    DocumentWindowBlock = "document-window-block",
    WindowBlock = "window-block",
    ControlPanelBlock = "control-panel-block",
    UniverseBlock = "universe-block",
    WorkspaceBlock = "workspace-block",
    AbstractBlock = "root-block",
    DocumentBlock = "main-list-block",
    IndentedListBlock = "indented-list-block",
    TabRowBlock = "tab-row-block",
    TabBlock = "tab-block",
    TableBlock = "table-block",
    TableRowBlock = "table-row-block",
    TableCellBlock = "table-cell-block",
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
    YouTubeVideoBlock = "youtube-video-block",
    YouTubeVideoBackgroundBlock = "youtube-video-background-block",
    PlainTextBlock = "plain-text-block",
    CodeMirrorBlock = "code-mirror-block",
    CheckboxBlock = "checkbox-block",
    EmbedDocumentBlock = "embed-document-block"
}
export interface IBlock {
    id: GUID;
    manager?: UniverseBlock; // for coordinating actions between Blocks
    root?: IBlock;
    type: BlockType;
    blocks: IBlock[];
    blockProperties: BlockProperty[];
    relation: Record<string, IBlock>;
    metadata: Record<string, any>;
    canSerialize: boolean;
    container: HTMLElement; // rendering system

    serialize(): IBlockDto;
    deserialize(json: any|any[]): IBlock;
    destroy(): void;
    setFocus(): void;
    handleArrowDown(args: IArrowNavigation): void;
    handleArrowUp(args: IArrowNavigation): void;
    handleArrowRight(args: IArrowNavigation): void;
    handleArrowLeft(args: IArrowNavigation): void;

    addBlockProperties: (props: BlockPropertyDto[]) => void;
    //updateView: () => void;
    getBlock: (id: GUID) => IBlock;
    applyBlockPropertyStyling(): void;
    removeBlockProperty(bp: BlockProperty): void;
}

export type FindMatch = {
    block: StandoffEditorBlock;
    match: string;
    start: number;
    end: number;
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
    metadata?: Record<string, any>;
}
export interface IArrowNavigation {
    manager: UniverseBlock;
    e?: Event;
}
export interface IBindingHandlerArgs {
    block: IBlock;
    caret?: Caret;
    allowPassthrough?: () => void;
    selection?: IRange;
    e?: Event;
}
export interface IPlainTextBindingHandlerArgs {
    block: IBlock;
    caret: CaretAnchor;
    allowPassthrough?: () => void;
}
export type AsyncBindingHandler = (args: IBindingHandlerArgs) => Promise<void>;
export type BindingHandler = (args: IBindingHandlerArgs) => void;
export type BlockBindingHandler = (block: BlockProperty) => void;
export type KeyboardBinding = Record<string, AsyncBindingHandler>;
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
    metadata?: Record<string, any>;
}
export interface IKeyboardInput {
    platform: Platform;
    control: boolean;
    shift: boolean;
    option: boolean;
    command: boolean;
    //function: boolean;
    key: string;
    keyCode: number;
}
export interface IMouseInput {
    platform: Platform;
    control: boolean;
    shift: boolean;
    option: boolean;
    command: boolean;
    leftButton: boolean;
    rightButton: boolean;
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
    type?: BlockType;
    relation?: Record<string, IBlockDto>;
    children?: IBlockDto[];
    metadata?: Record<string, any>;
    blockProperties?: BlockPropertyDto[];
}
export interface IEmbedDocumentBlockDto extends IBlockDto {
    filename: string;
}
export interface IPlainTextBlockDto extends IBlockDto {
    text: string;
}
export interface ICodeMirrorBlockDto extends IBlockDto {
    text: string;
}
export interface IMainListBlockDto extends IBlockDto {}
export enum Platform {
    Linux,
    Windows,
    Mac
}

export type TPlatformKey = { code: number, platform: Platform; };
export type TKEYS = Record<string, TPlatformKey[]>;
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

export interface IUniverseBlockConstructor {
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

export enum PointerDirection {
    Undo,
    Redo
}
export interface IUniverseBlock extends IBlock {

}
export type CaretAnchor = {
    left?: Node;
    right?: Node;
}
export type Caret = {
    left?: Cell;
    right: Cell;
};
export type CellElement = {
    cell: Cell;
    role: ELEMENT_ROLE;
    isSpace: boolean;
}
export interface ICellConstructor {
    block: StandoffEditorBlock;
    text: string;
    previous?: Cell;
    next?: Cell;
}
export interface ICoordOffsets {
    x: number;
    y: number;
    h: number;
    w: number;
}
export interface ICellCoordOffsets extends ICoordOffsets {
    cy: number;
}
export type CellNode = Node & { speedy: CellElement };
export type CellHtmlElement = HTMLElement & { speedy: CellElement };
export interface ICursor {
    anchorCell: Cell;
    caret: CARET;
}
export interface IAbstractBlockConstructor extends IBlockDto {
    id?: string;
    container?: HTMLDivElement;
    manager: UniverseBlock;
    blockSchemas?: IBlockPropertySchema[];
    root?: IBlock;
}
export interface IAbstractBlockConstructor2 {
    id?: string;
    container?: HTMLDivElement;
    manager: UniverseBlock;
    metadata?: Record<string, any>;
    blockProperties?: BlockProperty[];
    blockSchemas?: IBlockPropertySchema[];
    root?: IBlock;
}
export enum InputEventSource {
    Keyboard,
    Mouse,
    Custom
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
export const passoverClass = "block-modal";
export type InputAction = {
    name: string;                   // "copy"
    description?: string;           // "Copies text in the selection for pasting elsewhere."
    handler: AsyncBindingHandler;        // The function that carries out the task.
}
export enum CARET {
    LEFT = 0,
    RIGHT = 1
}
export class Word {
    start: number;
    end: number;
    text: string;
    previous?: Word;
    next?: Word
    constructor(start: number, end: number, text: string) {
        this.start = start;
        this.end = end;
        this.text = text;
    }
}
export type StandoffPropertyDto = {
    id?: GUID,
    blockGuid?: GUID,
    start: number,
    end: number,
    type: string,
    text?: string,
    value?: string
    metadata?: Record<string, any>;
    clientOnly?: boolean;
}

export type StandoffEditorBlockDto = {
    id?: GUID
    text: string
    standoffProperties: StandoffPropertyDto[]
    blockProperties?: BlockPropertyDto[]
}
export enum RowPosition {
    Previous,
    Next
}
export enum ELEMENT_ROLE {
    CELL = 0,
    INNER_STYLE_BLOCK = 1,
    ROOT = 2,
    CELL_STYLE = 3,
    TEXT_BLOCK = 4,
    OUTER_STYLE_BLOCK = 5
}
export enum DIRECTION {
    LEFT = 0,
    RIGHT = 1
}

export interface IStandoffPropertyConstructor {
    id?: GUID;
    type: string,
    start: Cell,
    end: Cell,
    value?: string;
    block: StandoffEditorBlock,
    schema: IStandoffPropertySchema,
    metadata?: Record<string, any>;
    clientOnly?: boolean;
}
export interface IRange {
    start: Cell;
    end: Cell;
}

export enum BLOCK_POSITION {
    Inside,
    Start,
    End,
    EmptyLine
};
export interface IStandoffProperty {
    type: string;
    startIndex: number;
    endIndex: number;
    value?: string;
}
export interface IPropertySchema {
    type: string;
    name?: string;
    description?: string;
}
export interface IStandoffPropertySchema extends IPropertySchema {
    event?: any;
    decorate?: {
        cssClass?: string;
        batchRender?: (args: { block: StandoffEditorBlock, properties: StandoffProperty[] }) => void;
    },
    wrap?: {
        cssClass?: string;
    },
    render?: {
        update: (args: { block: StandoffEditorBlock, properties: StandoffProperty[] }) => void;
        destroy: (args: { block: StandoffEditorBlock, properties: StandoffProperty[] }) => void;
    },
    animation?: {
        init?: (args: { block: StandoffEditorBlock, properties: StandoffProperty[] }) => void;
    }
}

export interface IStandoffEditorBlockDto extends IBlockDto {
    text: string;
    standoffProperties?: StandoffPropertyDto[];
}

export interface ICheckBlockDto extends IBlockDto {
    checked: boolean;
}

export interface ISelection extends IRange {
    direction: DIRECTION;
}
export type UniverseBlockEvent = Record<string, ((data?: {}) => void)[]>
export interface IStandoffEditorBlockConstructor extends IAbstractBlockConstructor {
    text?: string;
    standoffProperties?: StandoffPropertyDto[];
    blockProperties?: BlockPropertyDto[];
}
export interface IPlugin {
    type: string;
    property: StandoffProperty;
    destroy(): void;
    serialise(): Record<string, any>;
}
export interface IAnimationPlugin extends IPlugin {
    active: boolean;
    timer: number;
    start(): void;
    stop(): void;
    update(): void;
    pause(): void;
    unpause(): void;
}
export interface IClockPluginConstructor {
    property: StandoffProperty;
}
export enum ClockDirection {
    Clockwise,
    Anticlockwise
}

export const isStr = (value: any) => typeof (value) == "string";
export const isNum = (value: any) => typeof (value) == "number";

export type DocumentHistory = {
    id: string;
    undoStack: IBlockDto[];
    redoStack: IBlockDto[];
    lastChange: number;
}

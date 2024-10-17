export type GUID = string;
export interface IBlockDto {
    id?: GUID;
    type: BlockType;
    relation?: Record<string, IBlockDto>;
    children?: IBlockDto[];
    metadata?: Record<string, any>;
    blockProperties?: BlockPropertyDto[];
}
export interface IndexedBlock {
    block: IBlockDto;
    index: number;
    depth: number;
    path: string;
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
}
export type BlockPropertyDto = {
    id?: GUID,
    blockGuid?: GUID,
    type: string,
    value?: string
    metadata?: Record<string, any>;
}
export type StandoffEditorBlockDto = {
    id?: GUID
    text: string
    standoffProperties: StandoffPropertyDto[]
    blockProperties?: BlockPropertyDto[]
}
export enum BlockType {
    BlockManagerBlock = "block-manager-block",
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
    VideoBlock = "video-block",
    PlainTextBlock = "plain-text-block",
    CodeMirrorBlock = "code-mirror-block",
    CheckboxBlock = "checkbox-block",
    EmbedDocumentBlock = "embed-document-block"
}
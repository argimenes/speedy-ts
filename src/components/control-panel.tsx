import { For } from "solid-js"
import { createStore } from "solid-js/store";
import { GridBlock, GridCellBlock } from "../blocks/grid-block";
import { TabBlock, TabRowBlock } from "../blocks/tabs-block";
import { IndentedListBlock } from "../blocks/indented-list-block";
import { StandoffEditorBlock } from "../blocks/standoff-editor-block";
import { BlockType, CARET, IAbstractBlockConstructor, IBlock, IBlockDto, ISetSource } from "../library/types";
import { renderToNode } from "../library/common";
import { AbstractBlock } from "../blocks/abstract-block";
import { Template } from "../library/templates";
import { DocumentBlock } from "../blocks/document-block";
import { TableBlock } from "../blocks/tables-blocks";
import { IconFile } from "@tabler/icons-solidjs";

type Model = {
    command: string;
    file: string;
    folder: string;
    template: string;
    background: string;
    workspace: string;
    workspaceSourceUrl: string;
}
type Resources = {
    folders: string[];
    files: string[];
    templates: string[];
    workspaces: string[];
    backgrounds: string[];
}
export interface IControlPanelBlockConstructor extends IAbstractBlockConstructor {}

export class ControlPanelBlock extends AbstractBlock {
    node: HTMLElement;
    constructor(args: IControlPanelBlockConstructor){
        super(args);
        this.type = BlockType.ControlPanelBlock;
        this.node = document.createElement("DIV") as HTMLElement;
    }
    async render() {
        const self = this;
        const manager = this.manager;
        if (!manager) return;
        const [model, setModel] = createStore<Model>({
            command: "",
            file: "",
            template: "",
            workspace: ""
        } as any);
        const [resources, setResources] = createStore<Resources>({
            folders: [],
            files: [],
            templates: [],
            workspaces: [],
            backgrounds: [
                "YouTube Video", "Video", "Image", "WebGL"
            ]
        });
        const onWorkspaceSourceSubmit = (e: Event) => {
            e.preventDefault();
            const workspace = manager.getBackground() as any as ISetSource;
            workspace.setSource(model.workspaceSourceUrl);
        }
        const onSubmit = (e:Event) => {
            e.preventDefault();
            runCommand();
        }
        const embedDocument = async (parameters: string[]) => {
            if (!manager) return;
            const filename = parameters && parameters[0] || model.file;
            const block = manager.getBlockInFocus() as IBlock;
            const doc = manager.getParentOfType(block, BlockType.DocumentBlock) as DocumentBlock;
            await doc.embedDocument(block, filename);
        }
        const loadMicroDocument = async (parameters: string[]) => {
            if (!manager) return;
            const filename = parameters && parameters[0] || model.file;
            const block = manager.getBlockInFocus() as StandoffEditorBlock;
            if (block?.type != BlockType.StandoffEditorBlock) return;
            const lastCaret = block.lastCaret;
            const prop = {
                type: "cell/micro-document",
                start: lastCaret.index,
                end: lastCaret.index,
                value: filename
            };
            block.addStandoffPropertiesDto([prop]);
            block.applyBlockPropertyStyling();
            block.setCaret(lastCaret.index, CARET.LEFT);
        }
        const load = async (parameters: string[]) => {
            if (!manager) return;
            const filename = parameters && parameters[0] || model.file;
            await manager.loadServerDocument(filename, model.folder);
        }
        const loadTemplate = async (parameters: string[]) => {
            if (!manager) return;
            const filename = parameters && parameters[0] || model.file;
            await manager.loadServerTemplate(filename);
        }
        const loadWorkspace = async (parameters: string[]) => {
            if (!manager) return;
            const workspace = parameters && parameters[0] || model.workspace;
            await manager.loadWorkspace(workspace);
        }
        const save = async (parameters: string[]) => {
            if (!manager) return;
            const filename = parameters && parameters[0] || model.file;
            const focusBlock = manager.getBlockInFocus();
            const doc = manager.getParentOfType(focusBlock, BlockType.DocumentBlock) as DocumentBlock;
            await manager.saveServerDocument(doc.id, filename, model.folder);
            await listDocuments();
        }
        const listDocuments = async () => {
            if (!self?.manager) return;
            const files = await manager!.listDocuments();
            setResources("files", files);
        }
        const listTemplates = async () => {
            if (!self?.manager) return;
            const files = await manager!.listTemplates();
            setResources("templates", files);
        }
        const loadFolderClicked = async (e: Event) => {
            e.preventDefault();
            const files = await manager.listDocuments(model.folder);
            setResources("files", files);
            setModel("file", files[0]);
        }
        const loadSelectedFileClicked = async (e: Event) => {
            e.preventDefault();
            await load([model.file]);
        }
        const loadSelectedTemplateClicked = async (e: Event) => {
            e.preventDefault();
            await loadTemplate([model.template]);
        }
        const loadSelectedBackgroundClicked = async (e: Event) => {
            e.preventDefault();
            switch (model.background)
            {
                case "Image": manager.switchToImageBackground(); break;
                case "Video": manager.switchToVideoBackground(); break;
                case "YouTube Video": manager.switchToYouTubeVideoBackground(); break;
                case "WebGL": manager.switchToWebGLBackground(); break;
                default: break;
            }
        }
        const loadSelectedWorkspaceClicked = async (e: Event) => {
            e.preventDefault();
            await loadWorkspace([model.workspace]);
        }
        const createCodeMirrorBlock = () => {
            const block = manager?.getBlockInFocus();
            if (!block) return;
            const doc = manager.getParentOfType(block, BlockType.DocumentBlock) as DocumentBlock;
            doc.addCodeMirrorBlock(block);
        }
        const createNewDocumentClicked = (e: Event) => {
            e.preventDefault();
            createDocument();
        }
        const saveWorkspace = async () => {
            await manager.saveWorkspace();
        };
        const createDocument = async () => {
            const dto = Template.EmptyDocument;
            await manager.createDocumentWithWindow(dto);
        }
        const setBackgroundColour = (colour: string) => {
            const prop = {
                type: "block/background/colour",
                value: colour
            };
            const block = manager?.getBlockInFocus();
            if (!block) return;
            block.addBlockProperties([prop]);
        }
        const setBackgroundImage = (url: string) => {
            const prop = {
                type: "block/background/image",
                value: url
            };
            const block = manager?.getBlockInFocus();
            if (!block) return;
            block.addBlockProperties([prop]);
            block.applyBlockPropertyStyling();
        }
        const setFontColour = (colour: string) => {
            const prop = {
                type: "block/font/colour",
                value: colour
            };
            const block = manager?.getBlockInFocus();
            if (!block) return;
            block.addBlockProperties([prop]);
        }
        const addImage = (url: string) => {
            const block = manager?.getBlockInFocus();
            if (!block) return;
            const doc = manager.getParentOfType(block, BlockType.DocumentBlock) as DocumentBlock;
            doc.addImageBlock(block, url);
        }
        const addImageRight = (url: string) => {
            const block = manager?.getBlockInFocus();
            if (!block) return;
            const doc = manager.getParentOfType(block, BlockType.DocumentBlock) as DocumentBlock;
            doc.addImageRight(block, url);
        }
        const addImageLeft = (url: string) => {
            const block = manager?.getBlockInFocus();
            if (!block) return;
            const doc = manager.getParentOfType(block, BlockType.DocumentBlock) as DocumentBlock;
            doc.addImageLeft(block, url);
        }
        const addVideo = (url: string) => {
            const block = manager?.getBlockInFocus();
            if (!block) return;
            const doc = manager.getParentOfType(block, BlockType.DocumentBlock) as DocumentBlock;
            doc.addVideoBlock(block, url);
        }
        const addIFrame = (url: string) => {
            const block = manager?.getBlockInFocus();
            if (!block) return;
            const doc = manager.getParentOfType(block, BlockType.DocumentBlock) as DocumentBlock;
            doc.addIFrameBlock(block, url);
        }
        const createGrid = (rows: number, cells: number) => {
            const block = manager.getBlockInFocus();
            if (!block) return;
            const doc = manager.getParentOfType(block, BlockType.DocumentBlock) as DocumentBlock;
            const grid = doc.createGrid(rows, cells) as GridBlock;
            doc.addBlockAfter(grid, block);
            const textBlock = grid.blocks[0].blocks[0].blocks[0] as StandoffEditorBlock;
            manager.setBlockFocus(textBlock);
            textBlock.moveCaretStart();
        }
        const createTable = (rows: number, cells: number) => {
            const block = manager.getBlockInFocus();
            if (!block) return;
            const doc = manager.getParentOfType(block, BlockType.DocumentBlock) as DocumentBlock;
            const table = doc.createTable(rows, cells) as TableBlock;
            doc.addBlockAfter(table, block);
            const textBlock = table.blocks[0].blocks[0].blocks[0] as StandoffEditorBlock;
            manager.setBlockFocus(textBlock);
            textBlock.moveCaretStart();
        }
        const setTabName = (name: string) => {
            const block = manager?.getBlockInFocus();
            if (!block) return;
            const tab = manager?.getParent(block) as TabBlock;
            if (!tab || tab.type != BlockType.TabBlock) return;
            tab.setName(name);
            const row = tab.relation.parent as TabRowBlock;
            row.renderLabels();
        }
        const addTab = (name: string) => {
            const block = manager?.getBlockInFocus();
            if (!block) return;
            const tab = manager?.getParent(block) as TabBlock;
            if (!tab || tab.type != BlockType.TabBlock) return;
            let row = tab.getRow();
            row.addTab({ previousTabId: tab.id, name });
        }
        const collapse = (name: string) => {
            const block = manager?.getBlockInFocus() as IndentedListBlock;
            if (!block || block.type != BlockType.IndentedListBlock) return;
            block.collapse();
        }
        const expand = (name: string) => {
            const block = manager?.getBlockInFocus() as IndentedListBlock;
            if (!block || block.type != BlockType.IndentedListBlock) return;
            block.expand();
        }
        const mergeNext= () => {
            const block = manager?.getBlockInFocus() as StandoffEditorBlock;
            if (!block) return;
            const next = block.relation.next;
            if (!next) return;
            const doc = manager.getParentOfType(block, BlockType.DocumentBlock) as DocumentBlock;
            doc.mergeBlocks(next.id, block.id);
        }
        const split = () => {
            const block = manager?.getBlockInFocus() as StandoffEditorBlock;
            if (!block) return;
            const doc = manager.getParentOfType(block, BlockType.DocumentBlock) as DocumentBlock;
            const caret = block.lastCaret;
            doc.splitTextBlock(block.id, caret.index || 0);
        }
        const swapGridCells = () => {
            const block = manager?.getBlockInFocus() as IBlock;
            if (!block) return;
            const row = manager?.getParentOfType(block, BlockType.GridRowBlock);
            if (!row) return;
            const len = row.blocks.length;
            if (len < 2) return;
            const cell = manager?.getParentOfType(block, BlockType.GridCellBlock) as GridCellBlock;
            const ci = row.blocks.findIndex(x => x.id == cell.id);
            if (ci == len) return;
            const left = row.blocks[ci] as GridCellBlock;
            const right = row.blocks[ci + 1] as GridCellBlock;
            manager?.swapCells(left, right);
        }
        const setMultiColumns = (cols: string) => {
            const block = manager?.getBlockInFocus();
            manager?.setMultiColumns(block!.id, parseInt(cols));
        }
        const explodeTabs = () => {
            const block = manager?.getBlockInFocus();
            manager?.explodeTabs(block!.id);
        }
        const testLoadDocument =(rows: string) => {
            // manager?.testLoadDocument(parseInt(rows));
        }
        const newTabRow = () => {
            const sibling = manager?.getBlockInFocus();
            manager?.addTabRowAfter(sibling!.id);
        }
        const makeCheckbox = () => {
            const block = manager?.lastFocus;
            const doc = manager.getParentOfType(block, BlockType.DocumentBlock) as DocumentBlock;
            doc?.makeCheckbox(block);
        }
        const moveBlockUp = () => {
            const block = manager?.getBlockInFocus() as IBlock;
            const doc = manager.getParentOfType(block, BlockType.DocumentBlock) as DocumentBlock;
            doc.moveBlockUp(block);
        }
        const moveBlockDown = () => {
            const block = manager?.getBlockInFocus() as IBlock;
            const doc = manager.getParentOfType(block, BlockType.DocumentBlock) as DocumentBlock;
            doc.moveBlockDown(block);
        }
        const toTab = () => {
            const block = manager?.getBlockInFocus();
            const doc = manager.getParentOfType(block, BlockType.DocumentBlock) as DocumentBlock;
            doc.convertBlockToTab(block!.id);
        }
        const runCommand = async () => {
            if (!model.command) {
                return;
            }
            const [command, ...parameters] = model.command.split(" ");
            switch (command.toLowerCase())
            {
                case "load": await load(parameters); return;
                case "save": await save(parameters); return;
                case "make-checkbox": await makeCheckbox(); return;
                case "move-up": await moveBlockUp(); return;
                case "move-down": await moveBlockDown(); return;
                case "list-docs": await listDocuments(); return;
                case "bgimage": setBackgroundImage(parameters[0]); return;
                case "add-image": addImage(parameters[0]); return;
                case "add-image-right": addImageRight(parameters[0]); return;
                case "add-image-left": addImageLeft(parameters[0]); return;
                case "add-video": addVideo(parameters[0]); return;
                case "add-url": addIFrame(parameters[0]); return;
                case "color": setFontColour(parameters[0]); return;
                case "bgcol": setBackgroundColour(parameters[0]); return;
                case "add-table": createTable(parseInt(parameters[0]), parseInt(parameters[1])); return;
                case "add-grid": createGrid(parseInt(parameters[0]), parseInt(parameters[1])); return;
                // case "collapse": collapse(); return;
                // case "expand": expand(); return;
                case "swap": swapGridCells(); return;
                case "new-doc": createDocument(); return;
                case "cm": createCodeMirrorBlock(); return;
                case "set-tab-name": setTabName(parameters[0]); return;
                case "add-tab": addTab(parameters[0]); return;
                case "new-tab-row": newTabRow(); return;
                case "to-tab": toTab(); return;
                case "explode-tabs": explodeTabs(); return;
                case "multicols": setMultiColumns(parameters[0]); return;
                case "test-load-doc": testLoadDocument(parameters[0]); return;
                case "load-micro-doc": await loadMicroDocument(parameters); return;
                case "embed-doc": await embedDocument(parameters); return;
                case "merge-next": mergeNext(); return;
                case "split": split(); return;
                case "save-workspace": await saveWorkspace(); return;
                default: break;
            }
        }
        const folderChanged = async (e: Event) => {
            e.preventDefault();
            const folder = (e.currentTarget as HTMLInputElement).value;
            setModel("folder", folder);
            await loadFolderClicked(e);
            manager.setFolder(folder);
        }
        const fileChanged = async (e: Event) => {
            if (!e.currentTarget) return;
            setModel("file", (e.currentTarget as HTMLInputElement).value);
            await loadSelectedFileClicked(e);
        }
        const ControlPanel = () => {
            return (
                <div class="control-panel block_theme_glass" style="text-align: left;">
                    <div class="partition">
                        <button type="button" onClick={createNewDocumentClicked}><IconFile /></button>
                    </div>
                    <div class="partition">
                        <select value={model.folder} onChange={folderChanged} style="width: 200px;">
                            <For each={resources.folders}>{(folder) =>
                                <option value={folder}>
                                    {folder}
                                </option>
                            }</For>
                        </select>
                        <button class="form-control" onClick={loadFolderClicked}>Set Folder</button>
                    </div>
                    <div class="partition">
                        <select value={model.file} onChange={fileChanged} style="width: 200px;">
                            <For each={resources.files}>{(file) =>
                                <option value={file}>
                                    {file}
                                </option>
                            }</For>
                        </select>
                        <button class="form-control" onClick={loadSelectedFileClicked}>Load Doc</button>
                    </div>
                    <div class="partition">
                        <select value={model.template} onInput={(e) => setModel("template", e.currentTarget.value)} style="width: 200px;">
                            <For each={resources.templates}>{(template) =>
                                <option value={template}>
                                    {template}
                                </option>
                            }</For>
                        </select>
                        <button class="form-control" onClick={loadSelectedTemplateClicked}>Load Template</button>
                    </div>
                    <div class="partition">
                        <select value={model.workspace} onInput={(e) => setModel("workspace", e.currentTarget.value)} style="width: 200px;">
                            <For each={resources.workspaces}>{(workspace) =>
                                <option value={workspace}>
                                    {workspace}
                                </option>
                            }</For>
                        </select>
                        <button class="form-control" onClick={loadSelectedWorkspaceClicked}>Load Workspace</button>
                    </div>
                    {/* <div class="partition">
                        <form onSubmit={onWorkspaceSourceSubmit}>
                            <input
                                type="text"
                                value={model.workspaceSourceUrl}
                                class="form-control"
                                onInput={(e) => setModel("workspaceSourceUrl", e.currentTarget.value)}
                            />
                            <button type="submit" class="btn btn-default">Set</button>
                        </form>
                    </div> */}
                </div>
            )
        }
        const folders = await manager?.listFolders();
        const files = await manager?.listDocuments() as string[];
        const templates = await manager?.listTemplates() as string[];
        const workspaces = await manager?.listWorkspaces() as string[];
        setResources("folders", folders);
        setResources("files", files);
        setResources("templates", templates);
        setResources("workspaces", workspaces);
        setModel("file", files[0]);
        const jsx = ControlPanel();
        const node = this.node = renderToNode(jsx);
        return node;
    }
    serialize(): IBlockDto {
        throw new Error("Method not implemented.");
    }
    deserialize(json: any | any[]): IBlock {
        throw new Error("Method not implemented.");
    }
    destroy(): void {
        this.node.remove();
    }
}


import { v4 as uuidv4 } from 'uuid';
import { AbstractBlock } from './abstract-block';
import { IAbstractBlockConstructor, BlockType, IMainListBlockDto as IDocumentBlockDto, IBlockDto, IBlock, CARET, InputEventSource, InputEvent, RowPosition, Caret, IBindingHandlerArgs, DIRECTION, ISelection, passoverClass, IRange, FindMatch, EventType, BlockState, GUID, StandoffPropertyDto, isStr, Word, BlockPropertyDto } from '../library/types';
import { StandoffEditorBlock } from './standoff-editor-block';
import { updateElement } from '../library/svg';
import { UniverseBlock } from '../universe-block';
import { AnnotationPanelBlock } from '../components/annotation-panel';
import { fetchGet, renderToNode } from '../library/common';
import { MonitorBlock, StandoffEditorBlockMonitor } from './monitor-block';
import { TextProcessor } from '../library/text-processor';
import _ from 'underscore';
import { SearchEntitiesBlock } from '../components/search-entities';
import { FindReplaceBlock } from '../components/find-replace';
import { IframeBlock } from './iframe-block';
import { ImageBlock } from './image-block';
import { YouTubeVideoBlock } from './youtube-video-block';
import { IndentedListBlock } from './indented-list-block';
import { TabBlock } from './tabs-block';
import { BlockProperty } from '../library/block-property';
import BlockVines from '../library/plugins/block-vines';
import { StandoffProperty } from '../library/standoff-property';
import { BlockPropertySchemas } from '../properties/block-properties';
import { CanvasBlock } from './canvas-block';
import { DocumentTabBlock } from './document-tabs-block';

const maxHistoryItems = 30;
export interface IMultiRangeStandoffProperty {
    blockId: GUID, // The block the Property belongs to 
    standoffPropertyId: GUID // Standoff Property GUIDs
}

export interface IndexedBlock {
  block: IBlock;
  index: number;
  depth: number;
  path: string;
}

export interface IPageBlockConstructor extends IAbstractBlockConstructor {}

export class PageBlock extends AbstractBlock {
    index: IndexedBlock[];
    textProcessor: TextProcessor;
    state: string;
    constructor(args: IPageBlockConstructor) {
        super(args);
        this.type = BlockType.PageBlock;
        this.state = BlockState.initalising;
        this.metadata = args.metadata || {};
        this.index = [];
        this.textProcessor = new TextProcessor();
        this.inputEvents = this.getInputEvents();
        this.setBlockSchemas(this.getBlockSchemas());
        this.setupSubscriptions();
    } 
    applyBlockStyle(type:string, value?: string) {
        const tb = this.manager.getBlockInFocus() as StandoffEditorBlock;
        if (tb.type != BlockType.StandoffEditorBlock) {
            return;
        }
        tb.addBlockProperties([{ type, value }]);
        tb.applyBlockPropertyStyling();
        tb.updateView();
    }
    applyStandoffProperty(block: StandoffEditorBlock, type: string) {
        const selection = block.getSelection();
        if (selection) {
            block.createStandoffProperty(type, selection);
        } else {
            block.toggleStandoffPropertyMode(type);
        }
    }
    static getRightMarginBlockBuilder() {
        return {
            type: BlockType.RightMarginBlock,
            builder: async (container: HTMLElement, dto: IBlockDto, manager: UniverseBlock) => {
                if (dto.metadata?.loadFromExternal) {
                    const res = await fetchGet("/api/loadDocumentJson", { folder: dto.metadata.folder, filename: dto.metadata.filename });
                    const json = await res.json();
                    dto = json.Data.document;
                }
                const block = new PageBlock({ ...dto, manager });
                block.addBlockProperties([ { type: "block/marginalia/right" }, { type: "block/alignment", value: "right" } ]);
                block.applyBlockPropertyStyling();
                await manager.buildChildren(block, dto);
                container.appendChild(block.container);
                return block;
            }
        };
    }
    static getLeftMarginBlockBuilder() {
        return {
            type: BlockType.LeftMarginBlock,
            builder: async (container: HTMLElement, dto: IBlockDto, manager: UniverseBlock) => {
                if (dto.metadata?.loadFromExternal) {
                    const res = await fetchGet("/api/loadDocumentJson", { folder: dto.metadata.folder, filename: dto.metadata.filename });
                    const json = await res.json();
                    dto = json.Data.document;
                }
                const block = new PageBlock({ ...dto, manager });
                block.addBlockProperties([ { type: "block/marginalia/left" } ]);
                block.applyBlockPropertyStyling();
                await manager.buildChildren(block, dto);
                container.appendChild(block.container);
                return block;
            }
        };
    }
    static getBlockBuilder() {
        return {
            type: BlockType.PageBlock,
            builder: async (container: HTMLElement, dto: IBlockDto, manager: UniverseBlock) => {
                if (dto.metadata?.loadFromExternal) {
                    const res = await fetchGet("/api/loadDocumentJson", { folder: dto.metadata.folder, filename: dto.metadata.filename });
                    const json = await res.json();
                    if (!json.Success) {
                        console.log("DocumentBlock.getBlockBuilder", { container, dto });
                    } else {
                        dto = json.Data.document;
                    }
                }
                const document = new PageBlock({ ...dto, manager });
                document.applyBlockPropertyStyling();
                updateElement(document.container, { classList: ["document-container"] });
                document.generateIndex();
                await manager.buildChildren(document, dto);
                container.appendChild(document.container);
                return document;
            }
        };
    }
    
    getBlockSchemas() {
        const manager = this.manager;
        return [
            ...BlockPropertySchemas.getDocumentBlockProperties(),
            {
                type: "document/contiguous-standoff",
                name: "A standoff property that is composed of two contiguous standoff properties in adjoining blocks",
                metadata: {
                    ranges: [] as IMultiRangeStandoffProperty[]
                }
            },
            {
                type: "block/vines",
                name: "Block vines",
                event: {
                    onInit: (p: BlockProperty) => {
                        const vines = new BlockVines(p.block);
                        vines.update();
                    }
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
                type: "block/indent",
                event: {
                    onInit: async (p: BlockProperty) => {
                        p.block.container.style.marginLeft = (parseInt(p.value) * 20) + "px";
                    }
                },
                render: {
                    destroy: async (p: BlockProperty) => {
                        p.block.container.style.marginLeft = "unset";
                    },
                    update: async (p: BlockProperty) => {
                        p.block.container.style.marginLeft = (parseInt(p.value) * 20) + "px";
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
    setupSubscriptions() {
        this.subscribeTo(EventType.beforeChange, this.addToHistory.bind(this));
    }
    
    createTable(rows: number, cells: number) {
        const manager = this.manager;
        const table = manager.createTableBlock();
        const width = 100 / cells;
        for (let row = 1; row <= rows; row++) {
            const row = manager.createTableRowBlock();
            for (let cell = 1; cell <= cells; cell++) {
                const cell = manager.createTableCellBlock({
                    type: BlockType.TableCellBlock,
                    metadata: {
                        width: "50px"
                    }
                });
                const textBlock = manager.createStandoffEditorBlock();
                textBlock.addEOL();
                this.addBlockTo(cell, textBlock);
                this.addBlockTo(row, cell);
                cell.container.appendChild(textBlock.container);
                row.container.appendChild(cell.container);
            }
            this.addBlockTo(table, row);
            table.container.appendChild(row.container);
        }
        manager.generatePreviousNextRelations(table);
        return table;
    }
    createGrid(rows: number, cells: number) {
        const manager = this.manager;
        const gridBlock = manager.createGridBlock();
        const width = 100 / cells;
        for (let row = 1; row <= rows; row++) {
            const rowBlock = manager.createGridRowBlock();
            for (let cell = 1; cell <= cells; cell++) {
                const cellBlock = manager.createGridCellBlock({
                    type: BlockType.GridCellBlock,
                    metadata: {
                        width: (width-2) + "%"
                    }
                });
                const textBlock = manager.createStandoffEditorBlock();
                textBlock.addEOL();
                this.addBlockTo(cellBlock, textBlock);
                this.addBlockTo(rowBlock, cellBlock);
                cellBlock.container.appendChild(textBlock.container);
                rowBlock.container.appendChild(cellBlock.container);
            }
            this.addBlockTo(gridBlock, rowBlock);
            gridBlock.container.appendChild(rowBlock.container);
        }
        manager.generatePreviousNextRelations(gridBlock);
        return gridBlock;
    }
    addImageBlock(anchor: IBlock, url: string) {        
        const manager = this.manager;
        const image = manager.createImageBlock({
            type: BlockType.ImageBlock,
            metadata: {
                url: url
            }
        }) as ImageBlock;
        image.build();
        this.addBlockAfter(image, anchor);
        return image;
    }
    addImageLeft(block: IBlock, url: string) {
        const manager = this.manager;
        const parent = manager.getParent(block) as AbstractBlock;
        const previous = block.relation.previous;
        const next = block.relation.next;
        const grid = manager.createGridBlock();
        const row = manager.createGridRowBlock();
        const cell1 = manager.createGridCellBlock({
            type: BlockType.GridCellBlock,
            metadata: {
                width: "48%"
            }
        });
        const cell2 = manager.createGridCellBlock({
            type: BlockType.GridCellBlock,
            metadata: {
                width: "48%"
            }
        });
        const image = manager.createImageBlock({
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
        manager.generateParentSiblingRelations(cell1);
        manager.generateParentSiblingRelations(cell2);
        manager.generateParentSiblingRelations(row);
        manager.generateParentSiblingRelations(grid);
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
        const i = manager.getIndexOfBlock(block);
        this.removeBlockAt(parent, i);
        this.insertBlockAt(parent, grid, i);
        manager.appendSibling(block.container, grid.container);
        cell2.container.append(block.container);
    }
    
    
    
    makeCheckbox(block: IBlock) {
        const manager = this.manager;
        this.triggerBeforeChange();
        const root = manager.getParentOfType(block, BlockType.PageBlock);
        const parent = block.relation.parent as AbstractBlock;
        const checkbox = manager.createCheckboxBlock();
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
        manager.reindexAncestorDocument(root);
        manager.generateParentSiblingRelations(checkbox);
        manager.generateParentSiblingRelations(parent);
    }
    moveBlockUp(block: IBlock) {
        const manager = this.manager;
        this.triggerBeforeChange();
        const root = manager.getParentOfType(block, BlockType.PageBlock) as PageBlock;
        const i = root.index.findIndex(x => x.block.id == block.id);
        if (i <= 0) {
            return;
        }
        let previous = root.index[i-1].block;
        if (block.relation.parent?.type == BlockType.CheckboxBlock) {
            if (previous.relation?.parent.type == BlockType.CheckboxBlock) {
                previous = root.index[i-2].block;
            }
            manager.insertBlockBefore(previous, block.relation.parent);
            return;            
        }
        manager.insertBlockBefore(previous, block);
    }    
    moveBlockDown(block: IBlock) {
        const manager = this.manager;
        this.triggerBeforeChange();
        const root = manager.getParentOfType(block, BlockType.PageBlock) as PageBlock;
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
            manager.insertBlockAfter(next, block.relation.parent);
            return;            
        }
        manager.insertBlockAfter(next, block);
    }
    minimalTimeElapsedSinceLastChange() {
        if (this.state == BlockState.loading) {
            return false;
        }
        const history = this.getHistory();
        const now = Date.now();
        const ms = now - history.lastChange;
        if (ms < 1000) {
            return false;
        }
        this.updateLastChange();
        return true;
    }
    updateLastChange() {
        const history = this.getHistory();
        history.lastChange = Date.now();
    }
    
    addToHistory() {
        if (!this.minimalTimeElapsedSinceLastChange()) {
            return;
        }
        this.manager.takeSnapshot(this.id);
    }
    clearHistory() {
        const history = this.getHistory();
        history.lastChange = Date.now();
        history.undoStack = [];
        history.redoStack = [];
    }
    
   
    async handleFind(args: IBindingHandlerArgs) {
        const manager = this.manager;
        const source = args.block as StandoffEditorBlock;
        const findReplace = new FindReplaceBlock({ manager: manager, source });
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
        manager.registerBlock(findReplace);
        manager.setBlockFocus(findReplace);
    }
    async applyEntityReferenceToText(args: IBindingHandlerArgs) {
        const manager = this.manager;
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
            manager: this.manager,
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
        manager.registerBlock(searchBlock);
        manager.setBlockFocus(searchBlock);
        block.removeFocus();
        searchBlock.setFocus();
    }
    async handleCreateNewTab(args: IBindingHandlerArgs) {
        const textBlock = args.block as StandoffEditorBlock;
        const manager = textBlock.manager as UniverseBlock;
        const parent = manager.getParentOfType(textBlock, BlockType.TabBlock) as TabBlock;
        if (parent?.type == BlockType.TabBlock) {
            const row = parent.getRow();
            await row.appendTab(textBlock.id);
        } else {
            await this.convertBlockToTab(textBlock.id);
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
        const manager = this.manager;
        const listParent = block.relation.parent;
        if (listParent.type != BlockType.IndentedListBlock) {
            return;
        }
        if (block.id != listParent.blocks[0].id) {
            return;
        }
        const parent = listParent.relation.parent;
        manager.insertBlockAfter(parent, block);
        if (block.metadata.indentLevel) {
            block.metadata.indentLevel--;
        }
        manager.renderIndent(block);
        manager.reindexAncestorDocument(parent);
    }
    async indentBlock(args: IBindingHandlerArgs) {
        const manager = this.manager;
        const block = args.block as StandoffEditorBlock;
        const parent = block.relation.parent;
        if (parent.blocks[0].id == block.id && parent.type == BlockType.IndentedListBlock) {
            /**
             * Quit if this is the first child of another block.
             */
            console.log("handleTabKey", { error: "Cannot indent the first item in a list.", block, parent });
            return;
        }
        const list = manager.createIndentedListBlock();
        const previous = block.relation.previous;
        if (!previous) {
            console.log("handleTabKey", { error: "Expected to find a previous block." })
            return;
        }
        this.addBlockTo(list, block);
        this.addBlockTo(parent, list);
        const firstListParent = manager.getParentOfType(block, BlockType.IndentedListBlock) as IndentedListBlock;
        const level = firstListParent?.metadata.indentLevel || 0 as number;
        list.metadata.indentLevel = level + 1;
        list.container.appendChild(block.container);
        updateElement(list.container, {
            classList: ["list-item-numbered"]
        });
        previous.container.appendChild(list.container);
        manager.renderIndent(list);
    }
    async applyBoldToText(args: IBindingHandlerArgs) {
        args.block.manager.applyStandoffProperty(args.block as StandoffEditorBlock, "style/bold") 
    }
    async applyBlurToText(args: IBindingHandlerArgs) {
        args.block.manager.applyStandoffProperty(args.block as StandoffEditorBlock, "style/blur") 
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
    async applyMirrorToText(args: IBindingHandlerArgs) {
        const block = args.block as StandoffEditorBlock;
        const selection = block.getSelection();
        if (selection) {
            block.createStandoffProperty("style/mirror", selection);
        } else {
            // TBC
        }      
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
    getAllStandoffPropertiesByType(type: string) {
        const blocks = this.manager.registeredBlocks
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
    async handleAnnotationMonitorClicked(args: IBindingHandlerArgs) {
        const caret = args.caret as Caret;
        const block = args.block as StandoffEditorBlock;
        const manager = this.manager;
        const anchor = caret.left || caret.right;
        // block.setMarker(anchor, this.container);
        if (block.cache.monitor) {
            block.cache.monitor.remove();
            block.cache.monitor = undefined;
        }
        const props = block.getEnclosingProperties(anchor);
        if (!props.length) return;
        const monitor = new MonitorBlock({ manager: manager });
        const component = StandoffEditorBlockMonitor({
            monitor,
            properties: props,
            onDelete: (p) => {
                p.destroy();
            },
            onClose: () => {
                block.cache.monitor?.remove();
                manager.deregisterBlock(monitor.id);
                block.setCaret(anchor.index, CARET.LEFT);
                manager.setBlockFocus(block);
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
                "z-index": manager.getHighestZIndex()
            },
            parent: this.container
        });
        block.removeFocus();
        monitor.setFocus();
        manager.registerBlock(monitor);
        manager.setBlockFocus(monitor);
    }
    async moveCaretToStartOfTextBlock(args: IBindingHandlerArgs) {
        const block = args.block as StandoffEditorBlock;
        block.moveCaretStart();
    }
    async moveCaretToEndOfTextBlock(args: IBindingHandlerArgs) {
        const block = args.block as StandoffEditorBlock;
        block.moveCaretEnd();
    }
    async handleCopy(args: IBindingHandlerArgs) {
        const block = args.block as StandoffEditorBlock;
        const selection = args.selection as IRange;
        const manager = this.manager;
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
        manager.clipboard.push(data);
        console.log("Copy .. dump", {  block, text, data, si, ei });
    }
    async handleBackspace(args: IBindingHandlerArgs) {
        const manager = this.manager;
        const caret = args.caret as Caret;
        const block = args.block as StandoffEditorBlock;
        if (manager.hasSelections()) {
            manager.deleteSelections();
            return;
        }
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
                manager.setBlockFocus(previous);
                if (previous.type == BlockType.StandoffEditorBlock) {
                    (previous as StandoffEditorBlock).moveCaretEnd();
                }
                return;
            }
            const parent = block.relation.parent;
            if (parent) {
                this.deleteBlock(block.id);
                manager.setBlockFocus(parent);
                return;
            }
        }
        const atStart = !caret.left;
        if (atStart) {
            if (block.relation.previous?.type == BlockType.StandoffEditorBlock) {
                const previous = block.relation.previous as StandoffEditorBlock;
                if (previous.isEmpty()) {
                    this.deleteBlock(block.relation.previous.id);
                    manager.setBlockFocus(block);
                    block.moveCaretStart();
                    return;
                }
                const li = previous.getLastCell().index;
                this.mergeBlocks(block.id, previous.id);
                setTimeout(() => {
                    manager.setBlockFocus(previous);
                    previous.setCaret(li, CARET.LEFT);
                }, 1);
                return;
            } else {
                manager.setBlockFocus(block.relation.previous);
                return;
            }
        }
        const ci = caret.left?.index as number;
        block.removeCellAtIndex(ci, true);
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
    async moveCaretUp(args: IBindingHandlerArgs) {
        args.block.handleArrowUp({ manager: this.manager });
    }
    async moveCaretDown(args: IBindingHandlerArgs) {
        args.block.handleArrowDown({ manager: this.manager });
    }
    async moveCaretRight(args: IBindingHandlerArgs) {
        args.block.handleArrowRight({ manager: this.manager });
    }
    async moveCaretLeft(args: IBindingHandlerArgs) {
        args.block.handleArrowLeft({ manager: this.manager });
    }
    async handleMoveBlockUp(args: IBindingHandlerArgs) {
        const block = args.block;
        const manager = this.manager;
        this.moveBlockUp(args.block);
        manager.setBlockFocus(block);
        if (block.type == BlockType.StandoffEditorBlock) {
            const caret = args.caret as Caret;
            (block as StandoffEditorBlock).setCaret(caret?.right.index, CARET.LEFT);
        }
    }
    async handleMoveBlockDown(args: IBindingHandlerArgs) {
        const block = args.block;
        const manager = this.manager;
        this.moveBlockDown(block);
        manager.setBlockFocus(block);
        if (block.type == BlockType.StandoffEditorBlock) {
            const caret = args.caret as Caret;
            (block as StandoffEditorBlock).setCaret(caret?.right.index, CARET.LEFT);
        }
    }
    async handleCreateRightMargin(args: IBindingHandlerArgs){
        const block = args.block as StandoffEditorBlock;
        const manager = block.manager as UniverseBlock;
        let rightMargin = block.relation.rightMargin as PageBlock;
        block.clearSelection();
        /**
         * If there is no LeftMarginBlock already then create one and add
         * a StandoffEditorBlock to it.
         */
        if (!rightMargin) {
            this.manager.handleBuildingMarginBlocks(block, {
                relation: {
                    rightMargin: {
                        type: BlockType.RightMarginBlock,
                        blockProperties: [
                            { type: "block/marginalia/right" }
                        ],
                        children: [
                            {
                                type: BlockType.StandoffEditorBlock,
                                blockProperties: [
                                    { type: "block/alignment", value: "right" }, { type: "block/font/size/three-quarters" }
                                ]
                            }
                        ]
                    }
                }
            });
            rightMargin = block.relation.rightMargin as PageBlock;
            const textBlock = rightMargin.blocks[0] as StandoffEditorBlock;
            setTimeout(() => {
                manager.setBlockFocus(textBlock);
                textBlock.moveCaretStart();
            }, 100);
            return;
        }
        const textBlock = rightMargin.blocks[0] as StandoffEditorBlock;
        setTimeout(() => {
            textBlock.moveCaretStart();
            manager.setBlockFocus(textBlock);
        }, 1);
    }
    async handleCreateLeftMargin(args: IBindingHandlerArgs){
        const block = args.block as StandoffEditorBlock;
        const manager = block.manager as UniverseBlock;
        let leftMargin = block.relation.leftMargin as PageBlock;
        block.clearSelection();
        /**
         * If there is no LeftMarginBlock already then create one and add
         * a StandoffEditorBlock to it.
         */
        if (!leftMargin) {
            this.manager.handleBuildingMarginBlocks(block, {
                relation: {
                    leftMargin: {
                        type: BlockType.LeftMarginBlock,
                        blockProperties: [
                            { type: "block/marginalia/left" }
                        ],
                        children: [
                            {
                                type: BlockType.StandoffEditorBlock,
                                blockProperties: [
                                    { type: "block/alignment", value: "left" }, { type: "block/font/size/three-quarters" }
                                ]
                            }
                        ]
                    }
                }
            });
            leftMargin = block.relation.leftMargin as PageBlock;
        }
        const textBlock = leftMargin.blocks[0] as StandoffEditorBlock;
        setTimeout(() => {
            textBlock.moveCaretStart();
            manager.setBlockFocus(textBlock);
        }, 100);
    }
    findNearestWord(index: number, words: Word[]) {
        const lastIndex = words.length - 1;
        for (let i = lastIndex; i >= 0; i--) {
            let word = words[i];
            if (index >= word.start) return word;
        }
        return null;
    }
    
    pastePlainTextItem(targetBlockId: GUID, ci: number, item: any) {
        const manager = this.manager;
        const block = this.getBlock(targetBlockId) as StandoffEditorBlock;
        const text = item.data.text;
        const lines = manager.splitLines(text);
        let currentBlock = block;
        let temp = [block];
        const len = lines.length;
        for (let i = 0; i < len; i++) {
            if (i == 0) {
                block.insertTextAtIndex(lines[0], ci);
                continue;
            }
            currentBlock = temp[i-1];
            const newBlock = manager.createStandoffEditorBlock();
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
        manager.setBlockFocus(lastBlock);
        const lastCell = lastBlock.getLastCell();
        lastBlock.setCaret(lastCell.index, CARET.LEFT);
    }
    async embedDocument(sibling: IBlock, filename: string) {
        const manager = this.manager;
        const parent = manager.getParent(sibling) as AbstractBlock;
        await manager.loadServerDocument(filename);
        updateElement(manager.container, {
            style: {
                zoom: 0.5,
                "overflow-x": "hidden",
                "overflow-y": "scroll"
            }
        });
        this.addBlockAfter(manager, sibling);
        manager.generateParentSiblingRelations(parent);
        manager.setBlockFocus(manager.blocks[0]);
    }
    addCodeMirrorBlock(sibling: IBlock) {
        const manager = this.manager;
        const parent = manager.getParent(sibling) as AbstractBlock;
        const cm = manager.createCodeMirrorBlock();
        manager.generateParentSiblingRelations(parent);
        this.addBlockAfter(cm, sibling);
        manager.setBlockFocus(cm);
        return cm;
    }
    
    async loadAnnotationMenu(args: IBindingHandlerArgs) {
        const manager = this.manager;
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
            manager: this.manager,
            source: block,
            selection,
            events: {
                onClose: () => {
                    manager.deregisterBlock(panel.id);
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
        manager.registerBlock(panel);
        manager.setBlockFocus(panel);
    }
    async handlePaste(args: IBindingHandlerArgs) {
        //document.body.focus();
        const manager = this.manager;
        const block = args.block as StandoffEditorBlock;
        const caret = (args.caret || block.getCaret()) as Caret;
        const e = args.e as ClipboardEvent;
        const clipboardData = e.clipboardData as DataTransfer; // || window.clipboardData;
        const json = clipboardData.getData('application/json');
        const text = clipboardData.getData('text');
        //const html = clipboardData.getData("text/html");
        if (clipboardData.files.length) {
            const file = clipboardData.files[0];
            const dimensions = await manager.getImageDimensions(file);
            const save = await manager.saveImageToServer(file);
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
            manager.pasteCodexItem(block.id, ci, item);
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
    
   
    async convertBlockToTab(blockId: GUID) {
        const manager = this.manager;
        const source = this.manager.getBlock(blockId) as IBlock;
        if (!source) {
            console.error("convertBlockToTab", { error: "Source block not found.", blockId });
            return; 
        } 
        const row = await manager.createTabRowBlock();
        const tab = await manager.createTabBlock({
            metadata: {
                name: "1"
            }
        });
        const parent = manager.getParent(source) as AbstractBlock;
        const bi = parent.blocks.findIndex(x=> x.id == source.id);
        this.removeBlockAt(parent, bi);
        this.addBlockTo(tab, source);
        this.addBlockTo(row, tab);
        this.insertBlockAt(parent, row, bi);
        row.renderLabels();
        row.firstTab()?.setActive();
        const previous = source.relation.previous;
        if (previous) {
            previous.relation.next = row;
            row.relation.previous = previous;
        }
        const next = source.relation.next;
        if (next) {
            next.relation.previous = row;
            row.relation.next = next;
        }
        delete source.relation.previous;
        source.relation.parent = tab;
        tab.relation.parent = row;
        row.relation.parent = parent;
        manager.generateParentSiblingRelations(parent);
        /**
         * Sort out all the tab panel stuff, rendering the label, etc.
         */
        source.container.insertAdjacentElement("afterend", row.container);
        row.container.appendChild(tab.container);
        tab.panel.appendChild(source.container);
        manager.setBlockFocus(source);
        if (source.type == BlockType.StandoffEditorBlock) {
            setTimeout(() => {
                const _block = source as StandoffEditorBlock;
                const caret = _block.lastCaret;
                _block.setCaret(caret.index, CARET.LEFT);
            }, 1);
        }
        return row;
    }
    convertToDocumentTab(blockId: GUID) {
        const manager = this.manager;
        const block = this.manager.getBlock(blockId) as StandoffEditorBlock;
        const doc = this.manager.getParentOfType(block, BlockType.PageBlock) as PageBlock;
        if (!doc) return;
        const tabRow = manager.createDocumentTabRowBlock();
        const tab = manager.createDocumentTabBlock({
            type: BlockType.DocumentTabBlock,
            metadata: {
                name: "Page 1"
            }
        });
        const parent = manager.getParent(doc) as AbstractBlock;
        const bi = parent.blocks.findIndex(x=> x.id == doc.id);
        this.removeBlockAt(parent, bi);
        this.addBlockTo(tab, doc);
        this.addBlockTo(tabRow, tab);
        this.insertBlockAt(parent, tabRow, bi);
        tabRow.renderLabels();
        (tabRow.blocks[0] as DocumentTabBlock)?.setActive();
        const previous = doc.relation.previous;
        if (previous) {
            previous.relation.next = tabRow;
            tabRow.relation.previous = previous;
        }
        const next = doc.relation.next;
        if (next) {
            next.relation.previous = tabRow;
            tabRow.relation.next = next;
        }
        delete doc.relation.previous;
        doc.relation.parent = tab;
        tab.relation.parent = tabRow;
        tabRow.relation.parent = parent;
        manager.generateParentSiblingRelations(parent);
        /**
         * Sort out all the tab panel stuff, rendering the label, etc.
         */
        doc.container.insertAdjacentElement("afterend", tabRow.container);
        tabRow.container.appendChild(tab.container);
        tab.panel.appendChild(doc.container);
        manager.setBlockFocus(doc);
        if (block.type == BlockType.StandoffEditorBlock) {
            const caret = block.lastCaret;
            block.setCaret(caret.index, CARET.LEFT);
        }
        return tabRow;
    }
    setFocus() {
        const manager = this.manager;
        if (this.metadata?.focus?.blockId) {
            const block = this.getBlock(this.metadata.focus.blockId);
            manager.setBlockFocus(block);
            if (this.metadata.focus.caret) {
                (block as StandoffEditorBlock)?.setCaret(this.metadata.focus.caret, CARET.LEFT);
            }
        } else {
            const textBlock = manager.registeredBlocks.find(x => x.type == BlockType.StandoffEditorBlock) as StandoffEditorBlock;
            if (textBlock) {
                manager.setBlockFocus(textBlock);
                textBlock.moveCaretStart();
            }
        }
    }
    generateIndex(): IndexedBlock[] {
      const result: IndexedBlock[] = [];
      function traverse(block: IBlock, depth: number = 0, path: string = '0'): void {
          // Visit the current node
          result.push({ block, index: result.length, depth, path });
          // Recursively traverse all children
          block.blocks.forEach((child, index) => {
              traverse(child, depth + 1, `${path}.${index + 1}`);
          });
      }
      traverse(this);
      this.index = result.filter(x => x.block.type == BlockType.StandoffEditorBlock || x.block.type == BlockType.CheckboxBlock);
      return result;
    }
    bind(data: IDocumentBlockDto) {
        this.id = data.id || uuidv4();
        if (data.blockProperties) {
            this.addBlockProperties(data.blockProperties);
            this.applyBlockPropertyStyling();
        }
        this.metadata = data.metadata || {};
    }
    serialize() {
        const dto = {
            id: this.id,
            type: this.type,
            metadata: this.metadata,
            blockProperties: this.blockProperties?.map(x => x.serialize()) || [],
            children: this.blocks.map(x => x.serialize())
        } as IBlockDto;
        dto.metadata = dto.metadata || {};
        const focus = this.manager.getBlockInFocus() as StandoffEditorBlock;
        dto.metadata.focus = {
            blockId: focus.id
        };
        if (focus.type == BlockType.StandoffEditorBlock) {
            dto.metadata.focus.caret = focus.getCaret()?.right?.index || 0;
        }
        return dto;
    }
    deserialize(json: any): IBlock {
        throw new Error("Method not implemented.");
    }
    
}
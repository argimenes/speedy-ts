import { AbstractBlock } from './abstract-block';
import { IAbstractBlockConstructor, BlockType, IBlockDto, IBlock, Caret, InputEvent, CARET, DIRECTION, IBindingHandlerArgs, IRange, ISelection, IMainListBlockDto as IDocumentBlockDto, RowPosition, InputEventSource, GUID, StandoffPropertyDto } from '../library/types';
import { UniverseBlock } from '../universe-block';
import { DocumentTabRowBlock } from './document-tabs-block';
import { PageBlock } from './page-block';
import { StandoffEditorBlock } from './standoff-editor-block';
import { updateElement } from '../library/svg';
import { CanvasBlock } from './canvas-block';
import { YouTubeVideoBlock } from './youtube-video-block';
import { IframeBlock } from './iframe-block';

const maxHistoryItems = 30;

export class DocumentBlock extends AbstractBlock {
    constructor(args: IAbstractBlockConstructor) {
        super(args);
        this.type = BlockType.DocumentBlock;
        this.inputEvents = this.getInputEvents();
    }
    getHistory() {
        let history = this.manager.history[this.id];
        return history;
    }
    clearDocument() {
        
    }
    async undoHistory() {
        const last = this.manager.undoHistory(this.id);
        if (!last) {
            return;
        }
        await this.reloadDocument(last);
    }
    async reloadDocument(dto: IBlockDto) {
        const manager = this.manager;
        const parent = this.relation.parent as AbstractBlock;
        if (!parent) return;
        console.log("reloadDocument", { parent, dto })
        this.destroy();
        const doc = await manager.recursivelyBuildBlock(parent.container, dto) as PageBlock;
        manager.addBlockTo(parent, doc);
        manager.generateParentSiblingRelations(parent);
        doc.generateIndex();
        doc.setFocus();
    }
    async redoHistory() {
        const history = this.getHistory();
        const last = history.redoStack.pop();
        if (!last) return;
        if (history.undoStack.length == maxHistoryItems) {
            history.undoStack.shift();
        }
        const dto = this.serialize();
        history.undoStack.push(dto);
        await this.reloadDocument(last);
    }
    addBlockTo(parent: IBlock, block: IBlock, skipIndexation?: boolean) {
        const manager = this.manager;
        this.triggerBeforeChange();
        parent.blocks.push(block);
        block.relation.parent = parent;
        manager.registerBlock(block);
        manager.generatePreviousNextRelations(parent);
        if (!skipIndexation) manager.reindexAncestorDocument(parent);
    }
    deleteBlock(blockId: GUID) {
        const manager = this.manager;
        this.triggerBeforeChange();
        const block = this.getBlock(blockId) as StandoffEditorBlock;
        const parent = block.relation.parent as AbstractBlock;
        const i = manager.getIndexOfBlock(block);
        this.removeBlockAt(parent, i);
        block.destroy();
    }
    removeBlockAt(parent: AbstractBlock, atIndex: number, skipIndexation?: boolean) {
        const manager = this.manager;
        this.triggerBeforeChange();
        const block = parent.blocks[atIndex];
        parent.blocks.splice(atIndex, 1);
        manager.generatePreviousNextRelations(parent);
        manager.deregisterBlock(block.id);
        if (!skipIndexation) manager.reindexAncestorDocument(block);
    }
    
    async handleDelete(args: IBindingHandlerArgs) {
        const manager = this.manager;
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
                            manager.setBlockFocus(block);
                            block.moveCaretEnd();
                        }, 1);
                    } else {
                        this.mergeBlocks(next.id, block.id);
                        setTimeout(() => {
                            manager.setBlockFocus(block);
                            block.setCaret(cri, CARET.LEFT);
                        }, 1);
                    }
                } else {
                    manager.setBlockFocus(block.relation.next);
                }
            }
        } else {
            block.removeCellAtIndex(caret.right.index, true);
        }
    }
    addVideoBlock(anchor: IBlock, url: string) {
        const manager = this.manager;
        const video = manager.createVideoBlock({
            type: BlockType.YouTubeVideoBlock,
            metadata: {
                url: url
            }
        }) as YouTubeVideoBlock;
        video.build();
        this.addBlockAfter(video, anchor);
        return video;
    }
    addCanvasBlock(anchor: IBlock) {
        const manager = this.manager;
        const canvas = manager.createCanvasBlock({
            type: BlockType.CanvasBlock
        }) as CanvasBlock;
        canvas.build();
        this.addBlockAfter(canvas, anchor);
        return canvas;
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
    insertBlockAt(parent: IBlock, block: IBlock, atIndex: number, skipIndexation?: boolean) {
        const manager = this.manager;
        this.triggerBeforeChange();
        console.log("insertBlockAt", { parent, block, atIndex, skipIndexation });
        if (parent.blocks.length == 0) {
            parent.blocks.push(block);
        } else {
            parent.blocks.splice(atIndex, 0, block);
        }
        block.relation.parent = parent;
        manager.generatePreviousNextRelations(parent);
        manager.registerBlock(block);
        if (!skipIndexation) manager.reindexAncestorDocument(block);
    }
    addBlockBefore(newBlock: IBlock, anchor: IBlock) {
        const manager = this.manager;
        this.triggerBeforeChange();
        console.log("addBlockBefore", { newBlock, anchor });
        anchor.container.insertAdjacentElement('beforebegin', newBlock.container);
        const parent = anchor.relation.parent;
        if (!parent) {
            console.log("addBlockBefore", { message: "Expected to find a parent block of @anchor", anchor, newBlock });
            return;
        }
        const ai = manager.getIndexOfBlock(anchor);
        this.insertBlockAt(parent, newBlock, ai);
    }
    addImageRight(block: IBlock, url: string) {
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
        cell1.blocks = [block];
        cell2.blocks = [image];
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
        cell2.container.append(image.container);
        row.container.append(cell1.container);
        row.container.append(cell2.container);
        grid.container.append(row.container);
        const i = manager.getIndexOfBlock(block);
        this.removeBlockAt(parent, i, true);
        this.insertBlockAt(parent, grid, i);
        manager.appendSibling(block.container, grid.container);
        cell1.container.append(block.container);
    }
    addIFrameBlock(anchor: IBlock, url: string) {
        const manager = this.manager;
        const iframe = manager.createIFrameBlock({
            type: BlockType.IFrameBlock,
            metadata: {
                url: url
            }
        }) as IframeBlock;
        iframe.build();
        this.addBlockAfter(iframe, anchor);
    }
    addBlockAfter(newBlock: IBlock, anchor: IBlock) {
        const manager = this.manager;
        this.triggerBeforeChange();
        console.log("addBlockAfter", { newBlock, anchor });
        anchor.container.insertAdjacentElement("afterend", newBlock.container);
        const parent = anchor.relation.parent;
        if (!parent) {
            console.log("addBlockAfter", { message: "Expected to find a parent block of @anchor", anchor, newBlock });
            return;
        }
        const ai = manager.getIndexOfBlock(anchor);
        this.insertBlockAt(parent, newBlock, ai + 1);
    }
     async handleEnterKey(args: IBindingHandlerArgs) {
        const manager = this.manager;
        const caret = args.caret as Caret;
        const block = args.block as StandoffEditorBlock;
        if (block.type != BlockType.StandoffEditorBlock) {
            const blockData = block.serialize();
            const newBlock = manager.createStandoffEditorBlock();
            newBlock.relation.parent = block.relation.parent;
            newBlock.addBlockProperties(blockData.blockProperties || []);
            newBlock.applyBlockPropertyStyling();
            newBlock.addEOL();
            this.addBlockAfter(newBlock, block);
            manager.setBlockFocus(newBlock);
            newBlock.moveCaretStart();
            return;
        }
        const textBlock = block as StandoffEditorBlock;
        const atStart = caret.left == null;
        const atEnd = caret.right.isEOL;
        const isInside = !atStart && !atEnd;
        if (isInside) {
            const ci = caret.left?.index as number;
            const split = this.splitTextBlock(textBlock.id, ci + 1);
            manager.setBlockFocus(split);
            split.moveCaretStart();
            return;
        }
        const newBlock = manager.createStandoffEditorBlock();
        const blockData = textBlock.serialize();
        newBlock.relation.parent = block.relation.parent;
        newBlock.addBlockProperties(blockData.blockProperties || []);
        newBlock.applyBlockPropertyStyling();
        newBlock.addEOL();
        if (atStart) {
            this.addPreviousBlock(newBlock, textBlock);
            manager.setBlockFocus(textBlock);
            block.moveCaretStart();
        } else if (atEnd) {
            this.addBlockAfter(newBlock, textBlock);
            manager.setBlockFocus(newBlock);
            newBlock.moveCaretStart();
        }
        const list = manager.getParentOfType(block, BlockType.IndentedListBlock);
        if (list) {
            updateElement(newBlock.container, {
                classList: ["list-item-numbered"]
            });
        }
    }
    addPreviousBlock(newBlock: IBlock, sibling: IBlock) {
        const manager = this.manager;
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
        const si = manager.getIndexOfBlock(sibling);
        if (si > 0) {
            this.insertBlockAt(parent, newBlock, si);
        } else {
            this.insertBlockAt(parent, newBlock, 0);
            parent.relation.firstChild = sibling;
            //sibling.relation.parent = parent;
        }
    }
    splitTextBlock(blockId: GUID, ci: number) {
            const manager = this.manager;
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
            const secondBlock = manager.createStandoffEditorBlock();
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
    async extractIntoNewDocument(id: GUID) {
        const block = this.manager.getBlock(id);
        const { metadata } = this.manager.getParentOfType(block, BlockType.PageBlock);
        const dto = block.serialize();
        const docDto = {
            type: BlockType.PageBlock,
            metadata: {
                ...metadata,
                filename: `${block.type}-${id}.json`
            },
            children: [
                dto
            ]
        } as IDocumentBlockDto;
        const doc = await this.manager.createDocumentWithWindow(docDto);
        await this.manager.saveServerDocument(doc.id, docDto.metadata.filename, metadata.folder);
    }
     getInputEvents() {
        const _this = this;
        return [
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "Control-X"
                },
                action: {
                    name: "Copy current block into a new DocumentWindow.",
                    description: `
                        
                    `,
                    handler: async (args) => {
                        await _this.extractIntoNewDocument(args.block.id);
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
                    name: "Create a new text block. Move text to the right of the caret into the new block.",
                    description: `
                        
                    `,
                    handler: _this.handleEnterKey.bind(_this)
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
                    handler: _this.handleDelete.bind(_this)
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
                        const manager = block.manager as UniverseBlock;
                        const next = block.relation.next;
                        const previous = block.relation.previous;
                        const parent= block.relation.parent;
                        _this.deleteBlock(block.id);
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
                        const manager = block.manager;
                        const doc = manager.getParentOfType(block, BlockType.PageBlock) as PageBlock;
                        if (!caret.left) {
                            return;
                        }
                        const i = caret.left.index;
                        const text = block.getText();
                        const words = block.getWordsFromText(text);
                        const nearest = doc.findNearestWord(i, words);
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
            // {
            //     mode: "default",
            //     trigger: {
            //         source: InputEventSource.Custom,
            //         match: "contextmenu"
            //     },
            //     action: {
            //         name: "Context Menu.",
            //         description: "",
            //         handler: async (args: IBindingHandlerArgs) => {
            //             const block = args.block;
            //             const manager = block.manager as UniverseBlock;
            //             manager.loadBlockMenu(args);
            //         }
            //     }
            // },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Mouse,
                    match: "Control-ClickLeft"
                },
                action: {
                    name: "Block selection",
                    description: "Toggles selection of a block; handles multiple block selections.",
                    handler: async (args: IBindingHandlerArgs) => {
                        const block = args.block;
                        const manager = block.manager as UniverseBlock;
                        manager.toggleBlockSelection(block.id);
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
                    source: InputEventSource.Custom,
                    match: "paste"
                },
                action: {
                    name: "Paste",
                    description: "Pastes plain text",
                    handler: this.handlePaste.bind(this)
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
                        _this.undoHistory();
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
                        _this.redoHistory();
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
                    match: "Shift-Backspace"
                },
                action: {
                    name: "Delete the entire block.",
                    description: ``,
                    handler: async (args: IBindingHandlerArgs) => {
                        const block = args.block;
                        const manager = block.manager as UniverseBlock;
                        const next = block.relation.next;
                        const previous = block.relation.previous;
                        const parent= block.relation.parent;
                        this.deleteBlock(block.id);
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
                    handler: this.handleBackspace.bind(this)
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
                    match: ["Windows:Control-S","Mac:Meta-S"]
                },
                action: {
                    name: "Save document",
                    description: "",
                    handler: async (args: IBindingHandlerArgs) => {
                        args.e?.preventDefault();
                        const manager = _this.manager as UniverseBlock;
                        const filename = _this.metadata.filename;
                        const folder = _this.metadata.folder;
                        await manager.saveServerDocument(_this.id, filename, folder);
                    }
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
                        const manager = block.manager;
                        const doc = manager.getParentOfType(block, BlockType.PageBlock) as PageBlock;
                        if (!caret.left) {
                            return;
                        }
                        const i = caret.left.index;
                        const text = block.getText();
                        const words = block.getWordsFromText(text);
                        const nearest = doc.findNearestWord(i, words);
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
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: ["Mac:Control-N"]
                },
                action: {
                    name: "Block vines",
                    description: "",
                    handler: async (args) => {
                        const prop = { type: "block/vines" };
                        args.block.addBlockProperties([prop]);
                        args.block.applyBlockPropertyStyling(); 
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
                    source: InputEventSource.Custom,
                    match: "copy"
                },
                action: {
                    name: "Copy",
                    description: "Copies standoff text",
                    handler: this.handleCopy.bind(this)
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
                        const doc = args.block.manager.getParentOfType(block, BlockType.PageBlock) as PageBlock;
                        const manager = block.manager;
                        if (caret.right.isEOL) {
                            return;
                        }
                        const i = caret.right.index;
                        const last = block.getLastCell();
                        const text = block.getText();
                        const words = block.getWordsFromText(text);
                        const nearest = doc.findNearestWord(i, words);
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
                    source: InputEventSource.Custom,
                    match: "onTextChanged"
                },
                action: {
                    name: "",
                    description: "",
                    handler: async (args: IBindingHandlerArgs) => {
                        await _this.textProcessor.process(args);
                    }
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
                    match: "Control-B"
                },
                action: {
                    name: "Bold",
                    description: "Bolds text",
                    handler: this.applyBoldToText.bind(this)
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: ["Control-T", "Windows:Alt-T"]
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
                    match: "Control-Enter"
                },
                action: {
                    name: "ENTER break",
                    description: "Breaks out of current container",
                    handler: async (args: IBindingHandlerArgs) => {
                        const block = args.block as StandoffEditorBlock;
                        const manager = block.manager as UniverseBlock;
                        const structure = manager.getParentOfType(block, BlockType.TabRowBlock)
                            || manager.getParentOfType(block, BlockType.GridBlock)
                            || manager.getParentOfType(block, BlockType.TableBlock)
                            || manager.getParentOfType(block, BlockType.IndentedListBlock)
                        ;
                        if (!structure) return;
                        const newBlock = manager.createStandoffEditorBlock();
                        newBlock.addEOL();
                        this.addBlockAfter(newBlock, structure);
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
                    match: ["Control-R"]
                },
                action: {
                    name: "Right-align",
                    description: "",
                    handler: async (args) => {
                        const block = args.block as StandoffEditorBlock;
                        const props = block
                            .blockProperties
                            .filter((x) => x.type.indexOf("block/alignment/") >= 0);
                        if (props.length) props.forEach(p => p.block?.removeBlockProperty(p));
                        block.addBlockProperties([ { type: "block/alignment", value: "right" } ]);
                        block.applyBlockPropertyStyling();
                        block.updateView();
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: ["Meta-Q", "Control-Q"]
                },
                action: {
                    name: "Match entities to the graph",
                    description: "Links to an entity in the graph database.",
                    handler: async (args) => {
                        const block = args.block as StandoffEditorBlock;
                        const manager = block.manager as UniverseBlock;
                        await manager.loadEntitiesList(args);
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
            },
            // {
            //     mode: "default",
            //     trigger: {
            //         source: InputEventSource.Keyboard,
            //         match: ["Mac:Option-T","Windows:Alt-T"]
            //     },
            //     action: {
            //         name: "To tab/add tab",
            //         description: "Either wraps the text in a new tab, or creates a new tab",
            //         handler: this.handleCreateNewTab.bind(this)
            //     }
            // },
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
        ] as InputEvent[]
    }
    static getBlockBuilder() {
        return {
            type: BlockType.DocumentBlock,
            builder: async (container: HTMLElement, dto: IBlockDto, manager: UniverseBlock) => {
                let test = {...dto, type: BlockType.DocumentBlock };
                const block = new DocumentBlock({ manager, ...test });
                if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
                block.applyBlockPropertyStyling();
                await manager.buildChildren(block, dto);
                container.appendChild(block.container);
                return block;
            }
        };
    }
    setFocus() {
        const row= this.blocks[0] as DocumentTabRowBlock;
        if (row.type != BlockType.DocumentTabRowBlock) {
            return;
        }
        row.setFocus();
    }
    serialize() {
        return {
            id: this.id,
            type: this.type,
            metadata: this.metadata,
            blockProperties: this.blockProperties?.map(x => x.serialize()) || [],
            children: this.blocks?.map(x => x.serialize()) || []
        } as IBlockDto;
    }
    deserialize(json: any): IBlock {
        throw new Error("Method not implemented.");
    }    
}
import { AbstractBlock } from "./abstract-block";
import { IAbstractBlockConstructor, BlockType, IBlockDto, IBlock, IArrowNavigation } from "../library/types";
import { UniverseBlock } from "../universe-block";
import { updateElement } from "../library/svg";
import { DocumentBlock } from "./document-block";
import { BlockPropertySchemas } from "../properties/block-properties";

export class GridBlock extends AbstractBlock {
    constructor(args: IAbstractBlockConstructor) {
        super(args);
        this.type = BlockType.GridBlock;
        this.container.classList.add(this.type);
        this.setBlockSchemas(this.getBlockSchemas());
    }
    getBlockSchemas() {
        return [
            BlockPropertySchemas.blockSize,
            BlockPropertySchemas.blockPosition
        ]
    }
    static getBlockBuilder() {
        return {
            type: BlockType.GridBlock,
            builder: async (container: HTMLElement, dto: IBlockDto, manager: UniverseBlock) => {
                const block = new GridBlock({ manager, ...dto });
                if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
                block.applyBlockPropertyStyling();
                await manager.buildChildren(block, dto);
                container.appendChild(block.container);
                return block;
            }
        };
    }
    destructure() {
        /**
         * Explode the GridCellBlock contents back into the Document
         * and destroy the Grid structure itself.
         */
        const parent = this.relation.parent as AbstractBlock;
        const rows = this.blocks as GridRowBlock[];
        [...rows].reverse().forEach(row => {
            let cells = row.blocks as GridCellBlock[];
            [...cells].reverse().forEach(cell => {
                cell.removeStyling();
                cell.explode();
            });
            row.explode();
        });
        this.explode();
        this.manager.generateParentSiblingRelations(parent);
        this.manager.reindexAncestorDocument(parent);
    }
    totalCells() {
         const cells = this.blocks.map(x => x.blocks).flat();
         return cells.length;
    }
    getFirstCell() {
        return this.blocks?.[0].blocks?.[0] as GridCellBlock;
    }
    insertRowAfter(row: GridRowBlock) {
        const i = this.blocks.findIndex(x => x.id == row.id);
        /**
         * Insert a new GridRow after position 'i'.
         */
        alert("insertRowAfter: Not Implemented");
    }
    serialize() {
        return {
            id: this.id,
            type: BlockType.GridBlock,
            metadata: this.metadata,
            blockProperties: this.blockProperties.map(x => x.serialize()),
            children: this.blocks.map(x => x.serialize())
        } as IBlockDto;
    }
    deserialize(json: any): IBlock {
        throw new Error("Method not implemented.");
    }    
}

export class GridRowBlock extends AbstractBlock {
    constructor(args: IAbstractBlockConstructor) {
        super(args);
        this.container.classList.add("grid-row-block");
        this.type = BlockType.GridRowBlock;
    }
    static getBlockBuilder() {
        return {
            type: BlockType.GridRowBlock,
            builder: async (container: HTMLElement, dto: IBlockDto, manager: UniverseBlock) => {
                const block = new GridRowBlock({ manager, ...dto });
                await manager.buildChildren(block, dto, (b) => {
                    if (b.metadata?.width) {
                        updateElement(b.container, {
                            style: {
                                width: b.metadata?.width
                            }
                        });
                    }
                });
                if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
                block.applyBlockPropertyStyling();
                container.appendChild(block.container);
                return block;
            }
        };
    }
    insertRowAfter() {
        const grid = this.getGrid();
        grid.insertRowAfter(this);
    }
    getGrid() {
        return this.relation.parent as GridBlock;
    }
    getPrevious() {
        const grid = this.getGrid();
        const i = grid.blocks.findIndex(x => x.id == this.id);
        if (i == 0) return null;
        return grid.blocks[i-1] as GridRowBlock;
    }
    getNext() {
        const grid = this.getGrid();
        const i = grid.blocks.findIndex(x => x.id == this.id);
        if (i == grid.blocks.length - 1) return null;
        return grid.blocks[i+1] as GridRowBlock;
    }
    serialize() {
        return {
            id: this.id,
            type: BlockType.GridRowBlock,
            metadata: this.metadata,
            blockProperties: this.blockProperties.map(x => x.serialize()),
            children: this.blocks.map(x => x.serialize())
        } as IBlockDto;
    }
    handleArrowDown(args: IArrowNavigation) {
        if (this.relation.firstChild) {
            args.manager.setBlockFocus(this.relation.firstChild);
            return;
        }
        if (this.relation.next) {
            args.manager.setBlockFocus(this.relation.next);
            return;
        }
        const grid = args.manager.getParentOfType(this, BlockType.GridBlock);
        if (grid) {
            if (grid.relation.next) {
                args.manager.setBlockFocus(this.relation.next);
                return;
            }
        }
    }
    swapCells(a: GridCellBlock, b: GridCellBlock) {
        const aRow = a.getRow();
        const bRow = b.getRow();
        const ai = aRow.blocks.findIndex(x => x.id == a.id), bi = bRow.blocks.findIndex(x => x.id == b.id);
        const aTempNode = document.createElement("DIV");
        const bTempNode = document.createElement("DIV");
        a.container.insertAdjacentElement("beforebegin", aTempNode);
        b.container.insertAdjacentElement("beforebegin", bTempNode);
        bRow.blocks[bi] = a;
        aRow.blocks[ai] = b;
        aTempNode.insertAdjacentElement("beforebegin", b.container);
        bTempNode.insertAdjacentElement("beforebegin", a.container);
        aTempNode.remove();
        bTempNode.remove();
        this.manager.generatePreviousNextRelations(aRow);
        this.manager.generatePreviousNextRelations(bRow);
    }
    deserialize(json: any): IBlock {
        throw new Error("Method not implemented.");
    }
    destroy(): void {
        this.container.remove();
    }
}

export class GridCellBlock extends AbstractBlock {
    constructor(args: IAbstractBlockConstructor) {
        super(args);
        this.container.classList.add("grid-cell-block", "grid-cell");
        this.type = BlockType.GridCellBlock;
        this.setBlockSchemas(this.getBlockSchemas());
    }
    getBlockSchemas() {
        return [
            BlockPropertySchemas.blockSize
        ]
    }
    static getBlockBuilder() {
        return {
            type: BlockType.GridCellBlock,
            builder: async (container: HTMLElement, dto: IBlockDto, manager: UniverseBlock) => {
                const block = new GridCellBlock({ manager, ...dto });
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
                await manager.buildChildren(block, dto);
                container.appendChild(block.container);
                return block;
            }
        };
    }
    removeStyling() {
        this.container.classList.remove("grid-cell");
        this.setWidth("auto");
    }
    setWidth(width: string) {
        this.metadata.width = width;
        updateElement(this.container, {
            style: {
                width: width
            }
        });
    }
    mergeLeft() {
        this.merge(this, this.getPreviousCell());
    }
    merge(source: GridCellBlock, target: GridCellBlock) {
        if (!source || !target) return;
        const row = source.getRow();
        this.moveBlocksAndContainers(source, target);
        this.manager.removeBlockFrom(row, source);
        this.manager.generateParentSiblingRelations(row);
        target.setWidth("auto");
        source.container.remove();
    }
    moveBlocksAndContainers(source: IBlock, target: IBlock) {
        target.blocks.push(...source.blocks);
        while (source.container.firstChild) {
            target.container.appendChild(source.container.firstChild);
        }
    }
    mergeRight() {
        this.merge(this, this.getNextCell());
    }
    moveCellUp() {
        const row = this.getRow();
        const aboveRow = row.relation.previous;
        if (!aboveRow) return;
        const cellIndex = row.blocks.findIndex(x => x.id == this.id);
        const aboveCell = aboveRow.blocks[cellIndex] as GridCellBlock;
        row.swapCells(aboveCell, this);
    }
    moveCellDown() {
        const row = this.getRow();
        const belowRow = row.relation.next;
        if (!belowRow) return;
        const cellIndex = row.blocks.findIndex(x => x.id == this.id);
        const belowCell = belowRow.blocks[cellIndex] as GridCellBlock;
        row.swapCells(belowCell, this);
    }
    moveCellLeft() {
        const left = this.getPreviousCell();
        if (!left) return;
        const row = this.getRow();
        row.swapCells(left, this);
    }
    moveCellRight() {
        const right = this.getNextCell();
        if (!right) return;
        const row = this.getRow();
        row.swapCells(right, this);
    }
    swapWith(cell: GridCellBlock) {
        const row = this.getRow();
        row.swapCells(this, cell);
    }
    getRow() {
        return this.relation.parent as GridRowBlock;
    }
    getCellIndex() {
        const i = this.getRow().blocks.findIndex(x => x.id == this.id);
        return i;
    }
    getAboveCell() {
        const i = this.getCellIndex();
        const row = this.getRow().getPrevious();
        return row?.blocks?.[i] as GridCellBlock;
    }
    getBelowCell() {
        const i = this.getCellIndex();
        const row = this.getRow().getNext();
        return row?.blocks?.[i] as GridCellBlock;
    }
    getPreviousCell() {
        const temp = this.relation.parent.blocks;
        const i = temp.findIndex(x => x.id == this.id);
        if (i == 0) return null;
        return temp[i-1] as GridCellBlock;
    }
    getNextCell() {
        const temp = this.relation.parent.blocks;
        const i = temp.findIndex(x => x.id == this.id);
        if (i == temp.length - 1) return null;
        return temp[i+1] as GridCellBlock;
    }
    getGrid() {
        return this.relation.parent?.relation?.parent as GridBlock;
    }
    handleArrowDown(args: IArrowNavigation) {
        if (this.relation.firstChild) {
            args.manager.setBlockFocus(this.relation.firstChild);
            return;
        }
        if (this.relation.next) {
            args.manager.setBlockFocus(this.relation.next);
            return;
        }
        const row = args.manager.getParentOfType(this, BlockType.GridRowBlock);
        if (row) {
            if (row.relation.next) {
                args.manager.setBlockFocus(this.relation.next);
                return;
            }
        }
    }
    serialize() {
        return {
            id: this.id,
            type: BlockType.GridCellBlock,
            metadata: this.metadata,
            blockProperties: this.blockProperties.map(x => x.serialize()),
            children: this.blocks.map(x => x.serialize())
        } as IBlockDto;
    }
    deserialize(json: any): IBlock {
        throw new Error("Method not implemented.");
    }    
}
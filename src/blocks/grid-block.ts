import { AbstractBlock } from "./abstract-block";
import { IAbstractBlockConstructor, BlockType, IBlockDto, IBlock, IArrowNavigation } from "../library/types";
import { UniverseBlock } from "../universe-block";
import { updateElement } from "../library/svg";
import { DocumentBlock } from "./document-block";

export class GridBlock extends AbstractBlock {
    constructor(args: IAbstractBlockConstructor) {
        super(args);
        this.type = BlockType.GridBlock;
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
    }
    totalCells() {
         const cells = this.blocks.map(x => x.blocks).flat();
         return cells.length;
    }
    getFirstCell() {
        return this.blocks?.[0].blocks?.[0] as GridCellBlock;
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
        const row = this;
        const li = row.blocks.findIndex(x => x.id == a.id), ri = row.blocks.findIndex(x => x.id == b.id);
        row.blocks[ri] = a;
        row.blocks[li] = b;
        const isOnLeft = a.container.nextElementSibling == b.container;
        if (isOnLeft) {
            a.container.insertAdjacentElement("beforebegin", b.container);
        } else {
            b.container.insertAdjacentElement("beforebegin", a.container);
        }
        this.manager.generatePreviousNextRelations(row);
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
        this.container.classList.add("grid-cell");
        this.type = BlockType.GridCellBlock;
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
        const grid = row.getGrid();
        const doc = this.manager.getParentOfType(source, BlockType.DocumentBlock) as DocumentBlock;
        const totalCells = grid.totalCells();
        if (totalCells > 2) {
            // Merge the two Cells together
            this.moveBlocksAndContainers(source, target);
            this.manager.generateParentSiblingRelations(row);
            this.manager.removeBlockFrom(row, source);
            target.setWidth("auto");
            source.container.remove();
        } else {
            // Destructure the Grid itself
            grid.destructure();
        }
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
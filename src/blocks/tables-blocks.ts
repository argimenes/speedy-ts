import { AbstractBlock } from "./abstract-block";
import { setElement } from "../library/svg";
import { IAbstractBlockConstructor, BlockType, IBlockDto, IBlock } from "../library/types";
import { UniverseBlock } from "../universe-block";

export class TableBlock extends AbstractBlock {
    rows?: TableRowBlock[];
    constructor(args: IAbstractBlockConstructor) {
        super(args);
        this.type = BlockType.TableBlock;
        setElement(this.container, {
            style: {
                display: "table"
            }
        });
    }
    static getBlockBuilder() {
        return {
            type: BlockType.TableBlock,
            builder: async (container: HTMLElement, dto: IBlockDto, manager: UniverseBlock) => {
                const block = new TableBlock({ manager, ...dto });
                if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
                block.applyBlockPropertyStyling();
                await manager.buildChildren(block, dto);
                container.appendChild(block.container);
                return block;
            }
        };
    }
    attachEventHandlers() {
        this.container.addEventListener("click", this.handleClick.bind(this));
    }
    handleClick(e: MouseEvent, tab?: TableBlock) {
        const onClick = this.inputEvents.find(x => (x.trigger.match as string).toLowerCase() == "click");
        if (!onClick) return;
        onClick.action.handler({ block: tab || this, caret: {} as any });
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

export class TableRowBlock extends AbstractBlock {
    cells?: TableCellBlock;
    constructor(args: IAbstractBlockConstructor) {
        super(args);
        this.type = BlockType.TableRowBlock;
        this.metadata.active = false;
        setElement(this.container, {
            style: {
                display: "table-row"
            }
        });
    }
    static getBlockBuilder() {
        return {
            type: BlockType.TableRowBlock,
            builder: async (container: HTMLElement, dto: IBlockDto, manager: UniverseBlock) => {
                const block = new TableRowBlock({ manager, ...dto });
                if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
                block.applyBlockPropertyStyling();
                await manager.buildChildren(block, dto);
                container.appendChild(block.container);
                return block;
            }
        };
    }
    attachEventHandlers() {
        this.container.addEventListener("click", this.handleClick.bind(this));
    }
    handleClick(e: MouseEvent) {
        const onClick = this.inputEvents.find(x => (x.trigger.match as string).toLowerCase() == "click");
        if (!onClick) return;
        onClick.action.handler({ block: this, caret: {} as any });
    }
    setName(name: string) {
        this.metadata.name = name;
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
    destroy(): void {
        this.container.innerHTML = "";
    }
}

export class TableCellBlock extends AbstractBlock {
    constructor(args: IAbstractBlockConstructor) {
        super(args);
        this.type = BlockType.TableCellBlock;
        this.metadata = {active: false, ...(args.metadata || {})};
        setElement(this.container, {
            style: {
                display: "table-cell",
                width: (this.metadata.width || 50) + "px"
            },
            classList: ["table-cell-block"]
        });
    }
    static getBlockBuilder() {
        return {
            type: BlockType.TableCellBlock,
            builder: async (container: HTMLElement, dto: IBlockDto, manager: UniverseBlock) => {
                const block = new TableCellBlock({ manager, ...dto });
                if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
                block.applyBlockPropertyStyling();
                await manager.buildChildren(block, dto);
                container.appendChild(block.container);
                return block;
            }
        };
    }
    attachEventHandlers() {
        this.container.addEventListener("click", this.handleClick.bind(this));
    }
    handleClick(e: MouseEvent) {
        const onClick = this.inputEvents.find(x => (x.trigger.match as string).toLowerCase() == "click");
        if (!onClick) return;
        onClick.action.handler({ block: this, caret: {} as any });
    }
    setName(name: string) {
        this.metadata.name = name;
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
    destroy(): void {
        this.container.innerHTML = "";
    }
}
import { AbstractBlock } from "./abstract-block";
import { IAbstractBlockConstructor, BlockType, IBlockDto, IBlock, IArrowNavigation } from "../library/types";
import { UniverseBlock } from "../universe-block";
import { updateElement } from "../library/svg";
import { PageBlock } from "./document-block";

export class IndentedListBlock extends AbstractBlock {
    constructor(args: IAbstractBlockConstructor) {
        super(args);
        this.type = BlockType.IndentedListBlock;
    }
    static getBlockBuilder() {
        return {
            type: BlockType.IndentedListBlock,
            builder: async (container: HTMLElement, dto: IBlockDto, manager: UniverseBlock) => {
                const block = new IndentedListBlock({ manager, ...dto });
                if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
                block.applyBlockPropertyStyling();
                await manager.buildChildren(block, dto, (b) =>
                    updateElement(b.container, {
                        classList: ["list-item-numbered"]
                }));
                const level = block.metadata.indentLevel || 0 as number;
                block.metadata.indentLevel = level + 1;
                manager.renderIndent(block);
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
        const items = this.blocks as IndentedListBlock[];
        [...items].reverse().forEach(item => {
            let children = item.blocks.filter(x => x.type == BlockType.IndentedListBlock) as IndentedListBlock[];
            [...children].reverse().forEach(c => {
                c.destructure();
            });
            item.explode();
        });
        this.explode();
    }
    serialize() {
        return {
            id: this.id,
            type: BlockType.IndentedListBlock,
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
        const listStart = args.manager.getParentOfType(this, BlockType.IndentedListBlock);
        if (listStart) {
            if (listStart.relation.next) {
                args.manager.setBlockFocus(this.relation.next);
                return;
            }
        }
    }
    collapse() {
        this.metadata.collapsed = true;
        this.renderCollapsedState();
    }
    expand() {
        this.metadata.collapsed = false;
        this.renderCollapsedState();
    }
    renderCollapsedState() {
        const nodes = Array.from(this.container.childNodes);
        if (this.metadata.collapsed) {
            nodes.forEach((c: any) => c.style.display = "none");
        } else {
            nodes.forEach((c: any) => c.style.display = "block");
        }
    }
    deserialize(json: any): IBlock {
        throw new Error("Method not implemented.");
    }    
}
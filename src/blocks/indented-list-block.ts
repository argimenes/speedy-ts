import { AbstractBlock } from "./abstract-block";
import { IAbstractBlockConstructor, BlockType, IBlockDto, IBlock, IArrowNavigation } from "../library/types";

export class IndentedListBlock extends AbstractBlock {
    constructor(args: IAbstractBlockConstructor) {
        super(args);
        this.type = BlockType.IndentedListBlock;
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
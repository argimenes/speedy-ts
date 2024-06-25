import { AbstractBlock, BlockType, IAbstractBlockConstructor, IBlock, IBlockDto } from "./abstract-block";

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
    destroy(): void {
        this.container.innerHTML = "";
    }
}
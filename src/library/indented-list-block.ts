import { AbstractBlock, IAbstractBlockConstructor } from "./abstract-block";
import { BlockType, IBlock, IBlockDto } from "./standoff-editor-block";

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
    deserialize(json: any): IBlock {
        throw new Error("Method not implemented.");
    }
    destroy(): void {
        this.container.innerHTML = "";
    }
}
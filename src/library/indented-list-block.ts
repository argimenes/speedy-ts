import { AbstractBlock, IAbstractBlockConstructor } from "./abstract-block";
import { BlockType, IBlock } from "./standoff-editor-block";

export class IndentedListBlock extends AbstractBlock {
    constructor(args: IAbstractBlockConstructor) {
        super(args);
        this.type = BlockType.IndentedListBlock;
    }
    serialize(): {} {
        return {
            id: this.id,
            type: BlockType.IndentedListBlock,
            metadata: this.metadata,
            blockProperties: this.blockProperties.map(x => x.serialize()),
            blocks: this.blocks.map(x => x.serialize())
        }
    }
    deserialize(json: any): IBlock {
        throw new Error("Method not implemented.");
    }
    destroy(): void {
        this.container.innerHTML = "";
    }
}
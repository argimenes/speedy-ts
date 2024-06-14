import { AbstractBlock, IAbstractBlockConstructor  } from "./abstract-block"
import { BlockType, IBlock } from "./standoff-editor-block";

export class MarginBlock extends AbstractBlock {
    constructor(args: IAbstractBlockConstructor) {
        super(args);
        this.type = BlockType.MarginBlock;
    }
    serialize(): {} {
        return {
            id: this.id,
            type: BlockType.MarginBlock,
            metadata: this.metadata,
            blockProperties: this.blockProperties.map(x => x.serialize()),
            blocks: this.blocks.map(x => x.serialize())
        }
    }
    deserialize(json: any): IBlock {
        throw new Error("Method not implemented.");
    }
    destroy(): void {
        throw new Error("Method not implemented.");
    }
}

export class RightMarginBlock extends AbstractBlock {
    constructor(args: IAbstractBlockConstructor) {
        super(args);
        this.type = BlockType.RightMarginBlock;
    }
    serialize(): {} {
        return {
            id: this.id,
            type: BlockType.RightMarginBlock,
            metadata: this.metadata,
            blockProperties: this.blockProperties.map(x => x.serialize()),
            blocks: this.blocks.map(x => x.serialize())
        }
    }
    deserialize(json: any): IBlock {
        throw new Error("Method not implemented.");
    }
    destroy(): void {
        throw new Error("Method not implemented.");
    }
}
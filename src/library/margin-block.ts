import { AbstractBlock, IAbstractBlockConstructor  } from "./abstract-block"
import { BlockType, IBlock } from "./standoff-editor-block";

export class MarginBlock extends AbstractBlock {
    constructor(args: IAbstractBlockConstructor) {
        super(args);
        this.type = BlockType.MarginBlock;
    }
    serialize(): {} {
        throw new Error("Method not implemented.");
    }
    deserialize(json: any): IBlock {
        throw new Error("Method not implemented.");
    }
    destroy(): void {
        throw new Error("Method not implemented.");
    }
}
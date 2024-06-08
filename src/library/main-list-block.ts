import { AbstractBlock, IAbstractBlockConstructor } from "./abstract-block";
import { IBlock } from "./standoff-editor-block";

export class MainListBlock extends AbstractBlock {
    constructor(args: IAbstractBlockConstructor) {
        super(args);
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
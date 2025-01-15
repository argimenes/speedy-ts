import { IAbstractBlockConstructor, IBlock, IBlockDto } from "../library/types";
import { AbstractBlock } from "./abstract-block";

export interface IUnknownBlockConstructor extends IAbstractBlockConstructor {}

export class UnknownBlock extends AbstractBlock {
    constructor(args: IUnknownBlockConstructor) {
        super(args);
    }
    serialize(): IBlockDto {
        return {
            id: this.id,
            type: this.type,
            metadata: this.metadata,
            blockProperties: this.blockProperties
        }
    }
    deserialize(json: any | any[]): IBlock {
        return this;
    }    
}
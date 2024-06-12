import { AbstractBlock, IAbstractBlockConstructor } from "./abstract-block";
import { BlockType, IBlock, IBlockDto } from "./standoff-editor-block";
import { v4 as uuidv4 } from 'uuid';

export interface IMainListBlockDto extends IBlockDto {

}

export class MainListBlock extends AbstractBlock {
    constructor(args: IAbstractBlockConstructor) {
        super(args);
        this.type = BlockType.MainListBlock;
    }
    bind(data: IMainListBlockDto) {
        this.id = data.id || uuidv4();
        if (data.blockProperties) {
            this.addBlockProperties(data.blockProperties);
            this.applyBlockPropertyStyling();
        }
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
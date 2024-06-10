import { AbstractBlock, IAbstractBlockConstructor } from "./abstract-block";
import { BlockType, IBlock, IBlockDto } from "./standoff-editor-block";

export interface IMainListBlockDto extends IBlockDto {

}

export class MainListBlock extends AbstractBlock {
    constructor(args: IAbstractBlockConstructor) {
        super(args);
        this.type = BlockType.MainListBlock;
    }
    bind(data: IMainListBlockDto) {
        this.id = data.id;
        this.addBlockProperties(data.blockProperties);
        this.applyBlockPropertyStyling();
        this.blocks.forEach(b => {

        });
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
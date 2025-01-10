import { AbstractBlock } from "./abstract-block";
import { IAbstractBlockConstructor, BlockType, IBlockDto, IBlock } from "../library/types"

export interface IEmbedDocumentBlockConstructor extends IAbstractBlockConstructor {
    filename?: string;
}
export class EmbedDocumentBlock extends AbstractBlock {
    filename: string;
    constructor(args: IEmbedDocumentBlockConstructor) {
        super(args);
        this.type = BlockType.EmbedDocumentBlock;
        this.filename = args.filename || "";
    }
    serialize() {
        return {
            id: this.id,
            type: BlockType.EmbedDocumentBlock,
            filename: this.filename,
            metadata: this.metadata,
            blockProperties: this.blockProperties.map(x => x.serialize()),
            children: this.blocks.map(x => x.serialize())
        } as IBlockDto;
    }
    deserialize(json: any): IBlock {
        throw new Error("Method not implemented.");
    }    
}
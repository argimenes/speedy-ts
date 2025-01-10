import { updateElement } from "../library/svg";
import { IAbstractBlockConstructor, IBlock, IBlockDto } from "../library/types";
import { AbstractBlock } from "./abstract-block";

export interface IImageBackgroundBlockConstructor extends IAbstractBlockConstructor {

}

export class ImageBackgroundBlock extends AbstractBlock {
    serialize(): IBlockDto {
        return {
            id: this.id,
            type: this.type,
            blockProperties: this.blockProperties,
            children: this.blocks.map(b => b.serialize()),
            metadata: this.metadata
        } as IBlockDto;
    }
    deserialize(json: any | any[]): IBlock {
        return null;
    }
    constructor(args: IImageBackgroundBlockConstructor ) {
        super(args);
        updateElement(this.container, {
            classList: ["fullscreen-background"]
        });
        if (args.metadata?.url) {
            this.setImage(args.metadata.url);
        }
    }
    setImage(url: string) {
        updateElement(this.container, {
            style: {
                "background-image": `url('${url}')`,
                "background-size": "cover",
                "background-position": "center"
            }
        });
    }
}
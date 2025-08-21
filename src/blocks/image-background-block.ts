import { setElement } from "../library/svg";
import { BlockType, IAbstractBlockConstructor, IBlock, IBlockDto } from "../library/types";
import { UniverseBlock } from "../universe-block";
import { AbstractBlock } from "./abstract-block";

export interface IImageBackgroundBlockConstructor extends IAbstractBlockConstructor {

}

export class ImageBackgroundBlock extends AbstractBlock {
    static getBlockBuilder() {
        return {
            type: BlockType.ImageBackgroundBlock,
            builder: async (container: HTMLElement, dto: IBlockDto, manager: UniverseBlock) => {
                const bg = new ImageBackgroundBlock({ manager, ...dto });
                await manager.buildChildren(bg, dto, (child) => {
                    bg.container.appendChild(child.container);
                });
                container.appendChild(bg.container);
                return bg;
            }
        };
    }
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
        return this;
    }
    constructor(args: IImageBackgroundBlockConstructor ) {
        super(args);
        this.type = BlockType.ImageBackgroundBlock;
        setElement(this.container, {
            classList: ["fullscreen-background"]
        });
        if (args.metadata?.url) {
            this.setImage(args.metadata.url);
        }
    }
    setImage(url: string) {
        setElement(this.container, {
            style: {
                "background-image": `url('${url}')`,
                "background-size": "cover",
                "background-position": "center"
            }
        });
    }
}
import { AbstractBlock, BlockType, IAbstractBlockConstructor, IBlock, IBlockDto } from "./abstract-block";
import { v4 as uuidv4 } from 'uuid';
import { updateElement } from "./svg";

export class ImageBlock extends AbstractBlock {
    image: HTMLImageElement;
    constructor(args: IAbstractBlockConstructor) {
        super(args);
        this.type = BlockType.ImageBlock;
        this.image = document.createElement("IMG") as HTMLImageElement;
    }
    build() {
        if (this.metadata.url) {
            updateElement(this.image, {
                attribute: {
                    src: this.metadata.url
                },
                style: {
                    width: this.metadata.width || "100%",
                    height: this.metadata.height || "auto",
                }
            });
        }
        this.container.appendChild(this.image);
    }
    bind(data: IBlockDto) {
        this.id = data.id || uuidv4();
        if (data.blockProperties) {
            this.addBlockProperties(data.blockProperties);
            this.applyBlockPropertyStyling();
        }
    }
    serialize() {
        return {
            id: this.id,
            type: this.type,
            metadata: this.metadata,
            blockProperties: this.blockProperties?.map(x => x.serialize()) || [],
            children: this.blocks?.map(x => x.serialize()) || []
        } as IBlockDto;
    }
    deserialize(json: any): IBlock {
        throw new Error("Method not implemented.");
    }
    destroy(): void {
        this.container.innerHTML = "";
    }

}
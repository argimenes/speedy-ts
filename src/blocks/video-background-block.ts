import { updateElement } from "../library/svg";
import { BlockType, IAbstractBlockConstructor, IBlock, IBlockDto } from "../library/types";
import { AbstractBlock } from "./abstract-block";

export interface IVideoBackgroundBlockConstructor extends IAbstractBlockConstructor {

}

export class VideoBackgroundBlock extends AbstractBlock {
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
    constructor(args: IVideoBackgroundBlockConstructor ) {
        super(args);
        this.type = BlockType.VideoBackgroundBlock;
        updateElement(this.container, {
            classList: ["fullscreen-background"]
        });
        if (args.metadata?.url) {
            this.setVideo(args.metadata.url);
        }
    }
    setVideo(url: string) {
        const video = document.createElement("VIDEO") as HTMLVideoElement;
        video.autoplay = true;
        video.loop = true;
        video.muted = true;
        const source = document.createElement("SOURCE") as HTMLSourceElement;
        source.src = url;
        source.type = "video/mp4";
        video.appendChild(source);
        this.container.appendChild(video);
    }
}
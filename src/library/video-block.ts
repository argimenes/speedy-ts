import { v4 as uuidv4 } from 'uuid';
import YouTubePlayer from 'youtube-player';
import { AbstractBlock } from './abstract-block';
import { IAbstractBlockConstructor, BlockType, IBlockDto, IBlock } from './types';
import { Options } from 'youtube-player/dist/types';

export class VideoBlock extends AbstractBlock {
    iframe: HTMLDivElement;
    player: any;
    constructor(args: IAbstractBlockConstructor) {
        super(args);
        this.type = BlockType.VideoBlock;
        this.iframe = document.createElement("DIV") as HTMLDivElement;
        this.player = YouTubePlayer(this.iframe, {
            playerVars: {
                origin: "http://localhost:3002"
            }
        } as Options);
    }
    build() {
        const id = this.metadata.url.split("=")[1].split("&")[0];
        this.player.loadVideoById(id);
        this.player.stopVideo();
        this.container.appendChild(this.iframe);
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
        if (this.container) this.container.remove();
    }

}
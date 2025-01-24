import { v4 as uuidv4 } from 'uuid';
import YouTubePlayer from 'youtube-player';
import { AbstractBlock } from './abstract-block';
import { IAbstractBlockConstructor, BlockType, IBlockDto, IBlock } from '../library/types';
import { Options } from 'youtube-player/dist/types';
import { UniverseBlock } from '../universe-block';

export class YouTubeVideoBlock extends AbstractBlock {
    iframe: HTMLDivElement;
    player: any;
    constructor(args: IAbstractBlockConstructor) {
        super(args);
        this.type = BlockType.YouTubeVideoBlock;
        this.iframe = document.createElement("DIV") as HTMLDivElement;
        this.player = YouTubePlayer(this.iframe, {
            playerVars: {
                origin: "http://localhost:3002"
            }
        } as Options);
    }
    static getBlockBuilder() {
        return {
            type: BlockType.YouTubeVideoBlock,
            builder: async (container: HTMLElement, dto: IBlockDto, manager: UniverseBlock) => {
                const block = new YouTubeVideoBlock({ manager, ...dto });
                if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
                block.applyBlockPropertyStyling();
                block.build();
                await manager.buildChildren(block, dto);
                container.appendChild(block.container);
                return block;
            }
        };
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
    async destroyAsync(): Promise<void> {
        if (!this.player) return;
        await this.player.destroy();
        this.player=null;
    }
}
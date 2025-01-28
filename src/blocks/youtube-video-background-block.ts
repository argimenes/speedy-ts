import { v4 as uuidv4 } from 'uuid';
import YouTubePlayer from 'youtube-player';
import { AbstractBlock } from './abstract-block';
import { IAbstractBlockConstructor, BlockType, IBlockDto, InputEvent, IBlock, IBindingHandlerArgs, InputEventSource, ISetSource } from '../library/types';
import { Options } from 'youtube-player/dist/types';
import { UniverseBlock } from '../universe-block';
import { updateElement } from '../library/svg';



export class YouTubeVideoBackgroundBlock extends AbstractBlock implements ISetSource {
    iframe: HTMLDivElement;
    player: any;
    constructor(args: IAbstractBlockConstructor) {
        super(args);
        this.type = BlockType.YouTubeVideoBackgroundBlock;
        this.iframe = document.createElement("DIV") as HTMLDivElement;
        updateElement(this.iframe, {
            style: {
                position: "fixed", // Use fixed instead of absolute
                pointerEvents: "none", // Disables mouse interactions
                top: "0",
                left: "0",
                width: "100vw", // Use viewport width
                height: "100vh", // Use viewport height
                objectFit: "cover", // Ensures video covers entire screen
                overflow: "hidden"
            }
        });
        updateElement(this.container, {
            classList: ["fullscreen-background"]
        });
        this.player = YouTubePlayer(this.iframe, {
            width: "100%",
            height: "100%",
            playerVars: {
                autoplay: 1, // Auto-start
                controls: 0, // Hide controls
                disablekb: 1, // Disable keyboard controls
                fs: 0, // Disable fullscreen
                iv_load_policy: 3, // Hide video annotations
                modestbranding: 1, // Minimal YouTube branding
                rel: 0, // Hide related videos
                showinfo: 0, // Hide video title
                mute: 0 // unmute
            }
        } as Options);
        this.inputEvents = this.getInputEvents();
    }
    getInputEvents() {
        const self = this;
        return [
            
        ];
    }
    setSource(url: string) {
        const id = url.split("=")[1].split("&")[0];
        this.player.loadVideoById(id);
        this.player.playVideo();
    }
    static getBlockBuilder() {
        return {
            type: BlockType.YouTubeVideoBackgroundBlock,
            builder: async (container: HTMLElement, dto: IBlockDto, manager: UniverseBlock) => {
                const block = new YouTubeVideoBackgroundBlock({ manager, ...dto });
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
        this.container.appendChild(this.iframe);
        this.player.playVideo();
        this.player.setVolume(10); // Volume range is 0-100, 10 is quite low/unobtrusive
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
        return this;
    }    
    async destroyAsync(): Promise<void> {
        if (!this.player) return;
        await this.player.destroy();
        this.player=null;
    }
}
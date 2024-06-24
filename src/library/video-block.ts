import { AbstractBlock, IAbstractBlockConstructor } from "./abstract-block";
import { BlockType, IBlock, IBlockDto } from "./standoff-editor-block";
import { v4 as uuidv4 } from 'uuid';
import YouTubePlayer from 'youtube-player';
import { updateElement } from "./svg";
//import { YouTubePlayer } from "youtube-player/dist/types";

export class VideoBlock extends AbstractBlock {
    iframe: HTMLDivElement;
    player: any;
    constructor(args: IAbstractBlockConstructor) {
        super(args);
        this.type = BlockType.VideoBlock;
        this.iframe = document.createElement("DIV") as HTMLDivElement;
        this.player = YouTubePlayer(this.iframe);
    }
    build() {
        const id = this.metadata.url.split("=")[1].split("&")[0];
        const src = `http://www.youtube.com/embed/${id}`;
        this.player.loadVideoById(id);
        // updateElement(this.iframe, {
        //     attribute: {
        //         src: src,
        //         width: "560",
        //         height: "315",
        //         title: "YouTube video player",
        //         frameborder: "0",
        //         allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
        //         //referrerpolicy: "no-referrer-when-downgrade",
        //         allowfullscreen: true
        //     }
        // });
        this.container.appendChild(this.iframe);
        /**
         * Source: https://www.youtube.com/watch?v=g5Vo2EiEFnA&ab_channel=TwoMinutePapers
         * 
         * Embed code:
         * <iframe width="560" height="315"
         * src="https://www.youtube.com/embed/g5Vo2EiEFnA?si=7LGUR6rfzt4P_DJf"
         * title="YouTube video player"
         * frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
         * referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
         */
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
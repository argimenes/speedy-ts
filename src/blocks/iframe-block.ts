
import { v4 as uuidv4 } from 'uuid';
import { updateElement } from "../library/svg";
import { AbstractBlock } from './abstract-block';
import { IAbstractBlockConstructor, BlockType, IBlockDto, IBlock, IArrowNavigation } from '../library/types';
import { UniverseBlock } from '../universe-block';

export class IframeBlock extends AbstractBlock {
    iframe: HTMLIFrameElement;
    constructor(args: IAbstractBlockConstructor) {
        super(args);
        this.type = BlockType.IFrameBlock;
        this.iframe = document.createElement("IFRAME") as HTMLIFrameElement;
    }
    static getBlockBuilder() {
        return {
            type: BlockType.IFrameBlock,
            builder: async (container: HTMLElement, dto: IBlockDto, manager: UniverseBlock) => {
                const block = new IframeBlock({ manager, ...dto });
                if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
                block.applyBlockPropertyStyling();
                await manager.buildChildren(block, dto);
                block.build();
                container.appendChild(block.container);
                return block;
            }
        };
    }
    build() {
        updateElement(this.iframe, {
            attribute: {
                src: this.metadata.url,
                width: this.metadata.width || "100%",
                height: this.metadata.height || "auto",
                title: this.metadata.title || "IFrame",
                frameborder: 0,
                allowfullscreen: true
            }
        });
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
        return this;
    }
}
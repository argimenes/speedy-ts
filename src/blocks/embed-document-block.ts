import { AbstractBlock } from "./abstract-block";
import { IAbstractBlockConstructor, BlockType, IBlockDto, IBlock } from "../library/types"
import { UniverseBlock } from "../universe-block";
import { setElement } from "../library/svg";

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
    static getBlockBuilder() {
        return {
            type: BlockType.YouTubeVideoBlock,
            builder: async (container: HTMLElement, dto: IBlockDto, manager: UniverseBlock) => {
                const block = new EmbedDocumentBlock({ manager, ...dto });
                if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
                block.applyBlockPropertyStyling();
                await manager.buildChildren(block, dto);
                block.filename = block.filename;
                if (block.filename) {
                    const manager = new UniverseBlock();
                    await manager.loadServerDocument(block.filename);
                    block.container.appendChild(manager.container);
                    setElement(block.container, {
                        style: {
                            zoom: 0.5,
                            "overflow-x": "hidden",
                            "overflow-y": "scroll"
                        }
                    })
                }
                container.appendChild(block.container);
                return block;
            }
        };
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
import { BlockType, IBlockDto } from "../library/types";
import { UniverseBlock } from "../universe-block";
import { AbstractBlock } from "./abstract-block";
import { IWindowBlockConstructor, WindowBlock } from "./window-block";

export interface IDocumentWindowBlockConstructor extends IWindowBlockConstructor {
    onClose: (b: AbstractBlock) => Promise<void>;
}

export class DocumentWindowBlock extends WindowBlock
{
    constructor(args: IDocumentWindowBlockConstructor)
    {
        args = {
            ...args,
            onClose: async (b) => {
                b.destroy();
            }
        };
        super(args);
        this.type = BlockType.DocumentWindowBlock;
        this.blockSchemas = this.getBlockSchemas();
    }
    static getBlockBuilder() {
        return {
            type: BlockType.DocumentWindowBlock,
            builder: async (container: HTMLElement, dto: IBlockDto, manager: UniverseBlock) => {
                const block = new DocumentWindowBlock({
                    ...dto,
                    manager,
                    onClose: async (b) => b.destroy()
                });
                block.addBlockProperties(dto.blockProperties);
                block.applyBlockPropertyStyling();
                await manager.buildChildren(block, dto, (child) => {
                    block.container.appendChild(child.container);
                });
                container.appendChild(block.container);
                return block;
            }
        };
    }
    getBlockSchemas() {
        return [
            {
                type: "block/theme/glass",
                name: "Glass window",
                decorate: {
                    blockClass: "block_theme_glass"
                }
            },
            {
                type: "block/theme/paper",
                name: "Paper window",
                decorate: {
                    blockClass: "block_theme_paper"
                }
            }
        ]
    }
}
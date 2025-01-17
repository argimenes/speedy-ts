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
                const background = new DocumentWindowBlock({
                    ...dto,
                    manager,
                    onClose: async (b) => b.destroy()
                });
                background.addBlockProperties(dto.blockProperties);
                await manager.buildChildren(background, dto, (child) => {
                    background.container.appendChild(child.container);
                });
                container.appendChild(background.container);
                return background;
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
            }
        ]
    }
}
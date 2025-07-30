import { StyleBar, StyleBarBlock } from "../components/style-bar";
import { BlockType, IBlockDto } from "../library/types";
import { UniverseBlock } from "../universe-block";
import { AbstractBlock } from "./abstract-block";
import { DocumentBlock } from "./document-block";
import { IWindowBlockConstructor, WindowBlock } from "./window-block";

export interface IDocumentWindowBlockConstructor extends IWindowBlockConstructor {
    onClose: (b: AbstractBlock) => Promise<void>;
}

export class DocumentWindowBlock extends WindowBlock
{
    styleBar: StyleBarBlock;
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
        this.styleBar = new StyleBarBlock({ manager: this.manager });
    }
    static getBlockBuilder() {
        return {
            type: BlockType.DocumentWindowBlock,
            builder: async (container: HTMLElement, dto: IBlockDto, manager: UniverseBlock) => {
                const dcw = new DocumentWindowBlock({
                    ...dto,
                    manager,
                    onClose: async (b) => b.destroy()
                });
                dcw.addBlockProperties(dto.blockProperties);
                dcw.applyBlockPropertyStyling();
                dcw.container.appendChild(dcw.styleBar.container);
                await manager.buildChildren(dcw, dto, (child) => {
                    dcw.container.appendChild(child.container);
                });
                let doc = manager.registeredBlocks.find(x => x.type == BlockType.DocumentBlock) as DocumentBlock;
                dcw.styleBar.document = doc; /// It's just a reference for some useful functions; later we can move those functions.
                // dcw.styleBar.document = manager.getParentOfType(dcw, BlockType.DocumentBlock) as DocumentBlock;
                container.appendChild(dcw.container);
                return dcw;
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
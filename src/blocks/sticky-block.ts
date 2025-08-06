import { v4 as uuidv4 } from 'uuid';
import { updateElement } from "../library/svg";
import { AbstractBlock } from './abstract-block';
import { IAbstractBlockConstructor, BlockType, IBlockDto, IBlock } from '../library/types';
import { UniverseBlock } from '../universe-block';
import { PocketBlock } from './pocket-block';
import { StandoffEditorBlock } from './standoff-editor-block';

type StickyBlockSide = "top"|"bottom"|"left"|"right";

interface IDocumentTagBlockMetadata {
    text: string;
    html: string;
    color: string;
    backgroundColor: string;
    side: StickyBlockSide;
    y: number;
    x: number;
}

export class DocumentTagRowBlock extends AbstractBlock {
    leftSide: HTMLDivElement;
    constructor(args: IAbstractBlockConstructor) {
        super(args);
        this.type = BlockType.DocumentTagRowBlock;
        this.metadata = {
            
        };
        if (args.metadata) this.metadata = { ...this.metadata, ...args.metadata };
        this.inputEvents = this.getInputEvents();
        this.setBlockSchemas(this.getBlockSchemas());
        this.leftSide = document.createElement("DIV") as HTMLDivElement;
    }
    getBlockSchemas() {
        return [
            
        ]
    }
    getNewTabColour() {
        return "cyan";
    }
    async createNewTag() {
        const total = this.blocks.length;
        const dto = {
            type: BlockType.DocumentTagBlock,
            metadata: {
                text: "Tag #" + total,
                backgroundColor: this.getNewTabColour()
            },
            children: [
                {
                    type: BlockType.PocketBlock,
                    children: [
                        {
                            type: BlockType.StandoffEditorBlock
                        }
                    ]
                }
            ]
        };
        const tagBlock = await this.manager.recursivelyBuildBlock(this.newContainer(), dto) as DocumentTagBlock;
        this.blocks.push(tagBlock);
        const pocket = tagBlock.blocks[0] as PocketBlock;
        pocket.container.classList.add("document-tag-panel", "active");
        this.container.appendChild(pocket.container);
        const textBlock = pocket.blocks[0] as StandoffEditorBlock;
        this.manager.setBlockFocus(textBlock);
        textBlock.setCaret(0);
        this.manager.generateParentSiblingRelations(this);
        this.manager.reindexAncestorDocument(this);
        return tagBlock;
    }
    async addTag() {
        const tag = await this.createNewTag();
        this.renderTagLabels();
    }
    static getBlockBuilder() {
        return {
            type: BlockType.DocumentTagRowBlock,
            builder: async (container: HTMLElement, dto: IBlockDto, manager: UniverseBlock) => {
                const block = new DocumentTagRowBlock({ manager, ...dto });
                if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
                block.applyBlockPropertyStyling();
                block.build();
                await manager.buildChildren(block, dto);
                block.renderTagLabels();
                container.appendChild(block.container);
                return block;
            }
        };
    }
    hideAllTagPanels() {
        this.blocks.forEach((tag: DocumentTagBlock) => tag.hidePanel());
    }
    getInputEvents() {
        return [
            
        ];
    }
    build() {
        updateElement(this.leftSide, { classList: ["document-tag-row-block"] });
        this.container.appendChild(this.leftSide);
    }
    renderTagLabels() {
        /**
         * Essentially this should render all the labels for the child
         * DocumentTagBlocks
         */
        const self = this;
        self.leftSide.innerHTML = null;
        const tags = this.blocks.map((tag: DocumentTagBlock) => tag.renderTag());
        const tagHeight = 25;
        const frag = document.createDocumentFragment();
        tags.forEach((node, i) => {
            //node.style.top = (i * tagHeight) + "px";
            frag.appendChild(node);
        });
        this.leftSide.appendChild(frag);
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
}

/**
 * A DocumentTagBlock should be a child of a MembraneBlock as it is intended
 * to draw tags attached to the sides of the Window.
 */

export class DocumentTagBlock extends AbstractBlock {
    constructor(args: IAbstractBlockConstructor) {
        super(args);
        const self = this;
        this.type = BlockType.DocumentTagBlock;
        this.metadata = {
            active: false,
            side: "left",
            backgroundColor: "gold",
            y: 0
        };
        if (args.metadata) this.metadata = { ...this.metadata, ...args.metadata };
        this.inputEvents = this.getInputEvents();
        this.setBlockSchemas(this.getBlockSchemas());
    }
    toggleActiveState() {
        const active = this.metadata.active;
        if (active) {
            this.metadata.active = false;
            this.hidePanel();
        } else {
            this.metadata.active = true;
            this.showPanel();
        }
    }
    showPanel(){
        this.container.classList.add("active");
        this.container.classList.remove("inactive");
    }
    hidePanel() {
        this.container.classList.add("inactive");
        this.container.classList.remove("active");
    }
    getBlockSchemas() {
        return [
            
        ]
    }
    static getBlockBuilder() {
        return {
            type: BlockType.DocumentTagBlock,
            builder: async (container: HTMLElement, dto: IBlockDto, manager: UniverseBlock) => {
                const block = new DocumentTagBlock({ manager, ...dto });
                if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
                block.applyBlockPropertyStyling();
                block.build();
                await manager.buildChildren(block, dto);
                container.appendChild(block.container);
                return block;
            }
        };
    }
    getInputEvents() {
        return [
            
        ];
    }
    build() {
        updateElement(this.container, { classList: ["document-tag-label-block"] });
        this.update();
    }
    update() {
        if (this.metadata.active) {
            this.showPanel();
        } else {
            this.hidePanel();
        }
    }
    renderTag() {
        const self = this;
        const container = document.createElement("DIV") as HTMLDivElement;
        const { text, html, color, backgroundColor } = (this.metadata as IDocumentTagBlockMetadata);
        container.classList.add("document-tag-label-block");
        if (color) {
            updateElement(container, { style: { "color": color } });
        }
        if (backgroundColor) {
            updateElement(container, { style: { "background-color": backgroundColor } });
        }
        if (text) {
            container.innerText = text;
        }
        if (html) {
            container.innerHTML = html;
        }
        container.addEventListener("click", (e) => {
            e.preventDefault();
            const row = self.getRow();
            row.hideAllTagPanels();
            self.toggleActiveState();
        });
        return container;
    }
    getRow() {
        return this.relation.parent as DocumentTagRowBlock;
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
}
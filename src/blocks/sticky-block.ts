import { v4 as uuidv4 } from 'uuid';
import { updateElement } from "../library/svg";
import { AbstractBlock } from './abstract-block';
import { IAbstractBlockConstructor, BlockType, IBlockDto, IBlock } from '../library/types';
import { UniverseBlock } from '../universe-block';

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
    constructor(args: IAbstractBlockConstructor) {
        super(args);
        this.type = BlockType.DocumentTagRowBlock;
        this.metadata = {
            
        };
        if (args.metadata) this.metadata = { ...this.metadata, ...args.metadata };
        this.inputEvents = this.getInputEvents();
        this.setBlockSchemas(this.getBlockSchemas());
    }
    getBlockSchemas() {
        return [
            
        ]
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
                block.renderTags();
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
        updateElement(this.container, { classList: ["document-tag-row-block"] });
    }
    renderTags() {
        /**
         * Essentially this should render all the labels for the child
         * DocumentTagBlocks
         */
        const self = this;
        self.container.innerHTML = null;
        const tags = this.blocks.map((tag: DocumentTagBlock) => tag.renderTag());
        const tagHeight = 25;
        const frag = document.createDocumentFragment();
        tags.forEach((node, i) => {
            //node.style.top = (i * tagHeight) + "px";
            frag.appendChild(node);
        });
        this.container.appendChild(frag);
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
        this.type = BlockType.DocumentTagBlock;
        this.metadata = {
            side: "left",
            backgroundColor: "gold",
            y: 0
        };
        if (args.metadata) this.metadata = { ...this.metadata, ...args.metadata };
        this.inputEvents = this.getInputEvents();
        this.setBlockSchemas(this.getBlockSchemas());
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

    }
    renderTag() {
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
        return container;
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
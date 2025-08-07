import { v4 as uuidv4 } from 'uuid';
import { updateElement } from "../library/svg";
import { AbstractBlock } from './abstract-block';
import { IAbstractBlockConstructor, BlockType, IBlockDto, IBlock } from '../library/types';
import { UniverseBlock } from '../universe-block';
import { PocketBlock } from './pocket-block';
import { StandoffEditorBlock } from './standoff-editor-block';

type BlockSide = "top"|"bottom"|"left"|"right";

interface IStickyTabBlockMetadata {
    text: string;
    html: string;
    color: string;
    backgroundColor: string;
    side: BlockSide;
    y: number;
    x: number;
}

export class StickyTabRowBlock extends AbstractBlock {
    leftSide: HTMLDivElement;
    constructor(args: IAbstractBlockConstructor) {
        super(args);
        this.type = BlockType.StickyTabRowBlock;
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
            type: BlockType.StickyTabBlock,
            metadata: {
                text: "Tab #" + total + 1,
                backgroundColor: this.getNewTabColour(),
                active: true
            },
            children: [
                {
                    type: BlockType.StandoffEditorBlock,
                    text: "",
                    standoffProperties: []
                }
            ]
        };
        const tab = await this.manager.recursivelyBuildBlock(this.newContainer(), dto) as StickyTabBlock;
        this.blocks.push(tab);
        this.container.appendChild(tab.container);
        const textBlock = tab.blocks[0] as StandoffEditorBlock;
        this.manager.setBlockFocus(textBlock);
        textBlock.setCaret(0);
        this.manager.generateParentSiblingRelations(this);
        this.manager.reindexAncestorDocument(this);
        return tab;
    }
    async addTag() {
        const tab = await this.createNewTag();
        this.renderTagLabels();
        this.hideAllTagPanels();
        tab.setActive();
    }
    static getBlockBuilder() {
        return {
            type: BlockType.StickyTabRowBlock,
            builder: async (container: HTMLElement, dto: IBlockDto, manager: UniverseBlock) => {
                const block = new StickyTabRowBlock({ manager, ...dto });
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
        this.blocks.forEach((tag: StickyTabBlock) => tag.setInactive());
    }
    getInputEvents() {
        return [
            
        ];
    }
    build() {
        updateElement(this.leftSide, { classList: ["sticky-tab-row-block"] });
        this.container.appendChild(this.leftSide);
        this.hideAllTagPanels();
    }
    renderTagLabels() {
        /**
         * Essentially this should render all the labels for the child
         * DocumentTagBlocks
         */
        const self = this;
        self.leftSide.innerHTML = null;
        const tags = this.blocks.map((tag: StickyTabBlock) => tag.renderTag());
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
 * A StickyTabBlock should be a child of a MembraneBlock as it is intended
 * to draw tags attached to the sides of the Window.
 */

export class StickyTabBlock extends AbstractBlock {
    constructor(args: IAbstractBlockConstructor) {
        super(args);
        const self = this;
        this.type = BlockType.StickyTabBlock;
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
        this.metadata.active = !this.metadata.active;
        this.updatePanelVisibility();
    }
    updatePanelVisibility() {
        if (this.metadata.active) {
            this.showPanel();
        } else {
            this.hidePanel();
        }
    }
    showPanel(){
        this.container.classList.add("active");
        const row = this.getRow();
        const i = row.blocks.findIndex(x => x.clientId == this.clientId) + 1;
        updateElement(this.container, {
            style: {
                top: (i * 25) + "px"
            }
        });
    }
    hidePanel() {
        this.container.classList.remove("active");
        updateElement(this.container, {
            style: {
                top: "0px"
            }
        });
    }
    getBlockSchemas() {
        return [
            
        ]
    }
    static getBlockBuilder() {
        return {
            type: BlockType.StickyTabBlock,
            builder: async (container: HTMLElement, dto: IBlockDto, manager: UniverseBlock) => {
                const block = new StickyTabBlock({ manager, ...dto });
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
        updateElement(this.container, { classList: ["sticky-tab-panel"] });
        this.update();
    }
    update() {
        this.updatePanelVisibility();
    }
    renderTag() {
        const self = this;
        const container = document.createElement("DIV") as HTMLDivElement;
        const { text, html, color, backgroundColor } = (this.metadata as IStickyTabBlockMetadata);
        container.classList.add("sticky-tab-label-block");
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
            if (!self.metadata.active) {
                self.setActive();
            }
        });
        return container;
    }
    setActive() {
        this.metadata.active = true;
        this.updatePanelVisibility();
    }
    setInactive() {
        this.metadata.active = false;
        this.updatePanelVisibility();
    }
    getRow() {
        return this.relation.parent as StickyTabRowBlock;
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
import { v4 as uuidv4 } from 'uuid';
import { setElement } from "../library/svg";
import { AbstractBlock } from './abstract-block';
import { IAbstractBlockConstructor, BlockType, IBlockDto, IBlock } from '../library/types';
import { UniverseBlock } from '../universe-block';
import { StandoffEditorBlock } from './standoff-editor-block';
import { DocumentBlock } from './document-block';

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
        const colours = ["#6CA0DC", "#A8E6A1", "#FDCB82", "#FFB6A0", "#A0E8B8", "#B9A7D0", "#FF8A80", "#FFDD82", "#00A9E0", "#D3A6D8", "#F2A7D4", "#FFF0D9"]
        const len = colours.length - 1;
        return colours[Math.floor(Math.random() * len)];
    }
    async createNewTab() {
        const total = this.blocks.length;
        const dto = {
            type: BlockType.StickyTabBlock,
            metadata: {
                text: "Sticky tag #" + (total + 1),
                backgroundColor: this.getNewTabColour()
            },
            children: [
                {
                    type: BlockType.StandoffEditorBlock,
                    text: "",
                    standoffProperties: []
                }
            ],
            blockProperties: [{ type: "block/alignment", value: "left" }]
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
    async addTab() {
        const tab = await this.createNewTab();
        this.renderTabLabels();
        this.hideAllTabPanels();
        tab.setActive();
    }
    deleteTab(tab: StickyTabBlock) {
        tab.destroy();
        this.renderTabLabels();
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
                block.renderTabLabels();
                container.appendChild(block.container);
                return block;
            }
        };
    }
    hideAllTabPanels() {
        this.blocks.forEach((tag: StickyTabBlock) => tag.setInactive());
    }
    getInputEvents() {
        return [
            
        ];
    }
    build() {
        setElement(this.leftSide, { classList: ["sticky-tab-row-block"] });
        this.container.appendChild(this.leftSide);
        this.hideAllTabPanels();
    }
    renderTabLabels() {
        /**
         * Essentially this should render all the labels for the child
         * DocumentTagBlocks
         */
        const self = this;
        self.leftSide.innerHTML = null;
        const tags = this.blocks.map((tag: StickyTabBlock) => tag.renderTag());
        const frag = document.createDocumentFragment();
        tags.forEach((node, i) => {
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
        setElement(this.container, {
            style: {
                top: (i * 25) + "px"
            }
        });
    }
    hidePanel() {
        this.container.classList.remove("active");
        setElement(this.container, {
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
    deleteTab() {
        const row = this.getRow();
        row.deleteTab(this);
    }
    setName(name: string) {
        this.metadata.text = name;
        this.getRow().renderTabLabels();
    }
    extract() {
        const doc = this.manager.getParentOfType(this, BlockType.DocumentBlock) as DocumentBlock;
        const tabDto = this.serialize();
        const name = this.metadata.name || "Extracted Sticky Tab";
        const extracted = {
            type: BlockType.DocumentBlock,
            metadata: {
                name: name,
                filename: doc.metadata.filename || "extracted-sticky-tab.json",
                folder: doc.metadata.folder || "uploads"
            },
            children: [{
                type: BlockType.PageBlock,
                metadata: {
                    name: name
                },
                children: [tabDto]
            }]
        };
        this.manager.createDocumentWithWindowAsync(extracted);
    }
    build() {
        setElement(this.container, { classList: ["sticky-tab-panel"] });
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
            setElement(container, { style: { "color": color } });
        }
        if (backgroundColor) {
            setElement(container, { style: { "background-color": backgroundColor } });
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
            const active = self.metadata.active;
            row.hideAllTabPanels();
            if (!active) {
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
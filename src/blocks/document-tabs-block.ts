import { AbstractBlock } from "./abstract-block";
import { updateElement } from "../library/svg";
import { IAbstractBlockConstructor, BlockType, IBlockDto, IBlock, InputEvent, InputEventSource, IBindingHandlerArgs, GUID, CARET } from "../library/types";
import { UniverseBlock } from "../universe-block";
import { StandoffEditorBlock } from "./standoff-editor-block";
import { Template } from "../library/templates";
import { PageBlock } from "./document-block";
import { DocumentBlock } from "./page-block";

export class DocumentTabRowBlock extends AbstractBlock {
    header: HTMLDivElement;
    labels: HTMLSpanElement[];
    constructor(args: IAbstractBlockConstructor) {
        super(args);
        this.type = BlockType.DocumentTabRowBlock;
        this.header = document.createElement("DIV") as HTMLDivElement;
        this.labels = [];
        this.container.appendChild(this.header);
        this.inputEvents = this.getInputEvents();
    }
    getInputEvents() {
        const events: InputEvent[] = [
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Mouse,
                    match: "click"
                },
                action: {
                    name: "Set focus to the current block.",
                    description: "",
                    handler: async (args: IBindingHandlerArgs) => {
                        const block = args.block;
                        const manager = block.manager as UniverseBlock;
                        manager.setBlockFocus(block);
                    }
                }
            }
        ]
        return events;
    }
    setFocus() {
        const tab = this.blocks[0] as DocumentTabBlock;
        if (tab?.type != BlockType.DocumentTabBlock) {
            return;
        }
        tab.setFocus();
    }
    deleteTab(tab: DocumentTabBlock) {
        const parent = this;
        this.manager.removeBlockFrom(parent, tab);
        tab.destroy();
        this.renderLabels();
        const last = this.blocks.length - 1;
        this.setTabActive(this.blocks[last] as DocumentTabBlock);
    }
    destructure() {
        const tabs = this.blocks as DocumentTabBlock[];
        this.header.remove();
        [...tabs].reverse().forEach(tab => {
            tab.explode();
        });
        this.explode();
    }
    static getBlockBuilder() {
        return {
            type: BlockType.DocumentTabRowBlock,
            builder: async (container: HTMLElement, dto: IBlockDto, manager: UniverseBlock) => {
                const block = new DocumentTabRowBlock({ manager, ...dto });
                if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
                block.applyBlockPropertyStyling();
                await manager.buildChildren(block, dto);
                block.renderLabels();
                const activeBlock = block.blocks.find(x => x.metadata.active) as DocumentTabBlock;
                if (activeBlock) {
                    block.setTabActive(activeBlock);
                } else {
                    block.setTabActive(block.blocks[0] as DocumentTabBlock);
                }
                block.container.classList.add("document-row");
                container.appendChild(block.container);
                return block;
            }
        };
    }
    attachEventHandlers() {
        this.container.addEventListener("click", this.handleClick.bind(this));
    }
    handleClick(e: MouseEvent, tab?: DocumentTabBlock) {
        const onClick = this.inputEvents.find(x => (x.trigger.match as string).toLowerCase() == "click");
        if (!onClick) return;
        onClick.action.handler({ block: tab || this, caret: {} as any });
    }
    setTabActive(tab: DocumentTabBlock) {
        const label = this.labels.find(x => x.id == tab.id) as HTMLSpanElement;
        Array.from(this.header.children).forEach(n => n.classList.remove("active"));
        (this.blocks as DocumentTabBlock[]).forEach((t: DocumentTabBlock)=> t.setInactive());
        tab.setActive();
        label && label.classList.add("active");
    }
    renderLabels() {
        const self = this;
        const header = this.header;
        const tabs = this.blocks.filter(x => x.type == BlockType.DocumentTabBlock) as DocumentTabBlock[];
        header.innerHTML = "";
        self.labels.forEach(x => x.remove());
        self.labels = [];
        tabs.forEach((tab, i) => {
            const label = (tab.container.querySelector("span.document-tab-label") || document.createElement("SPAN")) as HTMLSpanElement;
            label.setAttribute("id", tab.id);
            label.innerHTML = tab.metadata?.name || ("Page " + (i+1));
            label.classList.add("document-tab-label");
            self.labels.push(label);
            label.addEventListener("click", (e) => {
                self.setTabActive(tab);
                self.handleClick(e, tab);
            });
            header.appendChild(label);
        });
        const addNewTabLabel = document.createElement("SPAN") as HTMLSpanElement;
        updateElement(addNewTabLabel, {
            innerHTML: "+",
            classList: ["document-tab-label"],
            event: {
                click: async (e) => {
                    const tab = await self.createNewTab(self.labels.length + "");
                }
            }
        });
    }
    getTab(id: GUID) {
        return this.getBlock(id) as DocumentTabBlock;
    }
    async appendTab() {
        const lastTab = this.blocks.at(-1) as DocumentTabBlock;
        await this.addTab({ previousTabId: lastTab.id, name: "Page " + (this.blocks.length + 1) + "" });
    }
    async addTab({ previousTabId, name }: { previousTabId: string, name: string }) {
        const previousTab = this.getTab(previousTabId);
        const row = previousTab.getRow();
        if (!row) return;
        const newTab = await this.createNewTab(name);
        let doc = await this.manager.recursivelyBuildBlock(this.newContainer(), Template.EmptyDocument) as PageBlock;
        this.manager.addBlockTo(newTab, doc);
        this.manager.addBlockTo(row, newTab);
        doc.relation.parent = newTab;
        previousTab.relation.next = newTab;
        newTab.relation.previous = previousTab;
        this.manager.generateParentSiblingRelations(row);
        row.renderLabels();
        newTab.panel.appendChild(doc.container);
        row.container.appendChild(newTab.container);
        row.setTabActive(newTab);
        setTimeout(() => {
            this.manager.setBlockFocus(doc);
            (doc.blocks[0] as StandoffEditorBlock)?.setCaret(0, CARET.LEFT);
        }, 1);
        return newTab;
    }
    async createNewTab(name: string) {
        return await this.manager.recursivelyBuildBlock(this.newContainer(), {
            type: BlockType.DocumentTabBlock, metadata: { name: name } }) as DocumentTabBlock;
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

export class DocumentTabBlock extends AbstractBlock {
    panel: HTMLDivElement;
    constructor(args: IAbstractBlockConstructor) {
        super(args);
        this.type = BlockType.DocumentTabBlock;
        this.metadata.active = false;
        this.panel = document.createElement("DIV") as HTMLDivElement;
        this.panel.classList.add("document-tab-panel");
        this.container.appendChild(this.panel);
        this.inputEvents = this.getInputEvents();
    }
    extract() {
        const mem = this.manager.getParentOfType(this, BlockType.DocumentBlock) as DocumentBlock;
        const tabDto = this.serialize();
        const extracted = {
            type: BlockType.DocumentBlock,
            metadata: {
                name: mem.metadata.name || "Extracted Page",
                filename: mem.metadata.filename || "extracted-page.json",
                folder: mem.metadata.folder || "uploads"
            },
            children: [{
                type: BlockType.DocumentTabRowBlock,
                children: [tabDto]
            }]
        };
        this.manager.createDocumentWithWindow(extracted);
    }
    override explode() {
        /**
         * Destroy the block but first disgorge all of its child blocks.
         */
        const parent = this.relation.parent as AbstractBlock;
        if (!parent) return;
        const i = parent.blocks.findIndex(x => x.id == this.id);
        parent.blocks.splice(i, 1, ...this.blocks);
        const parentElement = this.container.parentElement;
        const fragment = document.createDocumentFragment();
        while (this.panel.firstChild) {
            fragment.appendChild(this.panel.firstChild);
        }
        if (parentElement) {
            parentElement.insertBefore(fragment, this.container);
            this.container.remove();
        }
        this.manager.deregisterBlock(this.id);
        this.manager.generateParentSiblingRelations(parent);
        this.manager.reindexAncestorDocument(parent);
    }
    getRow() {
        return this.manager.getParentOfType(this, BlockType.DocumentTabRowBlock) as DocumentTabRowBlock;
    }
    getInputEvents() {
        const events: InputEvent[] = [
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Mouse,
                    match: "click"
                },
                action: {
                    name: "Set focus to the current block.",
                    description: "",
                    handler: async (args: IBindingHandlerArgs) => {
                        const block = args.block;
                        const manager = block.manager as UniverseBlock;
                        manager.setBlockFocus(block);
                    }
                }
            }
        ]
        return events;
    }
    static getBlockBuilder() {
        return {
            type: BlockType.DocumentTabBlock,
            builder: async (container: HTMLElement, dto: IBlockDto, manager: UniverseBlock) => {
                const block = new DocumentTabBlock({
                    manager, ...dto
                });
                if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
                block.applyBlockPropertyStyling();
                await manager.buildChildren(block, dto, (b) => block.panel.appendChild(b.container));
                container.appendChild(block.container);
                return block;
            }
        };
    }
    attachEventHandlers() {
        this.container.addEventListener("click", this.handleClick.bind(this));
    }
    handleClick(e: MouseEvent) {
        const onClick = this.inputEvents.find(x => (x.trigger.match as string).toLowerCase() == "click");
        if (!onClick) return;
        onClick.action.handler({ block: this, caret: {} as any });
    }
    setName(name: string) {
        this.metadata.name = name;
        this.getRow().renderLabels();
    }
    moveRight() {
        alert("moveRight: Not Implemented")
    }
    moveLeft() {
        alert("moveLeft: Not Implemented")
    }
    mergeLeft() {
        alert("mergeLeft: Not Implemented")
    }
    mergeRight() {
        alert("mergeRight: Not Implemented")
    }
    setActive() {
        this.metadata.active = true;
        updateElement(this.container, {
            classList: ["document-tab"]
        });
        this.panel.classList.add("active");
    }
    setFocus() {
        const firstTextBox = this.blocks.find(x => x.type == BlockType.StandoffEditorBlock) as StandoffEditorBlock;
        if (!firstTextBox) {
            return;
        }
        firstTextBox.setFocus();
        firstTextBox.setCaret(0, CARET.LEFT);
    }
    setInactive() {
        this.metadata.active = false;
        this.panel.classList.remove("active");
        updateElement(this.container, {
            style: {
                border: "none"
            }
        });
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
    deleteTab() {
        this.getRow().deleteTab(this);
    }
    destroy(): void {
        this.container.innerHTML = "";
    }
}
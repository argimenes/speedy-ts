import { AbstractBlock } from "./abstract-block";
import { updateElement } from "../library/svg";
import { IAbstractBlockConstructor, BlockType, IBlockDto, IBlock, InputEvent, InputEventSource, IBindingHandlerArgs, GUID, CARET } from "../library/types";
import { UniverseBlock } from "../universe-block";
import { classList } from "solid-js/web";
import { StandoffEditorBlock } from "./standoff-editor-block";

export class TabRowBlock extends AbstractBlock {
    header: HTMLDivElement;
    labels: HTMLSpanElement[];
    constructor(args: IAbstractBlockConstructor) {
        super(args);
        this.type = BlockType.TabRowBlock;
        this.header = document.createElement("DIV") as HTMLDivElement;
        this.labels = [];
        this.container.appendChild(this.header);
        this.inputEvents = this.getTabBlockEvents();
    }
    getTabBlockEvents() {
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
            type: BlockType.TabRowBlock,
            builder: async (container: HTMLElement, dto: IBlockDto, manager: UniverseBlock) => {
                const block = new TabRowBlock({ manager, ...dto });
                if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
                block.applyBlockPropertyStyling();
                await manager.buildChildren(block, dto);
                block.renderLabels();
                const activeBlock = block.blocks.find(x => x.metadata.active) as TabBlock;
                if (activeBlock) {
                    block.setTabActive(activeBlock);
                } else {
                    block.setTabActive(block.blocks[0] as TabBlock);
                }
                container.appendChild(block.container);
                return block;
            }
        };
    }
    attachEventHandlers() {
        this.container.addEventListener("click", this.handleClick.bind(this));
    }
    handleClick(e: MouseEvent, tab?: TabBlock) {
        const onClick = this.inputEvents.find(x => (x.trigger.match as string).toLowerCase() == "click");
        if (!onClick) return;
        onClick.action.handler({ block: tab || this, caret: {} as any });
    }
    setTabActive(tab: TabBlock) {
        const label = this.labels.find(x => x.id == tab.id) as HTMLSpanElement;
        Array.from(this.header.children).forEach(n => n.classList.remove("active"));
        (this.blocks as TabBlock[]).forEach((t: TabBlock)=> t.setInactive());
        tab.setActive();
        label && label.classList.add("active");
    }
    renderLabels() {
        const self = this;
        const header = this.header;
        const tabs = this.blocks.filter(x => x.type == BlockType.TabBlock) as TabBlock[];
        header.innerHTML = "";
        self.labels.forEach(x => x.remove());
        self.labels = [];
        tabs.forEach((tab, i) => {
            const label = (tab.container.querySelector("span.tab-label") || document.createElement("SPAN")) as HTMLSpanElement;
            label.setAttribute("id", tab.id);
            label.innerHTML = tab.metadata?.name || ("Tab " + (i+1));
            label.classList.add("tab-label");
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
            classList: ["tab-label"],
            event: {
                click: async (e) => {
                    const tab = await self.createNewTab(self.labels.length + "");
                }
            }
        });
    }
    getTab(id: GUID) {
        return this.getBlock(id) as TabBlock;
    }
    async addTab({ tabId, name, copyTextBlockId }: { tabId: string, name: string, copyTextBlockId?: string }) {
        const tab = this.getTab(tabId);
        const row = tab.getRow();
        if (!row) return;
        const newTab = await this.createNewTab(name);
        let textBlock: StandoffEditorBlock;
        if (copyTextBlockId) {
            const block = this.getBlock(copyTextBlockId) as StandoffEditorBlock;
            const dto = block.serialize();
            textBlock = await this.manager.recursivelyBuildBlock(this.newContainer(), dto) as StandoffEditorBlock;
        } else {
            textBlock = await this.manager.recursivelyBuildBlock(this.newContainer(), { type: BlockType.StandoffEditorBlock, blockProperties:[ { type: "block/alignment/left" }] }) as StandoffEditorBlock;
        }
        textBlock.addEOL();
        this.manager.addBlockTo(newTab, textBlock);
        this.manager.addBlockTo(row, newTab);
        this.manager.addParentSiblingRelations(row);
        textBlock.relation.parent = newTab;
        newTab.relation.firstChild = textBlock;
        tab.relation.next = newTab;
        newTab.relation.previous = tab;
        row.renderLabels();
        newTab.panel.appendChild(textBlock.container);
        row.container.appendChild(newTab.container);
        const label = newTab.container.querySelector(".tab-label") as HTMLSpanElement;
        row.setTabActive(newTab);
        setTimeout(() => {
            this.manager.setBlockFocus(textBlock);
            textBlock.setCaret(0, CARET.LEFT);
        }, 1);
        return newTab;
    }
    async createNewTab(name: string) {
        return await this.manager.recursivelyBuildBlock(this.newContainer(), { type: BlockType.TabBlock, metadata: { name: name } }) as TabBlock;
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

export class TabBlock extends AbstractBlock {
    panel: HTMLDivElement;
    constructor(args: IAbstractBlockConstructor) {
        super(args);
        this.type = BlockType.TabBlock;
        this.metadata.active = false;
        this.panel = document.createElement("DIV") as HTMLDivElement;
        this.panel.classList.add("tab-panel");
        this.container.appendChild(this.panel);
        this.inputEvents = this.getTabBlockEvents();
    }
    getRow() {
        return this.manager.getParentOfType(this, BlockType.TabRowBlock) as TabRowBlock;
    }
    getTabBlockEvents() {
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
            type: BlockType.TabBlock,
            builder: async (container: HTMLElement, dto: IBlockDto, manager: UniverseBlock) => {
                const block = new TabBlock({
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
    }
    setActive() {
        this.metadata.active = true;
        updateElement(this.container, {
            classList: ["tab"]
        });
        this.panel.classList.add("active");
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
    destroy(): void {
        this.container.innerHTML = "";
    }
}
import { AbstractBlock } from "./abstract-block";
import { updateElement } from "../library/svg";
import { IAbstractBlockConstructor, BlockType, IBlockDto, IBlock, InputEvent, InputEventSource, IBindingHandlerArgs, GUID, CARET } from "../library/types";
import { UniverseBlock } from "../universe-block";
import { StandoffEditorBlock } from "./standoff-editor-block";
import { DocumentBlock } from "./document-block";

export class TabRowBlock extends AbstractBlock {
    header: HTMLDivElement;
    labels: HTMLSpanElement[];
    constructor(args: IAbstractBlockConstructor) {
        super(args);
        this.type = BlockType.TabRowBlock;
        this.header = document.createElement("DIV") as HTMLDivElement;
        this.labels = [];
        this.container.appendChild(this.header);
        this.suppressEventHandlers = true;
        //this.inputEvents = this.getTabBlockEvents();
    }
    getActiveTab() {
        return this.blocks.find((x) => (x as TabBlock).metadata?.active) as TabBlock;
    }
    firstTab() {
        return this.blocks[0] as TabBlock;
    }
    // getTabBlockEvents() {
    //     const events: InputEvent[] = [
    //         {
    //             mode: "default",
    //             trigger: {
    //                 source: InputEventSource.Mouse,
    //                 match: "click"
    //             },
    //             action: {
    //                 name: "Set focus to the current block.",
    //                 description: "",
    //                 handler: async (args: IBindingHandlerArgs) => {
    //                     const block = args.block;
    //                     const manager = block.manager as UniverseBlock;
    //                     manager.setBlockFocus(block);
    //                 }
    //             }
    //         }
    //     ]
    //     return events;
    // }
    setFocus() {
        const activeTab = this.getActiveTab();
        if (activeTab) {
            activeTab.setCustomFocus();
            return;
        }
        const firstTab = this.firstTab();
        if (firstTab) {
            firstTab.setCustomFocus();
        }
        console.error("No active tab found to set focus on.");
    }
    deleteTab(tab: TabBlock) {
        const parent = this;
        this.manager.removeBlockFrom(parent, tab);
        tab.destroy();
        this.renderLabels();
        const last = this.blocks.length - 1;
        this.setTabActive(this.blocks[last] as TabBlock);
    }
    destructure() {
        const tabs = this.blocks as TabBlock[];
        this.header.remove();
        [...tabs].reverse().forEach(tab => {
            tab.explode();
        });
        this.explode();
    }
    static getBlockBuilder() {
        return {
            type: BlockType.TabRowBlock,
            builder: async (container: HTMLElement, dto: IBlockDto, manager: UniverseBlock) => {
                const row = new TabRowBlock({ manager, ...dto, type: BlockType.TabRowBlock });
                if (dto?.blockProperties) row.addBlockProperties(dto.blockProperties);
                row.applyBlockPropertyStyling();
                await manager.buildChildren(row, dto);
                row.renderLabels();
                const activeBlock = row.blocks.find(x => x.metadata.active) as TabBlock;
                if (activeBlock) {
                    row.setTabActive(activeBlock);
                } else {
                    row.blocks.length && row.setTabActive(row.firstTab());
                }
                container.appendChild(row.container);
                return row;
            }
        };
    }
    // attachEventHandlers() {
    //     this.container.addEventListener("click", this.handleClick.bind(this));
    // }
    // handleClick(e: MouseEvent, tab?: TabBlock) {
    //     const onClick = this.inputEvents.find(x => (x.trigger.match as string).toLowerCase() == "click");
    //     if (!onClick) return;
    //     onClick.action.handler({ block: tab || this, caret: {} as any });
    // }
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
                e.preventDefault();
                self.setTabActive(tab);
                tab.setCustomFocus();
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
    lastTab() {
        return this.blocks.at(-1) as TabBlock;
    }
    async appendTab(blockId?: string) {
        const lastTab = this.lastTab();
        await this.addTab({ previousTabId: lastTab.id, name: (this.blocks.length + 1) + "", copyTextBlockId: blockId });
    }
    async addTab({ previousTabId, name, copyTextBlockId }: { previousTabId: string, name: string, copyTextBlockId?: string }) {
        const previousTab = this.getTab(previousTabId);
        const newTab = await this.createNewTab(name);
        const manager = this.manager;
        let textBlock: StandoffEditorBlock;
        if (copyTextBlockId) {
            const sourceTextBlock = manager.getBlock(copyTextBlockId) as StandoffEditorBlock;
            const sourceTextBlockDto = sourceTextBlock.serialize();
            textBlock = await manager.recursivelyBuildBlock(this.newContainer(), sourceTextBlockDto) as StandoffEditorBlock;
            manager.registerBlock(textBlock);
        } else {
            textBlock = await manager.recursivelyBuildBlock(this.newContainer(), { type: BlockType.StandoffEditorBlock, blockProperties:[ { type: "block/alignment/left" }] }) as StandoffEditorBlock;
        }
        manager.addBlockTo(newTab, textBlock);
        manager.addBlockTo(this, newTab);
        textBlock.relation.parent = newTab;
        previousTab.relation.next = newTab;
        newTab.relation.previous = previousTab;
        manager.generateParentSiblingRelations(this.relation.parent as AbstractBlock);
        this.renderLabels();
        newTab.panel.appendChild(textBlock.container);
        this.container.appendChild(newTab.container);
        this.setTabActive(newTab);
        setTimeout(() => {
            manager.setBlockFocus(textBlock);
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
                    manager, ...dto, type: BlockType.TabBlock
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
    setCustomFocus() {
        if(!this.blocks.length) return;
        const block = this.blocks[0] as IBlock;
        if (block.type == BlockType.StandoffEditorBlock) {
            (block as StandoffEditorBlock).setCaret(0, CARET.LEFT);
        }
        block.setFocus();
        this.manager.setBlockFocus(block);
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
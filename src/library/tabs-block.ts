import { AbstractBlock } from "./abstract-block";
import { updateElement } from "./svg";
import { IAbstractBlockConstructor, BlockType, IBlockDto, IBlock } from "./types";

export class TabRowBlock extends AbstractBlock {
    header: HTMLDivElement;
    constructor(args: IAbstractBlockConstructor) {
        super(args);
        this.type = BlockType.TabRowBlock;
        this.header = document.createElement("DIV") as HTMLDivElement;
        this.container.appendChild(this.header);
        //this.attachEventHandlers();
    }
    attachEventHandlers() {
        this.container.addEventListener("click", this.handleClick.bind(this));
    }
    handleClick(e: MouseEvent, tab?: TabBlock) {
        const onClick = this.inputEvents.find(x => (x.trigger.match as string).toLowerCase() == "click");
        if (!onClick) return;
        onClick.action.handler({ block: tab || this, caret: {} as any });
    }
    setTabActive(tab: TabBlock, label: HTMLSpanElement) {
        Array.from(this.header.children).forEach(n => n.classList.remove("active"));
        (this.blocks as TabBlock[]).forEach((t: TabBlock)=> t.setInactive());
        tab.setActive();
        label.classList.add("active");
    }
    renderLabels() {
        const self = this;
        const header = this.header;
        const tabs = this.blocks.filter(x => x.type == BlockType.TabBlock) as TabBlock[];
        header.innerHTML = "";
        tabs.forEach((tab, i) => {
            const label = (tab.container.querySelector("span.tab-label") || document.createElement("SPAN")) as HTMLSpanElement;
            label.innerHTML = tab.metadata?.name || ("Tab " + (i+1));
            label.classList.add("tab-label");
            if (i == 0) label.classList.add("active");
            label.addEventListener("click", (e) => {
                self.setTabActive(tab, label);
                self.handleClick(e, tab);
            });
            header.appendChild(label);
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
        throw new Error("Method not implemented.");
    }
    destroy(): void {
        if (this.container) this.container.remove();
    }
}

export class TabBlock extends AbstractBlock {
    panel: HTMLDivElement;
    isActive: boolean;
    constructor(args: IAbstractBlockConstructor) {
        super(args);
        this.type = BlockType.TabBlock;
        this.isActive = false;
        this.panel = document.createElement("DIV") as HTMLDivElement;
        this.panel.classList.add("tab-panel");
        this.container.appendChild(this.panel);
        //this.attachEventHandlers();
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
        this.isActive = true;
        updateElement(this.container, {
            classList: ["tab"]
        });
        this.panel.classList.add("active");
    }
    setInactive() {
        this.isActive = false;
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
        throw new Error("Method not implemented.");
    }
    destroy(): void {
        this.container.innerHTML = "";
    }
}
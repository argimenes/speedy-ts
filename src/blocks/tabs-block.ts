import { AbstractBlock } from "./abstract-block";
import { updateElement } from "../library/svg";
import { IAbstractBlockConstructor, BlockType, IBlockDto, IBlock } from "../library/types";

export class TabRowBlock extends AbstractBlock {
    header: HTMLDivElement;
    labels: HTMLSpanElement[];
    constructor(args: IAbstractBlockConstructor) {
        super(args);
        this.type = BlockType.TabRowBlock;
        this.header = document.createElement("DIV") as HTMLDivElement;
        this.labels = [];
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
    constructor(args: IAbstractBlockConstructor) {
        super(args);
        this.type = BlockType.TabBlock;
        this.metadata.active = false;
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
        throw new Error("Method not implemented.");
    }
    destroy(): void {
        this.container.innerHTML = "";
    }
}
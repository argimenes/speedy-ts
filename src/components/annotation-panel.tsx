import { createSignal, For, Match, Show, Switch } from "solid-js";
import { AbstractBlock } from "../library/abstract-block";
import { renderToNode } from "../library/common";
import { StandoffEditorBlock } from "../library/standoff-editor-block";
import { IBlockDto, IBlock, IAbstractBlockConstructor, ISelection, InputEventSource } from "../library/types";
import { AnyARecord } from "dns";


export interface IAnnotationPanelBlockConstructor extends IAbstractBlockConstructor {
    source: AbstractBlock;
    selection?: ISelection;
    events: {
        onClose: () => void;
    }
}

export class AnnotationPanelBlock extends AbstractBlock {
    source: AbstractBlock;
    selection?: ISelection;
    node: HTMLElement;
    events: {
        onClose: () => void;
    }
    constructor(props: IAnnotationPanelBlockConstructor) {
        super(props);
        this.source = props.source;
        this.selection = props.selection;
        this.node = document.createElement("DIV") as HTMLDivElement;
        this.events = props.events;
    }
    render() {
        const self = this;
        const block = this.source as StandoffEditorBlock;
        this.setEvents([
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Mouse,
                    match: "click"
                },
                action: {
                    name: "Close the panel.",
                    description: `
                        
                    `,
                    handler: async (args) => {
                        const target = args.e.target as HTMLElement;
                        if (!self.node.contains(target)) {
                            self.destroy();
                            self.events.onClose();
                        }
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "Escape"
                },
                action: {
                    name: "Close the panel.",
                    description: `
                        
                    `,
                    handler: async (args) => {
                        self.destroy();
                        self.events.onClose();
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "i"
                },
                action: {
                    name: "Apply italics.",
                    description: `
                        
                    `,
                    handler: async (args) => {
                        applyAnnotation("style/italics");
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "b"
                },
                action: {
                    name: "Apply bold.",
                    description: `
                        
                    `,
                    handler: async (args) => {
                        applyAnnotation("style/bold");
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "u"
                },
                action: {
                    name: "Apply underline.",
                    description: `
                        
                    `,
                    handler: async (args) => {
                        applyAnnotation("style/underline");
                    }
                }
            }
        ]);
        const annotate = (e: MouseEvent) => {
            e.preventDefault();
            const button = e.currentTarget as HTMLButtonElement;
            const type = button.dataset.type;
            applyAnnotation(type);
        };
        const applyAnnotation = (type: string) => {
            const start = self.selection?.start.index;
            const end = self.selection?.end.index;
            const dto = {
                type,
                start,
                end
            };
            block.clearSelection();
            block.addStandoffPropertiesDto([dto]);
            block.applyStandoffPropertyStyling();
            self.destroy();
            self.events.onClose();
        }
        const addTableClicked = (rows: number, cells: number) => {
            const table = self.source.manager.createTable(rows, cells);
            self.source.manager.addBlockAfter(table, self.source);
            self.destroy();
            self.events.onClose();
        }
        const bulletListClicked = () => {
            self.source.manager?.indentBlock({ block: self.source });
            self.destroy();
            self.events.onClose();
        }
        const boldClicked = () => {
            applyAnnotation("style/bold");
        };
        const italicClicked = () => {
            applyAnnotation("style/italics")
        };
        const strikethroughClicked = () => {
            applyAnnotation("style/strikethrough")
        }
        const highlightClicked = () => {
            applyAnnotation("style/highlight")
        }
        const clearFormattingClicked = () => {
            // 
        };
        interface IMenuItem {
            name: string;
            onClick?: () => void;
            children?: IMenuItem[];
        }
        interface IMenuComponent { menu: IMenuItem[]; level: number; }
        function MenuComponent (props: IMenuComponent) {
            const [selectedItem, setSelectedItem] = createSignal<IMenuItem>();
            const handleItemClick = (item: IMenuItem) => {
                console.log("handleItemClick", { item });
                if (item.onClick) {
                    item.onClick();
                    return;
                }
                if (!item.children?.length) {
                    return;
                }
                if (selectedItem() == item) {
                    setSelectedItem(undefined);
                } else {
                    setSelectedItem(item);
                }
            };
            return (
                <div class="menu-panel" style={{
                    "top": (20 * props.level - 1) + "px",
                    "margin-left": (20 * props.level) + "px",
                    "z-index": 10 * props.level
                }}>
                    <For each={props.menu}>{(item) =>
                        <div onClick={(e) => { e.preventDefault(); handleItemClick(item); }}>
                            {item.name}
                            <Show when={item.children}>
                                <Switch>
                                    <Match when={selectedItem() != item}>&gt;&gt;</Match>
                                    <Match when={selectedItem() == item}>&lt;&lt;</Match>
                                </Switch>
                                <Show when={selectedItem() == item}>
                                    <MenuComponent menu={item.children} level={props.level + 1} />
                                </Show>
                            </Show>
                        </div>
                    }</For>
                </div>
            );
        }
        function Panel (props: any) {
            const menu: IMenuItem[] = [
                {
                    name: "Format",
                    children: [
                        { name: "Bold", onClick: () => boldClicked() },
                        { name: "Italic", onClick: () => italicClicked() },
                        { name: "Strikethrough", onClick: () => strikethroughClicked() },
                        { name: "Highlight", onClick: () => highlightClicked() },
                        { name: "Clear formatting", onClick: () => clearFormattingClicked() }
                    ]
                },
                {
                    name: "Paragraph",
                    children: [
                        { name: "Bullet list", onClick: () => bulletListClicked() },
                        { name: "Numbered list" },
                        { name: "Task list" }
                    ]
                },
                {
                    name: "Structure",
                    children: [
                        {
                            name: "Table",
                            children: [
                                { name: "1 x 1", onClick: () => addTableClicked(1,1) },
                                { name: "1 x 2", onClick: () => addTableClicked(1,2) },
                                { name: "1 x 3", onClick: () => addTableClicked(1,3)  },
                                { name: "1 x 4", onClick: () => addTableClicked(1,4) },
                                { name: "-----" },
                                { name: "2 x 1", onClick: () => addTableClicked(2,1) },
                                { name: "2 x 2", onClick: () => addTableClicked(2,2) },
                                { name: "2 x 3", onClick: () => addTableClicked(2,3) },
                                { name: "2 x 4", onClick: () => addTableClicked(2,4) },
                            ]
                        },
                        { name: "Grid" },
                        { name: "Tabs" }
                    ]
                }
            ];
            return (
                <>
                    <MenuComponent menu={menu} level={1} />
                </>
            )
        }
        this.node = renderToNode(Panel(null));
        return this.node;
    }
    serialize(): IBlockDto {
        return null;
    }
    deserialize(json: any | any[]): IBlock {
        return null;
    }
    destroy(): void {
        this.node.remove();
    }
    
}
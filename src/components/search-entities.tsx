import { v4 as uuidv4 } from 'uuid';
import { createStore } from "solid-js/store";
import { autofocus } from "@solid-primitives/autofocus";
import { FindMatch, GUID, IAbstractBlockConstructor, IBlock, IBlockDto, InputEventSource, ISelection } from "../library/types";
import { createSignal, For } from "solid-js";
import { AbstractBlock } from "../library/abstract-block";
import { StandoffEditorBlock } from "../library/standoff-editor-block";
import { StandoffProperty } from "../library/standoff-property";
import { fetchGet, renderToNode } from "../library/common";
import { FindReplaceBlock } from './find-replace';
import { BlockManager } from '../library/block-manager';

type Model = {
    search: string;
    page: string;
    order: string;
    direction: string;
}

export type Entity = {
    id: GUID;
    name: string;
    mentions: number;
}

type Search<T> = {
    MaxPage: number;
    Page: number;
    Count: number;
    Results: T[];
}

export interface ISearchEntitiesBlockConstructor extends IAbstractBlockConstructor {
    source: StandoffEditorBlock;
    selection: ISelection;
    onClose?: (search: SearchEntitiesBlock) => Promise<void>;
    onBulkSubmit?: (item: { Text: string, Value: string; }, matches: FindMatch[]) => Promise<void>;
}
export class SearchEntitiesBlock extends AbstractBlock
{
    source: StandoffEditorBlock;
    node?: HTMLElement;
    searchInstance?: any;
    selection: ISelection;
    onClose?: (search: SearchEntitiesBlock) => Promise<void>;
    onBulkSubmit?: (item: { Text: string, Value: string; }, matches: FindMatch[]) => Promise<void>;
    matches: FindMatch[];
    constructor(args: ISearchEntitiesBlockConstructor) {
        super(args);
        this.source = args.source;
        this.selection = args.selection;
        this.onClose = args.onClose;
        this.onBulkSubmit = args.onBulkSubmit;
        this.matches = [];
    }
    close() {
        this.node?.remove();
        if (this.onClose) {
            this.onClose(this);
        }
    }
    onSelected(item: any) {
        if (this.selection) {
            const prop = this.source.createStandoffProperty("codex/entity-reference", this.selection) as StandoffProperty;
            prop.value = item.Value;
        }
        this.close();
    }
    async render() {
        const self = this;
        this.inputEvents.push(
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "Control-A"
                },
                action: {
                    name: "Select all matches of the text in all text blocks.",
                    description: `
                        
                    `,
                    handler: async (args) => {
                        const _text = self.source.getText();
                        const text = _text.substring(self.selection.start.index, self.selection.end.index + 1);
                        const find = new FindReplaceBlock({ source: self.source, manager: self.source!.manager as BlockManager });
                        const matches = self.matches = find.findMatches(text) as FindMatch[];
                        matches.forEach(m => m.block.removeStandoffPropertiesByType("codex/search/highlight"));
                        matches.forEach(m => find.applyHighlights(m.block, [m]));
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "Control-Backspace"
                },
                action: {
                    name: "Clear the search field.",
                    description: `
                        
                    `,
                    handler: async (args) => {
                        setModel("search", "");
                        await searchGraph(model.search);
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "Enter"
                },
                action: {
                    name: "Select the current entity.",
                    description: `
                        
                    `,
                    handler: async (args) => {
                        const item = search[currentResultIndex()];
                        if (self.onBulkSubmit) {
                            self.onBulkSubmit({
                                Text: item.name, Value: item.id
                            }, self.matches);
                            self.close();
                            return;
                        }
                        self.onSelected({
                            Text: item.name, Value: item.id
                        });
                        self.close();
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
                    name: "Quit the entity search.",
                    description: `
                        
                    `,
                    handler: async (args) => {
                        self.close();
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "ArrowDown"
                },
                action: {
                    name: "Go down one item in the search results",
                    description: `
                        
                    `,
                    handler: async (args) => {
                        const len = search.length;
                        if (currentResultIndex() == len -1) {
                            setCurrentResultIndex(0);
                            return;
                        }
                        setCurrentResultIndex(currentResultIndex()+1);
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "ArrowUp"
                },
                action: {
                    name: "Go up one item in the search results",
                    description: `
                        
                    `,
                    handler: async (args) => {
                        const len = search.length;
                        if (currentResultIndex() == 0) {
                            setCurrentResultIndex(len-1);
                            return;
                        }
                        setCurrentResultIndex(currentResultIndex()-1);
                    }
                }
            }
        );
        const [model, setModel] = createStore<Model>({
            search: "",
            page: "1",
            order: "ByName",
            direction: "Ascending"
        });
        const [search, setSearch] = createStore<Search<Entity>>({
            Page: "1", MaxPage: "1", Results: []
        } as any);
        const [currentResultIndex, setCurrentResultIndex] = createSignal<number>(0);
        const [files, setFiles] = createStore<string[]>([
            "default.graph.json"
        ]);
        const searchGraph = async (text: string) => {
            const data = {
                ...model, text
            }
            const res = await fetchGet("/api/findAgentsByNameJson", data);
            const json = await res.json();
            if (!json.Success) return;
            const search = json as Search<Entity>;
            setModel("page", search.Page + "");
            setSearch({
                Count: search.Count,
                Page: search.Page,
                MaxPage: search.MaxPage,
                Results: search.Results
            });
        }
        const addToGraph = async (entity: Entity) => {
            const data = {
                id: entity.id,
                name: entity.name
            }
            const res = await fetch(`/api/addToGraphJson`, {
                headers: {
                    "Content-Type": "application/json",
                },
                method: "POST",
                body: JSON.stringify(data)
            });
            const json = await res.json();
            self.onSelected({
                Text: entity.name, Value: entity.id
            });
        }
        const onSearchChanged = async (e: Event) => {
            e.preventDefault();
            setModel("search", ((e.currentTarget as HTMLInputElement).value as string));
            await searchGraph(model.search);
        }
        const addEntity = async (entity: Entity) => {
            await addToGraph(entity);
            self.onSelected({
                Text: entity.name, Value: entity.id
            });
        }
        const onSelectFromList = (item: Entity) => {
            if (self.onBulkSubmit) {
                self.onBulkSubmit({
                    Text: item.name, Value: item.id
                }, self.matches);
                self.close();
                return;
            }
            self.onSelected({
                Text: item.name, Value: item.id
            });
        }
        const handleClose = (e:Event) => {
            e.preventDefault();
            self.close();
        }
        const handleSubmit = async (e: Event) => {
            e.preventDefault();
            if (model.search?.length == 0) {
                self.close();
                return;
            }
            const entity = { id: uuidv4(), name: model.search } as Entity;
            await addEntity(entity);
        }
        const selection = this.source.getSelection();
        if (selection) {
            const text = this.source.getText();
            const find = text.slice(selection.start.index, selection.end.index + 1);
            setModel("search", find);
        }
        const SearchEntitiesWindow = () =>{
            return (
                <>
                    <div class="search-entities-window">
                        <form onSubmit={handleSubmit}>
                            <div>
                                <input
                                    id={self.id + "-search"}
                                    type="text"
                                    tabIndex={1}
                                    value={model.search}
                                    use:autofocus
                                    autofocus
                                    class="form-control"
                                    onInput={onSearchChanged}
                                />
                                <input
                                    id={self.id + "-page"}
                                    type="number"
                                    tabIndex={2}
                                    value={model.page}
                                    use:autofocus
                                    autofocus
                                    class="form-control"
                                    onInput={(e) => setModel("page", e.currentTarget.value)}
                                />
                                <button type="submit" class="btn btn-primary">Add</button>
                                <button type="button" class="btn btn-default" onClick={handleClose}>Close</button>
                            </div>
                            <div>
                                <For each={search.Results}>{(item, i) =>
                                    <>
                                        <div class="search-entities-list-item">
                                            <div classList={{ "highlight": i() == currentResultIndex() }}>
                                                <span style="width: 100px; margin-right: 10px;">{item.mentions}</span>
                                                <button onClick={(e) => { e.preventDefault(); onSelectFromList(item); }}>Select</button>{item.name}
                                            </div>
                                        </div>
                                    </>
                                }</For>
                            </div>
                        </form>
                    </div>
                </>
            )
        }
        const jsx = SearchEntitiesWindow();
        const node = this.node = renderToNode(jsx);
        return node;
    }
    removeFocus() {
        this.container.blur();
    }
    setFocus(){
        const input = this.container.querySelector("input");
        if (!input) return;
        input.focus();
    }
    serialize(): IBlockDto {
        throw new Error("Method not implemented.");
    }
    deserialize(json: any | any[]): IBlock {
        throw new Error("Method not implemented.");
    }
    destroy(): void {
        this.node?.remove();
    }
}


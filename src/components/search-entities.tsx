import { v4 as uuidv4 } from 'uuid';
import { createStore } from "solid-js/store";
import { autofocus } from "@solid-primitives/autofocus";
import { FindMatch, GUID, IAbstractBlockConstructor, IBlock, IBlockDto, InputEventSource, ISelection } from "../library/types";
import { createSignal, For } from "solid-js";
import { StandoffEditorBlock } from "../blocks/standoff-editor-block";
import { StandoffProperty } from "../library/standoff-property";
import { fetchGetCache, renderToNode } from "../library/common";
import { FindReplaceBlock } from './find-replace';
import { UniverseBlock } from '../universe-block';
import { AbstractBlock } from '../blocks/abstract-block';

type Model = {
    search: string;
    byAlias: boolean;
    byPartial: boolean;
    page: string;
    order: string;
    direction: string;
}

export type Entity = {
    id: GUID;
    text: string;
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
                        const find = new FindReplaceBlock({ source: self.source, manager: self.source!.manager as UniverseBlock });
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
                        const len = search.Results.length;
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
                        const len = search.Results.length;
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
            byAlias: false,
            byPartial: true,
            page: "1",
            order: "ByMentions",
            direction: "Descending"
        });
        const [search, setSearch] = createStore<Search<Entity>>({
            Page: "1", MaxPage: "1", Results: []
        } as any);
        const [currentResultIndex, setCurrentResultIndex] = createSignal<number>(0);
        const [files, setFiles] = createStore<string[]>([
            "default.graph.json"
        ]);
        const searchGraph = async (text: string) => {
            if (!model.search) {
                setSearch({
                    Count: 0,
                    Page: 1,
                    MaxPage: 1,
                    Results: []
                });
                return;
            }
            if (model.search.length <= 3 && !model.byAlias) return;
            const data = {
                ...model, text
            }
            const url = model.byAlias ? "/api/findAgentsByAliasJson" : "/api/findAgentsByNameJson";
            const json = await fetchGetCache(url, data);
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
        let timer = Date.now();
        const onSearchChanged = async (e: Event) => {
            e.preventDefault();
            setModel("search", ((e.currentTarget as HTMLInputElement).value as string));
            if (Date.now() - timer < 500) {
                setTimeout(async () => { if (Date.now() - timer >= 500) await searchGraph(model.search); }, 500);
                return;
            }
            timer = Date.now(); // not quite right as it doesn't evoke the searchGraph on the LAST key stroke
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
        const toggleByAlias = async (e: Event) => {
            e.preventDefault();
            setModel("byAlias", !model.byAlias);
            await searchGraph(model.search);
        }
        const toggleByPartial = async (e: Event) => {
            e.preventDefault();
            setModel("byPartial", !model.byPartial);
            await searchGraph(model.search);
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
                                    style="margin-right: 5px;"
                                    class="form-control"
                                    onInput={onSearchChanged}
                                />
                                <div style="display: inline-block; margin-right: 10px;">
                                    <input
                                        type="checkbox"
                                        checked={model.byAlias}
                                        onInput={toggleByAlias}
                                        style="margin-right: 5px;"
                                    />
                                    <span style="font-size: 0.5rem;">
                                        alias
                                    </span>
                                </div>
                                <div style="display: inline-block; margin-right: 10px;">
                                    <input
                                        type="checkbox"
                                        checked={model.byPartial}
                                        onInput={toggleByPartial}
                                        style="margin-right: 5px;"
                                    />
                                    <span style="font-size: 0.5rem;">
                                        partial
                                    </span>
                                </div>
                                <button type="submit" class="btn btn-primary">Add</button>
                                <button type="button" class="btn btn-default" onClick={handleClose}>Close</button>
                            </div>
                            <div>
                                <table class="table-search-entities">
                                    <thead>
                                        <tr>
                                            <th style="width: 80px;"></th>
                                            <th style="width: 80px;"></th>
                                            <th style="width: 125px;"></th>
                                            <th>

                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <For each={search.Results}>{(item, i) =>
                                            <tr classList={{ "highlight": i() == currentResultIndex() }}>
                                                <td>
                                                    <button onClick={(e) => { e.preventDefault(); onSelectFromList(item); }}>Select</button>
                                                </td>
                                                <td>
                                                    {item.mentions}
                                                </td>
                                                <td>
                                                    "{item.text}"
                                                </td>
                                                <td>
                                                    {item.name}
                                                </td>
                                            </tr>
                                        }</For>
                                    </tbody>
                                </table>
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


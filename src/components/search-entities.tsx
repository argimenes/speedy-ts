import { v4 as uuidv4 } from 'uuid';
import { createStore } from "solid-js/store";
import { autofocus } from "@solid-primitives/autofocus";
import { GUID, IAbstractBlockConstructor, IBlock, IBlockDto, InputEventSource, ISelection } from "../library/types";
import { createSignal, For } from "solid-js";
import { AbstractBlock } from "../library/abstract-block";
import { StandoffEditorBlock } from "../library/standoff-editor-block";
import { StandoffProperty } from "../library/standoff-property";
import { renderToNode } from "../library/common";

type Model = {
    search: string;
}

export type Entity = {
    id: GUID;
    name: string;
}

export interface ISearchEntitiesBlockConstructor extends IAbstractBlockConstructor {
    source: StandoffEditorBlock;
    selection: ISelection;
    onClose?: (search: SearchEntitiesBlock) => void;
}
export class SearchEntitiesBlock extends AbstractBlock
{
    source: StandoffEditorBlock;
    node?: HTMLElement;
    searchInstance?: any;
    selection: ISelection;
    onClose?: (search: SearchEntitiesBlock) => void
    constructor(args: ISearchEntitiesBlockConstructor) {
        super(args);
        this.source = args.source;
        this.selection = args.selection;
        this.onClose = args.onClose;
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
                        const item = results[currentResultIndex()];
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
                        const len = results.length;
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
                        const len = results.length;
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
            search: ""
        });
        const [entities, setEntities] = createStore<Entity[]>([]);
        const [results, setResults] = createStore<Entity[]>([]);
        const [currentResultIndex, setCurrentResultIndex] = createSignal<number>(0);
        const [files, setFiles] = createStore<string[]>([
            "default.graph.json"
        ]);
        const searchGraph = (text: string) => {
            const matches = entities.filter(x => x.name?.toLowerCase().indexOf(text.toLowerCase()) >= 0);
            setResults(matches);
        }
        const addToGraph = async (entity: Entity) => {
            const data = {
                filename: "default.graph.json",
                id: entity.id,
                name: entity.name
            }
            const res = await fetch(`api/addToGraph`, {
                headers: {
                    "Content-Type": "application/json",
                },
                method: "POST",
                body: JSON.stringify(data)
            });
            const json = await res.json();
            await loadGraph("default.graph.json");
        }
        const loadGraph = async (filename: string) => {
            const res = await fetch("api/loadGraphJson?filename=" + encodeURIComponent(filename));
            const json = await res.json();
            if (!json.Success) {
                return;
            }
            const _entities = json.Data.document.nodes;
            setEntities(_entities);
            console.log("loadGraph", { json, entities })
        }
        const onSearchChanged = async (e: Event) => {
            e.preventDefault();
            setModel("search", ((e.currentTarget as HTMLInputElement).value as string));
            await searchGraph(model.search);
        }
        const addEntity = async (entity: Entity) => {
            setEntities([...entities, entity]);
            await addToGraph(entity);
            self.onSelected({
                Text: entity.name, Value: entity.id
            });
        }
        const onSelectFromList = (item: Entity) => {
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
                                    id={self.id + "-input"}
                                    type="text"
                                    tabIndex={1}
                                    value={model.search}
                                    use:autofocus
                                    autofocus
                                    class="form-control"
                                    onInput={onSearchChanged}
                                />
                                <button type="submit" class="btn btn-primary">Add</button>
                                <button type="button" class="btn btn-default" onClick={handleClose}>Close</button>
                            </div>
                            <div>
                                <For each={results}>{(item, i) =>
                                    <>
                                        <div class="search-entities-list-item">
                                            <div classList={{ "highlight": i() == currentResultIndex() }}>
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
        await loadGraph("default.graph.json");
        const jsx = SearchEntitiesWindow();
        const node = this.node = renderToNode(jsx);
        return node;
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


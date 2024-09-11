import { v4 as uuidv4 } from 'uuid';
import { createStore } from "solid-js/store";
import { autofocus } from "@solid-primitives/autofocus";
import { GUID, IAbstractBlockConstructor, IBlock, IBlockDto, InputEventSource, ISelection } from "../library/types";
import { For } from "solid-js";
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
}
export class SearchEntitiesBlock extends AbstractBlock
{
    source: StandoffEditorBlock;
    node?: HTMLElement;
    searchInstance?: any;
    selection: ISelection;
    constructor(args: ISearchEntitiesBlockConstructor) {
        super(args);
        this.source = args.source;
        const self = this;
        this.selection = args.selection;
        this.inputEvents= [
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "Enter"
                },
                action: {
                    name: "Search.",
                    description: `
                        
                    `,
                    handler: async (args) => {
                        args.allowPassthrough && args.allowPassthrough();
                        self.searchInstance.search();
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
                    name: "Close the search modal.",
                    description: `
                        
                    `,
                    handler: async (args) => {
                        self.close();
                    }
                }
            }
        ];
    }
    close() {
        this.node?.remove();
        this.source.manager?.setBlockFocus(this.source);
        this.source.setCaret(this.source.lastCaret.index, this.source.lastCaret.offset);
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
        const [model, setModel] = createStore<Model>({
            search: ""
        });
        const [entities, setEntities] = createStore<Entity[]>([]);
        const [results, setResults] = createStore<Entity[]>([]);
        const [files, setFiles] = createStore<string[]>([
            "default.graph.json"
        ]);
        const searchGraph = (text: string) => {
            const matches = entities.filter(x => x.name.indexOf(text) >= 0);
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
                                <For each={results}>{(item) =>
                                    <>
                                        <div class="search-entities-list-item">
                                            <button onClick={(e) => { e.preventDefault(); onSelectFromList(item); }}>Select</button>{item.name}
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
        const input = document.getElementById(this.id + "-input");
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


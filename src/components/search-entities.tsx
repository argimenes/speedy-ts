import { v4 as uuidv4 } from 'uuid';
import { createStore } from "solid-js/store";
import { autofocus } from "@solid-primitives/autofocus";
import { GUID, IAbstractBlockConstructor, IBindingHandlerArgs, IBlock, IBlockDto, InputEventSource, ISelection } from "../library/types";
import { For, onMount } from "solid-js";
import { AbstractBlock } from "../library/abstract-block";
import { StandoffEditorBlock } from "../library/standoff-editor-block";
import { StandoffProperty } from "../library/standoff-property";
import { renderToNode } from "../library/common";
import { BlockManager } from "../library/block-manager";

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
        // this.addEventListeners();
    }
    addEventListeners() {
        this.node?.addEventListener("keydown", this.handleKeydown.bind(this));
    }
    async handleKeydown(e: KeyboardEvent) {
        const ALLOW = true, FORBID = false;
        const target = e.target as HTMLElement;
        const input = this.toKeyboardInput(e);
        const modifiers = ["Shift", "Alt", "Meta", "Control", "Option"];
        if (modifiers.some(x => x == input.key)) {
            return ALLOW;
        }
        const match = this.getFirstMatchingInputEvent(input);
        if (match) {
            let passthrough = false;
            const args = {
                block: this,
                allowPassthrough: () => passthrough = true,
                e
            } as IBindingHandlerArgs;
            await match.action.handler(args);
            if (passthrough) {
                return ALLOW;
            } else {
                e.preventDefault();
                return FORBID;
            }
        }
        return ALLOW;
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
    render() {
        const self= this;
        const jsx = SearchEntitiesWindow({
            setInstance: function (i: any) {
                self.searchInstance = i;
            },
            onSubmit: () =>{

            },
            onSelected: this.onSelected.bind(this),
            onClose: this.close.bind(this)
        });
        const node = this.node = renderToNode(jsx);
        return node;
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

export function SearchEntitiesWindow(props: any) {
    const [model, setModel] = createStore<Model>({
        search: ""
    });
    const [entities, setEntities] = createStore<Entity[]>([]);
    const [results, setResults] = createStore<Entity[]>([]);
    const [files, setFiles] = createStore<string[]>([
        "default.graph.json"
    ]);
    const addEntity = async (entity: Entity) => {
        setEntities([...entities, entity]);
        await addToGraph(entity);
        if (props.onSelected) {
            props.onSelected({
                Text: entity.name, Value: entity.id
            });
        }
    }
    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        if (model.search?.length == 0) {
            props.onClose && props.onClose();
            return;
        }
        const entity = { id: uuidv4(), name: model.search } as Entity;
        await addEntity(entity);
    }
    const handleClose = (e:Event) => {
        e.preventDefault();
        if (props.onClose) {
            props.onClose();
        }
    }
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
    const onSelectFromList = (item: Entity) => {
        if (props.onSelected) {
            props.onSelected({
                Text: item.name, Value: item.id
            });
        }

    }
    onMount(async () => {
        await loadGraph("default.graph.json");
        if (props.setInstance) {
            props.setInstance({
                search: async () => {
                    await searchGraph(model.search);
                },
                getModel: () => {
                    return {
                        search: model.search
                    };
                },
                clear: async () => {
                    setModel("search", "");
                    searchGraph(model.search);
                }
            });
        }
    })
    const onSearchChanged = async (e: Event) => {
        e.preventDefault();
        setModel("search", ((e.currentTarget as HTMLInputElement).value as string));
        await searchGraph(model.search);
    } 
    return (
        <>
            <div class="search-entities-window">
                <form onSubmit={handleSubmit}>
                    <div>
                        <input
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
                                <div>
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
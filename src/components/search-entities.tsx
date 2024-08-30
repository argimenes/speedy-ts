import { v4 as uuidv4 } from 'uuid';
import { createStore } from "solid-js/store";
import { autofocus } from "@solid-primitives/autofocus";
import { GUID, IAbstractBlockConstructor, IBlock, IBlockDto } from "../library/types";
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
}
export class SearchEntitiesBlock extends AbstractBlock
{
    source: StandoffEditorBlock;
    node?: HTMLElement;
    constructor(args: ISearchEntitiesBlockConstructor) {
        super(args);
        this.source = args.source;
    }
    render() {
        const source = this.source;
        const manager = source.manager as BlockManager;
        const selection = this.source.getSelection();
        const jsx = SearchEntitiesWindow({
            onSelected: (item: any) => {
                if (selection) {
                    const prop = source.createStandoffProperty("codex/entity-reference", selection) as StandoffProperty;
                    prop.value = item.Value;
                }
                node.remove();
                manager.setBlockFocus(source);
                source.setCaret(source.lastCaret.index, source.lastCaret.offset);
            },
            onClose: () => {
                node.remove();
                manager.setBlockFocus(source);
                source.setCaret(source.lastCaret.index, source.lastCaret.offset);
            }
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
    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        if (model.search?.length == 0) {
            props.onClose && props.onClose();
            return;
        }
        const entity = { id: uuidv4(), name: model.search } as Entity;
        setEntities([...entities, entity]);
        await addToGraph(entity);
        if (props.onSelected) {
            props.onSelected({
                Text: entity.name, Value: entity.id
            });
        }
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
        const res = await fetch(`api/addToGraph?id=${entity.id}&name=${entity.name}&filename=default.graph.json`);
        const json = await res.json();
    }
    const loadGraph = async (filename: string) => {
        const res = await fetch("api/loadGraphJson?filename=" + filename);
        const json = await res.json();
        if (!json.Success) {
            return;
        }
        const _entities = json.Data.nodes;
        setEntities(_entities);
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
    })
    return (
        <>
            <div class="search-entities-window">
                <form onSubmit={handleSubmit}>
                    <div>
                        <input
                            type="text"
                            tabIndex={1}
                            value={model.search}
                            use:autofocus autofocus
                            class="form-control"
                            onChange={(e) => { setModel("search", e.currentTarget.value); searchGraph(model.search); }}
                        />
                        <button type="submit" class="btn btn-primary">SELECT</button>
                        <button type="button" class="btn btn-default" onClick={handleClose}>Close</button>
                    </div>
                    <div>
                        <For each={results}>{(item) =>
                            <>
                                <div>
                                    <button onClick={(e) => { e.preventDefault(); onSelectFromList(item); }}>SELECT</button>{item.name}
                                </div>
                            </>
                        }</For>
                    </div>
                </form>
            </div>
        </>
    )
}
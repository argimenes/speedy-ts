import { Component, For, onMount } from "solid-js";
import { StandoffProperty } from "../library/standoff-property";
import { createStore } from "solid-js/store";
import { CARET, Caret, GUID, IBindingHandlerArgs, IBlock, IBlockDto, InputEventSource } from "../library/types";
import { BlockManager } from "../block-manager";
import { updateElement } from "../library/svg";
import { render } from "solid-js/web";
import _ from "underscore";
import { StandoffEditorBlock } from "../blocks/standoff-editor-block";
import { AbstractBlock } from "../blocks/abstract-block";

type StandoffPropertyGroup = {
    item: StandoffProperty;
    count: number;
}
type EntityGroup = {
    item: Entity;
    count: number;
}
export interface IEntitiesListBlockConstructor {
    manager: BlockManager;
    source: StandoffEditorBlock;
}
export class EntitiesListBlock extends AbstractBlock {
    properties: StandoffProperty[];
    node: HTMLDivElement;
    source: StandoffEditorBlock;
    caret: Caret;
    constructor(args: IEntitiesListBlockConstructor) {
        super({ manager: args.manager });
        this.source = args.source;
        this.caret = this.source.getCaret();
        this.properties = [];
        this.setupBindings();
    }
    setupBindings() {
        const self = this;
        this.inputEvents = [
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "Escape"
                },
                action: {
                    name: "Close the window",
                    description: `
                        
                    `,
                    handler: async (args: IBindingHandlerArgs) => {
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
                    name: "Move the cursor down one row. If one isn't found, move to the next block.",
                    description: `
                        
                    `,
                    handler: async (args: IBindingHandlerArgs) => {

                    }
                }
            }
        ];
    }
    setFocus() {
        updateElement(this.container, {
            attribute: {
                "tabIndex": -1
            }
        });
        this.container.focus();
    }
    async render() {
        const node = document.createElement("DIV") as HTMLDivElement;
        render(() =>
            <EntitiesListComponent wrapper={this} />,
            node);
        this.node = node;
        return node;
    }
    close() {
        this.manager.deregisterBlock(this.id);
        this.manager.setBlockFocus(this.source);
        this.source.setCaret(this.caret.right.index, CARET.LEFT);
        this.destroy();
    }
    destroy() {
        this.node.remove();
    }
    serialize(): IBlockDto {
        throw new Error();
    }
    deserialize(json: any | any[]): IBlock {
        throw new Error();
    }
}

type Entity = {
    Guid: GUID;
    Name: string;
}
type EntitiesListComponentProps = {
    wrapper: EntitiesListBlock;
}
type State = {
    activeItem: number;
    isOpen: boolean;
}
export const EntitiesListComponent : Component<EntitiesListComponentProps> = ({ wrapper }) => {
    const manager = wrapper.manager;
    const [state, setState] = createStore<State>({
        activeItem: 0,
        isOpen: false
    });
    const [entities, setEntities] = createStore<EntityGroup[]>([]);
    const [previousProperties, setPreviousProperties] =createStore<StandoffProperty[]>([]);
    const [properties, setProperties] =createStore<StandoffProperty[]>([]);
    const onMouseOver = (e: Event, item: Entity, index: number) => {
        const props = properties.filter(x => x.value == item.Guid);
        previousProperties.forEach(x => x.unhighlight());
        props.forEach(x => x.highlight());
        setPreviousProperties(props);
        setState("activeItem", index);
    }
    const onMouseLeave = (e: Event) => {
        previousProperties.forEach(x => x.unhighlight());
        setPreviousProperties([]);
        setState("activeItem",-1);
    }
    const countItems = (items: StandoffProperty[]): StandoffPropertyGroup[] => {
        const grouped = _.groupBy(items, 'value');
        return _.map(grouped, (group) => ({
            item: group[0],  // Take the first occurrence of the object
            count: group.length
        }));
    }
    onMount(async () => {
        const properties = manager.getAllStandoffPropertiesByType("codex/entity-reference");
        const entities = await manager.getEntities() as Entity[];
        const group = countItems(properties);
        const countMap = _.indexBy(group, (result) => result.item.value);
        const entitiesGroup = _.chain(entities)
            .map((entity) => {
            const match = countMap[entity.Guid];
            return {
                item: entity,
                count: match ? match.count : 0
            } as EntityGroup;
            })
            .sortBy('count')
            .reverse()
            .value();
        setProperties(properties);
        setEntities(entitiesGroup);
    });
    return (
        <div class="entities-list-block">
            <div class="abstract-block">
                <table style="width: 100;">
                    <thead>
                        <tr>
                            <th style="text-align: left;">
                                Entity
                            </th>
                            <th style="text-align: right;">
                                Links
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <For each={entities}>{(row, index) =>
                            <tr style={"border-bottom: 1px solid #eee; background-color: " + (state.activeItem == index() ? "yellow" : "inherit") }>
                                <td style="height: 20px; vertical-align: middle; text-align: left;">
                                    <div
                                        onMouseEnter={(e) => onMouseOver(e, row.item, index())}
                                        onMouseLeave={(e) => onMouseLeave(e)}>
                                        {row.item.Name}
                                    </div>
                                </td>
                                <td style="height: 20px; vertical-align: middle; text-align: right;">
                                    {row.count}
                                </td>
                            </tr>
                        }</For>
                    </tbody>
                </table>
            </div>
        </div>
    )
}
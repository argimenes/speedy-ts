import { Component, For, Show } from "solid-js";
import { StandoffProperty } from "../library/standoff-property";
import { createStore } from "solid-js/store";
import { AbstractBlock } from "../library/abstract-block";
import { GUID, IBindingHandlerArgs, IBlock, IBlockDto, InputEventSource } from "../library/types";
import { BlockManager } from "../library/block-manager";
import { updateElement } from "../library/svg";
import { render } from "solid-js/web";
import _ from "underscore";

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
    onClose: () => void;
}
export class EntitiesListBlock extends AbstractBlock {
    properties: StandoffProperty[];
    node: HTMLDivElement;
    onClose: () => void;
    constructor(args: IEntitiesListBlockConstructor) {
        super({ manager: args.manager });
        this.onClose = args.onClose;
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
                        self.destroy();
                        self.onClose();
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
    countItems(items: StandoffProperty[]): StandoffPropertyGroup[] {
        const grouped = _.groupBy(items, 'value');
        return _.map(grouped, (group) => ({
            item: group[0],  // Take the first occurrence of the object
            count: group.length
        }));
    }
    async render() {
        const properties = this.manager.getAllStandoffPropertiesByType("codex/entity-reference");
        const entities = await this.manager.getEntities() as Entity[];
        const group = this.countItems(properties);
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
        const node = document.createElement("DIV") as HTMLDivElement;
        render(() =>
            <EntitiesListComponent entities={entitiesGroup} manager={this.manager} properties={properties} />,
            node);
        this.node = node;
        return node;
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
    manager: BlockManager;
    properties: StandoffProperty[];
    entities: EntityGroup[];
}
type State = {
    activeItem: number;
    isOpen: boolean;
}
export const EntitiesListComponent : Component<EntitiesListComponentProps> = (props) => {
    const [state, setState] = createStore<State>({
        activeItem: 0,
        isOpen: false
    });
    const [entities, setEntities] = createStore<EntityGroup[]>(props.entities);
    const [previousProperties, setPreviousProperties] =createStore<StandoffProperty[]>([]);
    const [properties, setProperties] =createStore<StandoffProperty[]>(props.properties);
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
import { Component, For, onCleanup, Show } from "solid-js";
import { StandoffProperty } from "../library/standoff-property";
import { createStore } from "solid-js/store";

import { IBindingHandlerArgs, IBlock, IBlockDto, InputEventSource } from "../library/types";
import { UniverseBlock } from "../universe-block";
import { updateElement } from "../library/svg";
import { AbstractBlock } from "./abstract-block";

type StandoffPropertyState = {
    visible: boolean;
    property: StandoffProperty;
}
type Props = {
    monitor: MonitorBlock;
    properties: StandoffProperty[];
    onDelete: (p: StandoffProperty) => void;
    onClose: () => void;
}
export interface IMonitorBlockConstructor {
    manager: UniverseBlock;
}
export interface IHandleyKeyboardInput {
    handleKeyDown(e: KeyboardEvent): Promise<void>;
}
export class MonitorBlock extends AbstractBlock implements IHandleyKeyboardInput {
    properties: StandoffPropertyState[];
    constructor(args: IMonitorBlockConstructor) {
        super({ manager: args.manager });
        this.canSerialize = false;
        this.properties = [];
    }
    setFocus(){
        updateElement(this.container, {
            attribute: {
                "tabIndex": -1
            }
        });
        this.container.focus();
    }
    handleKeyDown(e: KeyboardEvent): Promise<void> {
        throw new Error("Method not implemented.");
    }
    setContainer(node: HTMLDivElement) {
        this.container = node;
    }
    destroy() {
        throw new Error();
    }
    serialize(): IBlockDto {
        throw new Error();
    }
    deserialize(json: any | any[]): IBlock {
        throw new Error();
    }
}

type State = {
    activeItem: number;
    isOpen: boolean;
}
export const StandoffEditorBlockMonitor : Component<Props> = (props) => {
    let node: HTMLDivElement;
    const [state, setState] = createStore<State>({
        activeItem: 0,
        isOpen: false
    });
    const toStandoffPropertyState = (props: StandoffProperty[]) => props.map(x => ({ visible: false, property: x } as StandoffPropertyState));
    const [properties, setProperties] = createStore<StandoffPropertyState[]>(toStandoffPropertyState(props.properties));
    const setItemVisible = (item: StandoffPropertyState, visible: boolean) => {
        const i = properties.findIndex(x => x == item);
        setProperties(i, { visible });
    }
    const onDelete = (p: StandoffProperty) => {
        p.destroy();
        setProperties(properties.filter(x=> x.property != p));
    };
    setItemVisible(properties[0], true);
    let monitor = props.monitor;
    const onInit = (node: HTMLDivElement) => {
        monitor.properties = properties;
        monitor.inputEvents.push(
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "Escape"
                },
                action: {
                    name: "Close Monitor",
                    description: "",
                    handler: async (args: IBindingHandlerArgs) => {
                        props.onClose();
                    }
                },
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "ArrowUp"
                },
                action: {
                    name: "Set focus to the item above.",
                    description: "",
                    handler: async (args: any) => {
                        properties.forEach((__,i) => setProperties(i, "visible", false));
                        const len = monitor.properties.length;
                        if (state.activeItem == 0) {
                            setState("activeItem", len - 1);
                            setProperties(len - 1, "visible", true);
                            return;
                        }
                        const i = state.activeItem - 1;
                        setState("activeItem", i);
                        setProperties(i, "visible", true);
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
                    name: "Set focus to the block below.",
                    description: "",
                    handler: async (args: any) => {
                        properties.forEach((__,i) => setProperties(i, "visible", false));
                        const len = monitor.properties.length;
                        if (state.activeItem == len - 1) {
                            setState("activeItem", 0);
                            setProperties(0, "visible", true);
                            return;
                        }
                        const i = state.activeItem + 1;
                        setState("activeItem", i);
                        setProperties(i, "visible", true);
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "ArrowRight"
                },
                action: {
                    name: "Set property at current index visible.",
                    description: "",
                    handler: async (args: any) => {
                        const item = properties[state.activeItem];
                        item.property.shiftRightOneWord();
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "Shift-ArrowRight"
                },
                action: {
                    name: "Set property at current index visible.",
                    description: "",
                    handler: async (args: any) => {
                        const item = properties[state.activeItem];
                        item.property.shiftRight();
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "ArrowLeft"
                },
                action: {
                    name: "Set property at current index invisible.",
                    description: "",
                    handler: async (args: any) => {
                        const item = properties[state.activeItem];
                        item.property.shiftLeftOneWord();
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "Shift-ArrowLeft"
                },
                action: {
                    name: "Set property at current index invisible.",
                    description: "",
                    handler: async (args: any) => {
                        const item = properties[state.activeItem];
                        item.property.shiftLeft();
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "'='"
                },
                action: {
                    name: "Increase the length of the annotation.",
                    description: "",
                    handler: async (args: any) => {
                        const item = properties[state.activeItem];
                        item.property.expand();
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "'-'"
                },
                action: {
                    name: "Decrease the length of the annotation.",
                    description: "",
                    handler: async (args: any) => {
                        const item = properties[state.activeItem];
                        item.property.contract();
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "'d'"
                },
                action: {
                    name: "Delete the annotation.",
                    description: "",
                    handler: async (args: any) => {
                        const item = properties[state.activeItem];
                        item.property.destroy();
                    }
                }
            }
        );
        monitor.setContainer(node);
    }
    onCleanup(() => {
        
    })
    return (
        <div class="monitor" ref={onInit}>
            <For each={properties}>{(item, index) =>
                <>
                    <div class="line-item">
                        <table>
                            <tbody>
                                <tr>
                                    <td style="width: 25px;">
                                        <Show when={index() == state.activeItem}>
                                            <button>&rsaquo;</button>
                                        </Show>
                                    </td>
                                    <td>
                                        <div class="monitor-property-type" onClick={(e) => { e.preventDefault(); setItemVisible(item, !item.visible); }}>
                                            {item.property.type}
                                        </div>
                                        <Show when={item.visible}>
                                            <div style="display: inline-block;">
                                                <button class="btn" tabIndex={0}>edit</button>
                                                <button class="btn"
                                                    tabIndex={1}
                                                    onMouseOver={(e) => { e.preventDefault(); item.property.highlight(); }}
                                                    onMouseOut={(e) => { e.preventDefault(); item.property.unhighlight(); }}
                                                    onClick={(e) => { e.preventDefault(); item.property.shiftLeft() }}>&lsaquo;</button>
                                                <button class="btn"
                                                    tabIndex={2}
                                                    onMouseOver={(e) => { e.preventDefault(); item.property.highlight(); }}
                                                    onMouseOut={(e) => { e.preventDefault(); item.property.unhighlight(); }}
                                                    onClick={(e) => { e.preventDefault(); item.property.shiftRight() }}>&rsaquo;</button>
                                                <button class="btn"
                                                    tabIndex={3}
                                                    onMouseOver={(e) => { e.preventDefault(); item.property.highlight(); }}
                                                    onMouseOut={(e) => { e.preventDefault(); item.property.unhighlight(); }}
                                                    onClick={(e) => { e.preventDefault(); item.property.expand() }}>&plus;</button>
                                                <button class="btn"
                                                    tabIndex={4}
                                                    onMouseOver={(e) => { e.preventDefault(); item.property.highlight(); }}
                                                    onMouseOut={(e) => { e.preventDefault(); item.property.unhighlight(); }}
                                                    onClick={(e) => { e.preventDefault(); item.property.contract() }}>&ndash;</button>
                                                <button class="btn"
                                                    tabIndex={5}
                                                    onMouseOver={(e) => { e.preventDefault(); item.property.highlight(); }}
                                                    onMouseOut={(e) => { e.preventDefault(); item.property.unhighlight(); }}
                                                    onClick={(e) => { e.preventDefault(); onDelete(item.property) }}>&times;</button>
                                            </div>
                                        </Show>
                                        <Show when={item.property.cache.entity}>
                                            <div class="monitor-entity-name">
                                                {item.property.cache.entity.Name}
                                            </div>
                                        </Show>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </>
            }</For>
        </div>
    )
}
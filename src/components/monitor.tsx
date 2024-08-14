import { Component, For, onCleanup, Show } from "solid-js";
import { StandoffProperty } from "../library/standoff-property";
import { createStore } from "solid-js/store";
import { AbstractBlock } from "../library/abstract-block";
import { IBindingHandlerArgs, IBlock, IBlockDto, InputEventSource } from "../library/types";
import { BlockManager } from "../library/block-manager";

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
    owner: BlockManager;
}
export interface IHandleyKeyboardInput {
    handleKeyDown(e: KeyboardEvent): Promise<void>;
}
export class MonitorBlock extends AbstractBlock implements IHandleyKeyboardInput {
    constructor(args: IMonitorBlockConstructor) {
        super({ owner: args.owner });
        this.canSerialize = false;
    }
    setContainer(node: HTMLDivElement) {
        this.container = node;
    }
    async handleKeyDown(e: KeyboardEvent) {
        const input = this.toKeyboardInput(e);
        const match = super.getFirstMatchingInputEvent(input);
        console.log("MonitorBlock.handleKeyDown", { e, match });
        if (!match) return;
        await match.action.handler({ e, block: this });
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

export const StandoffEditorBlockMonitor : Component<Props> = (props) => {
    let node: HTMLDivElement;
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
    let monitor = props.monitor;
    const onInit = (node: HTMLDivElement) => {
        monitor.inputEvents.push({
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
            }
        })
        monitor.setContainer(node);
    }
    onCleanup(() => {
        
    })
    return (
        <div class="monitor" ref={onInit}>
            <For each={properties}>{(item) =>
                <>
                    <div class="line-item">
                        <div style="display: inline-block;" onClick={(e) => { e.preventDefault(); setItemVisible(item, !item.visible); }}>
                            {item.property.type}
                        </div>
                        <Show when={item.visible}>
                            <div style="display: inline-block;">
                                <button class="btn">edit</button>
                                <button class="btn"
                                    onMouseOver={(e) => { e.preventDefault(); item.property.highlight(); }}
                                    onMouseOut={(e) => { e.preventDefault(); item.property.unhighlight(); }}
                                    onClick={(e) => { e.preventDefault(); item.property.shiftLeft() }}>&lsaquo;</button>
                                <button class="btn"
                                    onMouseOver={(e) => { e.preventDefault(); item.property.highlight(); }}
                                    onMouseOut={(e) => { e.preventDefault(); item.property.unhighlight(); }}
                                    onClick={(e) => { e.preventDefault(); item.property.shiftRight() }}>&rsaquo;</button>
                                <button class="btn"
                                    onMouseOver={(e) => { e.preventDefault(); item.property.highlight(); }}
                                    onMouseOut={(e) => { e.preventDefault(); item.property.unhighlight(); }}
                                    onClick={(e) => { e.preventDefault(); item.property.expand() }}>&plus;</button>
                                <button class="btn"
                                    onMouseOver={(e) => { e.preventDefault(); item.property.highlight(); }}
                                    onMouseOut={(e) => { e.preventDefault(); item.property.unhighlight(); }}
                                    onClick={(e) => { e.preventDefault(); item.property.contract() }}>&ndash;</button>
                                <button class="btn"
                                    onMouseOver={(e) => { e.preventDefault(); item.property.highlight(); }}
                                    onMouseOut={(e) => { e.preventDefault(); item.property.unhighlight(); }}
                                    onClick={(e) => { e.preventDefault(); onDelete(item.property) }}>&times;</button>
                            </div>
                        </Show>
                    </div>
                </>
            }</For>
        </div>
    )
}
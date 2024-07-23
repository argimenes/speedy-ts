import { Component, For, Show } from "solid-js";
import { StandoffProperty } from "../library/standoff-property";
import { createStore } from "solid-js/store";

type StandoffPropertyState = {
    visible: boolean;
    property: StandoffProperty;
}
type Props = {
    properties: StandoffProperty[];
    onMoveLeft: (p: StandoffProperty) => void;
    onMoveRight: (p: StandoffProperty) => void;
    onExpand: (p: StandoffProperty) => void;
    onContract: (p: StandoffProperty) => void;
    onDelete: (p: StandoffProperty) => void;
}
export const StandoffEditorBlockMonitor : Component<Props> = (props) => {
    const toStandoffPropertyState = (props: StandoffProperty[]) => props.map(x => ({ visible: false, property: x } as StandoffPropertyState));
    const [properties, setProperties] = createStore<StandoffPropertyState[]>(toStandoffPropertyState(props.properties));
    const setItemVisible = (item: StandoffPropertyState, visible: boolean) => {
        const i = properties.findIndex(x => x == item);
        setProperties(i, { visible });
    }
    const onDelete = (p: StandoffProperty) => {
        props.onDelete(p);
        setProperties(properties.filter(x=> x.property != p));
    };
    return (
        <div class="monitor">
            <For each={properties}>{(item) =>
                <>
                    <div class="line-item">
                        <div style="display: inline-block;" onClick={(e) => { e.preventDefault(); setItemVisible(item, !item.visible); }}>
                            {item.property.type}
                        </div>
                        <Show when={item.visible}>
                            <div style="display: inline-block;">
                                <button class="btn">edit</button>
                                <button class="btn" onClick={(e) => { e.preventDefault(); props.onMoveLeft(item.property); }}>&lsaquo;</button>
                                <button class="btn" onClick={(e) => { e.preventDefault(); props.onMoveRight(item.property); }}>&rsaquo;</button>
                                <button class="btn" onClick={(e) => { e.preventDefault(); props.onExpand(item.property); }}>&plus;</button>
                                <button class="btn" onClick={(e) => { e.preventDefault(); props.onContract(item.property); }}>&ndash;</button>
                                <button class="btn" onClick={(e) => { e.preventDefault(); onDelete(item.property); }}>&times;</button>
                            </div>
                        </Show>
                    </div>
                </>
            }</For>
        </div>
    )
}
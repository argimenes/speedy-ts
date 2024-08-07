import { Component, For, Show } from "solid-js";
import { StandoffProperty } from "../library/standoff-property";
import { createStore } from "solid-js/store";

type StandoffPropertyState = {
    visible: boolean;
    property: StandoffProperty;
}
type Props = {
    properties: StandoffProperty[];
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
        p.destroy();
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
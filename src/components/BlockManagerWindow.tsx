import { Component } from "solid-js"
import { BlockManager, StandoffEditorBlockDto } from "../library/block-manager"

type Props = {
    
}
export const BlockManagerWindow : Component<Props> = (props) => {
    const initialise = (el: HTMLDivElement) => {
        const testDoc: StandoffEditorBlockDto = {
            text: "Once upon a midnight dreary ...",
            standoffProperties: [
                { type: "style/italics", start: 5, end: 9 },
                { type: "style/bold", start: 7, end: 14 }
            ]
        };
        const manager = new BlockManager();
        manager.container = el;
        manager.loadDocument(testDoc);
    }
    return (
        <>
            <div ref={initialise} />
        </>
    )
}
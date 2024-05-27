import { Component } from "solid-js"
import { BlockManager } from "../library/block-manager"
import { StandoffEditorBlockDto } from "../library/standoff-editor-block"

type Props = {
    
}
export const BlockManagerWindow : Component<Props> = (props) => {
    const initialise = (el: HTMLDivElement) => {
        const testDoc: StandoffEditorBlockDto = {
            text: "Once upon a midnight dreary ...",
            standoffProperties: [
                { type: "style/italics", start: 5, end: 12 },
                { type: "style/bold", start: 7, end: 14 },
                { type: "animation/spinner", start: 10, end: 12 },
                { type: "codex/entity-reference", start: 10, end: 18, value: "abd-def-ghi-123" },
                { type: "codex/block-reference", start: 5, end: 14, value: "abd-def-ghi-321" }
            ]
        };
        const manager = new BlockManager();
        manager.container = el;
        manager.loadDocument(testDoc);
        console.log({ manager, block: manager.blocks[0] })
    }
    return (
        <>
            <div ref={initialise} class="block-window" />
        </>
    )
}
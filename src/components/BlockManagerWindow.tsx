import { Component } from "solid-js"
import { BlockManager } from "../library/block-manager"

export const BlockManagerWindow : Component<any> = (props) => {
    const initialise = (el: HTMLDivElement) => {
        const manager = new BlockManager();
        manager.container = el;
        manager.startNewDocument();
    }
    return (
        <>
            <div ref={initialise} />
        </>
    )
}
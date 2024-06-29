import { Component, For, onMount } from "solid-js"
import { createStore } from "solid-js/store";
import { BlockManager } from "../library/block-manager";
import { GridBlock } from "../library/grid-block";
import { TabBlock, TabRowBlock } from "../library/tabs-block";
import { IndentedListBlock } from "../library/indented-list-block";
import { BlockType } from "../library/abstract-block";
import { StandoffEditorBlock, CARET } from "../library/standoff-editor-block";

type Model = {
    command: string;
    file: string;
}
type Resources = {
    files: string[];
}
type Props = {
    manager?: BlockManager;
}
export const ControlPanel : Component<Props> = (props) => {
    const [model, setModel] = createStore<Model>({
        command: "",
        file: ""
    });
    const [resources, setResources] = createStore<Resources>({
        files: []
    });
    const onSubmit = (e:Event) => {
        e.preventDefault();
        runCommand();
    }
    const load = async (parameters: string[]) => {
        if (!props.manager) return;
        const filename = parameters && parameters[0] || model.file;
        await props.manager.loadServerDocument(filename);
    }
    const save = async (parameters: string[]) => {
        if (!props.manager) return;
        const filename = parameters && parameters[0] || model.file;
        await props.manager.saveServerDocument(filename);
        await listDocuments();
    }
    const listDocuments = async () => {
        if (!props?.manager) return;
        const files = await props.manager.listDocuments();
        setResources("files", files);
    }
    const loadSelectedFileClicked = async (e: Event) => {
        e.preventDefault();
        await load([model.file]);
    }
    const createDocument = () => {
        if (!props.manager) return;
        const doc = {
            type: BlockType.MainListBlock,
            children: [
                {
                    type: BlockType.StandoffEditorBlock,
                    text: "",
                    standoffProperties: [],
                    blockProperties: [
                        { type: "block/alignment/left "}
                    ]
                }
            ]
        };
        props.manager.loadDocument(doc);
        const block = props.manager.blocks[1] as StandoffEditorBlock;
        block.addEOL();
        block.setCaret(0, CARET.LEFT);
        props.manager?.setBlockFocus(block);
    }
    const setBackgroundColour = (colour: string) => {
        const prop = {
            type: "block/background/colour",
            value: colour
        };
        const block = props.manager?.getBlockInFocus();
        if (!block) return;
        block.addBlockProperties([prop]);
    }
    const setFontColour = (colour: string) => {
        const prop = {
            type: "block/font/colour",
            value: colour
        };
        const block = props.manager?.getBlockInFocus();
        if (!block) return;
        block.addBlockProperties([prop]);
    }
    const addImage = (url: string) => {
        const block = props.manager?.getBlockInFocus();
        if (!block) return;
        props.manager?.addImageBlock(block, url);
    }
    const addVideo = (url: string) => {
        const block = props.manager?.getBlockInFocus();
        if (!block) return;
        props.manager?.addVideoBlock(block, url);
    }
    const addIFrame = (url: string) => {
        const block = props.manager?.getBlockInFocus();
        if (!block) return;
        props.manager?.addIFrameBlock(block, url);
    }
    const createGrid = (rows: number, cells: number) => {
        const block = props.manager?.getBlockInFocus();
        if (!block) return;
        const gridBlock = props.manager?.createGrid(rows, cells) as GridBlock;
        props.manager?.addNextBlock(block, gridBlock);
    }
    const setTabName = (name: string) => {
        const block = props.manager?.getBlockInFocus();
        if (!block) return;
        const tab = props.manager?.getParent(block) as TabBlock;
        if (!tab || tab.type != BlockType.TabBlock) return;
        tab.setName(name);
        const row = tab.relation.parent as TabRowBlock;
        row.renderLabels();
    }
    const addTab = (name: string) => {
        const block = props.manager?.getBlockInFocus();
        if (!block) return;
        const tab = props.manager?.getParent(block) as TabBlock;
        if (!tab || tab.type != BlockType.TabBlock) return;
        props.manager?.addTab({ tabId: tab.id, name });
    }
    const collapse = (name: string) => {
        const block = props.manager?.getBlockInFocus() as IndentedListBlock;
        if (!block || block.type != BlockType.IndentedListBlock) return;
        block.collapse();
    }
    const expand = (name: string) => {
        const block = props.manager?.getBlockInFocus() as IndentedListBlock;
        if (!block || block.type != BlockType.IndentedListBlock) return;
        block.expand();
    }
    const drawLeaderLines = (relation: string) => {
        const block = props.manager?.getBlockInFocus();
        props.manager?.drawLeaderLines(relation);
    }
    const runCommand = async () => {
        if (!model.command) {
            return;
        }
        const [command, ...parameters] = model.command.toLowerCase().split(" ");
        switch (command)
        {
            case "load": await load(parameters); return;
            case "save": await save(parameters); return;
            case "list-docs": await listDocuments(); return;
            case "add-image": addImage(parameters[0]); return;
            case "add-video": addVideo(parameters[0]); return;
            case "add-url": addIFrame(parameters[0]); return;
            case "color": setFontColour(parameters[0]); return;
            case "bgcol": setBackgroundColour(parameters[0]); return;
            case "add-grid": createGrid(parseInt(parameters[0]), parseInt(parameters[1])); return;
            // case "collapse": collapse(); return;
            // case "expand": expand(); return;
            case "new-doc": createDocument(); return;
            case "set-tab-name": setTabName(parameters[0]); return;
            case "add-tab": addTab(parameters[0]); return;
            case "draw-leader-lines": drawLeaderLines(parameters[0] || ""); return;
            default: break;
        }
    }
    onMount(async () => {
        const files = await props.manager?.listDocuments() as string[];
        setResources("files", files);
        setModel("file", files[0]);
    })
    return (
        <div class="control-panel">
            <div style="display: inline-block; margin-right: 10px;">
                <form onSubmit={onSubmit}>
                    <input
                        type="text"
                        value={model.command}
                        class="form-control"
                        onInput={(e) => setModel("command", e.currentTarget.value)}
                    />
                    <button type="submit" style="float: right; margin-left: 10px;" class="btn btn-default">Run</button>
                </form>
            </div>
            <div style="display: inline-block; margin-right: 10px;">
                <select value={model.file} onInput={(e) => setModel("file", e.currentTarget.value)}>
                    <For each={resources.files}>{(file) =>
                        <option value={file}>
                            {file}
                        </option>
                    }</For>
                </select>
                <button class="form-control" onClick={loadSelectedFileClicked}>Load</button>
            </div>
        </div>
    )
}

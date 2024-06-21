import { Component, For, onMount } from "solid-js"
import { createStore } from "solid-js/store";
import { BlockManager } from "../library/block-manager";
import { BlockType, CARET, IBlock, StandoffEditorBlock } from "../library/standoff-editor-block";
import { GridBlock } from "../library/gird-block";
import { TabBlock, TabRowBlock } from "../library/tabs-block";

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
    const createGrid = (rows: number, cells: number) => {
        const block = props.manager?.getBlockInFocus();
        if (!block) return;
        const gridBlock = props.manager?.createGrid(rows, cells) as GridBlock;
        props.manager?.addSiblingBlock(block, gridBlock);
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
        const row = props.manager?.getParent(tab) as TabRowBlock;
        if (!row) return;
        const newTab = props.manager?.createTabBlock({
            type: BlockType.TabBlock,
            metadata: {
                name: name
            }
        }) as TabBlock;
        const textBlock = props.manager?.createStandoffEditorBlock({
            type: BlockType.StandoffEditorBlock,
            blockProperties:[
                { type: "block/alignment/left" }
            ]
        }) as StandoffEditorBlock;
        textBlock.addEOL();
        newTab.blocks.push(textBlock);
        row.blocks.push(newTab);
        props.manager?.addParentSiblingRelations(row);
        row.renderLabels();
        newTab.container.appendChild(textBlock.container);
        row.container.appendChild(newTab.container);
        const label = newTab.container.querySelector(".tab-label") as HTMLSpanElement;
        row.setTabActive(newTab, label);
        props.manager?.setBlockFocus(textBlock);
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
            case "bgcol": setBackgroundColour(parameters[0]); return;
            case "add-grid": createGrid(parseInt(parameters[0]), parseInt(parameters[1])); return;
            case "new-doc": createDocument(); return;
            case "set-tab-name": setTabName(parameters[0]); return;
            case "add-tab": addTab(parameters[0]); return;
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

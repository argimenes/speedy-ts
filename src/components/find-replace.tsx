import { createStore } from "solid-js/store";
import { autofocus } from "@solid-primitives/autofocus";
import { BlockType, FindMatch, GUID, IAbstractBlockConstructor, IBlock, IBlockDto, InputEventSource } from "../library/types";
import { createSignal, Show } from "solid-js";
import { AbstractBlock } from "../library/abstract-block";
import { StandoffEditorBlock } from "../library/standoff-editor-block";
import { renderToNode } from "../library/common";
import { BlockManager } from '../library/block-manager';

type Model = {
    findText: string;
    replaceText: string;
}

enum Mode {
    Find,
    Replace
}
export interface IFindReplaceBlockConstructor extends IAbstractBlockConstructor {
    source: StandoffEditorBlock;
    manager: BlockManager;
}
export class FindReplaceBlock extends AbstractBlock
{
    source: StandoffEditorBlock;
    manager: BlockManager;
    node?: HTMLElement;
    constructor(args: IFindReplaceBlockConstructor) {
        super(args);
        this.source = args.source;
        this.manager = args.manager;
    }
    close() {
        this.node?.remove();
        this.manager.setBlockFocus(this.source);
        this.source.setCaret(this.source.lastCaret.index, this.source.lastCaret.offset);
    }
    findMatches(search: string) {
        const textblocks = this.manager.registeredBlocks.filter(x => x.type == BlockType.StandoffEditorBlock) as StandoffEditorBlock[];
        const len = textblocks.length;
        if (!search) return;
        const results: FindMatch[] = [];
        for (let i = 0; i < len; i++) {
            let block = textblocks[i];
            const matches = block.getAllTextMatches(search);
            results.push(...matches);
        }
        return results;
    }
    removeHighlights(block: StandoffEditorBlock) {
        const props = block.standoffProperties.filter(x => x.type == "codex/search/highlight");
        props.forEach(x => x.destroy());
    }
    applyHighlights(block: StandoffEditorBlock, matches: FindMatch[]) {
        const props = [];
        for (let i = 0; i < matches.length; i++) {
            let match = matches[i];
            let prop = {
                type: "codex/search/highlight",
                start: match.start,
                end: match.end,
                clientOnly: true
            }
            props.push(prop);
        }
        if (props.length) {
            block.addStandoffPropertiesDto(props);
            block.applyStandoffPropertyStyling();
        }
    }
    async render() {
        const self = this;
        this.inputEvents.push({
            mode: "default",
            trigger: {
                source: InputEventSource.Keyboard,
                match: "Escape"
            },
            action: {
                name: "Close the find-replace modal.",
                description: `
                    
                `,
                handler: async (args) => {
                    clearHighlights();
                    self.close();
                }
            }
        });
        const [mode, setMode] = createSignal<Mode>(Mode.Find);
        const [model, setModel] = createStore<Model>({
            findText: "",
            replaceText: ""
        });
        const [currentIndex, setCurrentIndex] = createSignal<number>(0);
        const [matches, setMatches] = createStore<FindMatch[]>([]);
        const handleClose = (e: Event) => {
            e.preventDefault();
            clearHighlights();
            self.close();
        }
        const setMatchFocus = () => {
            const i = currentIndex();
            const match = matches[i];
        }
        const upClicked = (e: Event) => {
            e.preventDefault();
            if (currentIndex() > 0) {
                setCurrentIndex(currentIndex()-1);
            } else {
                setCurrentIndex(matches.length - 1);
            }
            setMatchFocus();
        }
        const downClicked = (e: Event) => {
            e.preventDefault();
            if (currentIndex() < matches.length - 1) {
                setCurrentIndex(currentIndex() + 1);
            } else {
                setCurrentIndex(0);
            }
            setMatchFocus();
        }
        const onFind = async (e: Event) => {
            e.preventDefault();
            setModel("findText", e.currentTarget?.value);
            clearHighlights();
            const _matches = self.findMatches(model.findText) || [];
            setMatches(_matches);
            matches.forEach(m => {
                self.applyHighlights(m.block, [m]);
            });
        }
        const handleSubmit = (e: Event) => {
            downClicked(e);
        }
        const clearHighlights = () => {
            const blocks = matches.map(x => x.block);
            blocks.forEach(b => self.removeHighlights(b));
            setMatches([]);
        }
        const clearClicked = (e: Event) => {
            e.preventDefault();
            setModel("findText", "");
            clearHighlights();
        }
        const replaceNextClicked = (e: Event) => {
            e.preventDefault();
        }
        const replaceAllClicked = (e: Event) => {
            e.preventDefault();
        }
        const selection = this.source.getSelection();
        if (selection) {
            const text = this.source.getText();
            const find = text.slice(selection.start.index, selection.end.index);
            setModel("findText", find);
        }
        const SearchEntitiesWindow = () =>{
            return (
                <>
                    <div class="search-entities-window">
                        <form onSubmit={handleSubmit}>
                            <div>
                                <input
                                    type="text"
                                    tabIndex={1}
                                    placeholder='Find'
                                    value={model.findText}
                                    use:autofocus
                                    autofocus
                                    class="form-control"
                                    onInput={onFind}
                                />
                                <span style="font-size: 0.3em;">
                                    {currentIndex() + 1} of {matches.length}
                                </span>
                                <button onClick={upClicked}>&uarr;</button>
                                <button onClick={downClicked}>&darr;</button>
                                <button onClick={clearClicked}>&#10005;</button>
                            </div>
                            <Show when={mode() == Mode.Replace}>
                                <div>
                                    <input
                                        type="text"
                                        placeholder='Replace'
                                        value={model.replaceText}
                                        class="form-control"
                                        onInput={onFind}
                                    />
                                    <button onClick={replaceNextClicked}>Next</button>
                                    <button onClick={replaceAllClicked}>All</button>
                                </div>
                            </Show>
                            <div>
                                <button type="button" class="btn btn-default" onClick={handleClose}>Close</button>
                            </div>
                        </form>
                    </div>
                </>
            )
        }
        const jsx = SearchEntitiesWindow();
        const node = this.node = renderToNode(jsx);
        return node;
    }
    serialize(): IBlockDto {
        throw new Error("Method not implemented.");
    }
    deserialize(json: any | any[]): IBlock {
        throw new Error("Method not implemented.");
    }
    destroy(): void {
        this.node?.remove();
    }
}


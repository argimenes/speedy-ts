import { v4 as uuidv4 } from 'uuid';
import { BlockType, IBlockDto, IBlock, IAbstractBlockConstructor, InputEventSource, IArrowNavigation, Caret, CARET, IRange } from "../library/types";
import { DocumentBlock } from './document-block';
import { TabBlock, TabRowBlock } from './tabs-block';
import { createElement, updateElement } from '../library/svg';
import { AbstractBlock } from './abstract-block';
import { StandoffEditorBlock } from './standoff-editor-block';

export interface ICheckBlockConstructor extends IAbstractBlockConstructor {
    checked?: boolean;
}

export class CheckboxBlock extends AbstractBlock {
    checked: boolean;
    checkbox: HTMLInputElement;
    wrapper: HTMLDivElement;
    constructor(args: ICheckBlockConstructor) {
        super(args);
        const self = this;
        this.id = args?.id || uuidv4();
        this.type = BlockType.CheckboxBlock;
        this.checked = args.checked || false;
        const wrapper = this.wrapper = createElement<HTMLDivElement>("DIV", {
            style: {
                clear: "both"
            }
        });
        this.checkbox = createElement<HTMLInputElement>("INPUT", {
            attribute: {
                type: "checkbox",
                "!checked": args.checked
            },
            style: {
                display: "inline-block",
                height: "25px",
                width: "25px"
            }
        });
        this.inputEvents = [
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "' '"
                },
                action: {
                    name: "Decrease the length of the annotation.",
                    description: "",
                    handler: async (args: any) => {
                        if (self.checked) {
                            self.uncheck();
                        } else {
                            self.check();
                        }
                    }
                }
            }
        ];
        wrapper.append(this.checkbox);
        this.container.append(wrapper);
        this.setupEventHandlers();
    }
    setupEventHandlers() {
        const self = this;
        this.checkbox.addEventListener("change", () => {
            self.manager?.triggerBeforeChange();
            self.checked = !self.checked;
        });
    }
    check() {
        this.manager?.triggerBeforeChange();
        this.checked = true;
        updateElement(this.checkbox, {
            attribute: {
                checked: true
            }
        });
    }
    uncheck() {
        this.manager?.triggerBeforeChange();
        this.checked = false;
        this.checkbox.removeAttribute("checked");
    }
    handleArrowRight(args: IArrowNavigation) {
        this.handleArrowDown(args);
    }
    handleArrowLeft(args: IArrowNavigation) {
        this.handleArrowUp(args);
    }
    handleArrowUp(args: IArrowNavigation): void {
        const self = this;
        const manager = args.manager;
        const root = manager.getParentOfType(this, BlockType.DocumentBlock) as DocumentBlock;
        const index = root.index;
        const ci = index.findIndex(x => x.block.id == self.id);
        if (ci <= 0) return;
        const previousIndex = index[ci-1];
        const previous = previousIndex.block as StandoffEditorBlock;
        if (previous.relation.parent.type == BlockType.TabBlock) {
            let tab = previous.relation.parent as TabBlock;
            let row = tab.relation.parent as TabRowBlock;
            row.setTabActive(tab);
        }
        args.manager.setBlockFocus(previous);
        previous.moveCaretStart();
        const previousRect = previous.container.getBoundingClientRect();
        const h = window.innerHeight;
        console.log("handleArrowUp", { previousRectBottom: previousRect.bottom, h });
        const diff = previousRect.bottom - args.manager.container.scrollTop;
        if (diff < 50) {
            window.scrollBy(0, -1 * (previousRect.bottom + 25));
        }
    }
    handleArrowDown(args: IArrowNavigation) {
        const self = this;
        const manager = args.manager;
        const root = manager.getParentOfType(this, BlockType.DocumentBlock) as DocumentBlock;
        const index = root.index;
        const ci = index.findIndex(x => x.block.id == self.id);
        if (ci == -1) {
            console.log("handleArrowDown", { msg: "Next item not found.", root, block: self })
            return;
        }
        if (ci == index.length - 1) {
            return;
        }
        const nextIndex = index[ci+1];
        const next = nextIndex.block as StandoffEditorBlock;
        if (next.relation.parent.type == BlockType.TabBlock) {
            let tab = next.relation.parent as TabBlock;
            let row = tab.relation.parent as TabRowBlock;
            row.setTabActive(tab);
        }
        args.manager.setBlockFocus(next);
        next.moveCaretStart();
        const nextRect = next.container.getBoundingClientRect();
        const h = window.innerHeight;
        console.log("handleArrowDown", { nextRectTop: nextRect.top, h });
        const diff = h - nextRect.y;
        if (diff < 50) {
            window.scrollBy(0, nextRect.top - h + 50);
        }
    }
    serialize() {
        return {
            id: this.id,
            type: BlockType.CheckboxBlock,
            checked: this.checked,
            metadata: this.metadata,
            blockProperties: this.blockProperties,
            children: this.blocks.map(x => x.serialize())
        } as IBlockDto;
    }
    deserialize(json: any): IBlock {
        throw new Error("Method not implemented.");
    }
}
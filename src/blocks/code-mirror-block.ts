import {basicSetup, EditorView} from "codemirror"
import {javascript} from "@codemirror/lang-javascript"
import { IAbstractBlockConstructor, BlockType, ICodeMirrorBlockDto, IBlock } from "../library/types";
import { AbstractBlock } from "./abstract-block";
import { UniverseBlock } from "../universe-block";

export interface ICodeMirrorBlockConstructor extends IAbstractBlockConstructor {
    text?: string;
}

export class CodeMirrorBlock extends AbstractBlock {
    text: string;
    wrapper: HTMLDivElement;
    view: EditorView;
    constructor(args: ICodeMirrorBlockConstructor) {
        super(args);
        this.type = BlockType.CodeMirrorBlock;
        this.text = "";
        this.wrapper = document.createElement("DIV") as HTMLDivElement;
        this.container.append(this.wrapper);
        this.attachEventHandlers();
        this.view = new EditorView({
            doc: args.text || "",
            extensions: [basicSetup, javascript()],
            parent: this.wrapper
        });
        this.container.append(this.wrapper);
    }
    static getBlockBuilder() {
        return {
            type: BlockType.CodeMirrorBlock,
            builder: async (container: HTMLElement, dto: ICodeMirrorBlockDto, manager: UniverseBlock) => {
                const block = new CodeMirrorBlock({ manager, ...dto });
                if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
                block.applyBlockPropertyStyling();
                await manager.buildChildren(block, dto);
                if (dto.text)  {
                    block.bind(dto.text);
                }
                container.appendChild(block.container);
                return block;
            }
        };
    }
    attachEventHandlers() {
        const self = this;
    }
    private handleKeyDown(e: KeyboardEvent) {
        const ALLOW = true, FORBID = false;
        const input = this.toKeyboardInput(e);
        const modifiers = ["Shift", "Alt", "Meta", "Control", "Option"];
        if (modifiers.some(x => x == input.key)) {
            return ALLOW;
        }
        const match = this.getFirstMatchingInputEvent(input);
        if (match) {
            let passthrough = false;
            const args = {
                block: this,
                allowPassthrough: () => passthrough = true
            } as any;
            match.action.handler(args);
            if (!passthrough) {
                e.preventDefault();
                return FORBID;
            }
        }
        return ALLOW;
    }
    getContent() {
        return this.view.state.doc.toString();
    }
    bind(text: string) {
        
    }
    serialize() {
        return {
            id: this.id,
            type: BlockType.CodeMirrorBlock,
            text: this.getContent(),
            metadata: this.metadata,
            blockProperties: this.blockProperties.map(x => x.serialize()),
            children: this.blocks.map(x => x.serialize())
        } as ICodeMirrorBlockDto;
    }
    deserialize(json: any): IBlock {
        throw new Error("Method not implemented.");
    }    
}
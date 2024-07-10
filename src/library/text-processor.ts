import { StandoffEditorBlock } from "./standoff-editor-block";
import { CARET, IBindingHandlerArgs } from "./types";

export interface ITextProcessorConstructor {
    editor: StandoffEditorBlock;
}
export class TextProcessor {
    editor: StandoffEditorBlock;
    replacements: string[][];
    constructor({ editor }: ITextProcessorConstructor) {
        this.editor = editor;
        this.replacements = [
            ["->", "➤"],
            ["<>", "🔷"],
            ["<3", "❤️"],
            [">-", "⤚"],
            ["--", "—"],
            ["[ ]", "☐"],
            ["[X]", "✅"],
            [":x:", "❌"],
            [":P", "😛"],
            ["::", "▀▄"],
            ["(\")", "✌"],

            [":bolt:", "⚡"],
            [":light:", "💡"],
            [":time:", "⏲️"],
            [":date:", "📅"],
            [":watch:", "⌚"],
            [":tent:", "⛺"],

            [":thinking:", "🤔"],
            [":joy:", "😂"],
            [":grinning:", "😀"],
            [":cry:", "😢"],
            [":sweat:", "😓"],
            [":disappointed:", "😞"],
            [":anguished:", "😧"],
            [":astonished:", "😲"],
            [":dizzy_face:", "😵"],
            [":open_mouth:", "😮"],
            [":scream:", "😱"],
            [":cold_sweat:", "😰"],
            ["b/n", "between"],
            ["c/d", "could"],
            ["w/d", "would"],
            ["r/n/s", "relations"],
            ["b/c", "because"]
        ];
    }
    process(args: IBindingHandlerArgs) {
        const self = this;
        var replaced = false;
        const { caret } = args;
        const block = args.block as StandoffEditorBlock;
        const text = block.getText();
        const cells = block.cells;
        this.replacements.forEach(term => {
            if (text.indexOf(term[0]) >= 0) {
                replaced = true;
                self.replaceTextWith({ source: term[0], target: term[1], text, cells });
            }
        });
        if (replaced) {
            this.editor.setCaret(caret.right.index, CARET.LEFT);
            return;
        }
    }
    replaceTextWith(args: any) {
        const { text, cells, source, target } = args;
        const si = text.indexOf(source);
        const ei = si + source.length - 1;
        const next = cells[ei + 1];
        this.editor.removeCellsAtIndex(si, source.length);
        this.editor.insertTextAtIndex(target, next.index);
        this.editor.setCaret(next.index, CARET.LEFT);
    }
}
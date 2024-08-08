import { Cell } from "./cell";
import { StandoffEditorBlock } from "./standoff-editor-block";
import { BlockPropertyDto, CARET, IBindingHandlerArgs, IPropertySchema, IRange, StandoffPropertyDto } from "./types";

export interface ITextProcessorConstructor {
    editor: StandoffEditorBlock;
}
type Wrapper = {
    start: string;
    end: string;
};
export interface ITextPatternRecogniserHandler {
    block: StandoffEditorBlock;
    text: string;
    cells: Cell[];
    match: IRange;
    container: HTMLDivElement;
    rule: Rule
}
export type Rule = {
    pattern: string;
    type?: string;
    wrapper?: Wrapper;
    process?: (args: any) => Promise<void>;
}
const getMatches = (args: any) => {
    const { text, search } = args;
    var options = args.options || "gi";
    const re = new RegExp(search, options);
    var results = [], match;
    while ((match = re.exec(text)) != null) {
        if (re.lastIndex == 0) {
            return [];
        }
        let span = match[0];
        results.push({
            start: match.index,
            end: match.index + span.length - 1,
            text: text.substr(match.index, span.length)
        });
    }
    return results;
};

export class TextProcessor {
    editor: StandoffEditorBlock;
    replacements: string[][];
    rules: Rule[];
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
        this.rules = [
            {
                pattern: "\\^\\^(.*?)\\^\\^", type: "superscript", wrapper: { start: "^^", end: "^^" }
            },
            {
                pattern: "~~(.*?)~~", type: "strike", wrapper: { start: "~~", end: "~~" }
            },
            {
                pattern: "_(.*?)_", type: "italics", wrapper: { start: "_", end: "_" }
            },
            {
                pattern: "\\[\\((.*?)\\)\\]",
                type: "item-number",
                wrapper: { start: "[(", end: ")]" }
            },
            {
                pattern: "\\[<(.*?)>\\]", type: "rectangle", wrapper: { start: "[<", end: ">]" }
            },
            {
                pattern: "`(.*?)`", type: "code", wrapper: { start: "`", end: "`" }
            },
            {
                pattern: "\\*(.*?)\\*", type: "bold", wrapper: { start: "*", end: "*" }
            },
            //capital
            {
                pattern: '<<(.*?)>>', type: "capital", wrapper: { start: '<<', end: '>>' },
            },
            {
                pattern: '""(.*?)""', type: "air-quotes", wrapper: { start: '""', end: '""' },
            },
            {
                pattern: "\\[image/(.*?)\\]",
                type: "image",
                wrapper: {
                    start: "[image/", end: "]"
                },
                /*
                export interface ITextPatternRecogniserHandler {
                    block: StandoffBlockEditor;
                    text: string;
                    cells: Cell[];
                    match: IRange;
                    container: HTMLDivElement;
                    editor: BlockManager;
                    rule: {
                        type: string;
                        wrapper: {
                            start: string;
                            end: string;
                        }
                        pattern: string;
                    }
                }
                */
                process:async(args: ITextPatternRecogniserHandler) => {
                    const { text, cells, match, container, block, rule } = args;
                    const wrapper = rule.wrapper as Wrapper;
                    const startLen = wrapper.start.length;
                    const endLen = wrapper.end.length;
                    const textStart = match.start.index + startLen;
                    const textEnd = match.end.index - endLen;
                    const url = text.substring(textStart, textEnd - textStart + 1);
                    const anchor = match.end;
                    // const p = editor.createZero({ type: rule.type, value: url, cell: anchor });
                    // const { schema } = p;
                    // //schema.render.update(p);
                    // schema.animation.init(p);
                    // schema.animation.start(p);
                    for (var i = match.start; i <= match.end; i++) {
                        let cell = cells[i];
                        //self.removeCell({ cell, container });
                    }
                }
            },
            {
                pattern: "/sup/(.*?)/", type: "superscript", wrapper: { start: "/sup/", end: "/" }
            },
            {
                pattern: "/sub/(.*?)/", type: "subscript", wrapper: { start: "/sub/", end: "/" }
            },
            {
                pattern: "__(.*?)__", type: "underline", wrapper: { start: "__", end: "__" }
            },
            {
                pattern: "/spin/(.*?)/", type: "clock", wrapper: { start: "/spin/", end: "/" }
            },
            {
                pattern: "/todo/(.*?)/", type: "todo", wrapper: { start: "/todo/", end: "/" }
            },
            {
                pattern: "/drop/(.*?)/", type: "drop", wrapper: { start: "/drop/", end: "/" }
            },
            {
                pattern: "/h/(.*?)/", type: "highlight", wrapper: { start: "/h/", end: "/" }
            },
            {
                pattern: "/u/(.*?)/", type: "underline", wrapper: { start: "/u/", end: "/" }
            },
            //{
            //    pattern: "/i/(.*?)/", type: "italics", wrapper: { start: "/i/", end: "/" }
            //},
            //{
            //    pattern: `"(.*?)"`, type: "quotation"
            //},
            {
                pattern: "/b/(.*?)/", type: "bold", wrapper: { start: "/b/", end: "/" }
            },
            {
                pattern: "/s/(.*?)/", type: "strike", wrapper: { start: "/s/", end: "/" }
            },
            {
                pattern: "/br/",
                process: async (args: ITextPatternRecogniserHandler) => {
                    const { cells, match, container } = args;
                    const next = cells[match.end.index + 1];
                    for (var i = match.start.index; i <= match.end.index; i++) {
                        const cell = cells[i];
                        //self.removeCell({ cell, container });
                    }
                    //self.editor.addZeroPoint("hr", null, next);
                }
            },
            {
                pattern: "/pp/(.*?)/", wrapper: { start: "/pp/", end: "/" },
                process: async (args: ITextPatternRecogniserHandler) => {
                    const { cells, match, container, rule } = args;
                    const textStart = cells[match.start.index + 4], textEnd = cells[match.end.index - 1];
                    // self.removeWrapper({ wrapper: rule.wrapper, cells, match, container });
                    // self.insertBeforeAnchor(textStart, "😼");
                    // self.insertAfterAnchor(textEnd, "😼");
                }
            },
            {
                pattern: "/lg/(.*?)/", type: "size", wrapper: { start: "/lg/", end: "/" },
                process: async (args) => {
                    const { cells, match, container, editor, rule } = args;
                    const start = cells[match.start + 4], end = cells[match.end - 1];
                    // self.removeWrapper({ wrapper: rule.wrapper, cells, match, container });
                    editor.createProperty("size", "2rem", { start, end });
                }
            },
            {
                pattern: "/sm/(.*?)/", type: "size", wrapper: { start: "/sm/", end: "/" },
                process: async (args) => {
                    const { cells, match, container, editor, rule } = args;
                    const start = cells[match.start + 4], end = cells[match.end - 1];
                    // self.removeWrapper({ wrapper: rule.wrapper, cells, match, container });
                    editor.createProperty("size", "0.75rem", { start, end });
                }
            },
            {
                pattern: "/right/", type: "alignment/right", wrapper: { start: "/right/",end:"" },
                process: async (args) => {
                    const { cells, match, container, editor, rule } = args;
                    // self.removeWrapper({ wrapper: rule.wrapper, cells, match, container });
                    const start = cells[match.end].speedy.next;
                    editor.createBlockProperty("alignment/right", { start: start, end: cells[cells.length - 1] });
                }
            },
            {
                pattern: "/center/", type: "alignment/center", wrapper: { start: "/center/", end: "" },
                process: async (args) => {
                    const { cells, match, container, editor, rule } = args;
                    // self.removeWrapper({ wrapper: rule.wrapper, cells, match, container });
                    const start = cells[match.end].speedy.next;
                    editor.createBlockProperty("alignment/center", { start: start, end: cells[cells.length - 1] });
                }
            },
            {
                pattern: "/h1/", type: "size", wrapper: { start: "/h1/", end: "" },
                process: async (args) => {
                    const { block } = args;
                    block.addBlockProperties([ { type: "block/font/size/h1" } ]);
                    block.applyBlockPropertyStyling();
                }
            },
            {
                pattern: "/h2/", type: "size", wrapper: { start: "/h2/", end: "" },
                process: async (args: ITextPatternRecogniserHandler) => {
                    const { block } = args;
                    block.addBlockProperties([ { type: "block/font/size/h2" } ]);
                    block.applyBlockPropertyStyling();
                }
            },
            {
                pattern: "/h3/", type: "size", wrapper: { start: "/h3/", end: "" },
                process: async (args: ITextPatternRecogniserHandler) => {
                    const { block } = args;
                    block.addBlockProperties([ { type: "block/font/size/h3" } ]);
                    block.applyBlockPropertyStyling();
                }
            },
            {
                pattern: "/arial/(.*?)/", type: "font", wrapper: { start: "/arial/", end: "/" },
                process: async (args: ITextPatternRecogniserHandler) => {
                    const { match, block } = args;
                    block.addStandoffPropertiesDto([{
                        type: "font/family/arial",
                        start: match.start.index, end: match.end.index
                    }]);
                    block.applyStandoffPropertyStyling();
                }
            },
            {
                pattern: "/mono/(.*?)/", type: "font", wrapper: { start: "/mono/", end: "/" },
                process: async (args: ITextPatternRecogniserHandler) => {
                    const { match, block } = args;
                    block.addStandoffPropertiesDto([{
                        type: "font/family/mono",
                        start: match.start.index, end: match.end.index
                    }]);
                    block.applyStandoffPropertyStyling();
                }
            },
            {
                pattern: "/red/(.*?)/", type: "colour", wrapper: { start: "/red/", end: "/" },
                process: async (args: ITextPatternRecogniserHandler) => {
                    const { match, block } = args;
                    block.addStandoffPropertiesDto([{
                        type: "font/color",
                        value: "red",
                        start: match.start.index, end: match.end.index
                    }]);
                    block.applyStandoffPropertyStyling();
                }
            },
            {
                pattern: "/blue/(.*?)/", type: "colour", wrapper: { start: "/blue/", end: "/" },
                process:async (args: ITextPatternRecogniserHandler) => {
                    const { match, block } = args;
                    block.addStandoffPropertiesDto([{
                        type: "font/color",
                        value: "blue",
                        start: match.start.index, end: match.end.index
                    }]);
                    block.applyStandoffPropertyStyling();
                }
            },
            {
                type: "agent",
                pattern: "\\[today\\]",
                process: async (args: ITextPatternRecogniserHandler) => {
                    const { match, block } = args;
                    block.removeCellsAtIndex(match.start.index, match.end.index - match.start.index + 1)
                    const now = new Date();
                    const day = ("0" + now.getDate()).slice(-2);
                    const month = ("0" + (now.getMonth() + 1)).slice(-2);
                    const year = now.getFullYear();
                    const dateText = `${day}/${month}/${year}`;
                    block.insertTextAtIndex(dateText, match.start.index);
                    // $.get("/Admin/Agent/FindOrCreate", params, (response) => {
                    //     if (!response.Success) {
                    //         return;
                    //     }
                    //     const guid = response.Data.Guid;
                    //     editor.createProperty(rule.type, guid, { start, end });
                    // });
                }
            }
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
    processRules(args: IBindingHandlerArgs){
        const self = this;
        let rulesProcessed = false;
        const { caret } = args;
        const block = args.block as StandoffEditorBlock;
        const text = block.getText();
        const cells = block.cells;
        this.rules.forEach(rule => {
            const matches = getMatches({ text, search: rule.pattern });
            if (matches.length) {
                rulesProcessed = true;
                matches.forEach(m => {
                    if (rule.process) {
                        rule.process({ block, text, cells, match: m, rule })
                        return;
                    }
                    var wrapperStart = 0, wrapperEnd = 0;
                    if (rule.wrapper) {
                        if (!rule.wrapper) {
                            // skip
                        } else {
                            wrapperStart = rule.wrapper.start.length;
                            wrapperEnd = rule.wrapper.end.length;
                        }
                    }
                    const textStart = m.start + wrapperStart, textEnd = m.end - wrapperEnd;
                    const schemas = (block.schemas as IPropertySchema[]).concat(block.blockSchemas);
                    const type = schemas.find(x => x.type == rule.type) as IPropertySchema;
                    block.removeCellsAtIndex(m.start, wrapperStart);
                    block.removeCellsAtIndex(m.end, wrapperEnd);
                    // for (var i = 0; i < wrapperStart; i++) {
                    //     const start = cells[m.start + i];
                    //     self.removeCell({ cell: start, container });
                    // }
                    // for (var i = 0; i < wrapperEnd; i++) {
                    //     const end = cells[m.end - i];
                    //     self.removeCell({ cell: end, container });
                    // }
                    if (type.type.indexOf("block") >= 0 ) {
                        const prop = { type: rule.type } as BlockPropertyDto;
                        block.addBlockProperties([prop]);
                        block.applyBlockPropertyStyling();
                    } else {
                        block.addStandoffPropertiesDto([
                            { type: rule.type, start: textStart, end: textEnd } as StandoffPropertyDto
                        ]);
                        block.applyStandoffPropertyStyling();
                    }
                });
                if (rulesProcessed) {
                    block.moveCaretStart();
                }
            }
        });
        // if (rulesProcessed) {
        //     this.close();
        //     return;
        // }
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
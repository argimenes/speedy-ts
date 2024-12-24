import { BlockProperty } from "./block-property";
import { Cell } from "./cell";
import { StandoffEditorBlock } from "./standoff-editor-block";
import { BlockPropertyDto, Caret, CARET, IBindingHandlerArgs, IPropertySchema, IRange, StandoffPropertyDto } from "./types";

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
    match: { start: number; end: number; };
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
    const options = args.options || "gi";
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
    replacements: string[][];
    rules: Rule[];
    constructor() {
        const self = this;
        this.replacements = [
            ["->", "➤"],
            ["<>", "🔷"],
            ["<3", "❤️"],
            [">-", "⤚"],
            ["--", "—"],
            //["[ ]", "☐"],
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
                pattern: "\\^\\^(.*?)\\^\\^", type: "style/superscript", wrapper: { start: "^^", end: "^^" }
            },
            {
                pattern: "~~(.*?)~~", type: "style/strike", wrapper: { start: "~~", end: "~~" }
            },
            {
                pattern: "_(.*?)_", type: "style/italics", wrapper: { start: "_", end: "_" }
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
                pattern: "\\*(.*?)\\*", type: "style/bold", wrapper: { start: "*", end: "*" }
            },
            //capital
            {
                pattern: '<<(.*?)>>', type: "capital", wrapper: { start: '<<', end: '>>' },
            },
            {
                pattern: '""(.*?)""', type: "air-quotes", wrapper: { start: '""', end: '""' },
            },
            {
                pattern: "/sup/(.*?)/", type: "style/superscript", wrapper: { start: "/sup/", end: "/" }
            },
            {
                pattern: "/sub/(.*?)/", type: "style/subscript", wrapper: { start: "/sub/", end: "/" }
            },
            {
                pattern: "__(.*?)__", type: "style/underline", wrapper: { start: "__", end: "__" }
            },
            {
                pattern: "/spin/(.*?)/", type: "animation/clock", wrapper: { start: "/spin/", end: "/" }
            },
            {
                pattern: "/h/(.*?)/", type: "style/highlight", wrapper: { start: "/h/", end: "/" }
            },
            {
                pattern: "/u/(.*?)/", type: "style/underline", wrapper: { start: "/u/", end: "/" }
            },
            {
                pattern: "/b/(.*?)/", type: "style/bold", wrapper: { start: "/b/", end: "/" }
            },
            {
                pattern: "/strike/(.*?)/", type: "style/strike", wrapper: { start: "/s/", end: "/" }
            },
            {
                pattern: "/lg/(.*?)/", type: "style/font/size/large", wrapper: { start: "/lg/", end: "/" },
                process: async (args: ITextPatternRecogniserHandler) => {
                    const { match, block } = args;
                    block.addStandoffPropertiesDto([
                        { type: "style/font/size/large", start: match.start, end: match.end }
                    ]);
                    block.applyStandoffPropertyStyling();
                }
            },
            {
                pattern: "/sm/(.*?)/", type: "style/font/size/small", wrapper: { start: "/sm/", end: "/" },
            },
            {
                pattern: "/l/", type: "block/alignment/left", wrapper: { start: "/l/",end:"" },
                process: async (args: ITextPatternRecogniserHandler) => {
                    const { block } = args;
                    self.removeBlockProperties(block, (x) => x.type.indexOf("block/alignment/") >= 0);
                    block.addBlockProperties([ { type: "block/alignment/left" } ]);
                    block.applyBlockPropertyStyling();
                }
            },
            {
                pattern: "/r/", type: "block/alignment/right", wrapper: { start: "/r/",end:"" },
                process: async (args: ITextPatternRecogniserHandler) => {
                    const { block } = args;
                    self.removeBlockProperties(block, (x) => x.type.indexOf("block/alignment/") >= 0);
                    block.addBlockProperties([ { type: "block/alignment/right" } ]);
                    block.applyBlockPropertyStyling();
                }
            },
            {
                pattern: "\\[ \\]", wrapper: {  start: "[ ]", end: "" },
                process: async (args: ITextPatternRecogniserHandler) => {
                    const { block } = args;
                    const manager = block.manager;
                    manager.makeCheckbox(block);
                }
            },
            {
                pattern: "^- ", wrapper: {  start: "- ", end: "" },
                process: async (args: ITextPatternRecogniserHandler) => {
                    const { block } = args;
                    const manager = block.manager;
                    manager.indentBlock({ block });
                }
            },
            {
                pattern: "/c/", type: "block/alignment/center", wrapper: { start: "/c/", end: "" },
                process: async (args: ITextPatternRecogniserHandler) => {
                    const { block } = args;
                    self.removeBlockProperties(block, (x) => x.type.indexOf("block/alignment/") >= 0);
                    block.addBlockProperties([ { type: "block/alignment/center" } ]);
                    block.applyBlockPropertyStyling();
                }
            },
            {
                pattern: "/j/", type: "block/alignment/justify", wrapper: { start: "/j/", end: "" },
                process: async (args: ITextPatternRecogniserHandler) => {
                    const { block } = args;
                    self.removeBlockProperties(block, (x) => x.type.indexOf("block/alignment/") >= 0);
                    block.addBlockProperties([ { type: "block/alignment/justify" } ]);
                    block.applyBlockPropertyStyling();
                }
            },
            {
                pattern: "/h1/", type: "block/font/size/h1", wrapper: { start: "/h1/", end: "" },
                process: async (args: ITextPatternRecogniserHandler) => {
                    const { block } = args;
                    self.removeBlockProperties(block, (x) => x.type.indexOf("block/font/size/") >= 0);
                    block.addBlockProperties([ { type: "block/font/size/h1" } ]);
                    block.applyBlockPropertyStyling();
                }
            },
            {
                pattern: "/h2/", type: "block/font/size/h2", wrapper: { start: "/h2/", end: "" },
                process: async (args: ITextPatternRecogniserHandler) => {
                    const { block } = args;
                    self.removeBlockProperties(block, (x) => x.type.indexOf("block/font/size/") >= 0);
                    block.addBlockProperties([ { type: "block/font/size/h2" } ]);
                    block.applyBlockPropertyStyling();
                }
            },
            {
                pattern: "/h3/", type: "block/font/size/h3", wrapper: { start: "/h3/", end: "" },
                process: async (args: ITextPatternRecogniserHandler) => {
                    const { block } = args;
                    self.removeBlockProperties(block, (x) => x.type.indexOf("block/font/size/") >= 0);
                    block.addBlockProperties([ { type: "block/font/size/h3" } ]);
                    block.applyBlockPropertyStyling();
                }
            },
            {
                pattern: "/h4/", type: "block/font/size/h4", wrapper: { start: "/h4/", end: "" },
                process: async (args: ITextPatternRecogniserHandler) => {
                    const { block } = args;
                    self.removeBlockProperties(block, (x) => x.type.indexOf("block/font/size/") >= 0);
                    block.addBlockProperties([ { type: "block/font/size/h4" } ]);
                    block.applyBlockPropertyStyling();
                }
            },
            {
                pattern: "/high/(.*?)/", type: "style/highlighter", wrapper: { start: "/high/", end: "/" }
            },
            {
                pattern: "/rain/(.*?)/", type: "style/rainbow", wrapper: { start: "/rain/", end: "/" }
            },
            {
                pattern: "/arial/(.*?)/", type: "font/family/arial", wrapper: { start: "/arial/", end: "/" }
            },
            {
                pattern: "/mono/(.*?)/", type: "font/family/mono", wrapper: { start: "/mono/", end: "/" }
            },
            {
                pattern: "/red/(.*?)/", type: "font/color", wrapper: { start: "/red/", end: "/" },
                process: async (args: ITextPatternRecogniserHandler) => {
                    const { match, block } = args;
                    block.addStandoffPropertiesDto([{
                        type: "font/color",
                        value: "red",
                        start: match.start, end: match.end
                    }]);
                    block.applyStandoffPropertyStyling();
                }
            },
            {
                pattern: "/blue/(.*?)/", type: "font/color", wrapper: { start: "/blue/", end: "/" },
                process:async (args: ITextPatternRecogniserHandler) => {
                    const { match, block } = args;
                    block.addStandoffPropertiesDto([{
                        type: "font/color",
                        value: "blue",
                        start: match.start, end: match.end
                    }]);
                    block.applyStandoffPropertyStyling();
                }
            },
            {
                type: "agent",
                pattern: "\\[today\\]",
                process: async (args: ITextPatternRecogniserHandler) => {
                    const { match, block } = args;
                    block.removeCellsAtIndex(match.start, match.end - match.start + 1)
                    const now = new Date();
                    const day = ("0" + now.getDate()).slice(-2);
                    const month = ("0" + (now.getMonth() + 1)).slice(-2);
                    const year = now.getFullYear();
                    const dateText = `${day}/${month}/${year}`;
                    block.insertTextAtIndex(dateText, match.start);
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
    async process(args: IBindingHandlerArgs) {
        await this.processReplacements(args);
        await this.processRules(args);
    }
    async processReplacements(args: IBindingHandlerArgs) {
        const self = this;
        var replaced = false;
        const caret = args.caret as Caret;
        const block = args.block as StandoffEditorBlock;
        const text = block.getText();
        const cells = block.cells;
        this.replacements.forEach(term => {
            if (text.indexOf(term[0]) >= 0) {
                replaced = true;
                self.replaceTextWith({ block, source: term[0], target: term[1], text, cells });
            }
        });
        if (replaced) {
            block.setCaret(caret.right.index, CARET.LEFT);
            return;
        }
    }
    async processRules(args: IBindingHandlerArgs){
        let rulesProcessed = false;
        const caret = args.caret as Caret;
        const block = args.block as StandoffEditorBlock;
        const text = block.getText();
        const cells = block.cells;
        this.rules.forEach(rule => {
            const matches = getMatches({ text, search: rule.pattern });
            if (!matches.length) return;
            rulesProcessed = true;
            matches.forEach(m => {
                let wrapperStart = 0, wrapperEnd = 0;
                if (rule.wrapper) {
                    if (!rule.wrapper) {
                        // skip
                    } else {
                        wrapperStart = rule.wrapper.start.length;
                        wrapperEnd = rule.wrapper.end.length;
                    }
                }
                if (rule.process) {
                    rule.process({ block, text, cells, match: m, rule });
                    block.removeCellsAtIndex(m.end, wrapperEnd);
                    block.removeCellsAtIndex(m.start, wrapperStart);
                    return;
                }
                const schemas = (block.schemas as IPropertySchema[]).concat(block.blockSchemas);
                const type = schemas.find(x => x.type == rule.type) as IPropertySchema;
                block.removeCellsAtIndex(m.end, wrapperEnd);
                block.removeCellsAtIndex(m.start, wrapperStart);
                if (type.type.indexOf("block") >= 0 ) {
                    const prop = { type: rule.type } as BlockPropertyDto;
                    block.addBlockProperties([prop]);
                    block.applyBlockPropertyStyling();
                } else {
                    const textStart = m.start, textEnd = m.end - wrapperStart - 1;
                    block.addStandoffPropertiesDto([
                        { type: rule.type, start: textStart, end: textEnd } as StandoffPropertyDto
                    ]);
                    block.applyStandoffPropertyStyling();
                }
            });
            if (rulesProcessed) {
                block.setCaret(caret.right.index, CARET.LEFT);
            }
        });
    }
    removeBlockProperties(block: StandoffEditorBlock, getter: (p: BlockProperty) => boolean) {
        const props = block
            .blockProperties
            .filter(getter);
        if (props.length) props.forEach(p => p.block?.removeBlockProperty(p));
    }
    replaceTextWith(args: any) {
        const { text, cells, source, target, block } = args;
        const si = text.indexOf(source);
        const ei = si + source.length - 1;
        const next = cells[ei + 1];
        block.removeCellsAtIndex(si, source.length);
        block.insertTextAtIndex(target, next.index);
        block.setCaret(next.index, CARET.LEFT);
    }
}
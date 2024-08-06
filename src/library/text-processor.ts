import { StandoffEditorBlock } from "./standoff-editor-block";
import { CARET, IBindingHandlerArgs } from "./types";

export interface ITextProcessorConstructor {
    editor: StandoffEditorBlock;
}
export type Rule = {
    pattern: string;
    type?: string;
    wrapper?: string | {
        start: string;
        end?: string;
    };
    process?: (args: any) => void;
}
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
                pattern: "\\^\\^(.*?)\\^\\^", type: "superscript", wrapper: "^^"
            },
            {
                pattern: "~~(.*?)~~", type: "strike", wrapper: "~~"
            },
            {
                pattern: "_(.*?)_", type: "italics", wrapper: "_"
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
                pattern: "`(.*?)`", type: "code", wrapper: "`"
            },
            {
                pattern: "\\*(.*?)\\*", type: "bold", wrapper: "*"
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
                process: (args) => {
                    const { text, cells, match, container, editor, rule } = args;
                    const { wrapper } = rule;
                    const startLen = wrapper.start.length;
                    const endLen = wrapper.end.length;
                    const textStart = match.start + startLen;
                    const textEnd = match.end - endLen;
                    const url = text.substr(textStart, textEnd - textStart + 1);
                    const anchor = cells[match.end];
                    const p = editor.createZero({ type: rule.type, value: url, cell: anchor });
                    const { schema } = p;
                    //schema.render.update(p);
                    schema.animation.init(p);
                    schema.animation.start(p);
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
                pattern: "__(.*?)__", type: "underline", wrapper: "__"
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
                process: (args) => {
                    const { cells, match, container } = args;
                    const next = cells[match.end + 1];
                    for (var i = match.start; i <= match.end; i++) {
                        const cell = cells[i];
                        //self.removeCell({ cell, container });
                    }
                    //self.editor.addZeroPoint("hr", null, next);
                }
            },
            {
                pattern: "/pp/(.*?)/", wrapper: { start: "/pp/", end: "/" },
                process: (args) => {
                    const { cells, match, container, rule } = args;
                    const textStart = cells[match.start + 4], textEnd = cells[match.end - 1];
                    // self.removeWrapper({ wrapper: rule.wrapper, cells, match, container });
                    // self.insertBeforeAnchor(textStart, "😼");
                    // self.insertAfterAnchor(textEnd, "😼");
                }
            },
            {
                pattern: "/lg/(.*?)/", type: "size", wrapper: { start: "/lg/", end: "/" },
                process: (args) => {
                    const { cells, match, container, editor, rule } = args;
                    const start = cells[match.start + 4], end = cells[match.end - 1];
                    // self.removeWrapper({ wrapper: rule.wrapper, cells, match, container });
                    editor.createProperty("size", "2rem", { start, end });
                }
            },
            {
                pattern: "/sm/(.*?)/", type: "size", wrapper: { start: "/sm/", end: "/" },
                process: (args) => {
                    const { cells, match, container, editor, rule } = args;
                    const start = cells[match.start + 4], end = cells[match.end - 1];
                    // self.removeWrapper({ wrapper: rule.wrapper, cells, match, container });
                    editor.createProperty("size", "0.75rem", { start, end });
                }
            },
            {
                pattern: "/right/", type: "alignment/right", wrapper: { start: "/right/" },
                process: (args) => {
                    const { cells, match, container, editor, rule } = args;
                    // self.removeWrapper({ wrapper: rule.wrapper, cells, match, container });
                    const start = cells[match.end].speedy.next;
                    editor.createBlockProperty("alignment/right", { start: start, end: cells[cells.length - 1] });
                }
            },
            {
                pattern: "/center/", type: "alignment/center", wrapper: { start: "/center/" },
                process: (args) => {
                    const { cells, match, container, editor, rule } = args;
                    // self.removeWrapper({ wrapper: rule.wrapper, cells, match, container });
                    const start = cells[match.end].speedy.next;
                    editor.createBlockProperty("alignment/center", { start: start, end: cells[cells.length - 1] });
                }
            },
            {
                pattern: "/h1/", type: "size", wrapper: { start: "/h1/" },
                process: (args) => {
                    const { cells, match, container, editor, rule } = args;
                    // self.removeWrapper({ wrapper: rule.wrapper, cells, match, container });
                    editor.createProperty("size", "2.5rem", { start: cells[0], end: cells[cells.length - 1] });
                }
            },
            {
                pattern: "/h2/", type: "size", wrapper: { start: "/h2/" },
                process: (args) => {
                    const { cells, match, container, editor, rule } = args;
                    // self.removeWrapper({ wrapper: rule.wrapper, cells, match, container });
                    editor.createProperty("size", "2rem", { start: cells[0], end: cells[cells.length - 1] });
                }
            },
            {
                pattern: "/h3/", type: "size", wrapper: { start: "/h3/" },
                process: (args) => {
                    const { cells, match, container, editor, rule } = args;
                    // self.removeWrapper({ wrapper: rule.wrapper, cells, match, container });
                    // const bcells = self.editor.getContainerCells(container);
                    // editor.createProperty("size", "1.5rem", { start: bcells[0], end: bcells[bcells.length - 1] });
                }
            },
            {
                pattern: "/arial/(.*?)/", type: "font", wrapper: { start: "/arial/", end: "/" },
                process: (args) => {
                    const { cells, match, container, editor, rule } = args;
                    const textStart = cells[match.start], textEnd = cells[match.end];
                    editor.createProperty("font", "Arial", { start: textStart, end: textEnd });
                    // self.removeWrapper({ wrapper: rule.wrapper, cells, match, container });
                }
            },
            {
                pattern: "/mono/(.*?)/", type: "font", wrapper: { start: "/mono/", end: "/" },
                process: (args) => {
                    const { cells, match, container, editor, rule } = args;
                    const textStart = cells[match.start], textEnd = cells[match.end];
                    editor.createProperty("font", "Monospace", { start: textStart, end: textEnd });
                    // self.removeWrapper({ wrapper: rule.wrapper, cells, match, container });
                }
            },
            {
                pattern: "/red/(.*?)/", type: "colour", wrapper: { start: "/red/", end: "/" },
                process: (args) => {
                    const { cells, match, container, editor, rule } = args;
                    const textStart = cells[match.start], textEnd = cells[match.end];
                    editor.createProperty("colour", "red", { start: textStart, end: textEnd });
                    // self.removeWrapper({ wrapper: rule.wrapper, cells, match, container });
                }
            },
            {
                pattern: "/blue/(.*?)/", type: "colour", wrapper: { start: "/blue/", end: "/" },
                process: (args) => {
                    const { cells, match, container, editor, rule } = args;
                    const textStart = cells[match.start], textEnd = cells[match.end];
                    editor.createProperty("colour", "blue", { start: textStart, end: textEnd });
                    // self.removeWrapper({ wrapper: rule.wrapper, cells, match, container });
                }
            },
            {
                pattern: "&&", type: "metaRelation",
                process: (args) => {
                    const { cells, match, container } = args;
                    // self.extendMetaRelation({ match, cells, text, container });
                    // rulesProcessed = false;
                }
            },
            {
                type: "agent",
                pattern: "(?:(?:https?|ftp|file):\/\/|www\.|ftp\.)(?:\([-A-Z0-9+&@#\/%=~_|$?!:,.]*\)|[-A-Z0-9+&@#\/%=~_|$?!:,.])*(?:\([-A-Z0-9+&@#\/%=~_|$?!:,.]*\)|[A-Z0-9+&@#\/%=~_|$])",
                process: (args) => {
                    return;

                    //const { text, cells, match, container, editor, rule } = args;
                    //const { startNode, endNode } = container.speedy;
                    //const properties = editor.getPropertiesWithin(startNode, endNode);
                    //const textStart = cells[match.start], textEnd = cells[match.end];
                    //const url = text.substr(match.start, match.end - match.start + 1);
                    //const exists = properties.find(p => !p.isDeleted && p.startIndex() == textStart.speedy.index && p.endIndex() == textEnd.speedy.index && p.attributes.url == url);
                    //if (exists) {
                    //    return;
                    //}
                    //const params = {
                    //    AgentType: "Website",
                    //    Name: url,
                    //    Value: url
                    //};
                    //$.get("/Admin/Agent/FindOrCreate", params, (response) => {
                    //    if (!response.Success) {
                    //        return;
                    //    }
                    //    const guid = response.Data.Guid;
                    //    const p = editor.addProperty({
                    //        type: rule.type,
                    //        value: guid,
                    //        startIndex: textStart.speedy.index,
                    //        endIndex: textEnd.speedy.index,
                    //        attributes: {
                    //            url: url
                    //        }
                    //    });
                    //});
                }
            },
            {
                type: "agent",
                pattern: "\\[today\\]",
                process: (args) => {
                    const { cells, match, container, editor, rule } = args;
                    const next = cells[match.end + 1];
                    for (var i = match.start; i <= match.end; i++) {
                        const cell = cells[i];
                        // self.removeCell({ cell, container });
                    }
                    const now = new Date();
                    const day = ("0" + now.getDate()).slice(-2);
                    const month = ("0" + (now.getMonth() + 1)).slice(-2);
                    const year = now.getFullYear();
                    const dateText = `${day}/${month}/${year}`;
                    // const textCells = self.insertBeforeAnchor(next, dateText);
                    // const start = textCells[0], end = textCells[textCells.length - 1];
                    // const params = {
                    //     Name: dateText
                    // };
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
    processRules(){
        this.rules.forEach(rule => {
            // const matches = getMatches({ text, search: rule.pattern });
            // if (matches.length) {
            //     rulesProcessed = true;
            //     matches.forEach(m => {
            //         if (rule.process) {
            //             rule.process({ editor, container, text, cells, match: m, rule })
            //             return;
            //         }
            //         var wrapperStart = 0, wrapperEnd = 0;
            //         if (rule.wrapper) {
            //             if (!rule.wrapper) {
            //                 // skip
            //             } else if (typeof rule.wrapper == "string") {
            //                 wrapperStart = wrapperEnd = rule.wrapper.length;
            //             } else {
            //                 wrapperStart = rule.wrapper.start.length;
            //                 wrapperEnd = rule.wrapper.end.length;
            //             }
            //         }
            //         const textStart = cells[m.start + wrapperStart], textEnd = cells[m.end - wrapperEnd];
            //         const type = editor.propertyType[rule.type];
            //         for (var i = 0; i < wrapperStart; i++) {
            //             const start = cells[m.start + i];
            //             self.removeCell({ cell: start, container });
            //         }
            //         for (var i = 0; i < wrapperEnd; i++) {
            //             const end = cells[m.end - i];
            //             self.removeCell({ cell: end, container });
            //         }
            //         if (type.format == "block") {
            //             const p = this.editor.createBlockProperty(rule.type, { start: textStart, end: textEnd });
            //             if (p.schema) {
            //                 if (p.schema.animation) {
            //                     if (p.schema.animation.init) {
            //                         p.schema.animation.init(p);
            //                     }
            //                     if (p.schema.animation.start) {
            //                         p.schema.animation.start(p);
            //                     }
            //                 }
            //             }
            //         } else {
            //             const p = editor.createProperty(rule.type, null, { start: textStart, end: textEnd });
            //         }
            //     });
            //     if (rulesProcessed) {
            //         editor.setCarotByNode(caret.right, 0);
            //     }
            // }
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
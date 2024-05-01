(function (factory) {
    define("components/autocomplete", ["jquery", "knockout", "app/helpers", "parts/window-manager", "pubsub", "jquery-ui"], factory);
}(function ($, ko, Helper, _WindowManager, pubsub) {

    const { div, newElement, getMatches, groupBy, removeFromArray } = Helper;
    const WindowManager = _WindowManager.getWindowManager();
    const TextMode = {
        "Input": "Input",
        "Replace": "Replace",
        "Overlay": "Overlay",
        "Reinstate": "Reinstate",
        "Command": "Command"
    };
    const SearchMode = {
        "Name": "Name",
        "Alias": "Alias",
        "Relationship": "Relationship"
    };
    const EntityType = {
        "Entity": "Entity",
        "Hashtag": "Hashtag",
        "Relationship": "Relationship"
    };
    const Context = {
        "Local": "Local",
        "Graph": "Graph"
    };
    class EntitySearchResult {
        constructor(cons) {
            this._selected = ko.observable(false);
            this.Aliases = cons.Aliases;
            this.References = cons.References;
            this.Properties = cons.Properties;
            this.Name = cons.Entity.Name;
            this.Guid = cons.Entity.Guid;
        }
        setSelected(value) {
            this._selected(value);
        }
        highlight() {
            this.setSelected(true);
        }
        unhighlight() {
            this.setSelected(false);
        }
        getName() {
            return this.Name;
        }
    }
    class RelationSearchResult {
        constructor(cons) {
            this._selected = ko.observable(false);
            this.Name = cons.Name;
            this.Guid = cons.Guid;
        }
        setSelected(value) {
            this._selected(value);
        }
        highlight() {
            this.setSelected(true);
        }
        unhighlight() {
            this.setSelected(false);
        }
        getName() {
            return this.Name;
        }
    }
    class WikidataSearchResult {
        constructor(cons) {
            this._selected = ko.observable(false);
            this.aliases = cons.aliases;
            this.concepturi = cons.concepturi;
            this.description = cons.description;
            this.id = cons.id;
            this.label = cons.label;
            this.match = cons.match;
            this.pageid = cons.pageid;
            this.repository = cons.repository;
            this.title = cons.title;
            this.url = cons.url;
        }
        setSelected(value) {
            this._selected(value);
        }
        highlight() {
            this.setSelected(true);
        }
        unhighlight() {
            this.setSelected(false);
        }
        getName() {
            return this.label;
        }
    }
    class GNDSearchResult {
        constructor(cons) {
            this._selected = ko.observable(false);
            this.type = cons.type;
            this.gndIdentifier = cons.gndIdentifier;
            this.preferredName = cons.preferredName;
            this.variantName = cons.variantName;
            this.gender = cons.gender;
            this.periodOfActivity = cons.periodOfActivity;
            this.forename = cons.forename;
            this.surname = cons.surname;
            this.professionOrOccupation = cons.professionOrOccupation;
        }
        getName() {
            return this.preferredName;
        }
        setSelected(value) {
            this._selected(value);
        }
        highlight() {
            this.setSelected(true);
        }
        unhighlight() {
            this.setSelected(false);
        }
    }
    const State = {
        "Open": "Open",
        "Closed": "Closed",
        "Searching": "Searching"

    };
    const Sensitivity = {
        "Sensitive": "Sensitive",
        "Insensitive": "Insensitive"
    };
    const SearchEndpoint = {
        "Agents": "Agents",
        "Wikipedia": "Wikipedia",
        "GND": "GND",
        "Relationship": "Relationship"
    };
    const Scope = {
        "Partial": "Partial",
        "Exact": "Exact"
    };

    class Autocomplete {
        constructor(cons) {
            const _this = this;
            this.appendResults = ko.observable(false);
            this.page = ko.observable(1);
            this.maxPage = ko.observable(1);
            this.text = ko.observable();
            this.results = ko.observableArray([]);
            this.editor = cons.editor;
            this.container = null;
            this.cells = [];
            this.model = null;
            this.textMode = ko.observable(TextMode.Input);
            this.searchMode = ko.observable(SearchMode.Name);
            this.searchEndpoint = ko.observable(SearchEndpoint.Agents);
            this.entityType = ko.observable(EntityType.Entity);
            this.sensitivity = ko.observable(Sensitivity.Insensitive);
            this.scope = ko.observable(Scope.Partial);
            this.state = ko.observable(State.Closed);
            this.originalText = ko.observable();
            this.cache = {
                entities: {},
                relations: {}
            };
            this.brackets = {
                left: [],
                right: []
            };
            this.range = {};
            this.highlights = [];
            this.highlightsEnabled = false;
            this.context = 0;
            this.contexts = [Context.Graph, Context.Local];
            this.originalEvent = {};
            this.editorHandlerNames = ["!DOWN-ARROW", "!UP-ARROW", "!ENTER", "!ESCAPE", "!TAB", "!HOME", "!END",
                "CHAR:*", "CHAR:+", "CHAR::", "control-K", "control-G", "control-A", "control-C", "control-RIGHT-ARROW", "control-LEFT-ARROW",
                "CHAR:0", "CHAR:1", "CHAR:2", "CHAR:3", "CHAR:4", "CHAR:5", "CHAR:6", "CHAR:7", "CHAR:8", "CHAR:9"
            ];
            this.storeEditorHandlers();
            this.active = false;
            this.currentIndex = 0;
            this.buffer = {
                values: [],
                maxInterval: 200,
                maxLength: 3,
                lastKeyTime: Date.now()
            };
            this.modeLabel = ko.computed(() => {
                const mode = _this.searchMode();
                if (mode == SearchMode.Alias) {
                    return "alias";
                }
                if (mode == SearchMode.Name) {
                    return "name";
                }
                return "?";
            });
            this.scopeLabel = ko.computed(() => {
                const scope = _this.scope();
                if (scope == Scope.Exact) {
                    return "exact";
                }
                if (scope == Scope.Partial) {
                    return "partial";
                }
                return "?";
            });
            this.contextLabel = ko.computed(() => {
                const context = _this.contexts[_this.context];
                return context.toLowerCase();
            });
            this.node = this.createPanel();
            this.load();
        }
        storeEditorHandlers() {
            this.copyHandlers(this.editor.event.keyboard, this.originalEvent);
        }
        restoreEditorHandlers() {
            this.copyHandlers(this.originalEvent, this.editor.event.keyboard);
        }
        copyHandlers(from, to) {
            this.editorHandlerNames.forEach(name => to[name] = from[name]);
        }
        setEditorEvents(events) {
            for (let key in events) {
                this.editor.event.keyboard[key] = events[key];
            }
        }
        load() {
            document.body.appendChild(this.node);
            $(this.node).draggable();
        }
        regenerateSentenceProperties(container) {
            const editor = this.editor;
            const { text } = editor.getTextBlockData(container);
            const sentences = editor.getSentencesFromText(text);
            const si = container.speedy.startNode.speedy.index;
            const ei = container.speedy.endNode.speedy.index;
            var existing = editor.data.properties.filter(p => p.type == "text/sentence" && p.startIndex() >= si && p.endIndex() <= ei);
            existing.forEach(x => {
                const i = editor.data.properties.indexOf(x);
                editor.data.properties.splice(i, 1);
            })
            const sentenceProperties = sentences.map((s, i) => {
                return { ...s, type: "text/sentence", value: (i + 1).toString(), startIndex: s.startIndex + si, endIndex: s.endIndex + si };
            });
            const result = this.editor.addProperties(sentenceProperties);
        }
        applyToSelection(args) {
            const { start, end } = args;
            this.range.start = start;
            this.range.end = end;
            const text = this.editor.getTextFromRange({ start, end });
            this.active = true;
            this.state(State.Searching);
            this.text(text);
            this.page(1);
            this.editor.setCarotByNode(end, 1);
            this.textMode(TextMode.Overlay);
            this.searchMode(SearchMode.Name);
            this.entityType(EntityType.Entity);
            this.scope(Scope.Partial);
            this.setPositionFromCell(start);
            this.results([]);
            this.fetchEntities();
        }
        setMode(mode) {
            this.textMode(mode);
            if (mode == TextMode.Replace || mode == TextMode.Overlay) {
                this.show();
                return;
            }
            this.hide();
        }
        insertAfterNew(anchorNode, text) {
            const editor = this.editor;
            const len = text.length;
            var cells = [];
            var node = anchorNode;
            for (var i = 0; i < len; i++) {
                let c = text[i];
                let cell = editor.newSpan(c);
                let next = node.speedy.next;
                let container = node.speedy.next.parentNode;
                let atStart = next == container.speedy.startNode;
                if (atStart) {
                    // container.speedy.startNode = cell;
                }
                container.insertBefore(cell, node.speedy.next);
                node.speedy.next = cell;
                cell.speedy.previous = node;
                cell.speedy.next = next;
                next.speedy.previous = cell;
                cells.push(cell);
                node = cell;
            }
            editor.mark();
            editor.updateOffsets();
            return cells;
        }
        insertAfter(cell, brackets) {
            const editor = this.editor;
            const bracketsNode = editor.newSpan(brackets);
            cell.parentNode.insertBefore(bracketsNode, cell.nextElementSibling);
            const _next = cell.speedy.next;
            cell.speedy.next = bracketsNode;
            bracketsNode.speedy.isBracket = true;
            bracketsNode.speedy.previous = cell;
            bracketsNode.speedy.next = _next;
            _next.speedy.previous = bracketsNode;
            this.range.end = bracketsNode;
            this.brackets.push(bracketsNode);
            editor.mark();
            editor.updateOffsets();
        }
        replaceTextWith(args) {
            const { text, cells, source, target, container } = args;
            const si = text.indexOf(source);
            const ei = si + source.length - 1;
            const next = cells[ei + 1];
            const start = cells[si];
            const atStart = container.speedy.startNode == start;
            this.editor.deleteRange({ start: cells[si], end: cells[ei] });
            const segment = this.insertBeforeAnchor(next, target);
            if (atStart) {
                container.speedy.startNode = segment.start;
            }
            this.editor.setCarotByNode(next, 0);
        }
        handleTextChange(args) {
            const self = this;
            const editor = this.editor;
            const { cells, text, caret } = args;
            const { container } = caret;
            this.container = container;
            this.cells = cells;
            //this.regenerateSentenceProperties(container);
            const replacements = [
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
            this.scanForCompletions();
            var replaced = false;
            replacements.forEach(term => {
                if (text.indexOf(term[0]) >= 0) {
                    replaced = true;
                    self.replaceTextWith({ source: term[0], target: term[1], text, cells, container: caret.container });
                }
            });
            if (replaced) {
                editor.setCarotByNode(caret.right, 0);
                this.close();
                return;
            }
            // annotation functions
            var rulesProcessed = false;
            const rules = [
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
                    pattern: "\\[\\((.*?)\\)\\]", type: "item-number", wrapper: { start: "[(", end: ")]" }
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
                            self.removeCell({ cell, container });
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
                            self.removeCell({ cell, container });
                        }
                        self.editor.addZeroPoint("hr", null, next);
                    }
                },
                {
                    pattern: "/pp/(.*?)/", wrapper: { start: "/pp/", end: "/" },
                    process: (args) => {
                        const { cells, match, container, rule } = args;
                        const textStart = cells[match.start + 4], textEnd = cells[match.end - 1];
                        self.removeWrapper({ wrapper: rule.wrapper, cells, match, container });
                        // self.insertBefore({ text: "😼", right: textStart });
                        // self.insertAfterNew(textEnd, "😼");
                        self.insertBeforeAnchor(textStart, "😼");
                        self.insertAfterAnchor(textEnd, "😼");
                    }
                },
                {
                    pattern: "/lg/(.*?)/", type: "size", wrapper: { start: "/lg/", end: "/" },
                    process: (args) => {
                        const { cells, match, container, editor, rule } = args;
                        const start = cells[match.start + 4], end = cells[match.end - 1];
                        self.removeWrapper({ wrapper: rule.wrapper, cells, match, container });
                        editor.createProperty("size", "2rem", { start, end });
                    }
                },
                {
                    pattern: "/sm/(.*?)/", type: "size", wrapper: { start: "/sm/", end: "/" },
                    process: (args) => {
                        const { cells, match, container, editor, rule } = args;
                        const start = cells[match.start + 4], end = cells[match.end - 1];
                        self.removeWrapper({ wrapper: rule.wrapper, cells, match, container });
                        editor.createProperty("size", "0.75rem", { start, end });
                    }
                },
                {
                    pattern: "/right/", type: "alignment/right", wrapper: { start: "/right/" },
                    process: (args) => {
                        const { cells, match, container, editor, rule } = args;
                        self.removeWrapper({ wrapper: rule.wrapper, cells, match, container });
                        const start = cells[match.end].speedy.next;
                        editor.createBlockProperty("alignment/right", { start: start, end: cells[cells.length - 1] });
                    }
                },
                {
                    pattern: "/center/", type: "alignment/center", wrapper: { start: "/center/" },
                    process: (args) => {
                        const { cells, match, container, editor, rule } = args;
                        self.removeWrapper({ wrapper: rule.wrapper, cells, match, container });
                        const start = cells[match.end].speedy.next;
                        editor.createBlockProperty("alignment/center", { start: start, end: cells[cells.length - 1] });
                    }
                },
                {
                    pattern: "/h1/", type: "size", wrapper: { start: "/h1/" },
                    process: (args) => {
                        const { cells, match, container, editor, rule } = args;
                        self.removeWrapper({ wrapper: rule.wrapper, cells, match, container });
                        editor.createProperty("size", "2.5rem", { start: cells[0], end: cells[cells.length - 1] });
                    }
                },
                {
                    pattern: "/h2/", type: "size", wrapper: { start: "/h2/" },
                    process: (args) => {
                        const { cells, match, container, editor, rule } = args;
                        self.removeWrapper({ wrapper: rule.wrapper, cells, match, container });
                        editor.createProperty("size", "2rem", { start: cells[0], end: cells[cells.length - 1] });
                    }
                },
                {
                    pattern: "/h3/", type: "size", wrapper: { start: "/h3/" },
                    process: (args) => {
                        const { cells, match, container, editor, rule } = args;
                        self.removeWrapper({ wrapper: rule.wrapper, cells, match, container });
                        const bcells = self.editor.getContainerCells(container);
                        editor.createProperty("size", "1.5rem", { start: bcells[0], end: bcells[bcells.length - 1] });
                    }
                },
                {
                    pattern: "/arial/(.*?)/", type: "font", wrapper: { start: "/arial/", end: "/" },
                    process: (args) => {
                        const { cells, match, container, editor, rule } = args;
                        const textStart = cells[match.start], textEnd = cells[match.end];
                        editor.createProperty("font", "Arial", { start: textStart, end: textEnd });
                        self.removeWrapper({ wrapper: rule.wrapper, cells, match, container });
                    }
                },
                {
                    pattern: "/mono/(.*?)/", type: "font", wrapper: { start: "/mono/", end: "/" },
                    process: (args) => {
                        const { cells, match, container, editor, rule } = args;
                        const textStart = cells[match.start], textEnd = cells[match.end];
                        editor.createProperty("font", "Monospace", { start: textStart, end: textEnd });
                        self.removeWrapper({ wrapper: rule.wrapper, cells, match, container });
                    }
                },
                {
                    pattern: "/red/(.*?)/", type: "colour", wrapper: { start: "/red/", end: "/" },
                    process: (args) => {
                        const { cells, match, container, editor, rule } = args;
                        const textStart = cells[match.start], textEnd = cells[match.end];
                        editor.createProperty("colour", "red", { start: textStart, end: textEnd });
                        self.removeWrapper({ wrapper: rule.wrapper, cells, match, container });
                    }
                },
                {
                    pattern: "/blue/(.*?)/", type: "colour", wrapper: { start: "/blue/", end: "/" },
                    process: (args) => {
                        const { cells, match, container, editor, rule } = args;
                        const textStart = cells[match.start], textEnd = cells[match.end];
                        editor.createProperty("colour", "blue", { start: textStart, end: textEnd });
                        self.removeWrapper({ wrapper: rule.wrapper, cells, match, container });
                    }
                },
                {
                    pattern: "&&", type: "metaRelation",
                    process: (args) => {
                        const { cells, match, container } = args;
                        self.extendMetaRelation({ match, cells, text, container });
                        rulesProcessed = false;
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
                            self.removeCell({ cell, container });
                        }
                        const now = new Date();
                        const day = ("0" + now.getDate()).slice(-2);
                        const month = ("0" + (now.getMonth() + 1)).slice(-2);
                        const year = now.getFullYear();
                        const dateText = `${day}/${month}/${year}`;
                        const textCells = self.insertBeforeAnchor(next, dateText);
                        const start = textCells[0], end = textCells[textCells.length - 1];
                        const params = {
                            Name: dateText
                        };
                        $.get("/Admin/Agent/FindOrCreate", params, (response) => {
                            if (!response.Success) {
                                return;
                            }
                            const guid = response.Data.Guid;
                            editor.createProperty(rule.type, guid, { start, end });
                        });
                    }
                }
            ];
            rules.forEach(rule => {
                const matches = getMatches({ text, search: rule.pattern });
                if (matches.length) {
                    rulesProcessed = true;
                    matches.forEach(m => {
                        if (rule.process) {
                            rule.process({ editor, container, text, cells, match: m, rule })
                            return;
                        }
                        var wrapperStart = 0, wrapperEnd = 0;
                        if (rule.wrapper) {
                            if (!rule.wrapper) {
                                // skip
                            } else if (typeof rule.wrapper == "string") {
                                wrapperStart = wrapperEnd = rule.wrapper.length;
                            } else {
                                wrapperStart = rule.wrapper.start.length;
                                wrapperEnd = rule.wrapper.end.length;
                            }
                        }
                        const textStart = cells[m.start + wrapperStart], textEnd = cells[m.end - wrapperEnd];
                        const type = editor.propertyType[rule.type];
                        for (var i = 0; i < wrapperStart; i++) {
                            const start = cells[m.start + i];
                            self.removeCell({ cell: start, container });
                        }
                        for (var i = 0; i < wrapperEnd; i++) {
                            const end = cells[m.end - i];
                            self.removeCell({ cell: end, container });
                        }
                        if (type.format == "block") {
                            const p = this.editor.createBlockProperty(rule.type, { start: textStart, end: textEnd });
                            if (p.schema) {
                                if (p.schema.animation) {
                                    if (p.schema.animation.init) {
                                        p.schema.animation.init(p);
                                    }
                                    if (p.schema.animation.start) {
                                        p.schema.animation.start(p);
                                    }
                                }
                            }
                        } else {
                            const p = editor.createProperty(rule.type, null, { start: textStart, end: textEnd });
                        }
                    });
                    if (rulesProcessed) {
                        editor.setCarotByNode(caret.right, 0);
                    }
                }
            });
            if (rulesProcessed) {
                this.close();
                return;
            }
            // autocomplete functions
            if (this.state() != State.Searching) {
                if (text.indexOf("[[") >= 0) {
                    this.setupSearchArea({ text, cells, startBrackets: "[[", endBrackets: "]]" });
                    this.setMode(TextMode.Replace);
                    this.searchEndpoint(SearchEndpoint.Agents);
                    this.searchMode(SearchMode.Name);
                    this.entityType(EntityType.Entity);
                }
                if (text.indexOf("((") >= 0) {
                    this.setupSearchArea({ text, cells, startBrackets: "((", endBrackets: "))" });
                    this.setMode(TextMode.Overlay);
                    this.searchEndpoint(SearchEndpoint.Agents);
                    this.searchMode(SearchMode.Alias);
                    this.entityType(EntityType.Entity);
                }
                if (text.indexOf("))") >= 0) {
                    // ?? do an alias overlay search for the word immediately preceding the "))"
                }
                if (text.indexOf("##") >= 0) {
                    this.setupSearchArea({ text, cells, startBrackets: "##", endBrackets: "##" });
                    this.setMode(TextMode.Replace);
                    this.searchEndpoint(SearchEndpoint.Agents);
                    this.searchMode(SearchMode.Name);
                    this.entityType(EntityType.Hashtag);
                }
                if (text.indexOf("//") >= 0) {
                    this.setupSearchArea({ text, cells, startBrackets: "//", endBrackets: "//" });
                    this.setMode(TextMode.Replace);
                    this.searchEndpoint(SearchEndpoint.Relationship);
                    this.searchMode(SearchMode.Name);
                    this.entityType(EntityType.Relationship);
                }
            }
            if (!this.active) {
                return;
            }
            this.page(1);
            this.appendResults(false);
            const input = this.getInput();
            if (input) {
                this.text(input.text);
                if (this.entityType() == EntityType.Relationship) {
                    this.fetchRelations();
                } else {
                    this.fetchEntities();
                }
            }
        }
        removeCell(args) {
            const { cell } = args;
            this.editor.deleteCell({ cell, updateCaret: false })
        }
        removeWrapper(args) {
            const { wrapper, cells, match, container } = args;
            if (wrapper.start) {
                const wrapperStart = wrapper.start.length;
                for (var i = 0; i < wrapperStart; i++) {
                    const start = cells[match.start + i];
                    this.removeCell({ cell: start, container });
                }
            }
            if (wrapper.end) {
                const wrapperEnd = wrapper.end.length;
                for (var i = 0; i < wrapperEnd; i++) {
                    const end = cells[match.end - i];
                    this.removeCell({ cell: end, container });
                }
            }
        }
        setupSearchArea(args) {
            const editor = this.editor;
            const { text, cells, startBrackets, endBrackets } = args;
            this.active = true;
            this.state(State.Searching);
            const si = text.indexOf(startBrackets);
            const ei = si + startBrackets.length - 1;
            const left = cells.filter((__, i) => si <= i && i <= ei);
            const lastLeftBracket = cells[ei];
            const nextCell = lastLeftBracket.speedy.next;
            const anchorNode = nextCell.speedy.isSpace || nextCell.speedy.isLineBreak ? lastLeftBracket : editor.getWordEnd(nextCell);
            const right = this.insertAfterNew(anchorNode, endBrackets);
            left.forEach(c => c.speedy.isBracket = true);
            right.forEach(c => c.speedy.isBracket = true);
            this.brackets.left = left;
            this.brackets.right = right;
            this.setPositionFromCell(cells[si]);
        }
        replaceThreeWith(target) {
            const len = this.buffer.values.length;
            const first = this.buffer.values[len - 3].cell;
            const third = this.buffer.values[len - 1].cell;
            const next = third.speedy.next;
            this.editor.deleteRange({ start: first, end: third });
            this.insertText(target, next, first.speedy.previous, next);
            this.editor.setCarotByNode(next, 0);
        }
        replaceTwoWith(target) {
            const len = this.buffer.values.length;
            const start = this.buffer.values[len - 2].cell;
            const end = this.buffer.values[len - 1].cell;
            const next = end.speedy.next;
            this.editor.deleteRange({ start, end });
            this.insertText(target, next, start.speedy.previous, next);
            this.editor.setCarotByNode(next, 0);
        }
        //$.get("/gnd/search?q=london&format=json", {}, (response) => {

        //});
        fetchGNDEntities(callback) {
            const _this = this;
            const text = this.text();
            const params = {
                q: text,
                format: "json"
            };
            $.get("http://lobid.org/gnd/search", params, (response) => {
                console.log({ response });
                if (!response) {
                    return;
                }
                const results = response.member.map(m => {
                    const type = m.type[0];
                    const forename = m.preferredNameEntityForThePerson?.forename[0];
                    const surname = m.preferredNameEntityForThePerson?.surname[0];
                    const professionOrOccupation = m.professionOrOccupation && m.professionOrOccupation.length ? m.professionOrOccupation[0].label : null;
                    const gender = m.gender && m.gender.length ? m.gender[0].label : null;
                    const periodOfActivity = m.periodOfActivity && m.periodOfActivity.length ? m.periodOfActivity[0] : null;
                    return new GNDSearchResult({
                        type: type,
                        gndIdentifier: m.gndIdentifier,
                        preferredName: m.preferredName,
                        variantName: m.variantName,
                        periodOfActivity: periodOfActivity,
                        gender: gender,
                        professionOrOccupation: professionOrOccupation,
                        forename: forename,
                        surname: surname
                    });
                });
                _this.results(results);
                _this.currentIndex = 0;
                if (callback) {
                    callback({ response });
                }
            });
        }
        fetchWikipediaEntities(callback) {
            const _this = this;
            const text = this.text();
            $.ajax({
                url: 'https://www.wikidata.org/w/api.php',
                data: {
                    action: 'wbsearchentities',
                    list: 'search',
                    search: text,
                    language: "en",
                    format: 'json',
                    formatversion: 2
                },
                dataType: 'jsonp',
                success: function (response) {
                    console.log({ response });
                    if (!response.success) {
                        return;
                    }
                    var values = Object.keys(response.search).map(key => response.search[key]);
                    const results = values.map(x => new WikidataSearchResult(x));
                    _this.results(results);
                    _this.currentIndex = 0;
                    if (callback) {
                        callback({ response, values });
                    }
                }
            });
        }
        fetchRelations(callback) {
            const _this = this;
            const text = this.text();
            const params = {
                Name: text,
                SearchAliases: (this.searchMode() == SearchMode.Alias),
                ExactSearch: (this.scope() == Scope.Exact)
            };
            const _params = JSON.stringify(params);
            //const data = this.cache.relations[_params];
            //if (data) {
            //    console.log("fetchRelations", { source: "cache", data });
            //    this.setRelations(data, callback);
            //    return;
            //}
            $.post("/Admin/Agent/SearchRelationsJson", params, (response) => {
                console.log({ response });
                const data = response.Data;
                console.log("fetchRelations", { source: "API", data });
                _this.cache.relations[_params] = data;
                _this.setRelations(data, callback);
            });
        }
        setRelations(data, callback) {
            const _this = this;
            this.maxPage(data.MaxPage);
            const results = data.Results;
            const _results = results.map(x => new RelationSearchResult(x))
            if (this.appendResults()) {
                results.forEach(x => _this.results.push(x));
            } else {
                this.results(_results);
            }
            this.currentIndex = 0;
            this.show();
            if (callback) {
                callback();
            }
        }
        fetchEntitiesFromLocal(callback) {
            // get all entities in the current document
            // : don't bother with the cache
            // : don't worry about partial vs. exact searching for now
            const entities = this.editor.data.properties.filter(x => x.type == "agent" && !x.isDeleted);
            const groups = groupBy(entities, x => x.value);
            const items = Array.from(groups);
            const data = {
                MaxPage: 1,
                Results: items.map(x => {
                    const agents = x[1];
                    const entity = agents[0];
                    const mentions = agents.map(a => a.getText());
                    const aliases = Array.from(groupBy(mentions, x => x)).map(x => x[0]);
                    const item = {
                        Entity: {
                            Name: entity.attributes.name || entity.text,
                            Guid: entity.value
                        },
                        References: agents.length,
                        Aliases: aliases,
                        Properties: []
                    };
                    return item;
                })
            };
            const results = data.Results.sort((a, b) => a.References < b.References ? 1 : a.References == b.References ? 0 : -1);
            data.Results = results;
            this.setEntities(data, callback);
        }
        fetchEntities(callback) {
            const context = this.contexts[this.context];
            if (context == Context.Local) {
                this.fetchEntitiesFromLocal(callback)
                return;
            }
            const _this = this;
            const text = this.text();
            const params = {
                Name: text,
                SearchAliases: (this.searchMode() == SearchMode.Alias),
                ExactSearch: (this.scope() == Scope.Exact),
                Page: this.page(),
                PageRows: 10,
                Order: "ByFrequency",
                Direction: "Ascending"
            };
            const _params = JSON.stringify(params);
            //const data = this.cache.entities[_params];
            //if (data) {
            //    console.log("fetchEntities", { source: "cache", data });
            //    this.setEntities(data, callback);
            //    return;
            //}
            $.post("/Admin/Agent/AutocompleteSearchJson", params, (response) => {
                const data = response.Data;
                console.log("fetchEntities", { source: "API", data });
                _this.cache.entities[_params] = data;
                _this.setEntities(data, callback);
            });
        }
        setEntities(data, callback) {
            this.maxPage(data.MaxPage);
            this.setResults(data.Results, callback);
            this.show();
        }
        attachHandlers() {
            const _this = this;
            const events = {
                "!DOWN-ARROW": () => _this.handleDownArrow(),
                "!UP-ARROW": () => _this.handleUpArrow(),
                "!ENTER": () => { _this.handleEnter() },
                "!ESCAPE": () => { _this.handleEscape() },
                "!TAB": () => { _this.handleTab() },
                "!HOME": () => { _this.handleHome() },
                "!END": () => { _this.handleEnd() },
                "CHAR:*": () => { _this.handleScope() },
                "CHAR:+": () => { _this.handleAddNewItem() },
                "CHAR::": () => { _this.handleSearchInput() },
                "control-K": () => { _this.handleWikipediaSearch() },
                "control-G": () => { _this.handleGNDSearch() },
                "control-A": () => { _this.toggleSelections() },
                "control-C": () => { _this.toggleContexts() },
                "control-shift-alt-RIGHT-ARROW": () => { _this.handleControlShiftAltRight() },
                "control-shift-RIGHT-ARROW": () => { _this.handleControlShiftRight() },
                "control-alt-RIGHT-ARROW": () => { _this.handleControlAltRight() },
                "control-RIGHT-ARROW": () => { _this.handleControlRight() },
                "control-shift-alt-LEFT-ARROW": () => { _this.handleControlShiftAltLeft() },
                "control-alt-LEFT-ARROW": () => { _this.handleControlAltLeft() },
                "control-shift-LEFT-ARROW": () => { _this.handleControlShiftLeft() },
                "control-LEFT-ARROW": () => { _this.handleControlLeft() }
            };
            const nums = [...Array(10).keys()];
            nums.forEach(n => events["CHAR:" + n] = () => { _this.setIndexByNumber(n) });
            this.setEditorEvents(events);
        }
        toggleContexts() {
            const max = this.contexts.length - 1;
            this.context = this.context < max ? this.context + 1 : 0;
            this.fetchEntities();
        }
        setIndexByNumber(index) {
            this.currentIndex = index;
            const nextItem = this.results()[this.currentIndex];
            this.highlight(nextItem);
            // this.updateScroll(this.currentIndex);
            this.handleEnter();
        }
        handleControlShiftAltRight() {
            this.shiftLeftBracketToNextChar();
            this.updateSearchFromBracketSelection();
        }
        handleControlAltLeft() {
            this.shiftLeftBracketToPreviousWord();
            this.updateSearchFromBracketSelection();
        }
        handleControlShiftAltLeft() {
            this.shiftLeftBracketToPreviousChar();
            this.updateSearchFromBracketSelection();
        }
        handleControlAltRight() {
            this.shiftLeftBracketToNextWord();
            this.updateSearchFromBracketSelection();
        }
        handleControlShiftRight() {
            this.shiftRightBracketToNextChar();
            this.updateSearchFromBracketSelection();
        }
        handleControlRight() {
            this.shiftRightBracketToNextWord();
            this.updateSearchFromBracketSelection();
        }
        handleControlShiftLeft() {
            this.shiftRightBracketToPreviousChar();
            this.updateSearchFromBracketSelection();
        }
        handleControlLeft() {
            this.shiftRightBracketToPreviousWord();
            this.updateSearchFromBracketSelection();
        }
        updateSearchFromBracketSelection() {
            const left = this.brackets.left, right = this.brackets.right;
            const start = left[left.length - 1].speedy.next, end = right[0].speedy.previous;
            const text = this.editor.getTextFromRange({ start, end });
            this.text(text);
            this.fetchEntities();
        }
        toggleSelections() {
            this.highlightsEnabled = !this.highlightsEnabled;
            if (this.highlightsEnabled) {
                this.highlightMatches();
            } else {
                this.removeHighlights();
            }
        }        
        highlightMatches() {
            const editor = this.editor;
            const input = this.getInput();
            const containers = editor.getContainers();
            containers.forEach(c => this.highlightMatchesInContainer(input, c));
        }
        highlightMatchesInContainer(input, container) {
            const editor = this.editor;
            this.container = container;
            const { text, cells } = editor.getTextBlockData(container);
            const startIndex = container.speedy.startNode.speedy.index;
            const matches = getMatches({ text, search: '\\b' + input.text + '\\b' });
            const word = {
                start: input.cells[0].speedy.index - startIndex,
                end: input.cells[input.cells.length - 1].speedy.index - startIndex
            };
            const agents = editor.data.properties.filter(x => x.type == "agent" && !x.isDeleted)
            const matchingWords = matches.filter(x => x.start != word.start && x.end != word.end);
            matchingWords.forEach(w => {
                const start = cells[w.start];
                const end = cells[w.end];
                if (agents.some(a => a.startNode == start && a.endNode == end)) {
                    return;
                }
                editor.createProperty("autocomplete/highlight", null, { start, end });
            });
            this.highlights = editor.data.properties.filter(x => x.type == "autocomplete/highlight");
        }
        findCurrentWord() {
            const editor = this.editor;
            const caret = editor.getCaret();
            const container = caret.container;
            this.container = container;
            const { text, cells } = editor.getTextBlockData(container);
            const li = caret.left.speedy.index;
            const sni = container.speedy.startNode.speedy.index;
            const words = getMatches({ text, search: /\b(\w+)\b/ });
            const word = words.find(x => x.start + sni <= li && li <= x.end + sni);
            return word;
        }
        handleControlSquareBracket() {
            const editor = this.editor;
            const caret = editor.getCaret();
            const container = caret.container;
            this.container = container;
            const { text, cells } = editor.getTextBlockData(container);
            const word = this.findCurrentWord();
            if (!word) {
                return;
            }
            // insert round brackets around it
            const start = cells[word.start], end = cells[word.end];
            this.wrapInBrackets({
                word: { start, end },
                brackets: { start: "[[", end: "]]" }
            });
            // set to autoalias mode
            this.setMode(TextMode.Replace);
            this.searchEndpoint(SearchEndpoint.Agents);
            this.searchMode(SearchMode.Name);
            this.entityType(EntityType.Entity);
            // fetch entities
            this.page(1);
            this.appendResults(false);
            const input = this.getInput();
            this.text(input.text);
            this.fetchEntities();
        }
        insertBeforeAnchor(cell, text) {
            return this.editor.insertBeforeCell(cell, text);
        }
        insertAfterAnchor(cell, text) {
            return this.editor.insertAfterCell(cell, text);
        }
        wrapInBrackets(args) {
            const { word, brackets } = args;
            const editor = this.editor;
            this.active = true;
            this.state(State.Searching);
            const leftCells = editor.insertBeforeCell(word.start, brackets.start);
            const rightCells = editor.insertAfterCell(word.end, brackets.end);            
            leftCells.forEach(c => {
                c.classList.add("autocomplete-brackets");
                c.speedy.isBracket = true;
            });
            rightCells.forEach(c => {
                c.classList.add("autocomplete-brackets");
                c.speedy.isBracket = true;
            });
            this.brackets.left = leftCells;
            this.brackets.right = rightCells;
            editor.mark();
            editor.updateOffsets();
            this.setPositionFromCell(leftCells[0]);
        }
        handleControlRoundBracket() {
            const editor = this.editor;
            const caret = editor.getCaret();
            const container = caret.container;
            this.container = container;
            const { text, cells } = editor.getTextBlockData(container);
            const word = this.findCurrentWord();
            if (word == null) {
                return;
            }
            // insert round brackets around it
            const start = cells[word.start], end = cells[word.end];
            this.wrapInBrackets({
                word: { start, end },
                brackets: { start: "((", end: "))" }
            });
            editor.mark();
            editor.updateOffsets();
            // set to autoalias mode
            this.setMode(TextMode.Overlay);
            this.searchEndpoint(SearchEndpoint.Agents);
            this.searchMode(SearchMode.Alias);
            this.entityType(EntityType.Entity);
            // fetch entities
            this.page(1);
            this.appendResults(false);
            const input = this.getInput();
            this.text(input.text);
            this.fetchEntities();
        }
        shiftRightBracketToPreviousWord() {
            const len = this.brackets.right.length;
            if (!len) {
                return;
            }
            const editor = this.editor;
            const caret = editor.getCaret();
            const container = caret.container;
            const { text, cells } = editor.getTextBlockData(container);
            const brackets = this.brackets.right;
            const first = brackets[0];
            const previous = first.speedy.previous;
            var sni = container.speedy.startNode.speedy.index;
            if (this.brackets.left[0].speedy.index < sni) {
                sni = this.brackets.left[0].speedy.index;
            }
            const words = getMatches({ text, search: /\b(\w+)\b/ });
            const bri = previous.speedy.index;
            const bli = this.brackets.left[this.brackets.left.length - 1].speedy.next.speedy.index;
            const rightBracketWordIndex = words.findIndex(x => x.end + sni == bri);
            if (rightBracketWordIndex == 0) {
                return;
            }
            const leftBracketWordIndex = words.findIndex(x => x.start + sni == bli);
            if (rightBracketWordIndex <= leftBracketWordIndex) {
                return;
            }
            const previousWord = words[rightBracketWordIndex - 1];
            const endOfPreviousWord = cells[previousWord.end];
            const afterEndOfPreviousWord = endOfPreviousWord.speedy.next;
            editor.moveCells({ cells: brackets, before: afterEndOfPreviousWord })
            editor.mark();
            editor.updateOffsets();
        }
        shiftLeftBracketToNextWord() {
            const len = this.brackets.left.length;
            if (!len) {
                return;
            }
            const editor = this.editor;
            const caret = editor.getCaret();
            const container = caret.container;
            const { text, cells } = editor.getTextBlockData(container);
            const leftBrackets = this.brackets.left;
            const first = leftBrackets[0];
            const previous = first.speedy.previous;
            var sni = container.speedy.startNode.speedy.index;
            if (this.brackets.left[0].speedy.index < sni) {
                return;
            }
            const words = getMatches({ text, search: /\b(\w+)\b/ });
            const bli = this.brackets.left[this.brackets.left.length - 1].speedy.next.speedy.index;
            const leftBracketWordIndex = words.findIndex(x => x.start + sni == bli);
            if (leftBracketWordIndex == 0) {
                return;
            }
            const nextWord = words[leftBracketWordIndex + 1];
            const startOfNextWord = cells[nextWord.start];
            editor.moveCells({ cells: leftBrackets, before: startOfNextWord })
            editor.mark();
            editor.updateOffsets();
        }
        shiftLeftBracketToPreviousWord() {
            const len = this.brackets.left.length;
            if (!len) {
                return;
            }
            const editor = this.editor;
            const caret = editor.getCaret();
            const container = caret.container;
            const { text, cells } = editor.getTextBlockData(container);
            const leftBrackets = this.brackets.left;
            const first = leftBrackets[0];
            const previous = first.speedy.previous;
            var sni = container.speedy.startNode.speedy.index;
            if (this.brackets.left[0].speedy.index < sni) {
                return;
            }
            const words = getMatches({ text, search: /\b(\w+)\b/ });
            const bli = this.brackets.left[this.brackets.left.length - 1].speedy.next.speedy.index;
            const leftBracketWordIndex = words.findIndex(x => x.start + sni == bli);
            if (leftBracketWordIndex == 0) {
                return;
            }
            const previousWord = words[leftBracketWordIndex - 1];
            const startOfPreviousWord = cells[previousWord.start];
            editor.moveCells({ cells: leftBrackets, before: startOfPreviousWord })
            editor.mark();
            editor.updateOffsets();
        }
        shiftLeftBracketToPreviousChar() {
            const len = this.brackets.left.length;
            if (!len) {
                return;
            }
            const editor = this.editor;
            const brackets = this.brackets.left;
            const first = brackets[0];
            const previous = first.speedy.previous;
            if (!previous) {
                return;
            }
            editor.moveCells({ cells: brackets, before: previous })
            editor.mark();
            editor.updateOffsets();
        }
        shiftRightBracketToPreviousChar() {
            const len = this.brackets.right.length;
            if (!len) {
                return;
            }
            const editor = this.editor;
            const brackets = this.brackets.right;
            const first = brackets[0];
            const previous = first.speedy.previous;
            if (!previous) {
                return;
            }
            editor.moveCells({ cells: brackets, before: previous })
            editor.mark();
            editor.updateOffsets();
        }
        shiftLeftBracketToNextChar() {
            const len = this.brackets.left.length;
            if (!len) {
                return;
            }
            const editor = this.editor;
            const brackets = this.brackets.left;
            const last = brackets[brackets.length - 1];
            const nextOver = last.speedy.next?.speedy.next;
            if (!nextOver) {
                return;
            }
            editor.moveCells({ cells: brackets, before: nextOver })
            editor.mark();
            editor.updateOffsets();
        }
        shiftRightBracketToNextChar() {
            const len = this.brackets.right.length;
            if (!len) {
                return;
            }
            const editor = this.editor;
            const brackets = this.brackets.right;
            const last = brackets[brackets.length - 1];
            const nextOver = last.speedy.next?.speedy.next;
            if (!nextOver) {
                return;
            }
            editor.moveCells({ cells: brackets, before: nextOver })
            editor.mark();
            editor.updateOffsets();
        }
        shiftRightBracketToNextWord() {
            const len = this.brackets.right.length;
            if (!len) {
                return;
            }
            const editor = this.editor;
            const container = this.container;
            const { text, cells } = editor.getTextBlockData(container);
            const brackets = this.brackets.right;
            const first = brackets[0];
            const previous = first.speedy.previous;
            var sni = container.speedy.startNode.speedy.index;
            if (this.brackets.left[0].speedy.index < sni) {
                sni = this.brackets.left[0].speedy.index;
            }
            const words = getMatches({ text, search: /\b(\w+)\b/ });
            const bri = previous.speedy.index;
            const rightBracketWordIndex = words.findIndex(x => x.end + sni == bri);
            if (rightBracketWordIndex < 0) {
                return;
            }
            const nextWord = words[rightBracketWordIndex + 1];
            const endOfNextWord = cells[nextWord.end];
            const afterEndOfNextWord = endOfNextWord.speedy.next;
            editor.moveCells({ cells: brackets, before: afterEndOfNextWord })
            editor.mark();
            editor.updateOffsets();
        }
        handleAddNewItem() {
            if (this.searchEndpoint() == SearchEndpoint.Relationship) {
                this.handleAddNewRelation();
                return;
            }
            this.handleAddNewEntity();
        }
        detachHandlers() {
            this.restoreEditorHandlers();
        }
        hide() {
            this.node.style.display = "none";
            this.active = false;
            this.detachHandlers();
        }
        show() {
            const _this = this;
            this.highlightFirstItem();
            this.attachHandlers();
            this.node.style.zIndex = WindowManager.getNextIndex();
            this.node.style.display = "block";
            this.active = true;
        }
        setPositionFromCell(cell) {
            const rect = cell.getBoundingClientRect();
            const y = rect.y + rect.height + 5;
            const x = rect.x;
            this.node.style.top = y + "px";
            this.node.style.left = x + "px";
        }
        handleGNDSearch() {
            const _this = this;
            const search = this.searchEndpoint();
            if (search != SearchEndpoint.GND) {
                this.searchEndpoint(SearchEndpoint.GND);
                this.fetchGNDEntities(data => {
                    //
                });
            } else {
                this.searchEndpoint(SearchEndpoint.Agents);
                this.fetchEntities();
            }
            const params = {

            };
        }
        handleWikipediaSearch() {
            const _this = this;
            const search = this.searchEndpoint();
            if (search != SearchEndpoint.Agents) {
                this.searchEndpoint(SearchEndpoint.Agents);
                this.fetchEntities();
            } else {
                this.searchEndpoint(SearchEndpoint.Wikipedia);
                this.fetchWikipediaEntities(data => {
                    //
                });
            }
        }
        createPanel() {
            const node = div({
                style: {
                    position: "absolute",
                    display: "none",
                    backgroundColor: "#fff",
                    border: "1px solid #ccc",
                    borderRadius: "5px",
                    boxShadow: "0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)",
                    padding: "5px 10px",
                    color: "#333",
                    fontSize: "13px",
                    lineHeight: "16px",
                    width: "450px",
                    height: "auto",
                    minHeight: "100px",
                    maxHeight: "400px",
                    zIndex: WindowManager.getNextIndex()
                },
                template: {
                    view: `
<div>
    <div style="height: 15px;">
        mode : <span data-bind="text: $data.modeLabel"></span> / scope : <span data-bind="text: $data.scopeLabel"></span> / end : <span data-bind="text: $data.searchEndpoint"></span> / context : <span data-bind="text: $data.contextLabel"></span>
    </div>
    <!-- ko if: $data.searchEndpoint() == 'Agents' -->
    <div data-bind="foreach: $data.results" style="overflow-y: scroll; height: 375px;">
        <div style="border-top: 1px dotted #ccc; padding: 3px 0;" data-role="autocomplete-item" style="list-style-position: outside;" data-bind="css: { 'active-list-item': $data._selected() }, attr: { 'data-agent-guid': $data.Guid }">
            <div style="width: 10px; margin-right: 5px; display: inline-block; vertical-align: top;">
                <span data-bind="text: $index"></span>
            </div>
            <div style="height: 40px; width: 40px; margin-right: 10px; display: inline-block; vertical-align: top;">
                <!-- ko if: $data.Properties.length -->
                    <div data-bind="with: $data.Properties[0]">
                        <div data-bind="if: $data.Type == 'image-url'">
                            <img src="#" data-bind="attr: { src: $data.Value }" style="width: 40px; height: 40px; border-radius: 50%;" />
                        </div>
                        <div data-bind="if: $data.Type == 'pdf-url'">
                            <i style="font-size: 40px; color: #F40F02;" class="fas fa-file-pdf"></i>
                        </div>
                        <div data-bind="if: $data.Type == 'video-url'">
                            <i style="font-size: 40px; color: #c4302b;" class="fab fa-youtube"></i>
                        </div>
                        <div data-bind="if: $data.Type == 'tweet-embed-code'">
                            <i style="font-size: 40px; color: #00acee;" class="fab fa-twitter"></i>
                        </div>
                        <div data-bind="if: $data.Type == 'embed-code'">
                            <img src="/Images/icons/sketchfab.png" style="width: 50px; height: 50px;" />
                        </div>
                        <div data-bind="if: $data.Type == 'website-url'">
                            <i style="font-size: 40px; color: #fff;" class="fas fa-link"></i>
                        </div>
                        &nbsp;
                    </div>
                <!-- /ko -->
            </div>
            <div style="display: inline-block; max-width: 335px;">
                <a tabindex="0" href="#" data-bind="click: () => $parent.entitySelected($data)"><span data-bind="text: $data.Name"></span></a>
                [ <span data-bind="text: $data.References"></span> ]
                <!-- if: $data.Aliases.length -->
                <div><small data-bind="text: $data.Aliases.join('; ')"></small></div>
                <!-- /ko -->
            </div>
        </div>
    </div>
    <!-- /ko -->
    <!-- ko if: $data.searchEndpoint() == 'Wikipedia' -->
    <div data-bind="foreach: $data.results" style="overflow-y: scroll; height: 375px;">
        <div style="border-top: 1px dotted #ccc; padding: 3px 0;" data-role="autocomplete-item" style="list-style-position: outside;" data-bind="css: { 'active-list-item': $data._selected() }, attr: { 'data-agent-guid': $data.Guid }">
            <div style="width: 10px; margin-right: 5px; display: inline-block; vertical-align: top;">
                <span data-bind="text: $index"></span>
            </div>
            <div style="display: inline-block; max-width: 335px;">
                <a tabindex="0" href="#" data-bind="click: () => $parent.entitySelected($data)"><span data-bind="text: $data.label"></span></a>
                <!-- if: $data.description -->
                <div><small data-bind="text: $data.description"></small></div>
                <!-- /ko -->
            </div>
        </div>
    </div>
    <!-- /ko -->
    <!-- ko if: $data.searchEndpoint() == 'GND' -->
    <div data-bind="foreach: $data.results" style="overflow-y: scroll; height: 375px;">
        <div style="border-top: 1px dotted #ccc; padding: 3px 0;" data-role="autocomplete-item" style="list-style-position: outside;" data-bind="css: { 'active-list-item': $data._selected() }, attr: { 'data-agent-guid': $data.Guid }">
            <div style="width: 10px; margin-right: 5px; display: inline-block; vertical-align: top;">
                <span data-bind="text: $index"></span>
            </div>
            <div style="display: inline-block; max-width: 335px;">
                <a tabindex="0" href="#" data-bind="click: () => $parent.entitySelected($data)"><span data-bind="text: $data.preferredName"></span></a>
            </div>
        </div>
    </div>
    <!-- /ko -->
    <!-- ko if: $data.searchEndpoint() == 'Relationship' -->
    <div data-bind="foreach: $data.results" style="overflow-y: scroll; height: 375px;">
        <div style="border-top: 1px dotted #ccc; padding: 3px 0;" data-role="autocomplete-item" style="list-style-position: outside;" data-bind="css: { 'active-list-item': $data._selected() }, attr: { 'data-agent-guid': $data.Guid }">
            <div style="width: 10px; margin-right: 5px; display: inline-block; vertical-align: top;">
                <span data-bind="text: $index"></span>
            </div>
            <div style="display: inline-block; max-width: 335px;">
                <a tabindex="0" href="#" data-bind="click: () => $parent.entitySelected($data)"><span data-bind="text: $data.Name"></span></a>
            </div>
        </div>
    </div>
    <!-- /ko -->
</div>
`,
                    model: this
                }
            });
            node.speedy = {
                role: 4,
                stream: 1
            };
            return node;
        }
        getInput() {
            const editor = this.editor;
            if (this.brackets.left.length) {
                const _cells = this.getRange(this.brackets.left[0], this.brackets.right[this.brackets.right.length - 1]);
                const cells = _cells.filter(c => !c.speedy.isBracket);
                const text = cells.map(c => editor.getTextContent(c)).join("");
                return { text, cells };
            }
            if (!this.range.start || !this.range.end) {
                return null;
            }
            const cells = this.getRange(this.range.start, this.range.end);
            const text = cells.map(c => editor.getTextContent(c)).join("");
            return { cells, text };
        }
        getRange(start, end) {
            var cells = [];
            var loop = true;
            var cell = start;
            while (loop) {
                cells.push(cell);
                if (cell == end) {
                    loop = false;
                    continue;
                }
                cell = cell.speedy.next;
            }
            return cells;
        }
        removeBrackets() {
            const editor = this.editor;
            this.brackets.left.filter(b => !b.speedy.isDeleted).forEach(b => {
                editor.deleteCell({ cell: b, updateCaret: false });
            });
            this.brackets.right.filter(b => !b.speedy.isDeleted).forEach(b => {
                editor.deleteCell({ cell: b, updateCaret: false });
            });
            this.brackets.left.length = 0;
            this.brackets.right.length = 0;
            editor.mark();
            editor.updateOffsets();
        }
        handleSearchInput() {
            this.textMode(TextMode.Reinstate);
            const { text, cells } = this.getInput();
            this.originalText(text);
            const start = cells[0], end = cells[cells.length - 1];
            const next = end.speedy.next;
            this.editor.deleteRange({ start, end });
            // this.editor.setCarotByNode(this.range.start, 1);
            this.editor.setCarotByNode(next, 0);
        }
        handleAddGNDEntity() {
            const _this = this;
            const input = this.getInput();
            const currentItem = this.results()[this.currentIndex];
            $.post("/Admin/Agent/AddGNDAgent", currentItem, (response) => {
                console.log("/Admin/Agent/AddGNDAgent", { response });
                if (!response.Success) {
                    return;
                }
                const entity = response.Data.Entity;
                var start = input.cells[0];
                var end = input.cells[input.cells.length - 1];
                if (_this.textMode() == TextMode.Replace) {
                    _this.editor.deleteRange({ start, end });
                    const anchorNode = _this.brackets.right[0];
                    const result = _this.insertText(entity.Name, anchorNode);
                    start = result.start;
                    end = result.end;
                }
                var agent = _this.editor.createProperty("agent", entity.Guid, { start, end });
                agent.attributes = {
                    name: entity.Name
                };
                if (_this.highlightsEnabled) {
                    _this.copyEntityReferenceToHighlights(agent);
                }
                _this.removeBrackets();
                _this.close();
                _this.editor.setCarotByNode(end, 1);
            });
        }
        handleAddNewRelation() {
            const _this = this;
            const editor = this.editor;
            const { text, cells } = this.getInput();
            const params = {
                Entity: {
                    Name: text
                }
            };
            $.post("/Admin/MetaRelationType/QuickAdd", params, (response) => {
                console.log({ response });
                if (!response.Success) {
                    return;
                }
                const first = _this.range.start.speedy.next;
                const last = _this.range.end.speedy.previous;
                const _metaRelation = {
                    type: "metaRelation",
                    startIndex: first.speedy.index,
                    endIndex: last.speedy.index,
                    attributes: {
                        metaRelationTypeGuid: response.Data.Guid
                    }
                };
                var metaRelation = editor.addProperty(_metaRelation);
                _this.removeBrackets();
                editor.setCarotByNode(last, 1);
                _this.close();
            });
        }
        handleAddWikipediaEntity() {
            const _this = this;
            const input = this.getInput();
            const currentItem = this.results()[this.currentIndex];
            $.post("/Admin/Agent/AddWikipediaAgent", currentItem, (response) => {
                console.log("/Admin/Agent/AddWikipediaAgent", { response });
                if (!response.Success) {
                    return;
                }
                const entity = response.Data.Entity;
                var start = input.cells[0];
                var end = input.cells[input.cells.length - 1];
                if (_this.textMode() == TextMode.Replace) {
                    _this.editor.deleteRange({ start, end });
                    const anchorNode = _this.brackets.right[0];
                    const result = _this.insertText(entity.Name, anchorNode);
                    start = result.start;
                    end = result.end;
                }
                var agent = _this.editor.createProperty("agent", entity.Guid, { start, end });
                agent.attributes = {
                    name: entity.Name
                };
                if (_this.highlightsEnabled) {
                    _this.copyEntityReferenceToHighlights(agent);
                }
                _this.removeBrackets();
                _this.close();
                _this.editor.setCarotByNode(end, 1);
            });
        }
        handleAddNewEntity() {
            const _this = this;
            const input = this.getInput();
            var params = {
                Entity: {
                    Name: input.text,
                    QuickAdd: true
                }
            };
            if (this.searchEndpoint() == SearchEndpoint.Wikipedia) {
                const currentItem = this.results()[this.currentIndex];
                params.Entity.Name = currentItem.label;
            }
            $.post("/Admin/Agent/QuickAdd", params, (response) => {
                console.log("/Admin/Agent/QuickAdd", { response });
                if (!response.Success) {
                    return;
                }
                const entity = response.Data.Entity;
                var start = input.cells[0];
                var end = input.cells[input.cells.length - 1];
                if (_this.textMode() == TextMode.Reinstate) {
                    _this.editor.deleteRange({ start, end });
                    const result = _this.insertBefore({ text: _this.originalText(), right: this.brackets.right[0] });
                    // const result = _this.insertText(_this.originalText(), _this.range.end);
                    start = result.start;
                    end = result.end;
                }
                if (_this.textMode() == TextMode.Replace) {
                    _this.editor.deleteRange({ start, end });
                    const result = _this.insertBefore({ text: entity.Name, right: this.brackets.right[0] });
                    // const result = _this.insertText(entity.Name, _this.brackets.right[0]);
                    start = result.start;
                    end = result.end;
                }
                var agent = _this.editor.createProperty("agent", entity.Guid, { start, end });
                agent.attributes.name = entity.Name;
                if (_this.highlightsEnabled) {
                    _this.copyEntityReferenceToHighlights(agent);
                }
                _this.removeBrackets();
                _this.close();
                this.editor.setCarotByNode(end, 1);
            });
        }
        scanForCompletions() {
            // If there is a metaRelation property in the block where Value is null check for the first agent before and after and create a metarelation triple
            const editor = this.editor;
            const container = this.container;
            const { startNode, endNode } = container.speedy;
            const properties = editor.getPropertiesWithin(startNode, endNode).filter(p => !p.isDeleted);
            this.completeMetaRelation(properties);
        }
        extendMetaRelation(args) {
            const { match, cells, text, container } = args;
            const { editor } = this;
            const { start, end } = match;
            const startCell = cells[start], endCell = cells[end];
            const existing = editor.data.properties.find(p => p.startIndex() == startCell.speedy.index && p.type == "metaRelation");
            if (existing) {
                return;
            }
            const operator = this.getPreviousProperty({ type: "metaRelation", cell: startCell, container });
            if (!operator) {
                return;
            }
            const previous = this.getPreviousProperty({ type: "agent", cell: operator.startNode, container });
            const next = this.getNextProperty({ type: "agent", cell: endCell, container });
            if (!previous || !next) {
                return;
            }
            const params = {
                Dominant: {
                    Target: {
                        Guid: previous.value
                    }
                },
                MetaRelationType: {
                    Target: {
                        Guid: operator.attributes.metaRelationTypeGuid
                    }
                },
                Subordinate: {
                    Target: {
                        Guid: next.value
                    }
                }
            };
            $.post("/Admin/MetaRelation/QuickAdd", params, (response) => {
                console.log("/Admin/MetaRelation/QuickAdd", { response });
                const guid = response.Data.Guid;
                const metaRelation = editor.addProperty({
                    type: "metaRelation",
                    startIndex: startCell.speedy.index,
                    endIndex: endCell.speedy.index,
                    value: guid
                });
            });
        }
        getPreviousProperty(args) {
            const { type, container, cell } = args;
            const properties = this.editor.getPropertiesWithin(container.speedy.startNode, container.speedy.endNode).filter(p => !p.isDeleted);
            const agents = properties.filter(p => p.type == type && !!p.value);
            const agentsBefore = agents
                .filter(p => p.endIndex() < cell.speedy.index)
                .sort((a, b) => a.endIndex() > b.endIndex() ? 1 : a.endIndex() == b.endIndex() ? 0 : -1);
            const len = agentsBefore.length;
            return len ? agentsBefore[len - 1] : null;
        }
        getNextProperty(args) {
            const { type, container, cell } = args;
            const properties = this.editor.getPropertiesWithin(container.speedy.startNode, container.speedy.endNode).filter(p => !p.isDeleted);
            const agents = properties.filter(p => p.type == type && !!p.value);
            const agentsAfter = agents
                .filter(p => p.endIndex() > cell.speedy.index)
                .sort((a, b) => a.endIndex() > b.endIndex() ? 1 : a.endIndex() == b.endIndex() ? 0 : -1);
            const len = agentsAfter.length;
            return len ? agentsAfter[0] : null;
        }
        getPreviousAgent(properties, property) {
            const agents = properties.filter(p => p.type == "agent" && !!p.value);
            const agentsBefore = agents
                .filter(p => p.endIndex() < property.endIndex())
                .sort((a, b) => a.endIndex() > b.endIndex() ? 1 : a.endIndex() == b.endIndex() ? 0 : -1);
            const len = agentsBefore.length;
            return len ? agentsBefore[len - 1] : null;
        }
        getNextAgent(properties, property) {
            const agents = properties.filter(p => p.type == "agent" && !!p.value);
            const agentsAfter = agents
                .filter(p => p.endIndex() > property.endIndex())
                .sort((a, b) => a.endIndex() > b.endIndex() ? 1 : a.endIndex() == b.endIndex() ? 0 : -1);
            if (agentsAfter.length == 0) {
                return;
            }
            return agentsAfter.length ? agentsAfter[0] : null;
        }
        getFlankingAgents(properties, incomplete) {
            return {
                previous: this.getPreviousAgent(properties, incomplete),
                next: this.getNextAgent(properties, incomplete)
            };
        }
        completeMetaRelation(properties) {
            const metaRelation = properties.find(p => p.type == "metaRelation" && !p.value);
            if (!metaRelation) {
                return;
            }
            const { previous, next } = this.getFlankingAgents(properties, metaRelation);
            if (!previous || !next) {
                return;
            }
            const params = {
                Dominant: {
                    Target: {
                        Guid: previous.value
                    }
                },
                MetaRelationType: {
                    Target: {
                        Guid: metaRelation.attributes.metaRelationTypeGuid
                    }
                },
                Subordinate: {
                    Target: {
                        Guid: next.value
                    }
                }
            };
            console.log("completeMetaRelation()", { params });
            $.post("/Admin/MetaRelation/QuickAdd", params, (response) => {
                console.log("/Admin/MetaRelation/QuickAdd", { response });
                metaRelation.value = response.Data.Guid;
                pubsub.publish("autocomplete/meta-relation-created", {
                    sourceGuid: previous.value,
                    targetGuid: next.value,
                    metaRelationTypeGuid: metaRelation.attributes.metaRelationTypeGuid,
                    metaRelationGuid: metaRelation.value
                });
            });
        }
        handleScope() {
            const scope = this.scope();
            this.scope(scope == Scope.Partial ? Scope.Exact : Scope.Partial);
            this.page(1);
            this.results([]);
            this.fetchEntities();
        }
        handleTab() {
            const searchMode = this.searchMode();
            const _searchMode = (searchMode == SearchMode.Alias) ? SearchMode.Name : SearchMode.Alias;
            this.searchMode(_searchMode);
            this.page(1);
            this.results([]);
            this.fetchEntities();
        }
        handleEscape() {
            this.removeBrackets();
            this.close();
        }
        copyEntityReferenceToHighlights(entity) {
            const editor = this.editor;
            this.highlights.filter(x => !x.isDeleted).forEach(x => {
                const agent = editor.createProperty("agent", entity.value, { start: x.startNode, end: x.endNode });
                agent.attributes.name = entity.attributes.name;
            });
            this.removeHighlights();
        }
        handleEnter() {
            console.log("handleEnter");
            const editor = this.editor;
            if (this.searchEndpoint() == SearchEndpoint.Wikipedia) {
                this.handleAddWikipediaEntity();
                return;
            }
            if (this.searchEndpoint() == SearchEndpoint.GND) {
                this.handleAddGNDEntity();
                return;
            }
            if (this.results().length == 0) {
                if (this.searchEndpoint() == SearchEndpoint.Relationship) {
                    this.handleAddNewRelation();
                    return;
                }
                this.handleAddNewEntity();
                return;
            }
            const currentItem = this.results()[this.currentIndex];
            const input = this.getInput();
            const first = input.cells[0];
            const last = input.cells[input.cells.length - 1];
            var type = "agent";
            if (this.entityType() == EntityType.Relationship) {
                type = "metaRelation";
            }
            if (this.textMode() == TextMode.Reinstate) {
                editor.deleteRange({ start: first, end: last });
                const { start, end } = this.insertBefore({ text: this.originalText(), right: this.brackets.right[0] });
                // const { start, end } = this.insertText(this.originalText(), this.range.end);
                var property = editor.createProperty(type, currentItem.Guid, { start, end });
                this.removeBrackets();
                this.editor.setCarotByNode(end, 1);
            }
            if (this.textMode() == TextMode.Overlay) {
                if (this.entityType() == EntityType.Entity) {
                    let entity = editor.createProperty(type, currentItem.Guid, { start: first, end: last });
                    if (this.highlightsEnabled) {
                        this.copyEntityReferenceToHighlights(entity);
                    }
                }
                if (this.entityType() == EntityType.Relationship) {
                    const _metaRelation = {
                        type: "metaRelation",
                        startIndex: first.speedy.index,
                        endIndex: last.speedy.index,
                        attributes: {
                            metaRelationTypeGuid: currentItem.Guid
                        }
                    };
                    this.editor.addProperty(_metaRelation);
                }
                this.removeBrackets();
                this.editor.setCarotByNode(last, 1);
            }
            if (this.textMode() == TextMode.Replace) {
                this.textMode(TextMode.Input);
                editor.deleteRange({ start: first, end: last });
                const name = currentItem.getName();
                const { cells } = editor.textToDocumentFragmentWithTextBlocks(name);
                const content = document.createDocumentFragment();
                cells.pop(); // Get rid of the trailing carriage return.
                cells.forEach(cell => content.appendChild(cell));
                const len = cells.length;
                const _first = cells[0];
                const _last = cells[len - 1];
                const previous = this.brackets.left[this.brackets.left.length - 1];
                const next = this.brackets.right[0];
                const anchorNode = next;
                const container = editor.getCurrentContainer(anchorNode);
                container.insertBefore(content, anchorNode);
                previous.speedy.next = _first;
                _first.speedy.previous = previous;
                _last.speedy.next = next;
                next.speedy.previous = _last;
                this.editor.mark();
                if (this.entityType() == EntityType.Entity) {
                    if (this.searchEndpoint() == SearchEndpoint.Agents) {
                        let entity = this.editor.createProperty("agent", currentItem.Guid, { start: _first, end: _last });
                        entity.attributes.name = currentItem.Name;
                        if (this.highlightsEnabled) {
                            this.copyEntityReferenceToHighlights(entity);
                        }
                    } else {
                        // add foreign entity to Codex
                        let record = {
                            Entity: {
                                Name: name,
                                QuickAdd: true
                            }
                        };
                        $.post("/Admin/Agent/QuickAdd", record, (response) => {
                            if (!response.Success) {
                                return;
                            }
                            const entity = response.Data.Entity
                            let agent = _this.editor.createProperty("agent", entity.Guid, { start: _first, end: _last });
                            agent.attributes.name = entity.Name;
                            if (_this.highlightsEnabled) {
                                _this.copyEntityReferenceToHighlights(agent);
                            }
                        });
                    }
                }
                if (this.entityType() == EntityType.Relationship) {
                    const _metaRelation = {
                        type: "metaRelation",
                        startIndex: _first.speedy.index,
                        endIndex: _last.speedy.index,
                        attributes: {
                            metaRelationTypeGuid: currentItem.Guid
                        }
                    };
                    this.editor.addProperty(_metaRelation);
                }
                this.removeBrackets();
                this.editor.setCarotByNode(_last, 1);
            }
            this.close();
        }
        insertBefore(args) {
            const { text, right } = args;
            const { cells } = this.editor.textToDocumentFragmentWithTextBlocks(text);
            const content = document.createDocumentFragment();
            const container = this.editor.getCurrentContainer(right);
            cells.pop();
            cells.forEach(cell => content.appendChild(cell));
            // container.insertBefore(content, right);
            right.parentNode.insertBefore(content, right);
            const len = cells.length;
            const first = cells[0];
            const last = cells[len - 1];
            const previous = right.speedy.previous;
            if (previous) {
                previous.speedy.next = first;
            }
            first.speedy.previous = previous;
            last.speedy.next = right;
            right.speedy.previous = last;
            this.editor.mark();
            this.editor.updateOffsets();
            return { start: first, end: last };
        }
        insertText(text, anchorNode, previous, next) {
            const { cells } = this.editor.textToDocumentFragmentWithTextBlocks(text);
            const content = document.createDocumentFragment();
            cells.pop(); // Get rid of the trailing carriage return.
            cells.forEach(cell => content.appendChild(cell));
            const len = cells.length;
            const _first = cells[0];
            const _last = cells[len - 1];
            previous = previous || this.range.start;
            next = next || this.range.end;
            const container = this.editor.getCurrentContainer(anchorNode);
            container.insertBefore(content, anchorNode);
            previous.speedy.next = _first;
            _first.speedy.previous = previous;
            _last.speedy.next = next;
            next.speedy.previous = _last;
            return { start: _first, end: _last };
        }
        getRangeCells() {
            var current = this.range.start.speedy.next;
            var cells = [];
            var loop = true;
            while (loop) {
                cells.push(current);
                if (current.speedy.next == this.range.end) {
                    loop = false;
                    continue;
                }
            }
            return cells;
        }
        handleHome() {
            this.jumpTo(0);
        }
        handleEnd() {
            const maxIndex = this.results().length - 1;
            this.jumpTo(maxIndex);
        }
        jumpTo(index) {
            this.currentIndex = index;
            this.updateScroll(this.currentIndex);
            const currentItem = this.results()[this.currentIndex];
            this.highlight(currentItem);
        }
        highlight(item) {
            this.results().forEach(x => x.unhighlight());
            item.highlight();
        }
        handleUpArrow() {
            const maxIndex = this.results().length - 1;
            const currentItem = this.results()[this.currentIndex];
            if (this.currentIndex == 0) {
                this.currentIndex = 0;
            } else {
                this.currentIndex--;
            }
            const nextItem = this.results()[this.currentIndex];
            this.highlight(nextItem);
            this.updateScroll(this.currentIndex);
        }
        handleDownArrow() {
            const _this = this;
            const maxIndex = this.results().length - 1;
            const currentItem = this.results()[this.currentIndex];
            if (this.currentIndex >= maxIndex) {
                if (this.page() < this.maxPage()) {
                    this.page(this.page() + 1);
                    this.appendResults(true);
                    this.fetchEntities(() => {
                        _this.appendResults(true);
                        _this.currentIndex++;
                        const nextItem = _this.results()[_this.currentIndex];
                        _this.highlight(nextItem);
                        _this.updateScroll(_this.currentIndex);
                    });
                    return;
                } else {
                    this.currentIndex = maxIndex;
                }
            } else {
                this.currentIndex++;
            }
            const nextItem = this.results()[this.currentIndex];
            this.highlight(nextItem);
            this.updateScroll(this.currentIndex);
        }
        updateScroll(currentIndex) {
            // See: https://stackoverflow.com/questions/59667535/scroll-with-up-and-down-keys-in-autocomplete-list
            const currentItem = this.results()[currentIndex];
            const element = document.querySelector("[data-agent-guid='" + currentItem.Guid + "']");
            if (element.offsetTop < element.parentNode.scrollTop) {
                // Hidden on top, move scroll to show item
                // Just to the top of item
                element.parentNode.scrollTop = element.offsetTop - 20;
            } else if (element.offsetTop > (element.parentNode.scrollTop + element.parentNode.clientHeight) - element.clientHeight) {
                // Hidden on bottom, move scroll to top of item + item height
                element.parentNode.scrollTop = element.offsetTop - (element.parentNode.clientHeight - element.clientHeight);
            }
        }
        highlightFirstItem() {
            if (!this.results().length) {
                return;
            }
            this.highlight(this.results()[0]);
        }
        setResults(results, callback) {
            const _this = this;
            const _results = results.map(x => new EntitySearchResult(x));
            if (this.appendResults()) {
                _results.forEach(x => _this.results.push(x));
            } else {
                this.results(_results);
            }
            if (callback) {
                callback();
                return;
            }
            this.currentIndex = 0;
        }
        close() {
            this.hide();
            this.page(1);
            this.results([]);
            this.appendResults(false);
            this.buffer.length = 0;
            this.active = false;
            this.state(State.Closed);
            this.textMode(TextMode.Input);
            this.searchEndpoint(SearchEndpoint.Agents);
            this.scanForCompletions();
            this.removeHighlights();
            this.context = 0;
        }
        removeHighlights() {
            const editor = this.editor;
            const properties = editor.data.properties;
            if (this.highlights.length) {
                this.highlights.filter(x => !x.isDeleted).forEach(h => {
                    h.remove();
                    removeFromArray(properties, h);
                });
                this.highlights.length = 0;
            }
            this.highlightsEnabled = false;
        }
        entitySelected(entity) {
            console.log({ entity });
            const index = this.results.indexOf(entity);
            this.currentIndex = index;
            this.handleEnter();
            // replace command mode text in editor with entity name
            // create an agent property for that text linked to the entity GUID
        }
    }

    return Autocomplete;

}));
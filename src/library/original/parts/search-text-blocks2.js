(function (factory) {
    define("parts/search-text-blocks", ["jquery", "knockout", "app/helpers", "modals/search-texts", "parts/text-add", "pubsub", "parts/window-manager", "jquery-ui", "jquery/nicescroll", "knockout/speedy-viewer", "jquery-ui"], factory);
}(function ($, ko, Helper, TextModal, QuickAdd, pubsub, _WindowManager) {

    const { div, generateUUID, applyBindings, openModal } = Helper;
    const WindowManager = _WindowManager.getWindowManager();
    var cache = {};
    var modalLists = {};

    class Component {
        constructor(cons) {
            cons = cons || {};
            cons.filter = cons.filter || {};
            cons.list = cons.list || {};
            this.container = div({
                style: {
                    position: "absolute",
                    top: 0,
                    right: 0,
                    width: "550px",
                    height: "100%",
                    padding: "10px",
                    backgroundColor: "#fff",
                    zIndex: WindowManager.getNextIndex()
                },
                classList: ["text-window"]
            });
            this.list = {
                sections: ko.observableArray(cons.list.sections || []),
                sortOptions: [{ Text: "By name", Value: "ByName" }, { Text: "By date added", Value: "ByDateAdded" }],
                directions: ["Ascending", "Descending"],
                agents: ko.observableArray(cons.list.agents || []),
                pages: ko.observableArray(cons.list.pages || [1]),
                pageRows: [4]
            };
            this.filter = {
                text: ko.observable(cons.filter.text),
                caseSensitive: ko.observable(cons.filter.caseSensitive),
                wholeWord: ko.observable(cons.filter.wholeWord),
                agentGuid: ko.observable(cons.filter.agentGuid),
                sectionGuid: ko.observable(cons.filter.sectionGuid),
                infinite: ko.observable(cons.filter.infinite),
                page: ko.observable(cons.filter.page || 1),
                order: ko.observable("ByName"),
                direction: ko.observable("Ascending"),
                pageRows: ko.observable(4)
            };
            this.agentGuid = cons.filter.agentGuid;
            this.action = {
                graph: ko.observable(false),
                wordCloud: ko.observable(false),
                agentCloud: ko.observable(false),
            };
            this.buttonState = {
                graph: ko.observable("disable")
            };
            this.cache = {};
            this.count = ko.observable();
            this.page = ko.observable(1);
            this.maxPage = ko.observable(1);
            this.results = ko.observableArray([]);
            this.setLists();
            this.focus = false;
            this.win = null;
            this.setup();
        }
        setup() {
            var _this = this;
            this.setupAgents();
            pubsub.subscribe("search-text-blocks/close", () => {
                _this.close();
            });
        }
        setupAgents() {
            const _this = this;
            this.list.agents.push({ Text: null, Value: null });
            const guid = this.filter.agentGuid();
            if (guid) {
                $.get("/Admin/Agent/GetAgent", { id: guid }, response => {
                    console.log("/Admin/Agent/GetAgent", { response });
                    if (!response.Success) {
                        return;
                    }
                    const data = response.Data;
                    _this.list.agents.push({ Text: data.Name, Value: data.Guid });
                    _this.filter.agentGuid(guid);
                    _this.agentGuid = null;
                });
            }
        }
        searchAgentClicked() {
            const _this = this;
            require(["modals/search-agents"], function (AgentModal) {
                openModal("/Static/Templates/Agent/SearchModal.html", {
                    name: "Find Agent",
                    ajaxContentAdded: function (element) {
                        var Search = new AgentModal({
                            popup: element,
                            tabSearch: "search",
                            handler: {
                                onSelected: function (guid, name) {
                                    $(element).modal("hide");
                                    _this.list.agents.push({ Text: name, Value: guid });
                                    _this.filter.agentGuid(guid);
                                }
                            }
                        });
                        ko.applyBindings(Search, element);
                        Search.start();
                    }
                });
            });
        }
        loadAgentCloudClicked() {
            const _this = this;
            const textBlockGuids = this.results().map(x => x.TextBlockGuid).join(",");
            $.get("/Admin/Agent/TextBlockReferences", { guids: textBlockGuids }, function (response) {
                console.log("/Admin/Agent/TextBlockReferences", { response });
                if (!response.Success) {
                    return;
                }
                require(["parts/word-cloud"], function (WordCloud) {
                    const agents = response.Data;
                    const wordCounts = _this.agentsToWords(agents);
                    const words = wordCounts.map(w => {
                        return {
                            ...w, handlers: {
                                "click": (e) => {
                                    console.log("jqcloud.click", e);
                                    const span = e.target;
                                    if (e.ctrlKey) {
                                        cloud.removeWord(span.innerText);
                                        return;
                                    }
                                    const agentGuid = span.dataset.agentGuid;
                                    pubsub.publish("dock/load-entity", agentGuid);
                                }
                            }
                        };
                    });
                    const data = {
                        words: words,
                        name: _this.getWindowName(),
                    };
                    const cloud = new WordCloud();
                    cloud.load(data);
                });
            });
        }
        agentsToWords(agents) {
            var names = [];
            agents.forEach(a => {
                let item = names.find(n => n.text == a.Name);
                if (item) {
                    item.weight++;
                } else {
                    names.push({
                        text: a.Name,
                        weight: 1,
                        html: {
                            "data-agent-guid": a.Guid
                        }
                    });
                }
            });
            return names;
        }
        loadWordCloudClicked() {
            this.loadWordCloud();
        }
        getSectionText(sectionGuid) {
            var section = this.list.sections().find(s => s.Value == sectionGuid);
            return section ? section.Text : null;
        }
        getAgentText(agentGuid) {
            var agent = this.list.agents().find(s => s.Value == agentGuid);
            return agent ? agent.Text : null;
        }
        getWindowName() {
            const filter = ko.toJS(this.filter);
            const section = this.getSectionText(filter.sectionGuid);
            const agent = this.getAgentText(filter.agentGuid);
            var parts = [];
            if (agent) {
                parts.push(`entity: "${agent}"`);
            }
            if (filter.text) {
                parts.push(`search: "${filter.text}"`);
            }
            if (section) {
                parts.push(`section: ${section}`);
            }
            parts.push(`case: ${filter.caseSensitive ? "yes" : "no"}`);
            parts.push(`word: ${filter.wholeWord ? "yes" : "no"}`);
            if (filter.infinite) {
                parts.push("pages: all")
            } else {
                parts.push(`page: ${filter.page} of ${this.maxPage()}`);
            }
            const result = parts.join("; ");
            return result;
        }
        loadWordCloud() {
            const wordCounts = this.getWordCounts();
            const words = wordCounts.map(w => {
                return {
                    ...w, handlers: {
                        "click": (e) => {
                            console.log("jqcloud.click", e);
                        }
                    }
                };
            });
            const data = {
                words: words,
                name: this.getWindowName(),
            };
            require(["parts/word-cloud"], function (WordCloud) {
                const cloud = new WordCloud();
                cloud.load(data);
            });
        }
        getWordCounts() {
            const words = this.getWords();
            var items = [];
            words.forEach(w => {
                let item = items.find(d => d.text == w);
                if (item) {
                    item.weight++;
                } else {
                    items.push({
                        text: w,
                        weight: 1
                    });
                }
            });
            return items;
        }
        getStopWords() {
            const _stop = `and,the,are,was,at,where,have,his,he,an,some,its,their,an,but,why,every,may,other,if,will,is,` + `they,of,said,on,there,any,one,be,also,from,very,about,could,such,without,these,like,this,were,had,which,with,that,been,` +
                `to,or,not,you,we,as,by,for,in,it,all,a,your,them,i,no,am,then,use,because,between,so,who,what,me,my,thou,here,him,still,` +
                `thy,would,wert,many,thee,nor,can,after,more,thine,whom,neither,has,than,though,therefore,out,must,into,do,go,over,let,shall,now,` +
                `made,two,did,come,another,put,up,down,being,went,three,through,same,under,yet,great,each,make,enough,turn,before,came,far,only,` +
                `only,ye,those,back,afterwards,much,done,since,when,thousand,already,own,away,might,rather,hast,next,cannot,add,should,half,until,` +
                `anything,myself,upon,eight,nine,ten,four,five,six,together,our,us,near,june`
                ;
            const stop = _stop.split(",");
            return stop;
        }
        cleanText(match) {
            return match
                ? match.toLowerCase().trim().replace(',', '').replace('.', '').replace(')', '').replace('(', '')
                    .replace('_', '').replace('__', '').replace(';', '').replace("'", '').replace('"', '').replace('[', '').replace(']', '')
                : null;
        }
        extractWords(text) {
            const words = text.match(/\S+\s*/g);
            return words;
        }
        getWords() {
            const _this = this;
            const text = this.getAllText();
            const stop = this.getStopWords();
            const words = this.extractWords(text);
            const result = words
                .map(w => _this.cleanText(w))
                .filter(w => !stop.some(s => s == w))
                ;
            return result;
        }
        getAllText() {
            const texts = this.results().map(tb => tb.TextBlock);
            const words = texts.join(" ");
            return words;
        }
        dockLeftClicked() {
            this.win.node.style.left = 0;
            this.win.node.style.right = "unset";
        }
        dockRightClicked() {
            this.win.node.style.right = 0;
            this.win.node.style.left = "unset";
        }
        closeClicked() {
            this.close();
        }
        close() {
            this.win.close();
        }
        minimizeClicked() {
            this.win.minimize({ name: this.getWindowName() });
        }
        executeActions() {
            const _this = this;
            this.setGraphButtonDisableState(state => {
                if (state == "disable") {
                    return;
                }
                if (_this.action.graph()) {
                    _this.loadTextGraphClicked();
                }
            });
            if (this.action.wordCloud()) {
                this.loadWordCloudClicked();
            }
            if (this.action.agentCloud()) {
                this.loadAgentCloudClicked();
            }
        }
        loadTextGraphClicked() {
            const textBlockGuids = this.results().map(x => x.TextBlockGuid);
            this.loadTextGraph({ textBlockGuids: textBlockGuids });
        }
        loadTextGraphIfRelationsExist(args, exists) {
            const guids = args.textBlockGuids.join(",");
            if (!guids.length) {
                return;
            }
            $.post("/Admin/Text/HasManyTextBlockRelations", { guids: guids }, (response) => {
                console.log({ response });
                if (!response.Success) {
                    return;
                }
                if (!response.Data) {
                    return;
                }
                if (exists) {
                    exists();
                }
            });
        }
        loadTextGraph(args) {
            require(["parts/text-graph"], function (TextGraph) {
                var panel = div({
                    style: {
                        position: "absolute",
                        top: "200px",
                        left: "400px",
                        padding: "20px",
                        width: "800px",
                        height: "600px",
                        zIndex: WindowManager.getNextIndex()
                    },
                    children: [
                        applyBindings(`
<div class="safari_buttons">
    <div data-bind="click: $data.closeClicked" class="safari_close"></div><div data-bind="click: $data.minimizeClicked" class="safari_minimize"></div><div class="safari_zoom"></div>
</div>
 <div data-role="drag-handle" style="text-align: right;"><span style="text-decoration: underline;" data-bind="click: closeClicked">close</span></div>
 `,
                            {
                                closeClicked: () => {
                                    panel.remove();
                                    win.close();
                                },
                                minimizeClicked: () => win.minimize()
                            })
                    ],
                    classList: ["text-window"]
                });
                var node = div({
                    style: {
                        width: "850px",
                        height: "450px"
                    }
                });
                panel.appendChild(node);
                document.body.appendChild(panel);
                var graph = new TextGraph({
                    layout: "cose",
                    node: node,
                    textBlockGuids: args.textBlockGuids
                });
                var handle = panel.querySelector("[data-role='drag-handle'");
                var win = WindowManager.addWindow({
                    type: "text-graph",
                    loader: {
                        params: {
                            textBlockGuids: args.textBlockGuids
                        }
                    },
                    node: panel,
                    draggable: {
                        node: handle
                    }
                });
            });
        }
        zoomClicked() {
            this.win.zoom();
        }
        focusClicked() {
            this.focus = !this.focus;
            if (this.focus) {
                this.win.focus();
            } else {
                this.win.unfocus();
            }
        }
        setPages(page, maxPage) {
            var pages = [];
            for (var i = 1; i <= maxPage; i++) {
                pages.push(i);
            }
            this.list.pages(pages);
            this.filter.page(page);
            this.maxPage(maxPage);
        }
        previousPageClicked() {
            var page = this.filter.page();
            if (page <= 1) {
                return;
            }
            this.filter.page(page - 1);
            this.searchClicked();
        }
        nextPageClicked() {
            var page = this.filter.page();
            if (page >= this.maxPage()) {
                return;
            }
            this.filter.page(page + 1);
            this.searchClicked();
        }
        textSelected(item) {
            const guid = item.TextGuid;
            this.loadTextWindow(guid);
        }
        loadTextWindow(guid) {
            var client = new QuickAdd();
            client.loadTextWindow(guid);
        }
        setGlassModeEditors(glass) {
            const editorNodes = this.container.querySelectorAll(".editor");
            const editors = Array.from(editorNodes);
            if (glass) {
                editors.forEach(e => e.classList.add("glass-editor"));

            } else {
                editors.forEach(e => e.classList.remove("glass-editor"));
            }
        }
        setLists() {
            var _this = this;
            $.get("/Admin/Agent/SearchModalLists", (response) => {
                _this.list.sections(response.Data.Sections);
            });
        };
        toggleGlassModeClicked() {
            this.glass = !this.glass;
            if (this.glass) {
                this.container.classList.add("glass-window");
            } else {
                this.container.classList.remove("glass-window");
            }
            this.setGlassModeEditors(this.glass);
        }
        cloneClicked() {
            this.clone();
        }
        clone() {
            const filter = ko.toJS(this.filter);
            const list = ko.toJS(this.list);
            var copy = new Component({
                filter: filter,
                list: list
            });
            (async () => {
                await copy.load();
                copy.search();
            })();
        }
        clearClicked() {
            this.filter.page(1);
            this.filter.text(null);
            this.filter.caseSensitive(false);
            this.filter.wholeWord(false);
            this.filter.sectionGuid(null);
            this.filter.agentGuid(null);
            this.filter.infinite(false);
            this.maxPage(1);
            this.results([]);
        }
        popoutTextBlockClicked(item) {
            const client = new QuickAdd();
            client.loadTextBlockWindow({
                textBlockGuid: item.TextBlockGuid
            });
        }
        toggleInfiniteClicked() {
            this.filter.infinite(!this.filter.infinite());
            this.search();
        }
        test(text) {

        }
        getMatches(text, search, options) {
            options = options || "gi";
            const re = new RegExp(search, options);
            var results = [], match;
            while ((match = re.exec(text)) != null) {
                if (re.lastIndex == 0) {
                    return [];
                }
                let span = match[0];
                results.push({
                    start: match.index,
                    end: match.index + span.length - 1
                });
            }
            return results;
        }
        getAgentHighlights(agentGuid, standoffProperties) {
            const agentProps = standoffProperties.filter(sp => sp.Type == "agent" && !sp.IsDeleted && sp.Value == agentGuid);
            const highlights = agentProps.map(ap => {
                return {
                    Guid: generateUUID(),
                    Type: "highlight",
                    StartIndex: ap.StartIndex,
                    EndIndex: ap.EndIndex,
                    Value: "yellow",
                    Attributes: []
                }
            });
            return highlights;
        }
        getHighlights(text, searchTerm, startIndex) {
            var parts = [];
            const ands = searchTerm.split('&&').map(p => p.trim());
            const ors = searchTerm.split('||').map(p => p.trim());
            parts = parts.concat(ands).concat(ors);
            const highlights = parts.map(p => {
                const matches = this.getMatches(text, p);
                const results = matches.map(m => {
                    return {
                        Guid: generateUUID(),
                        Type: "highlight",
                        StartIndex: startIndex + m.start,
                        EndIndex: startIndex + m.end,
                        Attributes: []
                    }
                });
                return results;
            });
            const result = highlights.flat();
            return result;
        }
        searchClicked() {
            this.search();
        }
        isValid() {
            if (this.filter.text()) {
                return true;
            }
            if (this.agentGuid || this.filter.agentGuid()) {
                return true;
            }
            return false;
        }
        setGraphButtonDisableState(callback) {
            const _this = this;
            const guids = this.results().map(x => x.TextBlockGuid).join(",");
            if (guids.length == 0) {
                return;
            }
            $.post("/Admin/Text/HasManyTextBlockRelations", { guids: guids }, (response) => {
                const state = response.Data ? "enable" : "disable";
                _this.buttonState.graph(state);
                callback(state);
            });
        }
        search() {
            const _this = this;
            if (false == this.isValid()) {
                return;
            }
            this.buttonState.graph("disable");
            this.fetchSearchResults(data => {
                _this.bindSearchResults(data);
                _this.executeActions();
            });
        }
        fetchSearchResults(callback) {
            var filter = ko.toJS(this.filter);
            filter.agentGuid = this.agentGuid || filter.agentGuid;
            const key = JSON.stringify(filter);
            //if (cache[key]) {
            //    const data = JSON.parse(cache[key]);
            //    callback(data);
            //    return;
            //}
            $.get("/Admin/Text/SearchTextBlocks", filter, response => {
                console.log("/Admin/Text/SearchTextBlocks", { response });
                if (!response.Success) {
                    return;
                }
                const data = response.Data;
                cache[key] = JSON.stringify(data);
                callback(data);
            });
        }
        bindSearchResults(data) {
            const _this = this;
            const results = data.Results;
            const text = this.filter.text();
            if (text) {
                results.forEach(tb => {
                    const highlights = _this.getHighlights(tb.TextBlock, text, tb.StartIndex);
                    tb.StandoffProperties = tb.StandoffProperties.concat(highlights);
                });
            }
            if (this.filter.agentGuid()) {
                results.forEach(tb => {
                    const highlights = _this.getAgentHighlights(_this.filter.agentGuid(), tb.StandoffProperties);
                    tb.StandoffProperties = tb.StandoffProperties.concat(highlights);
                });
            }
            this.results(results);
            this.count(data.Count);
            this.setPages(data.Page, data.MaxPage);
            this.setGlassModeEditors(this.glass);
        }
        scrollToTop() {
            console.log("scrollToTop");
            this.win.node.scrollTo({ top: 0 });
        }
        async load() {
            const response = await fetch("/Static/Templates/Text/search-text-blocks-panel.html?v=69");
            const html = await response.text();
            const node = div({
                template: {
                    view: html,
                    model: this
                }
            })
            this.container.appendChild(node);
            this.win = WindowManager.addWindow({
                type: "search-text-blocks",
                draggable: {
                    node: node.querySelectorAll("[data-role='handle']")[0]
                },
                node: this.container
            });
            document.body.appendChild(this.container);
            //this.win.layer.container.appendChild(this.container);
        }
    }

    return Component;

}));
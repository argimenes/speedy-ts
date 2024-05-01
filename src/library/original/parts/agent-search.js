(function (factory) {
    define("parts/agent-search", ["knockout", "app/helpers", "pubsub", "bootstrap", "knockout/tinymce", "knockout/ichecked"], factory);
}(function (ko, Helper, pubsub) {

    const { openModal, emptyItem, store } = Helper;
    var addToList = Helper.storeItemInList;
    var retrieve = Helper.retrieve;
    var cache = {};

    const div = (config) => {
        return newElement("DIV", config);
    }

    const span = (config) => {
        return newElement("SPAN", config);
    }

    const newElement = (type, config) => {
        var el = document.createElement(type);
        return updateElement(el, config);
    };

    const applyBindings = (html, model) => {
        var node = newElement("DIV", { innerHTML: html });
        ko.applyBindings(model, node);
        return node;
    }

    const updateElement = (el, config) => {
        config = config || {};
        if (config.property) {
            el.property = config.property;
        }
        if (config.innerHTML) {
            el.innerHTML = config.innerHTML;
        }
        if (config.style) {
            for (var key in config.style) {
                el.style[key] = config.style[key];
            }
        }
        if (config.handler) {
            for (var key in config.handler) {
                el.addEventListener(key, config.handler[key]);
            }
        }
        if (config.attribute) {
            for (var key in config.attribute) {
                el.setAttribute(key, config.attribute[key]);
            }
        }
        if (config.dataset) {
            for (var key in config.dataset) {
                el.dataset[key] = config.dataset[key];
            }
        }
        if (config.classList) {
            config.classList.forEach(x => el.classList.add(x));
        }
        if (config.children) {
            config.children.forEach(x => el.appendChild(x));
        }
        return el;
    };

    const extendElement = (source, config) => {
        var el = source.cloneNode(true);
        return updateElement(el, config);
    };

    function setList(field, observable, list) {
        var value = field();
        observable(list);
        field(value);
    }

    var Search = (function () {
        function Search(cons) {
            this.prepare(cons);
            this._parent = cons._parent;
            this.popup = cons.popup;
            this.total = ko.observable();
            this.maxPage = ko.observable(1);
            this.results = ko.observableArray([]);
            this.isModal = cons.mode == "modal";
            this.service = cons.service;
            this.filter = {
                Guid: ko.observable(cons.filter.Guid),
                Guids: ko.observable(cons.filter.Guids),
                AgentType: ko.observable(cons.filter.AgentType),
                PropertyTypeCode: ko.observable(cons.filter.PropertyTypeCode),
                RelatedTo: ko.observable(cons.filter.RelatedTo),
                Name: ko.observable(cons.filter.Name),
                Section: ko.observable(cons.filter.Section),
                Page: ko.observable(cons.filter.Page || 1),
                PageRows: ko.observable(cons.filter.PageRows),
                Order: ko.observable(cons.filter.Order || "ByDateAdded"),
                Direction: ko.observable(cons.filter.Direction || "Descending"),
                Backlink: ko.observable(cons.filter.Backlink),
                Inline: ko.observable(cons.filter.Inline),
                SearchAliases: ko.observable(cons.filter.SearchAliases),
                ExactSearch: ko.observable(cons.filter.ExactSearch),
                IsDeleted: ko.observable(cons.filter.IsDeleted),
                Type: ko.observable(cons.filter.Type),
            };
            this.list = {
                Sections: ko.observableArray(cons.list.Sections),
                SortOptions: ko.observableArray(cons.list.SortOptions),
                Records: ko.observableArray(this.isModal ? [5, 10, 20] : [20, 40, 60, 80, 100]),
                Directions: ko.observableArray(cons.list.Directions),
                IsDeleted: ko.observableArray(cons.list.IsDeleted),
                SearchAliases: ko.observableArray(cons.list.SearchAliases),
                Agents: ko.observableArray(cons.list.Agents),
                AgentTypes: ko.observableArray(cons.list.AgentTypes),
                PropertyTypes: ko.observableArray(cons.list.PropertyTypes || [
                    { Text: "", Value: "" },
                    { Text: "video", Value: "video-url" },
                    { Text: "image", Value: "image-url" },
                    { Text: "website", Value: "website-url" },
                    { Text: "pdf", Value: "pdf-url" },
                    { Text: "tweet", Value: "tweet-embed-code" },
                    { Text: "sketchfab", Value: "embed-code" },
                    { Text: "place", Value: "latitude" },
                ]),
                Types: ko.observableArray(cons.list.Types),
                Pages: ko.observableArray([]),
            };
            this.handler = {
                onSelected: cons.handler.onSelected,
                onGraphClicked: cons.handler.onGraphClicked,
                onTextsClicked: cons.handler.onTextsClicked,
                inlineAgentSelector: cons.handler.inlineAgentSelector
            };
            this.filter.Backlink.subscribe(function () {
                this.loadPage();
            }, this);
            this.filter.SearchAliases.subscribe(function () {
                this.loadPage();
            }, this);
            this.filter.ExactSearch.subscribe(function () {
                this.loadPage();
            }, this);
        }
        Search.prototype.updateAgents = function () {
            var agents = JSON.parse(sessionStorage.getItem("selected/agents")) || [];
            agents.splice(0, 0, emptyItem);
            this.list.Agents(agents);
        };
        Search.prototype.highlightName = function (text) {
            var value = this.filter.Name();
            if (!value) {
                return text;
            }
            var html = text.replace(new RegExp([value], 'gi'), function (x) {
                return "<mark>" + x + "</mark>";
            });
            return html;
        };
        Search.prototype.textClicked = function (item) {
            var guid = item.Entity.Guid;
            if (this.handler.onTextsClicked) {
                this.handler.onTextsClicked(guid);
                return;
            }
            require(["knockout/speedy-viewer", "jquery-ui"], function () {
                let cache = {};
                $.get("/Static/Templates/Agent/sentences-panel.html?v=28", function (html) {
                    var node = newElement("DIV", {
                        style: {
                            position: "absolute",
                            bottom: "300px",
                            right: "20px",
                            width: "500px",
                            height: "600px",
                            maxHeight: "800px",
                            padding: "10px",
                            zIndex: 41,
                        },
                        classList: ["text-window"],
                        innerHTML: html
                    });
                    var Model = (function () {
                        function Model(cons) {
                            this.list = {
                                sections: ko.observableArray([]),
                                sentiment: [null, "Positive", "Negative"],
                                sortOptions: [{ Text: "By name", Value: "ByName" }, { Text: "By date added", Value: "ByDateAdded" }],
                                directions: ["Ascending", "Descending"],
                                pages: ko.observableArray([1]),
                                pageRows: [5, 10, 20]
                            };
                            this.filter = {
                                agentGuid: ko.observable(cons.filter.agentGuid),
                                sectionGuid: ko.observable(),
                                page: ko.observable(),
                                sentiment: ko.observable(),
                                order: ko.observable("ByName"),
                                direction: ko.observable("Ascending"),
                                pageRows: ko.observable(5)
                            };
                            this.cache = {};
                            this.count = ko.observable();
                            this.page = ko.observable(1);
                            this.maxPage = ko.observable(1);
                            this.results = ko.observableArray([]);
                            this.setLists();
                        }
                        Model.prototype.closeClicked = function () {
                            node.remove();
                        };
                        Model.prototype.setPages = function (page, maxPage) {
                            var pages = [];
                            for (var i = 1; i <= maxPage; i++) {
                                pages.push(i);
                            }
                            this.list.pages(pages);
                            this.filter.page(page);
                            this.maxPage(maxPage);
                        };
                        Model.prototype.previousPageClicked = function () {
                            var page = this.filter.page();
                            if (page <= 1) {
                                return;
                            }
                            this.filter.page(page - 1);
                            this.searchClicked();
                        };
                        Model.prototype.nextPageClicked = function () {
                            var page = this.filter.page();
                            if (page >= this.maxPage()) {
                                return;
                            }
                            this.filter.page(page + 1);
                            this.searchClicked();
                        };
                        Model.prototype.textSelected = function (item) {
                            var guid = item.Text.Guid;
                            _this.loadTextWindow(guid, document.body);
                        };
                        Model.prototype.setLists = function () {
                            var _this = this;
                            $.get("/Admin/Agent/SearchModalLists", (response) => {
                                _this.list.sections(response.Data.Sections);
                            });
                        };
                        Model.prototype.clearClicked = function () {
                            this.results([]);
                        };
                        Model.prototype.searchClicked = function () {
                            var _this = this;
                            var filter = ko.toJS(this.filter);
                            var key = JSON.stringify(filter);
                            //if (cache[key]) {
                            //    var data = JSON.parse(cache[key]);
                            //    this.results(data.Results);
                            //    this.count(data.Count);
                            //    this.setPages(data.Page, data.MaxPage);
                            //    return;
                            //}
                            $.get("/Admin/Agent/Sentences", filter, function (response) {
                                console.log({ response });
                                if (!response.Success) {
                                    return;
                                }
                                //cache[key] = JSON.stringify(response.Data);
                                _this.results(response.Data.Results);
                                _this.count(response.Data.Count);
                                _this.setPages(response.Data.Page, response.Data.MaxPage);
                            });
                        };
                        Model.prototype.applyBindings = function (node) {
                            ko.applyBindings(this, node);
                        };
                        return Model;
                    })();
                    var model = new Model({
                        filter: {
                            agentGuid: guid,
                        }
                    });
                    model.searchClicked();
                    model.applyBindings(node);
                    document.body.appendChild(node);
                    $(node).draggable();
                });
            });
        };
        Search.prototype.graphClicked = function (item) {
            if (this.handler.onGraphClicked) {
                this.handler.onGraphClicked(item.Entity.Guid);
                return;
            }
            require(["parts/agent-graph"], (AgentGraph) => {
                var guid = item.Entity.Guid;
                var page = document.body;
                var container = newElement("DIV", {
                    style: {
                        position: "absolute",
                        bottom: "100px",
                        width: "600px",
                        height: "600px",
                        left: "200px",
                        zIndex: 35
                    },
                    classList: ["text-window"]
                });
                var node = newElement("DIV", {
                    style: {
                        width: "600px",
                        height: "600px",
                    }
                });
                var handle = newElement("DIV", {
                    style: {
                        //textAlign: "right"
                    },
                    //handler: {
                    //    "click": (e) => {
                    //        container.remove();
                    //    }
                    //},
                    children: [applyBindings("<div id='graph-" + guid + "'><span data-bind='click: closeClicked' style='text-decoration: underline;'>close</span></div>", { closeClicked: () => container.remove() })],
                    attribute: {
                        id: guid
                    }
                });
                container.appendChild(handle);
                container.appendChild(node);
                container.appendChild(newElement("DIV", { innerHTML: "&nbsp;" }));
                page.appendChild(container);
                var graph = new AgentGraph({
                    node: node,
                    agentGuid: guid
                });
                require(["jquery-ui"], () => {
                    $(container).draggable({
                        handle: "#graph-" + guid,
                        scroll: false
                    });
                });

            });
        };
        Search.prototype.addAgent = function (item) {
            addToList("selected/agents", item);
        };
        Search.prototype.searchRelatedToClicked = function () {
            this.loadAspectOf("Related to", "search");
        };
        Search.prototype.loadAspectOf = function (name, tabMode) {
            var _ = this;
            openModal("/Static/Templates/Agent/SearchModal.html", {
                name: name,
                ajaxContentAdded: function (element) {
                    var AgentModal = require("modals/search-agents");
                    var modal = new AgentModal({
                        popup: element,
                        tabModal: tabMode,
                        handler: {
                            onSelected: function (guid, name) {
                                $(element).modal("hide");
                                _.addAgent({ Text: name, Value: guid });
                                _.updateAgents();
                                _.filter.RelatedTo(guid);
                            }
                        }
                    });
                    ko.applyBindings(modal, element);
                    modal.start();
                }
            });
        };
        Search.prototype.prepare = function (cons) {
            cons = cons || {};
            cons.filter = cons.filter || {};
            cons.list = cons.list || {};
        }
        Search.prototype.displayEntityName = function (agent) {
            return this.highlightName(agent.Entity.Name);
        };
        Search.prototype.displayAliases = function (agent) {
            if (!agent.Aliases || !agent.Aliases.length) {
                return null;
            }
            var result = "";
            agent.Aliases.map(function (alias, i) {
                if (i > 0) {
                    result += ", ";
                }
                result += alias;
            });
            return this.highlightName(result);
        };
        Search.prototype.start = function () {
            //if (this.filter.Name() || this.filter.Guid()) {
            //    this.loadPage();
            //}
            this.loadPage();
        };
        Search.prototype.agentTypeText = function (item) {
            return item.Entity.AgentType;
        };
        Search.prototype.toDate = function (json) {
            return new Date(json.match(/\d+/)[0] * 1);
        };
        Search.prototype.previousPageClicked = function () {
            var page = this.filter.Page();
            if (page <= 1) {
                return;
            }
            this.filter.Page(page - 1);
            this.loadPage();
        };
        Search.prototype.nextPageClicked = function () {
            var page = this.filter.Page();
            if (page >= this.maxPage()) {
                return;
            }
            this.filter.Page(page + 1);
            this.loadPage();
        };
        Search.prototype.backlinkClicked = function () {
            this.filter.Backlink(!this.filter.Backlink());
            this.loadPage();
        };
        Search.prototype.inlineClicked = function () {
            this.filter.Inline(!this.filter.Inline());
            this.loadPage();
        };
        Search.prototype.loadPage = function () {
            var _this = this;
            var filter = ko.toJS(this.filter);
            var key = JSON.stringify(filter);
            this.service.Search(filter, function (response) {
                console.log("response", response);
                if (!response.Success) {
                    return;
                }
                cache[key] = response.Data;
                _this.bindResults(filter, response.Data);
            });
        };
        Search.prototype.bindResults = function (filter, data) {
            this.results(data.Results);
            this.list.Pages(data.PageHeadings.map(x => { return { Text: "[ " + x.Page + " ] " + (x.Heading || '???'), Value: x.Page }; }));
            this.filter.Page(filter.Page);
            this.total(data.Count);
            this.maxPage(data.MaxPage);
        };
        Search.prototype.selectClicked = function (item) {
            this.selected(item);
        };
        Search.prototype.selected = function (item) {
            store("recent/agents", item, function (x) { return x.Entity.Guid == item.Entity.Guid });
            var name = item.Entity.Name;
            this.handler.onSelected(item.Entity.Guid, name, { isNew: false });
        };
        Search.prototype.quickAddClicked = function () {
            if (this._parent) {
                if (this._parent.tab.quickAdd) {
                    this._parent.tab.quickAdd.saveFromSearchTab(this.filter.Name());
                }
            }
        };
        Search.prototype.submitClicked = function () {
            this.loadPage();
        };
        Search.prototype.clear = function () {
            this.filter.Page(1);
            this.filter.Guid(null);
            this.filter.Type(null);
            this.filter.Backlink(null);
            this.filter.Inline(null);
            this.filter.RelatedTo(null);
            this.filter.AgentType(null);
            this.filter.PropertyTypeCode(null);
            this.filter.Name(null);
            this.filter.Order(null);
            this.filter.PageRows(null);
            this.filter.Page(null);
            this.filter.Section(null);
            this.filter.Direction("Ascending");
            this.filter.IsDeleted(null);
            this.filter.SearchAliases(null);
            this.filter.ExactSearch(null);
        };
        Search.prototype.setLists = function (data) {
            setList(this.filter.Section, this.list.Sections, data.Sections);
            setList(this.filter.Order, this.list.SortOptions, data.SortOptions);
            setList(this.filter.Direction, this.list.Directions, data.Directions);
            this.list.AgentTypes(data.AgentTypes);
            this.list.Types(data.Types);
            //this.list.PropertyTypes([
            //    { Text: "", Value: "" },
            //    { Text: "video", Value: "video-url" },
            //    { Text: "image", Value: "image-url" },
            //    { Text: "website", Value: "website-url" },
            //    { Text: "pdf", Value: "pdf-url" },
            //    { Text: "tweet", Value: "tweet-embed-code" },
            //    { Text: "sketchfab", Value: "embed-code" },
            //]);
            this.list.IsDeleted(data.YesNos);
            this.list.SearchAliases(data.YesNos);
        };
        Search.prototype.clearClicked = function () {
            this.clear();
            this.results([]);
            this.loadPage();
        };
        return Search;
    })();

    return Search;
}));
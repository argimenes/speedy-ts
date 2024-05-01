(function (factory) {
    define("parts/lexeme-search", ["knockout", "jquery", "pubsub", "modals/search-lexicons", "modals/search-agents", "app/helpers", "bootstrap"], factory);
}(function (ko, $, pubsub, LexiconModal, AgentModal, Helper) {

    var openModal = Helper.openModal;
    var setList = Helper.setList;
    var emptyItem = { Text: "", Value: "" };
    var addToList = Helper.storeItemInList;

    var Search = (function () {
        function Search(cons) {
            this.prepare(cons);
            this.results = ko.observableArray([]);
            this.filter = {
                Guid: ko.observable(cons.filter.Guid),
                Name: ko.observable(cons.filter.Name),
                AssociatedAgent: ko.observable(cons.filter.AssociatedAgent),
                Lexicon: ko.observable(cons.filter.Lexicon),
                Section: ko.observable(cons.filter.Section),

                Page: ko.observable(cons.filter.Page || 1),
                PageRows: ko.observable(cons.filter.PageRows),
                Order: ko.observable(cons.filter.Order || "ByName"),
                Direction: ko.observable(cons.filter.Direction || "Ascending"),
            };
            this.list = {
                Sections: ko.observableArray(cons.list.Sections),
                Agents: ko.observableArray([]),
                Lexicons: ko.observableArray([]),

                SortOptions: ko.observableArray(cons.list.SortOptions),
                PageRows: ko.observableArray(cons.list.PageRows || [20, 40, 60, 80, 100]),
                Directions: ko.observableArray(cons.list.Directions),
                Pages: ko.observableArray([1]),
            };
            this.handler = {
                onSelected: cons.handler.onSelected
            }
            this.start();
        }
        Search.prototype.prepare = function (cons) {
            cons = cons || {};
            cons.filter = cons.filter || {};
            cons.list = cons.list || {};
        };
        Search.prototype.start = function () {
            this.loadPage();
        };
        Search.prototype.toDate = function (json) {
            return new Date(json.match(/\d+/)[0] * 1);
        };
        Search.prototype.setLists = function (list) {
            setList(this.filter.Section, this.list.Sections, list.Sections);
            setList(this.filter.Page, this.list.Pages, list.Pages);
            setList(this.filter.Order, this.list.SortOptions, list.SortOptions);
            setList(this.filter.Direction, this.list.Directions, list.Directions);
            this.updateAgents();
            this.updateLexicons();
        };
        Search.prototype.updateLexicons = function () {
            var list = JSON.parse(sessionStorage.getItem("selected/lexicons")) || [];
            list.splice(0, 0, emptyItem);
            this.list.Lexicons(list);
        };
        Search.prototype.addLexicon = function (item) {
            addToList("selected/lexicons", item);
        };
        Search.prototype.updateAgents = function () {
            var list = JSON.parse(sessionStorage.getItem("selected/agents")) || [];
            list.splice(0, 0, emptyItem);
            this.list.Agents(list);
        };
        Search.prototype.addAgent = function (item) {
            addToList("selected/agents", item);
        };
        Search.prototype.searchLexiconClicked = function () {
            var _ = this;
            openModal("/Static/Templates/Lexicon/SearchModal.html", {
                name: "Lexicons",
                ajaxContentAdded: function (element) {
                    var Search = new LexiconModal({
                        popup: element,
                        tabSearch: "search",
                        handler: {
                            onSelected: function (guid, name) {
                                $(element).modal("hide");
                                _.addLexicon({ Text: name, Value: guid });
                                _.updateLexicons();
                                _.filter.Lexicon(guid);
                            }
                        }
                    });
                    ko.applyBindings(Search, element);
                    Search.start();
                }
            });
        };
        Search.prototype.searchAgentClicked = function () {
            var _ = this;
            openModal("/Static/Templates/Agent/SearchModal.html", {
                name: "Agents",
                ajaxContentAdded: function (element) {
                    var Search = new AgentModal({
                        popup: element,
                        tabSearch: "search",
                        handler: {
                            onSelected: function (guid, name) {
                                $(element).modal("hide");
                                _.addAgent({ Text: name, Value: guid });
                                _.updateAgents();
                                _.filter.AssociatedAgent(guid);
                            }
                        }
                    });
                    ko.applyBindings(Search, element);
                    Search.start();
                }
            });
        };
        Search.prototype.loadPage = function () {
            var _ = this;
            var filter = ko.toJS(this.filter);
            $.get("/Admin/Lexeme/SearchJson", filter, function (response) {
                console.log("response", response);
                if (!response.Success) {
                    return;
                }
                _.results(response.Data.Results);
                _.list.Pages([]);
                for (var page = 1; page <= response.Data.MaxPage; page++) {
                    _.list.Pages.push(page);
                }
                _.filter.Page(filter.Page);
            });
        };
        Search.prototype.viewClicked = function (item) {
            this.selected(item.Entity.Guid);
        };
        Search.prototype.selectClicked = function (item) {
            this.selected(item.Entity.Guid, item.Entity.Name);
        };
        Search.prototype.selected = function (guid, name) {
            this.handler.onSelected(guid, name);
        };
        Search.prototype.submitClicked = function () {
            this.loadPage();
        };
        Search.prototype.clearClicked = function () {
            this.clear();
            this.loadPage();
        };
        Search.prototype.closeClicked = function () {
            this.close();
        };
        Search.prototype.close = function () {
            this.popup.close();
        };
        Search.prototype.clear = function () {
            this.filter.Guid(null);
            this.filter.Name(null);
            this.filter.AssociatedAgent(null);
            this.filter.Lexicon(null);
            this.filter.Section(null);

            this.filter.Order(null);
            this.filter.PageRows(null);
            this.filter.Page(null);
            this.filter.Direction("Ascending");
        };
        return Search;
    })();

    return Search;
}));
(function (factory) {
    define("parts/structure-search", ["knockout", "jquery", "app/helpers", "modals/search-agents"], factory);
}(function (ko, $, Helper, AgentModal) {

    var openModal = Helper.openModal;
    var emptyItem = Helper.emptyItem;
    var addToList = Helper.storeItemInList;

    var Search = (function () {
        function Search(cons) {
            this.prepare(cons);
            this.results = ko.observableArray([]);
            this.handler = cons.handler;
            this.filter = {
                Guid: ko.observable(cons.filter.Guid),
                Name: ko.observable(cons.filter.Name),
                Agent: ko.observable(cons.filter.Agent),
                Parent: ko.observable(cons.filter.Parent),

                Page: ko.observable(cons.filter.Page || 1),
                PageRows: ko.observable(cons.filter.PageRows || 5),
                Order: ko.observable(cons.filter.Order || "ByName"),
                Direction: ko.observable(cons.filter.Direction || "Ascending")
            };
            this.list = {
                Parents: ko.observableArray([]),
                Agents: ko.observableArray([]),

                SortOptions: ko.observableArray(cons.list.SortOptions),
                PageRows: ko.observableArray(cons.list.PageRows || [5, 10, 20]),
                Directions: ko.observableArray(cons.list.Directions),
                Pages: ko.observableArray([1]),
            };
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
        Search.prototype.setLists = function (data) {
            this.list.SortOptions(data.SortOptions);
            this.list.Directions(data.Directions);
            this.updateParents();
            this.updateAgents();
        };
        Search.prototype.updateAgents = function () {
            var list = JSON.parse(sessionStorage.getItem("selected/agents")) || [];
            list.splice(0, 0, emptyItem);
            this.list.Agents(list);
        };
        Search.prototype.addAgent = function (item) {
            addToList("selected/agents", item);
        };
        Search.prototype.searchAgentClicked = function () {
            this.loadAgents("Find Agent", "search");
        };
        Search.prototype.loadAgents = function (name, tabModal) {
            var _ = this;
            openModal("/Static/Templates/Agent/SearchModal.html", {
                name: name,
                ajaxContentAdded: function (element) {
                    var modal = new AgentModal({
                        popup: element,
                        tabModal: tabModal,
                        handler: {
                            onSelected: function (guid, name) {
                                $(element).modal("hide");
                                _.addAgent({ Text: name, Value: guid });
                                _.updateAgents();
                                _.filter.Agent(guid);
                            }
                        }
                    });
                    ko.applyBindings(modal, element);
                }
            });
        };
        Search.prototype.updateParents = function () {
            var list = JSON.parse(sessionStorage.getItem("selected/structures")) || [];
            list.splice(0, 0, emptyItem);
            this.list.Parents(list);
        };
        Search.prototype.addParent = function (item) {
            addToList("selected/structures", item);
        };
        Search.prototype.searchParentClicked = function () {
            this.loadParents("Find Parent", "search");
        };
        Search.prototype.loadParents = function (name, tabModal) {
            var _ = this;
            openModal("/Static/Templates/Structure/SearchModal.html", {
                name: name,
                ajaxContentAdded: function (element) {
                    var StructureModal = require("modals/search-structures");
                    var modal = new StructureModal({
                        popup: element,
                        tabModal: tabModal,
                        handler: {
                            onSelected: function (guid, name) {
                                $(element).modal("hide");
                                _.addParent({ Text: name, Value: guid });
                                _.updateParents();
                                _.model.Parent(guid);
                            }
                        }
                    });
                    ko.applyBindings(modal, element);
                }
            });
        };
        Search.prototype.loadPage = function () {
            var _ = this;
            var filter = ko.toJS(this.filter);
            $.get("/Admin/Structure/SearchJson", filter, function (response) {
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
        Search.prototype.selectClicked = function (item) {
            this.handler.onSelected(item.Entity.Guid, item.Entity.Name);
        };
        Search.prototype.submitClicked = function () {
            this.loadPage();
        };
        Search.prototype.clearClicked = function () {
            this.clear();
            this.loadPage();
        };
        Search.prototype.clear = function () {
            this.filter.Guid(null);
            this.filter.Name(null);
            this.filter.Parent(null);
            this.filter.Agent(null);

            this.filter.Order(null);
            this.filter.PageRows(null);
            this.filter.Page(null);
            this.filter.Direction("Ascending");
        };
        return Search;
    })();

    return Search;
}));
(function (factory) {
    define("modals/search-lexicons", ["knockout", "jquery", "pubsub", "app/helpers"], factory);
}(function (ko, $, pubsub, Helper) {

    var setList = Helper.setList;

    var QuickAdd = (function () {
        function QuickAdd(cons) {
            this.popup = cons.popup;
            this.model = {
                Entity: {
                    Name: ko.observable(),
                },
                AssociatedAgent: ko.observable(),
                Parent: ko.observable()
            };
            this.list = {
                Parents: ko.observableArray([]),
                Agents: ko.observableArray([])
            };
            this.handler = {
                onSelected: cons.handler.onSelected
            };
        }
        QuickAdd.prototype.setLists = function (list) {
            setList(this.model.Parent, this.list.Parents, list.Parents);
            setList(this.model.AssociatedAgent, this.list.Agents, list.Agents);
        };
        QuickAdd.prototype.clearClicked = function () {
            this.model.Entity.Name(null);
            this.model.Parent(null);
            this.model.AssociatedAgent(null);
        };
        QuickAdd.prototype.submitClicked = function () {
            this.save();
        };
        QuickAdd.prototype.cancelClicked = function () {
            this.cancel();
        };
        QuickAdd.prototype.cancel = function () {
            $(this.popup).modal("hide");
        };
        QuickAdd.prototype.save = function () {
            var _ = this;
            var data = ko.toJS(this.model);
            $.post("/Admin/Lexicon/QuickAdd", data)
                .done(function (response) {
                    console.log("response", response);
                    if (!response.Success) {
                        return;
                    }
                    _.handler.onSelected(response.Data.Guid);
                });
        };
        return QuickAdd;
    })();

    var Search = (function () {
        function Search(cons) {
            cons.filter = cons.filter || {};
            cons.list = cons.list || {};
            this.results = ko.observableArray([]);
            this.popup = cons.popup;
            this.isModal = cons.isModal;
            this.filter = {
                Guid: ko.observable(cons.filter.Guid),
                Name: ko.observable(cons.filter.Name),
                Lexeme: ko.observable(cons.filter.Lexeme),
                AssociatedAgent: ko.observable(cons.filter.AssociatedAgent),
                Parent: ko.observable(cons.filter.Parent),

                Page: ko.observable(cons.filter.Page || 1),
                PageRows: ko.observable(cons.filter.PageRows),
                Order: ko.observable(cons.filter.Order || "ByName"),
                Direction: ko.observable(cons.filter.Direction || "Ascending"),
            };
            this.list = {
                Agents: ko.observableArray(cons.list.Agents),
                Parents: ko.observableArray(cons.list.Parents),

                SortOptions: ko.observableArray(cons.list.SortOptions),
                PageRows: ko.observableArray(this.isModal ? [5, 10, 20] : [20, 40, 60, 80, 100]),
                Directions: ko.observableArray(cons.list.Directions),
                Pages: ko.observableArray([1]),
            };
            this.handler = {
                onSelected: cons.handler.onSelected
            }
            this.start();
        }
        Search.prototype.start = function () {
            this.loadPage();
        };
        Search.prototype.toDate = function (json) {
            return new Date(json.match(/\d+/)[0] * 1);
        };
        Search.prototype.setLists = function (list) {
            setList(this.filter.AssociatedAgent, this.list.Agents, list.Agents);
            setList(this.filter.Parent, this.list.Parents, list.Parents);

            setList(this.filter.Page, this.list.Pages, list.Pages);
            setList(this.filter.Order, this.list.SortOptions, list.SortOptions);
            setList(this.filter.Direction, this.list.Directions, list.Directions);
        };
        Search.prototype.loadPage = function () {
            var _ = this;
            var filter = ko.toJS(this.filter);
            $.get("/Admin/Lexicon/SearchJson", filter, function (response) {
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
            this.filter.Lexeme(null);
            this.filter.AssociatedAgent(null);
            this.filter.Parent(null);

            this.filter.Order(null);
            this.filter.PageRows(null);
            this.filter.Page(null);
            this.filter.Direction("Ascending");
        };
        return Search;
    })();

    var Modal = (function () {
        function Modal(cons) {
            this.popup = cons.popup;
            this.currentTab = ko.observable(cons.currentTab || "search");
            this.tab = {
                quickAdd: new QuickAdd({
                    popup: cons.popup,
                    handler: cons.handler
                }),
                search: new Search({
                    popup: cons.popup,
                    isModal: cons.isModal,
                    handler: cons.handler
                })
            };
            this.isModal = cons.mode == "modal";
            this.setupEventHandlers();
            this.start();
        }
        Modal.prototype.tabClicked = function (tab) {
            this.currentTab(tab);
        };
        Modal.prototype.start = function () {
            this.loadLists();
        };
        Modal.prototype.setupEventHandlers = function () {
            var _ = this;
            pubsub.subscribe("Lexicon/Cancelled", function () {
                _.close();
            });
        };
        Modal.prototype.loadLists = function () {
            var _ = this;
            $.get("/Admin/Lexicon/SearchModalLists", null, function (response) {
                console.log("response", response);
                if (!response.Success) {
                    return;
                }
                var data = response.Data;
                _.tab.search.setLists(data)
                _.tab.quickAdd.setLists(data);
            });
        };
        Modal.prototype.closeClicked = function () {
            this.close();
        };
        Modal.prototype.close = function () {
            $(this.popup).modal("hide");
        };
        return Modal;
    })();

    return Modal;
}));
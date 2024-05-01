(function (factory) {
    define("parts/concept-search", ["knockout", "jquery", "app/helpers"], factory);
}(function (ko, $, Helper) {

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
                ChildrenOf: ko.observable(cons.filter.ChildrenOf),
                ChildrenOfCode: ko.observable(cons.filter.ChildrenOfCode),

                Page: ko.observable(cons.filter.Page || 1),
                PageRows: ko.observable(cons.filter.PageRows || 5),
                Order: ko.observable(cons.filter.Order || "ByName"),
                Direction: ko.observable(cons.filter.Direction || "Ascending")
            };
            this.list = {
                Ancestors: ko.observableArray([]),
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
            this.updateAncestors();
        };
        Search.prototype.updateAncestors = function () {
            var list = JSON.parse(sessionStorage.getItem("selected/concepts")) || [];
            list.splice(0, 0, emptyItem);
            this.list.Ancestors(list);
        };
        Search.prototype.addAncestor = function (item) {
            addToList("selected/concepts", item);
        };
        Search.prototype.searchAncestorClicked = function () {
            this.loadAncestors("Find Ancestor (Concept)", "search");
        };
        Search.prototype.loadAncestors = function (name, tabModal) {
            var _ = this;
            openModal("/Static/Templates/Concept/SearchModal.html", {
                name: name,
                ajaxContentAdded: function (element) {
                    var ConceptModal = require("modals/search-concepts");
                    var modal = new ConceptModal({
                        popup: element,
                        tabModal: tabModal,
                        handler: {
                            onSelected: function (guid, name) {
                                $(element).modal("hide");
                                _.addAncestor({ Text: name, Value: guid });
                                _.updateAncestors();
                                _.model.ChildrenOf(guid);
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
            $.get("/Admin/Concept/SearchJson", filter, function (response) {
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
            this.filter.ChildrenOf(null);
            this.filter.Order(null);
            this.filter.PageRows(null);
            this.filter.Page(null);
            this.filter.Direction("Ascending");
        };
        return Search;
    })();

    return Search;
}));
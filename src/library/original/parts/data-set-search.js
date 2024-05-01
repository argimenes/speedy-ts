(function (factory) {
    define("parts/data-set-search", ["knockout", "jquery", "app/helpers", "modals/search-data-sets"], factory);
}(function (ko, $, Helpers, DataSetModal) {

    var addToList = Helpers.storeItemInList;
    var openModal = Helpers.openModal;
    var emptyItem = Helpers.emptyItem;

    var Search = (function () {
        function Search(cons) {
            this.popup = cons.popup;
            this.results = ko.observableArray([]);
            this.handler = cons.handler;
            this.filter = {
                Guid: ko.observable(cons.filter.Guid),
                Name: ko.observable(cons.filter.Value),
                Parent: ko.observable(cons.filter.DataSet),

                Page: ko.observable(cons.filter.Page || 1),
                PageRows: ko.observable(cons.filter.PageRows || 5),
                Order: ko.observable(cons.filter.Order || "ByName"),
                Direction: ko.observable(cons.filter.Direction || "Ascending")
            };
            cons.list = cons.list || {};
            this.list = {
                Parents: ko.observableArray([]),

                Pages: ko.observableArray([1]),
                PageRows: ko.observableArray(cons.list.PageRows || [5, 10, 20]),
                SortOptions: ko.observableArray(cons.list.SortOptions),
                Directions: ko.observableArray(cons.list.Directions),
            };
            this.start();
        }
        Search.prototype.setLists = function (data) {
            this.list.SortOptions(data.SortOptions);
            this.list.Directions(data.Directions);
            this.updateDataSets();
        };
        Search.prototype.updateDataSets = function () {
            var list = JSON.parse(sessionStorage.getItem("selected/data-sets")) || [];
            list.splice(0, 0, emptyItem);
            this.list.Parents(list);
        };
        Search.prototype.addDataSet = function (item) {
            addToList("selected/data-sets", item);
        };
        Search.prototype.searchDataSetClicked = function () {
            var _ = this;
            openModal("/Static/Templates/DataSet/SearchModal.html", {
                name: "Find Data Set",
                ajaxContentAdded: function (element) {
                    var DataSetModal = require("modals/search-data-sets");
                    var Search = new DataSetModal({
                        popup: element,
                        tabSearch: "search",
                        handler: {
                            onSelected: function (guid, name) {
                                $(element).modal("hide");
                                _.addDataSet({ Text: name, Value: guid });
                                _.updateDataSets();
                                _.filter.Parent(guid);
                            }
                        }
                    });
                    ko.applyBindings(Search, element);
                    Search.start();
                }
            });
        };
        Search.prototype.start = function () {
            this.loadPage();
        };
        Search.prototype.toDate = function (json) {
            return new Date(json.match(/\d+/)[0] * 1);
        };
        Search.prototype.loadPage = function () {
            var _ = this;
            var filter = ko.toJS(this.filter);
            $.get("/Admin/DataSet/SearchJson", filter, function (response) {
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
        Search.prototype.closeClicked = function () {
            $(this.popup).modal("hide");
        };
        Search.prototype.clear = function () {
            this.filter.Guid(null);
            this.filter.Name(null);
            this.filter.Parent(null);

            this.filter.Order(null);
            this.filter.PageRows(null);
            this.filter.Page(null);
            this.filter.Direction("Ascending");
        };
        return Search;
    })();

    return Search;
}));
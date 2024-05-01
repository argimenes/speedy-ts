(function (factory) {
    define("parts/data-point-search", ["knockout", "jquery", "app/helpers", "app/utils", "modals/search-data-sets"], factory);
}(function (ko, $, Helpers, Utils, DataSetModal) {

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
                Value: ko.observable(cons.filter.Value),
                DataSet: ko.observable(cons.filter.DataSet),
                Unit: ko.observable(cons.filter.Unit),

                Page: ko.observable(cons.filter.Page || 1),
                PageRows: ko.observable(cons.filter.PageRows || 5),
                Order: ko.observable(cons.filter.Order || "ByName"),
                Direction: ko.observable(cons.filter.Direction || "Ascending")
            };
            cons.list = cons.list || {};
            this.list = {
                DataSets: ko.observableArray(cons.list.DataSets),
                Units: ko.observableArray(cons.list.Units),
                SortOptions: ko.observableArray(cons.list.SortOptions),
                PageRows: ko.observableArray([5, 10, 20]),
                Directions: ko.observableArray(cons.list.Directions),
                Pages: ko.observableArray([1]),
            };
            this.start();
        }
        Search.prototype.setLists = function (data) {
            this.list.Units(data.Units);
            this.list.SortOptions(data.SortOptions);
            this.list.Directions(data.Directions);
            this.updateDataSets();
        };
        Search.prototype.updateDataSets = function () {
            var list = JSON.parse(sessionStorage.getItem("selected/data-sets")) || [];
            list.splice(0, 0, emptyItem);
            this.list.DataSets(list);
        };
        Search.prototype.addDataSet = function (item) {
            addToList("selected/data-sets", item);
        };
        Search.prototype.searchDataSetClicked = function () {
            var _ = this;
            openModal("/Static/Templates/DataSet/SearchModal.html", {
                name: "Find Data Set",
                ajaxContentAdded: function (element) {
                    var Search = new DataSetModal({
                        popup: element,
                        tabSearch: "search",
                        handler: {
                            onSelected: function (guid, name) {
                                $(element).modal("hide");
                                _.addDataSet({ Text: name, Value: guid });
                                _.updateDataSets();
                                _.filter.DataSet(guid);
                            }
                        }
                    });
                    ko.applyBindings(Search, element);
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
            $.get("/Admin/DataPoint/SearchJson", filter, function (response) {
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
            var name = "{value} {unit} ({dataset})".fmt({ value: item.Entity.Value, unit: item.Unit.Name, dataset: item.DataSet.length ? item.DataSet[0].Name : "<none>" });
            this.handler.onSelected(item.Entity.Guid, name);
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
            this.filter.Value(null);
            this.filter.DataSet(null);
            this.filter.Unit(null);
            this.filter.Order(null);
            this.filter.PageRows(null);
            this.filter.Page(null);
            this.filter.Direction("Ascending");
        };
        return Search;
    })();

    return Search;
}));
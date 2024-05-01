(function (factory) {
    define("parts/place-search", ["knockout", "jquery", "app/utils", "pubsub"], factory);
}(function (ko, $, utils, pubsub) {


    var Search = (function () {
        function Search(cons) {
            this.results = ko.observableArray([]);
            this.handler = cons.handler;
            this.filter = {
                Guid: ko.observable(cons.filter.Guid),
                Name: ko.observable(cons.filter.Name),
                Container: ko.observable(cons.filter.Container),

                Page: ko.observable(cons.filter.Page || 1),
                PageRows: ko.observable(cons.filter.PageRows || 5),
                Order: ko.observable(cons.filter.Order || "ByName"),
                Direction: ko.observable(cons.filter.Direction || "Ascending")
            };
            cons.list = cons.list || {};
            this.list = {
                Containers: ko.observableArray(cons.list.Containers),
                Types: ko.observableArray(cons.list.Types),

                SortOptions: ko.observableArray(cons.list.SortOptions),
                Records: ko.observableArray([5, 10, 20]),
                Directions: ko.observableArray(cons.list.Directions),
                Pages: ko.observableArray([1]),
            };
            this.start();
        }
        Search.prototype.start = function () {
            this.loadPage();
        };
        Search.prototype.toDate = function (json) {
            return new Date(json.match(/\d+/)[0] * 1);
        };
        Search.prototype.loadPage = function () {
            var _ = this;
            var filter = ko.toJS(this.filter);
            $.get("/Admin/Place/SearchJson", filter, function (response) {
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
            this.handler.closeClicked();
        };
        Search.prototype.clear = function () {
            this.filter.Guid(null);
            this.filter.Name(null);
            this.filter.Container(null);
            this.filter.Type(null);

            this.filter.Order(null);
            this.filter.PageRows(null);
            this.filter.Page(null);
            this.filter.Direction("Ascending");
        };
        return Search;
    })();

    return Search;

}));
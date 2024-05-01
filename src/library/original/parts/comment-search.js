(function (factory) {
    define("parts/comment-search", ["knockout", "jquery"], factory);
}(function (ko, $) {

    var Search = (function () {
        function Search(cons) {
            this.root = cons.root;
            this.results = ko.observableArray([]);
            this.handler = cons.handler;
            this.filter = {
                Guid: ko.observable(cons.filter.Guid),
                StandoffPropertyGuid: ko.observable(cons.filter.StandoffPropertyGuid),
                UserGuid: ko.observable(cons.filter.UserGuid),

                Order: ko.observable(cons.filter.UserGuid),
                PageRows: ko.observable(cons.filter.PageRows),
                Page: ko.observable(cons.filter.Page),
                Direction: ko.observable(cons.filter.Direction)
            };
            cons.list = cons.list || {};
            this.list = {
                Users: ko.observableArray(cons.list.Users),
                SortOptions: ko.observableArray(cons.list.SortOptions),
                Records: ko.observableArray([5, 10, 20]),
                Directions: ko.observableArray(cons.list.Directions),
                Pages: ko.observableArray([1]),
            };
        }
        Search.prototype.start = function () {
            this.loadPage();
        };
        Search.prototype.toDate = function (json) {
            return new Date(json.match(/\d+/)[0] * 1);
        };
        Search.prototype.setLists = function (data) {
            this.list.Users(data.Users);
            this.list.SortOptions(data.SortOptions);
            this.list.Directions(data.Directions);
        };
        Search.prototype.loadPage = function () {
            var _ = this;
            var filter = ko.toJS(this.filter);
            $.get("/Admin/Comment/SearchJson", filter, function (response) {
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
            this.handler.onSelected(item.Entity.Guid);
        };
        Search.prototype.submitClicked = function () {
            this.loadPage();
        };
        Search.prototype.clearClicked = function () {
            this.clear();
            this.loadPage();
        };
        Search.prototype.closeClicked = function () {
            this.root.close();
        };
        Search.prototype.clear = function () {
            this.filter.Guid(null);
            this.filter.StandoffPropertyGuid(null);
            this.filter.UserGuid(null);
            this.filter.Order(null);
            this.filter.PageRows(null);
            this.filter.Page(null);
            this.filter.Direction("Ascending");
        };
        return Search;
    })();

    return Search;
}));
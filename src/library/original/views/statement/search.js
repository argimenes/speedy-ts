(function (factory) {
    define(["knockout", "jquery"], factory);
}(function (ko, $) {

    var Model = (function () {
        function Model(cons) {
            cons.filter = cons.filter || {};
            cons.list = cons.list || {};
            this.results = ko.observableArray([]);
            this.filter = {
                Name: ko.observable(cons.filter.Name),
                Section: ko.observable(cons.filter.Section),
                Type: ko.observable(cons.filter.Type),
                Page: ko.observable(cons.filter.Page || 1),
                PageRows: ko.observable(cons.filter.PageRows || 20),
                Order: ko.observable(cons.filter.Order || "ByName"),
                Direction: ko.observable(cons.filter.Direction || "Ascending"),
                IsDeleted: ko.observable(cons.filter.IsDeleted),
            };
            this.list = {
                Sections: ko.observableArray(cons.list.Sections),
                SortOptions: ko.observableArray(cons.list.SortOptions),
                Records: ko.observableArray(cons.list.Records),
                Directions: ko.observableArray(cons.list.Directions),
                IsDeleted: ko.observableArray(cons.list.IsDeleted),
                Pages: ko.observableArray(cons.list.Pages),
                Types: ko.observableArray(cons.list.Types),
            };
        }
        Model.prototype.start = function () {
            this.loadPage();
        };
        Model.prototype.toTextType = function (index) {
            switch (index) {
                case 0: return "Body";
                case 1: return "Footnote";
                case 2: return "Endnote";
                case 3: return "MarginNote";
                case 4: return "Annotation";
                case 5: return "StandoffPropertyComment";
                default: return null;
            }
        };
        Model.prototype.toDate = function (json) {
            return new Date(json.match(/\d+/)[0] * 1);
        };
        Model.prototype.loadPage = function () {
            var _ = this;
            var filter = ko.toJS(this.filter);
            $.get("/Admin/Text/SearchJson", filter, function (response) {
                console.log("response", response);
                if (!response.Success) {
                    return;
                }
                _.results(response.Data.Results);
            });
        };
        Model.prototype.applyBindings = function (id) {
            ko.applyBindings(this, document.getElementById(id));
        };
        Model.prototype.viewClicked = function (item) {
            window.location.href = "/Admin/Text/Index/" + item.Entity.Guid;
        };
        Model.prototype.submitClicked = function () {
            this.loadPage();
        };
        Model.prototype.clearClicked = function () {
            this.clear();
            this.loadPage();
        };
        Model.prototype.clear = function () {
            this.filter.Name(null);
            this.filter.Type(null);
            this.filter.Order(null);
            this.filter.PageRows(null);
            this.filter.Page(null);
            this.filter.Section(null);
            this.filter.Direction(null);
            this.filter.IsDeleted(null);
        };
        Model.prototype.deleteClicked = function (item) {
            var _ = this;
            var data = {
                id: item.Entity.Guid
            };
            $.get("/Admin/Text/DeleteJson", data, function (response) {
                if (!response.Success) {
                    return;
                }
                _.loadPage();
            });
        };
        Model.prototype.undeleteClicked = function (item) {
            var _ = this;
            var data = {
                id: item.Entity.Guid
            };
            $.get("/Admin/Text/UndeleteJson", data, function (response) {
                if (!response.Success) {
                    return;
                }
                _.loadPage();
            });
        };
        return Model;
        })();

    return Model;

}));
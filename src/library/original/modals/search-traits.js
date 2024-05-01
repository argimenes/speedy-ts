(function (factory) {
    define("modals/search-traits", ["knockout", "jquery", "parts/trait-add"], factory);
}(function (ko, $, AddTrait) {

    var Search = (function () {
        function Search(cons) {
            cons.filter = cons.filter || {};
            cons.list = cons.list || {};
            this.popup = cons.popup;
            this.results = ko.observableArray([]);
            this.total = ko.observable();
            this.filter = {
                Guid: ko.observable(cons.filter.Guid),
                AgentGuid: ko.observable(cons.filter.AgentGuid),
                ClaimRole: ko.observable("Trait"),
                TextGuid: ko.observable(cons.filter.TextGuid),
                Trait: ko.observable(cons.filter.ClaimRole),
                Section: ko.observable(cons.filter.Section),

                Page: ko.observable(cons.filter.Page || 1),
                PageRows: ko.observable(cons.filter.PageRows),
                Order: ko.observable(cons.filter.Order || "ByName"),
                Direction: ko.observable(cons.filter.Direction || "Ascending"),
            };
            this.list = {
                Sections: ko.observableArray(cons.list.Sections),
                Traits: ko.observableArray(cons.list.Traits),

                SortOptions: ko.observableArray(cons.list.SortOptions),
                Records: ko.observableArray(cons.list.Records || [5, 10, 20]),
                Directions: ko.observableArray(cons.list.Directions),
                Pages: ko.observableArray([1])
            };
            this.handler = {
                onSelected: cons.handler.onSelected,
                closeClicked: cons.handler.closeClicked
            };
            this.setupEventHandlers();
        }        
        Search.prototype.dateAdded = function (item) {
            var date = this.toDate(item.Entity.DateAddedUTC);
            return "{yyyy}/{MM}/{dd}".fmt({ yyyy: date.getFullYear(), MM: date.getMonth() + 1, dd: date.getDate() });
        };
        Search.prototype.subjectName = function (item) {
            var subject = item.ActedOnBy.find(function (x) {
                return x.Relation.AgentRole == 0;
            });
            return subject ? "(Subject) " + subject.Target.Name : null;
        };
        Search.prototype.nonSubjects = function (item) {
            return item.ActedOnBy.filter(function (x) {
                return x.Relation.AgentRole != 0;
            });
        };
        Search.prototype.agentRole = function (item) {
            switch (item.Relation.AgentRole) {
                case 0: return "Subject";
                case 1: return "Object";
                case 2: return "With";
                case 3: return "By";
                case 4: return "At";
                case 5: return "From";
                case 6: return "Of";
                case 7: return "To";
                case 8: return "As";
                case 9: return "In";
                case 10: return "On";
                case 11: return "About";
                case 12: return "Under";
                case 13: return "According To";
                default: return "Unknown";
            }
        };
        Search.prototype.setupEventHandlers = function () {

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
            $.get("/Admin/Claim/SearchJson", filter, function (response) {
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
                _.total(response.Data.Count);
            });
        };
        Search.prototype.selectClicked = function (item) {
            this.selected(item.Entity.Guid);
        };
        Search.prototype.selected = function (guid) {
            this.handler.onSelected(guid);
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
            $(this.popup).modal("hide");
        };
        Search.prototype.clear = function () {
            this.filter.Guid(null);
            this.filter.ClaimRole(null);
            this.filter.Order(null);
            this.filter.PageRows(null);
            this.filter.Page(null);
            this.filter.Section(null);
            this.filter.Direction("Ascending");
        };
        return Search;
    })();

    var Modal = (function () {
        function Modal(cons) {
            this.prepare(cons);
            this.popup = cons.popup;
            this.currentTab = ko.observable(cons.currentTab || "search");
            this.tabMode = ko.observable(cons.tabMode || "search");
            this.tabs = ko.observableArray(cons.tabs || ["search", "quickAdd"]);
            this.tab = {
                search: new Search({
                    popup: cons.popup,
                    handler: cons.handler,
                    filter: cons.tab.search.filter
                }),
                quickAdd: new AddTrait({
                    popup: cons.popup,
                    handler: cons.handler,
                    model: cons.tab.quickAdd.model
                })
            };
            this.handler = {
                onSelected: cons.handler.onSelected
            };
            this.fade = false;
            this.setupEventHandlers();
            this.start(cons);
        }
        Modal.prototype.fadeClicked = function () {
            this.fade = !this.fade;
            if (this.fade) {
                $(".modal").css("opacity", "0.3");
                $(".modal-backdrop").hide();
            }
            else {
                $(".modal").css("opacity", "1");
                $(".modal-backdrop").show();
            }
        };
        Modal.prototype.prepare = function (cons) {
            cons = cons || {};
            cons.list = cons.list || {};
            cons.handler = cons.handler || {};
            cons.tab = cons.tab || {};
            cons.tab.search = cons.tab.search || {};
            cons.tab.quickAdd = cons.tab.quickAdd || {};
            cons.tab.quickAdd.model = cons.tab.quickAdd.model || {};
            cons.tab.quickAdd.model.Entity = cons.tab.quickAdd.model.Entity || {};
        };
        Modal.prototype.setupEventHandlers = function () {

        };
        Modal.prototype.tabClicked = function (tab) {
            this.currentTab(tab);
        };
        Modal.prototype.start = function (cons) {
            var _this = this;
            this.loadLists(function () {
                var search = _this.tab.search;
                if (cons.tab) {
                    if (cons.tab.search) {
                        if (cons.tab.search.filter) {
                            search.filter.Order(cons.tab.search.filter.Order);
                            search.filter.Direction(cons.tab.search.filter.Direction);
                        }
                    }
                }
                search.start();
            });
        };
        Modal.prototype.closeClicked = function () {
            this.close();
        };
        Modal.prototype.close = function () {
            $(this.popup).modal("hide");
        };
        Modal.prototype.isTabVisible = function (tab) {
            var _this = this;
            return ko.computed(function () {
                return _this.tabs().indexOf(tab) >= 0;
            });
        };
        Modal.prototype.loadLists = function (callback) {
            var _ = this;
            $.get("/Admin/Claim/SearchModalLists", null, function (response) {
                console.log("response", response);
                if (!response.Success) {
                    return;
                }
                var data = response.Data;
                _.tab.search.list.Sections(data.Sections);
                _.tab.search.list.SortOptions(data.SortOptions);
                _.tab.search.list.Directions(data.Directions);
                _.tab.quickAdd.setLists(data);
                _.tab.quickAdd.model.Entity.Role("Trait");
                if (callback) {
                    callback();
                }
            });
            $.get("/Admin/Time/SearchModalLists", null, function (response) {
                console.log("response", response);
                if (!response.Success) {
                    return;
                }
                var data = response.Data;
                _.tab.quickAdd.setLists(data);
                _.tab.quickAdd.model.Time.Target.Around("On");
            });
        };
        Modal.prototype.close = function () {
            this.handler.closeClicked();
        };
        return Modal;
    })();

    return Modal;
}));
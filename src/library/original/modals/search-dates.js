(function (factory) {
    define("modals/search-dates", ["knockout", "jquery", "pubsub"], factory);
}(function (ko, $, pubsub) {

    var QuickAdd = (function () {
        function QuickAdd(cons) {
            this.model = {
                AgentType: ko.observable("Person"),
                Name: ko.observable()
            };
            this.list = {
                AgentTypes: ko.observableArray([])
            };
            this.handler = cons.handler;
        }
        QuickAdd.prototype.setAgentTypes = function (list) {
            this.list.AgentTypes(list);
            this.model.AgentType("Person");
        };
        QuickAdd.prototype.clearClicked = function () {
            this.model.AgentType(null);
            this.model.Name(null);
        };
        QuickAdd.prototype.submitClicked = function () {
            this.save();
        };
        QuickAdd.prototype.cancelClicked = function () {
            this.cancel();
        };
        QuickAdd.prototype.cancel = function () {
            this.publish("QuickAdd/Cancelled");
        };
        QuickAdd.prototype.save = function () {
            var _ = this;
            var data = ko.toJS(this.model);
            data.QuickAdd = true;
            $.post("/Admin/Agent/QuickAdd", data)
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

    var Modal = (function () {
        function Modal(cons) {
            cons.filter = cons.filter || {};
            cons.list = cons.list || {};
            this.popup = cons.popup;
            this.results = ko.observableArray([]);
            this.tab = {
                quickAdd: new QuickAdd({
                    handler: {
                        onSelected: cons.handler.onSelected
                    }
                })
            };
            this.filter = {
                Guid: ko.observable(cons.filter.Guid),
                AgentType: ko.observable(cons.filter.AgentType),
                Name: ko.observable(cons.filter.Name),
                Section: ko.observable(cons.filter.Section),
                Page: ko.observable(cons.filter.Page || 1),
                PageRows: ko.observable(cons.filter.PageRows),
                Order: ko.observable(cons.filter.Order || "ByName"),
                Direction: ko.observable(cons.filter.Direction || "Ascending"),
                IsDeleted: ko.observable(cons.filter.IsDeleted),
                Type: ko.observable(cons.filter.Type),
            };
            this.list = {
                Sections: ko.observableArray(cons.list.Sections),
                SortOptions: ko.observableArray(cons.list.SortOptions),
                Records: ko.observableArray([5, 10, 20]),
                Directions: ko.observableArray(cons.list.Directions),
                IsDeleted: ko.observableArray(cons.list.IsDeleted),
                AgentTypes: ko.observableArray(cons.list.AgentTypes),
                Types: ko.observableArray(cons.list.Types),
                Pages: ko.observableArray([1]),
            };
            this.handler = {
                onSelected: cons.handler.onSelected
            }
            this.setupEventHandlers();
        }
        Modal.prototype.agentTypeText = function (item) {
            switch (item.Entity.AgentType) {
                case 0: return "Person";
                case 1: return "Collective";
                case 2: return "Object";
                case 3: return "Artefact";
                default: return "Unknown";
            }
        };
        Modal.prototype.setupEventHandlers = function () {
            var _ = this;
            pubsub.subscribe("QuickAdd/Saved", function (__, guid) {
                _.selected(guid);
            });
            pubsub.subscribe("QuickAdd/Cancelled", function () {
                _.close();
            });
        };
        Modal.prototype.start = function () {
            this.loadLists();
            this.loadPage();
        };
        Modal.prototype.toDate = function (json) {
            return new Date(json.match(/\d+/)[0] * 1);
        };
        Modal.prototype.loadLists = function () {
            var _ = this;
            $.get("/Admin/Agent/SearchModalLists", null, function (response) {
                console.log("response", response);
                if (!response.Success) {
                    return;
                }
                var data = response.Data;
                _.list.Sections(data.Sections);
                _.list.SortOptions(data.SortOptions);
                _.list.Directions(data.Directions);
                _.list.AgentTypes(data.AgentTypes);
                _.list.Types(data.Types);
                _.list.IsDeleted(data.YesNos);

                _.tab.quickAdd.setAgentTypes(data.AgentTypes);
            });
        };
        Modal.prototype.loadPage = function () {
            var _ = this;
            var filter = ko.toJS(this.filter);
            $.get("/Admin/Agent/SearchJson", filter, function (response) {
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
        Modal.prototype.selectClicked = function (item) {
            this.selected(item.Entity.Guid);
        };
        Modal.prototype.selected = function (guid) {
            this.handler.onSelected(guid);
        };
        Modal.prototype.submitClicked = function () {
            this.loadPage();
        };
        Modal.prototype.clearClicked = function () {
            this.clear();
            this.loadPage();
        };
        Modal.prototype.closeClicked = function () {
            this.close();
        };
        Modal.prototype.close = function () {
            $(this.popup).modal("hide");
        };
        Modal.prototype.clear = function () {
            this.filter.Guid(null);
            this.filter.Type(null);
            this.filter.AgentType(null);
            this.filter.Name(null);
            this.filter.Order(null);
            this.filter.PageRows(null);
            this.filter.Page(null);
            this.filter.Section(null);
            this.filter.Direction("Ascending");
            this.filter.IsDeleted(null);
        };
        return Modal;
    })();

    return Modal;
}));
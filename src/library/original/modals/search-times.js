(function (factory) {
    define("modals/search-times", ["knockout", "jquery", "pubsub"], factory);
}(function (ko, $, pubsub) {

    var QuickAdd = (function () {
        function QuickAdd(cons) {
            this.model = {
                Around: ko.observable(),
                Season: ko.observable(),
                Section: ko.observable(),
                Year: ko.observable(),
                Month: ko.observable(),
                Day: ko.observable(),
                Hour: ko.observable(),
                Minute: ko.observable(),
                Second: ko.observable(),
            };
            this.list = {
                Around: ko.observableArray([]),
                Months: ko.observableArray([]),
                Seasons: ko.observableArray([]),
                Sections: ko.observableArray([])
            };
            this.handler = cons.handler;
        }
        QuickAdd.prototype.setLists = function (list) {
            this.list.Months(list.Months);
            this.list.Around(list.Around);
            this.list.Sections(list.Sections);
            this.list.Seasons(list.Seasons);
        };
        QuickAdd.prototype.clearClicked = function () {
            this.model.Around(null);
            this.model.Section(null);
            this.model.Season(null);
            this.model.Year(null);
            this.model.Month(null);
            this.model.Day(null);
            this.model.Hour(null);
            this.model.Minute(null);
            this.model.Second(null);
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
            $.post("/Admin/Time/QuickAdd", data)
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
            this.tab = {
                quickAdd: new QuickAdd({
                    handler: {
                        onSelected: cons.handler.onSelected
                    }
                })
            };
            this.handler = {
                onSelected: cons.handler.onSelected
            }
            this.setupEventHandlers();
            this.start();
        }
        Modal.prototype.setupEventHandlers = function () {
            var _ = this;
            pubsub.subscribe("QuickAdd/Saved", function (__, guid) {
                _.selected(guid);
            });
            pubsub.subscribe("QuickAdd/Cancelled", function () {
                _.close();
            });
        };
        Modal.prototype.selected = function (guid) {
            this.handler.onSelected(guid);
        };
        Modal.prototype.start = function () {
            this.loadLists();
        };
        Modal.prototype.loadLists = function () {
            var _ = this;
            $.get("/Admin/Time/SearchModalLists", null, function (response) {
                console.log("response", response);
                if (!response.Success) {
                    return;
                }
                _.tab.quickAdd.setLists(response.Data);
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
(function (factory) {
    define("modals/search-comments", ["parts/comment-search", "knockout", "jquery", "pubsub", "bootstrap"], factory);
}(function (Search, ko, $, pubsub) {

    //
    // This ensures that tooltips are applied to all targets, whether or not they are dynamically created.
    //
    $("body").tooltip({
        selector: '[data-toggle="tooltip"]'
    });

    var Modal = (function () {
        function Modal(cons) {
            cons.filter = cons.filter || {};
            this.popup = cons.popup;
            this.currentTab = ko.observable("search");
            this.tabMode = ko.observable(cons.tabMode); // Setting this means that only the tab in @tabMode will be accessible.
            cons.tab = cons.tab || {};
            cons.tab.quickAdd = cons.tab.quickAdd || {};
            cons.tab.search = cons.tab.search || {};
            cons.tab.search.filter = cons.tab.search.filter || {};
            var QuickAdd = require("parts/text-add");
            this.tab = {
                search: new Search({
                    root: this,
                    filter: {
                        StandoffPropertyGuid: cons.tab.search.filter.StandoffPropertyGuid
                    },
                    handler: cons.handler
                }),
                quickAdd: new QuickAdd({
                    popup: cons.popup,
                    model: cons.tab.quickAdd.model,
                    handler: cons.handler
                })
            };
            cons.handler = cons.handler || {};
            this.handler = {
                onSelected: cons.handler.onSelected
            }
            this.setupEventHandlers();
            if (this.tabMode()) {
                this.currentTab(this.tabMode());
            }
        }
        Modal.prototype.start = function () {
            this.tab.search.start();
        };
        Modal.prototype.loadLists = function () {
            var _ = this;
            $.get("/Admin/Comment/SearchModalLists", null, function (response) {
                console.log("response", response);
                if (!response.Success) {
                    return;
                }
                var data = response.Data;
                _.tab.search.setLists(data);
            });
        };
        Modal.prototype.isTabVisible = function (tab) {
            return !this.tabMode() || this.tabMode() == tab;
        };
        Modal.prototype.tabClicked = function (tab) {
            this.currentTab(tab);
        };
        Modal.prototype.setupEventHandlers = function () {
            var _ = this;
            pubsub.subscribe("StatementSelected", function (__, guid) {
                _.selected(guid);
            });
            pubsub.subscribe("CloseModal", function () {
                _.close();
            });
        };
        Modal.prototype.closeClicked = function () {
            this.close();
        };
        Modal.prototype.close = function () {
            $(this.popup).modal("hide");
        };
        Modal.prototype.selected = function (guid) {
            this.handler.onSelected(guid);
        };
        return Modal;
    })();

    return Modal;
}));
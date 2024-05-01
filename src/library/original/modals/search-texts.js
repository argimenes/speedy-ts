(function (factory) {
    define("modals/search-texts", ["parts/text-search", "parts/text-add", "knockout", "jquery", "pubsub", "bootstrap"], factory);
}(function (Search, QuickAdd, ko, $, pubsub) {

    //
    // This ensures that tooltips are applied to all targets, whether or not they are dynamically created.
    //
    $("body").tooltip({
        selector: '[data-toggle="tooltip"]'
    });

    var Modal = (function () {
        function Modal(cons) {
            var _this = this;
            cons.filter = cons.filter || {};
            this.popup = cons.popup;
            this.currentTab = ko.observable(cons.currentTab || "search");
            this.tabMode = ko.observable(cons.tabMode); // Setting this means that only the tab in @tabMode will be accessible.
            cons.tab = cons.tab || {};
            cons.tab.quickAdd = cons.tab.quickAdd || {};
            cons.tab.search = cons.tab.search || {};
            cons.tab.search.filter = cons.tab.search.filter || {};
            this.tabs = ko.observableArray(cons.tabs || ["search", "quickAdd"]);
            this.tab = {
                search: new Search({
                    popup: cons.popup,
                    filter: {
                        Guid: cons.tab.search.filter.Guid,
                        Name: cons.tab.search.filter.Name,
                        ClaimRole: ko.observable("trait"),
                        Order: cons.tab.search.filter.Order,
                        Direction: cons.tab.search.filter.Direction,
                        PageRows: 20
                    },
                    list: {
                        Records: [20, 40, 60, 80, 100]
                    },
                    handler: cons.handler
                })
            };
            if (!this.tabMode() || this.tabMode() == "quickAdd") {
                this.tab.quickAdd = new QuickAdd({
                    popup: cons.popup,
                    mode: cons.tab.quickAdd.mode,
                    model: cons.tab.quickAdd.model,
                    editor: cons.editor,
                    handler: cons.handler
                });
            }
            cons.handler = cons.handler || {};
            this.handler = cons.handler;
            this.isActiveTab = function (tab) {
                return _this.tabs.indexOf(tab) >= 0;
            };
            this.setupEventHandlers();
            if (this.tabMode()) {
                this.currentTab(this.tabMode());
            }
        }
        //Modal.prototype.isActiveTab = function (tab) {
        //    return this.tabs.indexOf(tab) >= 0;
        //};
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
        Modal.prototype.loadAllTextsClicked = function () {
            if (this.handler.loadAllTextsClicked) {
                this.handler.loadAllTextsClicked();
            }
        };
        Modal.prototype.close = function () {
            this.handler.closeClicked();
        };
        Modal.prototype.minimizeClicked = function () {
            this.handler.minimizeClicked();
        };
        Modal.prototype.selected = function (guid) {
            this.handler.onSelected(guid);
        };
        return Modal;
    })();

    return Modal;
}));
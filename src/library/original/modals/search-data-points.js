(function (factory) {
    define("modals/search-data-points", ["knockout", "jquery", "parts/data-point-add", "parts/data-point-search"], factory);
}(function (ko, $, QuickAdd, Search) {

    var Modal = (function () {
        function Modal(cons) {
            this.prepare(cons);
            this.popup = cons.popup;
            this.currentTab = ko.observable(cons.currentTab || "search");
            this.tabMode = ko.observable(cons.tabMode || "search");
            this.tab = {
                search: new Search({
                    popup: cons.popup,
                    filter: cons.tab.search.filter,
                    handler: cons.handler
                }),
                quickAdd: new QuickAdd({
                    popup: cons.popup,
                    model: cons.tab.quickAdd.model,
                    handler: cons.handler
                })
            };
            this.handler = {
                onSelected: cons.handler.onSelected
            };
            this.setup();
        }
        Modal.prototype.prepare = function (cons) {
            cons = cons || {};
            cons.tab = cons.tab || {};
            cons.tab.search = cons.tab.search || {};
            cons.tab.search.filter = cons.tab.search.filter || {};
            cons.tab.quickAdd = cons.tab.quickAdd || {};
            cons.tab.quickAdd.model = cons.tab.quickAdd.model || {};
            cons.list = cons.list || {};
        };
        Modal.prototype.setup = function () {
            this.loadLists();
        };
        Modal.prototype.tabClicked = function (tab) {
            this.currentTab(tab);
        };
        Modal.prototype.loadLists = function () {
            var _ = this;
            $.get("/Admin/DataPoint/SearchModalLists", null, function (response) {
                console.log("response", response);
                if (!response.Success) {
                    return;
                }
                var data = response.Data;
                _.tab.search.setLists(data);
                _.tab.quickAdd.setLists(data);
            });
        };
        Modal.prototype.closeClicked = function () {
            $(this.popup).modal("hide");
        };
        return Modal;
    })();

    return Modal;
}));
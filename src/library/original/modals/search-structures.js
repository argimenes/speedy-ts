(function (factory) {
    define("modals/search-structures", ["knockout", "jquery", "parts/structure-add", "parts/structure-search"], factory);
}(function (ko, $, QuickAdd, Search) {

    var Modal = (function () {
        function Modal(cons) {
            this.prepare(cons);
            this.popup = cons.popup;
            this.currentTab = ko.observable(cons.currentTab || "search");
            this.tabMode = ko.observable(cons.tabMode || "search");
            this.tab = {
                search: new Search({
                    filter: cons.tab.search.filter,
                    handler: cons.handler
                }),
                quickAdd: new QuickAdd({
                    handler: cons.handler
                })
            };
            this.handler = {
                onSelected: cons.handler.onSelected
            }
            this.setup();
        }
        Modal.prototype.prepare = function (cons) {
            cons = cons || {};
            cons.tab = cons.tab || {};
            cons.tab.search = cons.tab.search || {};
            cons.tab.quickAdd = cons.tab.quickAdd || {};
        };
        Modal.prototype.start = function () {
            
        };
        Modal.prototype.tabClicked = function (tab) {
            this.currentTab(tab);
        };
        Modal.prototype.setup = function () {
            this.loadLists();
        };
        Modal.prototype.loadLists = function () {
            var _ = this;
            $.get("/Admin/Structure/SearchModalLists", null, function (response) {
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
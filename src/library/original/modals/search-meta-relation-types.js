(function (factory) {
    define("modals/search-meta-relation-types", ["knockout", "jquery", "parts/meta-relation-type-add", "parts/meta-relation-type-search"], factory);
}(function (ko, $, QuickAdd, Search) {

    var Modal = (function () {
        function Modal(cons) {
            this.prepare(cons);
            this.popup = cons.popup;
            this.currentTab = ko.observable(cons.currentTab || "search");
            this.tabMode = ko.observable(cons.tabMode || "search");
            this.results = ko.observableArray([]);            
            this.tab = {
                search: new Search({
                    filter: cons.tab.search.filter,
                    handler: cons.handler
                }),
                quickAdd: new QuickAdd({
                    filter: cons.tab.quickAdd.filter,
                    handler: cons.handler
                })
            };
            this.handler = {
                onSelected: cons.handler.onSelected
            }
            this.start();
        }
        Modal.prototype.isTabVisible = function (tab) {
            return !this.tabMode() || this.tabMode() == tab;
        };
        Modal.prototype.tabClicked = function (tab) {
            this.currentTab(tab);
        };
        Modal.prototype.prepare = function (cons) {
            cons = cons || {};
            cons.tab = cons.tab || {};
            cons.tab.search = cons.tab.search || {};
            cons.tab.quickAdd = cons.tab.quickAdd || {};
            cons.handler = cons.handler || {};
        };
        Modal.prototype.start = function () {
            this.loadLists();
            this.tab.search.start();
        };
        Modal.prototype.loadLists = function () {
            var _ = this;
            $.get("/Admin/MetaRelationType/SearchModalLists", null, function (response) {
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
        return Modal;
    })();

    return Modal;
}));
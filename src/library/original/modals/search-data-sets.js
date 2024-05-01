(function (factory) {
    define("modals/search-data-sets", ["knockout", "jquery", "parts/data-set-add", "parts/data-set-search"], factory);
}(function (ko, $, QuickAdd, Search) {

    var Modal = (function () {
        function Modal(cons) {
            cons.filter = cons.filter || {};
            cons.list = cons.list || {};
            this.popup = cons.popup;
            this.currentTab = ko.observable(cons.currentTab || "search");
            this.tabMode = ko.observable(cons.tabMode || "search");
            this.tab = {
                search: new Search({
                    popup: cons.popup,
                    filter: {
                        Guid: cons.filter.Guid
                    },
                    handler: cons.handler
                }),
                quickAdd: new QuickAdd({
                    popup: cons.popup,
                    handler: cons.handler
                })
            };
            this.handler = {
                onSelected: cons.handler.onSelected
            };
            this.setup();
        } 
        Modal.prototype.setup = function () {
            this.loadLists();
        };
        Modal.prototype.tabClicked = function (tab) {
            this.currentTab(tab);
        };
        Modal.prototype.loadLists = function () {
            var _ = this;
            $.get("/Admin/DataSet/SearchModalLists", null, function (response) {
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
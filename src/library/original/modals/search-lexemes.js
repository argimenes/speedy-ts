(function (factory) {
    define("modals/search-lexemes", ["knockout", "jquery", "pubsub", "app/helpers", "parts/lexeme-add", "parts/lexeme-search", "bootstrap"], factory);
}(function (ko, $, pubsub, Helper, QuickAdd, Search) {

    var openModal = Helper.openModal;
    var setList = Helper.setList;

    var Modal = (function () {
        function Modal(cons) {
            this.prepare(cons);
            this.popup = cons.popup;
            this.currentTab = ko.observable("search");
            this.tabMode = ko.observable();
            this.tab = {
                quickAdd: new QuickAdd({
                    model: cons.tab.quickAdd.model,
                    handler: cons.handler
                }),
                search: new Search({
                    filter: cons.tab.search.filter,
                    list: {
                        PageRows: cons.list.PageRows
                    },
                    handler: cons.handler
                })
            };
            this.start();
        }
        Modal.prototype.prepare = function (cons) {
            cons = cons || {};
            cons.tab = cons.tab || {};
            cons.tab.filter = cons.tab.filter || {};
            cons.tab.filter.search = cons.tab.filter.search || {};
            cons.tab.filter.quickAdd = cons.tab.filter.quickAdd || {};
            cons.tab.filter.quickAdd.model = cons.tab.filter.quickAdd.model || {};
            cons.tab.filter.quickAdd.model.Entity = cons.tab.filter.quickAdd.model.Entity || {};
            cons.list = cons.list || {};
        };
        Modal.prototype.tabClicked = function (tab) {
            this.currentTab(tab);
        };
        Modal.prototype.start = function () {
            this.loadLists();
        };
        Modal.prototype.loadLists = function () {
            var _ = this;
            $.get("/Admin/Lexeme/SearchModalLists", null, function (response) {
                console.log("response", response);
                if (!response.Success) {
                    return;
                }
                var data = response.Data;
                _.tab.search.setLists(data)
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
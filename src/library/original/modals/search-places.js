(function (factory) {
    define("modals/search-places", ["knockout", "jquery", "app/utils", "pubsub", "parts/place-add", "parts/place-search"], factory);
}(function (ko, $, utils, pubsub, QuickAdd, Search) {

    var select = utils.select;
    var distinct = utils.distinct;
    var where = utils.where;

    var Modal = (function () {
        function Modal(cons) {
            var _ = this;
            cons.filter = cons.filter || {};
            cons.list = cons.list || {};
            this.popup = cons.popup;
            this.tab = {
                search: new Search({
                    filter: cons.filter,
                    handler: {
                        onSelected: cons.handler.onSelected,
                        onClose: function () {
                            _.close();
                        }
                    }
                }),
                quickAdd: new QuickAdd({
                    handler: {
                        onSelected: cons.handler.onSelected,
                        onClose: function () {
                            _.close();
                        }
                    }
                })
            };
            this.handler = {
                onSelected: cons.handler.onSelected
            }
            this.setup();
        } 
        Modal.prototype.setup = function () {
            this.loadLists();
        };
        Modal.prototype.loadLists = function () {
            var _ = this;
            $.get("/Admin/Place/SearchModalLists", null, function (response) {
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
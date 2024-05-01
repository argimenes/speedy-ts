(function (factory) {
    define("parts/data-set-add", ["knockout", "jquery", "app/helpers"], factory);
}(function (ko, $, Helpers) {

    var addToList = Helpers.storeItemInList;
    var openModal = Helpers.openModal;
    var emptyItem = Helpers.emptyItem;

    var QuickAdd = (function () {
        function QuickAdd(cons) {
            this.prepare(cons);
            this.popup = cons.popup;
            this.model = {
                Entity: {
                    Guid: cons.model.Entity.Guid,
                    Name: ko.observable(cons.model.Entity.Name),
                },
                Parent: {
                    Target: {
                        Guid: ko.observable(cons.model.Parent.Target.Guid)
                    }
                }
            };
            this.handler = cons.handler;
            this.list = {
                Parents: ko.observableArray([])
            };
        }
        QuickAdd.prototype.prepare = function (cons) {
            cons = cons || {};
            cons.model = cons.model || {};
            cons.model.Entity = cons.model.Entity || {};
            cons.model.Parent = cons.model.Parent || {};
            cons.model.Parent.Target = cons.model.Parent.Target || {};
        };
        QuickAdd.prototype.setLists = function () {
            this.updateParents();
        };
        QuickAdd.prototype.updateParents = function () {
            var list = JSON.parse(sessionStorage.getItem("selected/data-sets")) || [];
            list.splice(0, 0, emptyItem);
            this.list.Parents(list);
        };
        QuickAdd.prototype.addParent = function (item) {
            addToList("selected/data-sets", item);
        };
        QuickAdd.prototype.searchParentClicked = function () {
            var _ = this;
            openModal("/Static/Templates/DataSet/SearchModal.html", {
                name: "Find Parent (Data Set)",
                ajaxContentAdded: function (element) {
                    var DataSetModal = require("modals/search-data-sets");
                    var Search = new DataSetModal({
                        popup: element,
                        tabSearch: "search",
                        handler: {
                            onSelected: function (guid, name) {
                                $(element).modal("hide");
                                _.addParent({ Text: name, Value: guid });
                                _.updateParents();
                                _.model.Parent.Target.Guid(guid);
                                _.model.Parent.Target.Name(name);
                            }
                        }
                    });
                    ko.applyBindings(Search, element);
                }
            });
        };
        QuickAdd.prototype.submitClicked = function () {
            this.saveClicked();
        };
        QuickAdd.prototype.closeClicked = function () {
            $(this.popup).modal("hide");
        };
        QuickAdd.prototype.saveClicked = function () {
            this.save();
        };
        QuickAdd.prototype.save = function () {
            var _ = this;
            var data = ko.toJS(this.model);
            $.post("/Admin/DataSet/QuickAdd", data, function (response) {
                console.log(response);
                if (!response.Success) {
                    alert("There was an error ...");
                    return;
                }
                _.handler.onSelected(response.Data.Guid, _.model.Entity.Name);
            });
        };
        return QuickAdd;
    })();

    return QuickAdd;
}));
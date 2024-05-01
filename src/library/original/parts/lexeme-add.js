(function (factory) {
    define("parts/lexeme-add", ["knockout", "jquery", "pubsub", "modals/search-lexicons", "app/helpers", "bootstrap"], factory);
}(function (ko, $, pubsub, LexiconModal, Helper) {

    var openModal = Helper.openModal;
    var emptyItem = Helper.emptyItem;
    var addToList = Helper.storeItemInList;

    var QuickAdd = (function () {
        function QuickAdd(cons) {
            this.prepare(cons);
            this.popup = cons.popup;
            this.model = {
                Entity: {
                    Name: ko.observable(cons.model.Entity.Name),
                    Description: ko.observable()
                },
                Lexicon: {
                    Target: {
                        Guid: ko.observable(cons.model.Lexicon.Target.Guid),
                        Name: ko.observable(cons.model.Lexicon.Target.Name)
                    }
                }
            };
            this.list = {
                Lexicons: ko.observableArray([])
            };
            this.handler = {
                onSelected: cons.handler.onSelected
            };
        }
        QuickAdd.prototype.prepare = function (cons) {
            cons = cons || {};
            cons.model = cons.model || {};
            cons.model.Entity = cons.model.Entity || {};
            cons.model.Lexicon = cons.model.Lexicon || {};
            cons.model.Lexicon.Target = cons.model.Lexicon.Target || {};
        };
        QuickAdd.prototype.addLexiconClicked = function () {
            this.loadLexicons("Add Lexicon", "quickAdd");
        };
        QuickAdd.prototype.searchLexiconClicked = function () {
            this.loadLexicons("Search Lexicon", "search");
        };
        QuickAdd.prototype.loadLexicons = function (name, tabModal) {
            var _ = this;
            openModal("/Static/Templates/Lexicon/SearchModal.html", {
                name: name,
                ajaxContentAdded: function (element) {
                    var modal = new LexiconModal({
                        popup: element,
                        tabModal: tabModal,
                        handler: {
                            onSelected: function (guid, name) {
                                $(element).modal("hide");
                                _.addLexicon({ Text: name, Value: guid });
                                _.updateLexicons();
                                _.model.Lexicon.Target.Guid(guid);
                                _.model.Lexicon.Target.Name(name);
                            }
                        }
                    });
                    ko.applyBindings(modal, element);
                }
            });
        };
        QuickAdd.prototype.setLists = function (list) {
            this.updateLexicons();
        };
        QuickAdd.prototype.updateLexicons = function () {
            var list = JSON.parse(sessionStorage.getItem("selected/lexicons")) || [];
            list.splice(0, 0, emptyItem);
            this.list.Lexicons(list);
        };
        QuickAdd.prototype.addLexicon = function (item) {
            addToList("selected/lexicons", item);
        };
        QuickAdd.prototype.clearClicked = function () {
            this.model.Entity.Name(null);
            this.model.Entity.Description(null);
            this.model.Lexicon.Target.Guid(null);
            this.model.Lexicon.Target.Name(null);
        };
        QuickAdd.prototype.submitClicked = function () {
            this.save();
        };
        QuickAdd.prototype.cancelClicked = function () {
            this.cancel();
        };
        QuickAdd.prototype.cancel = function () {
            $(this.popup).modal("hide");
        };
        QuickAdd.prototype.save = function () {
            var _ = this;
            var data = ko.toJS(this.model);
            data.QuickAdd = true;
            $.post("/Admin/Lexeme/QuickAdd", data)
                .done(function (response) {
                    console.log("response", response);
                    if (!response.Success) {
                        return;
                    }
                    _.handler.onSelected(response.Data.Guid, _.model.Entity.Name);
                });
        };
        return QuickAdd;
    })();

    return QuickAdd;

}));
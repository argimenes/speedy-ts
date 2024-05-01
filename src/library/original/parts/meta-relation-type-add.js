(function (factory) {
    define("parts/meta-relation-type-add", ["knockout", "jquery", "pubsub", "app/helpers", "modals/search-times", "modals/search-concepts", "modals/search-agents", "modals/search-places", "app/utils"], factory);
}(function (ko, $, pubsub, Helper, TimeModal, ConceptModal, AgentModal, PlaceModal, Utils) {

    var openModal = Helper.openModal;
    var setList = Helper.setList;
    var any = Utils.any;
    var emptyItem = { Text: null, Value: null };

    function addToList(key, item) {
        var list = JSON.parse(sessionStorage.getItem(key)) || [];
        if (any(list, function (x) { return JSON.stringify(x) == JSON.stringify(item); })) {
            return;
        }
        list.splice(0, 0, item);
        sessionStorage.setItem(key, JSON.stringify(list));
    }

    var QuickAdd = (function () {
        function QuickAdd(cons) {
            this.prepare(cons);
            this.popup = cons.popup;
            this.model = {
                Entity: {
                    Guid: cons.model.Entity.Guid,
                    Name: cons.model.Entity.Name,
                    DominantName: cons.model.Entity.DominantName,
                    DominantCode: cons.model.Entity.DominantCode,
                    SubordinateName: cons.model.Entity.SubordinateName,
                    SubordinateCode: cons.model.Entity.SubordinateCode
                },                
                TypeOfMetaRelationType: {
                    Target: {
                        Guid: ko.observable(cons.model.TypeOfMetaRelationType.Target.Guid),
                        Name: ko.observable(cons.model.TypeOfMetaRelationType.Target.Name),
                    }
                }                
            };
            this.handler = cons.handler;
            this.list = {
                SelectedTypeOfMetaRelationTypes: ko.observableArray([])                
            };
        }
        QuickAdd.prototype.setLists = function (list) {
            this.updateTypeOfMetaRelationTypes();
        };        
        QuickAdd.prototype.updateTypeOfMetaRelationTypes = function () {
            var items = JSON.parse(sessionStorage.getItem("selected/type-of-meta-relation-types")) || [];
            items.splice(0, 0, emptyItem);
            this.list.SelectedTypeOfMetaRelationTypes(items);
        };
        QuickAdd.prototype.addTypeOfMetaRelationType = function (item) {
            addToList("selected/type-of-meta-relation-types", item);
        };   
        QuickAdd.prototype.prepare = function (cons) {
            cons = cons || {};
            cons.model = cons.model || {};
            cons.model.Entity = cons.model.Entity || {};
            cons.model.TypeOfMetaRelationType = cons.model.TypeOfMetaRelationType || {};
            cons.model.TypeOfMetaRelationType.Target = cons.model.TypeOfMetaRelationType.Target || {};
        };        
        QuickAdd.prototype.searchTypeOfMetaRelationTypeClicked = function () {
            var _ = this;
            openModal("/Static/Templates/Concept/SearchModal.html", {
                name: "Find Type of Meta Relation Type",
                ajaxContentAdded: function (element) {
                    var modal = new ConceptModal({
                        popup: element,
                        tabModal: "search",
                        handler: {
                            onSelected: function (guid, name) {
                                _.addTypeOfMetaRelationType({ Text: name, Value: guid });
                                _.updateTypeOfMetaRelationTypes();
                                _.model.TypeOfMetaRelationType.Target.Guid(guid);
                                _.model.TypeOfMetaRelationType.Target.Name(name);
                                $(element).modal("hide");
                            }
                        }
                    });
                    ko.applyBindings(modal, element);
                    modal.start();
                }
            });
        };
        QuickAdd.prototype.addTypeOfMetaRelationTypeClicked = function () {
            var _ = this;
            openModal("/Static/Templates/Concept/SearchModal.html", {
                name: "Add Type of Meta Relation Type",
                ajaxContentAdded: function (element) {
                    var modal = new ConceptModal({
                        popup: element,
                        tabModal: "quick-add",
                        handler: {
                            onSelected: function (guid, name) {
                                _.addTypeOfMetaRelationType({ Text: name, Value: guid });
                                _.updateTypeOfMetaRelationTypes();
                                _.model.TypeOfMetaRelationType.Target.Guid(guid);
                                _.model.TypeOfMetaRelationType.Target.Name(name);
                                $(element).modal("hide");
                            }
                        }
                    });
                    ko.applyBindings(modal, element);
                    modal.start();
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
            var model = ko.toJS(this.model);
            $.post("/Admin/MetaRelationType/QuickAdd", model, function (response) {
                console.log(response);
                if (!response.Success) {
                    alert("There was an error ...");
                    return;
                }
                _.handler.onSelected(response.Data.Guid, model.Entity.Name);
            });
        };
        return QuickAdd;
    })();

    return QuickAdd;
}));
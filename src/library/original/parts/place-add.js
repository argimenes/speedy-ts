(function (factory) {
    define("parts/place-add", ["knockout", "jquery", "app/utils", "pubsub", "modals/search-concepts"], factory);
}(function (ko, $, utils, pubsub, ConceptModal) {

    var QuickAdd = (function () {
        function QuickAdd(cons) {
            var _ = this;
            cons = cons || {};
            cons.model = cons.model || {};
            cons.model.Entity = cons.model.Entity || {};
            cons.model.Container = cons.model.Container || {};
            cons.model.Container.Target = cons.model.Container.Target || {};
            cons.model.Type = cons.model.Type || {};
            cons.model.Type.Target = cons.model.Type.Target || {};
            this.model = {
                Entity: {
                    Guid: cons.model.Entity.Guid,
                    Name: ko.observable(cons.model.Entity.Name),
                    Code: ko.observable(cons.model.Entity.Code),
                    Description: ko.observable(cons.model.Entity.Description),
                },
                Container: {
                    Target: {
                        Guid: cons.model.Container.Target.Guid,
                        Name: cons.model.Container.Target.Name
                    }
                },
                Type: {
                    Target: {
                        Guid: cons.model.Type.Target.Guid,
                        Name: cons.model.Type.Target.Name
                    }
                }
            };
            this.handler = cons.handler;
            this.list = {
                Parents: ko.observableArray([])
            };
        }
        QuickAdd.prototype.searchContainerClicked = function () {
            var _ = this;
            openModal("/Static/Templates/Place/SearchModal.html", {
                ajaxContentAdded: function (element) {
                    var PlaceModal = require("modals/search-places");
                    var modal = new PlaceModal({
                        popup: element,
                        tabModal: "search",
                        handler: {
                            onSelected: function (guid, name) {
                                _.model.Container.Target.Guid(guid);
                                _.model.Container.Target.Name(name);
                                $(element).modal("hide");
                            }
                        }
                    });
                    ko.applyBindings(modal, element);
                    modal.start();
                }
            });
        };
        QuickAdd.prototype.addContainerClicked = function () {
            var _ = this;
            openModal("/Static/Templates/Place/SearchModal.html", {
                ajaxContentAdded: function (element) {
                    var PlaceModal = require("modals/search-places");
                    var modal = new PlaceModal({
                        popup: element,
                        tabModal: "quick-add",
                        handler: {
                            onSelected: function (guid, name) {
                                _.model.Container.Target.Guid(guid);
                                _.model.Container.Target.Name(name);
                                $(element).modal("hide");
                            }
                        }
                    });
                    ko.applyBindings(modal, element);
                    modal.start();
                }
            });
        };
        QuickAdd.prototype.searchTypeClicked = function () {
            var _ = this;
            openModal("/Static/Templates/Concept/SearchModal.html", {
                ajaxContentAdded: function (element) {
                    var modal = new ConceptModal({
                        popup: element,
                        tabModal: "search",
                        handler: {
                            onSelected: function (guid, name) {
                                _.model.Type.Target.Guid(guid);
                                _.model.Type.Target.Name(name);
                                $(element).modal("hide");
                            }
                        }
                    });
                    ko.applyBindings(modal, element);
                    modal.start();
                }
            });
        };
        QuickAdd.prototype.addTypeClicked = function () {
            var _ = this;
            openModal("/Static/Templates/Concept/SearchModal.html", {
                ajaxContentAdded: function (element) {
                    var modal = new ConceptModal({
                        popup: element,
                        tabModal: "quick-add",
                        handler: {
                            onSelected: function (guid, name) {
                                _.model.Type.Target.Guid(guid);
                                _.model.Type.Target.Name(name);
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
        QuickAdd.prototype.saveClicked = function () {
            this.save();
        };
        QuickAdd.prototype.save = function () {
            var _ = this;
            var data = ko.toJS(this.model);
            $.post("/Admin/Place/QuickAdd", data, function (response) {
                console.log(response);
                if (!response.Success) {
                    alert("There was an error ...");
                    return;
                }
                _.handler.onSelected(response.Data.Guid, data.Entity.Name);
            });
        };
        return QuickAdd;
    })();

    return QuickAdd;
}));
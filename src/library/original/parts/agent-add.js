(function (factory) {
    define("parts/agent-add", ["knockout", "app/helpers", "pubsub", "bootstrap", "knockout/tinymce", "knockout/ichecked"], factory);
}(function (ko, Helper, pubsub) {

    var openModal = Helper.openModal;
    var emptyItem = Helper.emptyItem;
    var addToList = Helper.storeItemInList;
    var store = Helper.store;
    var retrieve = Helper.retrieve;

    function setList(field, observable, list) {
        var value = field();
        observable(list);
        field(value);
    }

    var QuickAdd = (function () {
        function QuickAdd(cons) {
            cons = this.prepare(cons);
            this._parent = cons._parent;
            this.service = cons.service;
            this.model = {
                Entity: {
                    AgentTypeListItem: ko.observable(cons.model.Entity.AgentType || "Person"),
                    AgentType: ko.observable(cons.model.Entity.AgentType || "Person"),
                    Name: ko.observable(cons.model.Entity.Name)
                },
                AspectOf: {
                    Relation: {
                        AspectType: ko.observable(cons.model.AspectOf.Relation.Guid)
                    },
                    Target: {
                        Guid: ko.observable(cons.model.AspectOf.Target.Guid),
                        Name: ko.observable(cons.model.AspectOf.Target.Guid)
                    }
                },
                TypeOfPlace: {
                    Target: {
                        Guid: ko.observable(cons.model.TypeOfPlace.Target.Guid),
                        Name: ko.observable(cons.model.TypeOfPlace.Target.Name)
                    }
                },
                InSection: {
                    Target: {
                        Guid: ko.observable(cons.model.InSection.Target.Guid),
                        Name: ko.observable(cons.model.InSection.Target.Name)
                    }
                },
                AgentProperty: {
                    Gender: ko.observable()
                },
                PlaceProperty: {
                    Latitude: ko.observable(),
                    Longitude: ko.observable()
                }
            };
            this.list = {
                AgentTypes: ko.observableArray([]),
                AspectTypes: ko.observableArray([]),
                PlaceTypes: ko.observableArray([]),
                Sections: ko.observableArray([]),
                Agents: ko.observableArray([])
            };
            this.state = {
                showAgentTypeListItem: ko.observable(false),
            };
            this.handler = {
                onSelected: cons.handler.onSelected
            };
            this.model.Entity.AgentTypeListItem.subscribe(function (value) {
                this.model.Entity.AgentType(value);
                this.state.showAgentTypeListItem(false);
            }, this);
        }
        QuickAdd.prototype.saveFromSearchTab = function (name) {
            this.model.Entity.Name(name);
            this.save();
        };
        QuickAdd.prototype.showAgentTypeListItemClicked = function () {
            this.state.showAgentTypeListItem(true);
        };
        QuickAdd.prototype.prepare = function (cons) {
            cons = cons || {};
            cons.model = cons.model || {};
            cons.model.Entity = cons.model.Entity || {};

            cons.model.AspectOf = cons.model.AspectOf || {};
            cons.model.AspectOf.Relation = cons.model.AspectOf.Relation || {};
            cons.model.AspectOf.Target = cons.model.AspectOf.Target || {};

            cons.model.TypeOfPlace = cons.model.TypeOfPlace || {};
            cons.model.TypeOfPlace.Target = cons.model.TypeOfPlace.Target || {};

            cons.model.InSection = cons.model.InSection || {};
            cons.model.InSection.Target = cons.model.InSection.Target || {};

            cons.model.PlaceProperty = cons.model.PlaceProperty || {};
            return cons;
        };
        QuickAdd.prototype.setLists = function (data) {
            this.list.AgentTypes(data.AgentTypes);
            this.model.Entity.AgentType("Person");

            this.list.AspectTypes(data.AspectTypes);
            this.list.Sections(data.Sections);
            this.updateAgents();
            this.updatePlaceTypes();
        };
        QuickAdd.prototype.updatePlaceTypes = function () {
            var list = JSON.parse(sessionStorage.getItem("selected/place-types")) || [];
            list.splice(0, 0, emptyItem);
            this.list.PlaceTypes(list);
        };
        QuickAdd.prototype.addPlaceType = function (item) {
            addToList("selected/place-types", item);
        };
        QuickAdd.prototype.updateAgents = function () {
            var agents = JSON.parse(sessionStorage.getItem("selected/agents")) || [];
            agents.splice(0, 0, emptyItem);
            this.list.Agents(agents);
        };
        QuickAdd.prototype.addAgent = function (item) {
            addToList("selected/agents", item);
        };
        QuickAdd.prototype.searchTypeOfPlaceClicked = function () {
            this.loadTypeOfPlace("Find Place Type (Concept)", "search");
        };
        QuickAdd.prototype.addTypeOfPlaceClicked = function () {
            this.loadTypeOfPlace("Add Place Type (Concept)", "quickAdd");
        };
        QuickAdd.prototype.loadTypeOfPlace = function (name, tabMode) {
            var _ = this;
            openModal("/Static/Templates/Concept/SearchModal.html", {
                name: name,
                ajaxContentAdded: function (element) {
                    var modal = new ConceptModal({
                        popup: element,
                        tabModal: tabMode,
                        tab: {
                            search: {
                                filter: {
                                    ChildrenOfCode: "place"
                                }
                            }
                        },
                        handler: {
                            onSelected: function (guid, name) {
                                $(element).modal("hide");
                                _.addPlaceType({ Text: name, Value: guid });
                                _.updatePlaceTypes();
                                _.model.TypeOfPlace.Target.Guid(guid);
                                _.model.TypeOfPlace.Target.Name(name);
                            }
                        }
                    });
                    ko.applyBindings(modal, element);
                    modal.start();
                }
            });
        };
        QuickAdd.prototype.searchAspectOfClicked = function () {
            this.loadAspectOf("Find Aspect (Agent)", "search");
        };
        QuickAdd.prototype.addAspectOfClicked = function () {
            this.loadAspectOf("Add Aspect (Agent)", "quickAdd");
        };
        QuickAdd.prototype.loadAspectOf = function (name, tabMode) {
            var _ = this;
            openModal("/Static/Templates/Agent/SearchModal.html", {
                name: name,
                ajaxContentAdded: function (element) {
                    var AgentModal = require("modals/search-agents");
                    var modal = new AgentModal({
                        popup: element,
                        tabModal: tabMode,
                        handler: {
                            onSelected: function (guid, name) {
                                $(element).modal("hide");
                                _.addAgent({ Text: name, Value: guid });
                                _.updateAgents();
                                _.model.AspectOf.Target.Guid(guid);
                                _.model.AspectOf.Target.Name(name);
                            }
                        }
                    });
                    ko.applyBindings(modal, element);
                    modal.start();
                }
            });
        };
        QuickAdd.prototype.clearClicked = function () {
            this.model.Entity.AgentType(null);
            this.model.Entity.Name(null);
        };
        QuickAdd.prototype.submitClicked = function () {
            this.save();
        };
        QuickAdd.prototype.cancelClicked = function () {
            this.cancel();
        };
        QuickAdd.prototype.cancel = function () {

        };
        QuickAdd.prototype.save = function () {
            var _ = this;
            var model = ko.toJS(this.model);
            model.Entity.QuickAdd = true;
            this.service.QuickAdd(model, function (response) {
                console.log("response", response);
                if (!response.Success) {
                    return;
                }
                var data = response.Data;
                store("recent/agents", data, function (x) { return x.Entity.Guid == data.Entity.Guid });
                var name = model.Entity.Name;
                _.handler.onSelected(data.Entity.Guid, name, { isNew: true });
            });
        };
        return QuickAdd;
    })();

    return QuickAdd;
}));
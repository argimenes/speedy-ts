(function (factory) {
    define("parts/meta-relation-add", ["knockout", "jquery", "pubsub", "app/helpers", "modals/search-times", "modals/search-concepts", "modals/search-agents", "modals/search-places", "modals/search-meta-relation-types", "app/utils"], factory);
}(function (ko, $, pubsub, Helper, TimeModal, ConceptModal, AgentModal, PlaceModal, MetaRelationTypeModal, Utils) {

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
                },
                Dominant: {
                    Target: {
                        Guid: ko.observable(cons.model.Dominant.Target.Guid),
                        Name: ko.observable(cons.model.Dominant.Target.Name),
                    }
                },
                Subordinate: {
                    Target: {
                        Guid: ko.observable(cons.model.Subordinate.Target.Guid),
                        Name: ko.observable(cons.model.Subordinate.Target.Name),
                    }
                },
                MetaRelationType: {
                    Target: {
                        Guid: ko.observable(cons.model.MetaRelationType.Target.Guid),
                        Name: ko.observable(cons.model.MetaRelationType.Target.Name),
                    }
                },                
                Time: {
                    Target: {
                        Guid: ko.observable(cons.model.Time.Target.Guid),
                        Around: ko.observable(cons.model.Time.Target.Around),
                        Season: ko.observable(cons.model.Time.Target.Season),                        
                        Section: ko.observable(cons.model.Time.Target.Section),
                        Year: ko.observable(cons.model.Time.Target.Year),
                        Month: ko.observable(cons.model.Time.Target.Month),
                        Day: ko.observable(cons.model.Time.Target.Day),
                        Hour: ko.observable(cons.model.Time.Target.Hour),
                        Minute: ko.observable(cons.model.Time.Target.Minute),
                        Second: ko.observable(cons.model.Time.Target.Second),
                    }
                }                
            };
            this.handler = cons.handler;
            this.list = {
                SelectedAgents: ko.observableArray([emptyItem]),
                SelectedMetaRelationTypes: ko.observableArray([]),
                Around: ko.observableArray([]),
                Months: ko.observableArray([]),
                Seasons: ko.observableArray([]),
                Sections: ko.observableArray([])
            };
        }
        QuickAdd.prototype.setLists = function (list) {
            setList(this.model.Time.Target.Around, this.list.Around, list.Around);
            setList(this.model.Time.Target.Season, this.list.Seasons, list.Seasons);
            setList(this.model.Time.Target.Month, this.list.Months, list.Months);
            setList(this.model.Time.Target.Section, this.list.Sections, list.Sections);
            this.updateSelectedAgents();
            this.updateMetaRelationTypes();
        };
        QuickAdd.prototype.updateSelectedAgents = function () {
            var agents = JSON.parse(sessionStorage.getItem("selected/agents")) || [];            
            agents.splice(0, 0, emptyItem);
            this.list.SelectedAgents(agents);            
        };        
        QuickAdd.prototype.addSelectedAgent = function (item) {
            addToList("selected/agents", item);
        };   
        QuickAdd.prototype.updateMetaRelationTypes = function () {
            var agents = JSON.parse(sessionStorage.getItem("selected/meta-relation-types")) || [];
            agents.splice(0, 0, emptyItem);
            this.list.SelectedMetaRelationTypes(agents);
        };
        QuickAdd.prototype.addMetaRelationType = function (item) {
            addToList("selected/meta-relation-types", item);
        };   
        QuickAdd.prototype.prepare = function (cons) {
            cons = cons || {};
            cons.model = cons.model || {};
            cons.model.Entity = cons.model.Entity || {};
            cons.model.Dominant = cons.model.Dominant || {};
            cons.model.Dominant.Target = cons.model.Dominant.Target || {};
            cons.model.Subordinate = cons.model.Subordinate || {};
            cons.model.Subordinate.Target = cons.model.Subordinate.Target || {};
            cons.model.MetaRelationType = cons.model.MetaRelationType || {};
            cons.model.MetaRelationType.Target = cons.model.MetaRelationType.Target || {};
            cons.model.Time = cons.model.Time || {};
            cons.model.Time.Target = cons.model.Time.Target || {};
        };
        QuickAdd.prototype.searchDominantClicked = function () {
            var _ = this;
            openModal("/Static/Templates/Agent/SearchModal.html", {
                name: "Find Dominant (Agent)",
                ajaxContentAdded: function (element) {
                    var modal = new AgentModal({
                        popup: element,
                        tabModal: "search",
                        handler: {
                            onSelected: function (guid, name) {
                                $(element).modal("hide");
                                _.addSelectedAgent({ Text: name, Value: guid });
                                _.updateSelectedAgents();
                                _.model.Dominant.Target.Guid(guid);
                                _.model.Dominant.Target.Name(name);
                            }
                        }
                    });
                    ko.applyBindings(modal, element);
                    modal.start();
                }
            });
        };
        QuickAdd.prototype.addDominantClicked = function () {
            var _ = this;
            openModal("/Static/Templates/Agent/SearchModal.html", {
                name: "Add Dominant (Agent)",
                ajaxContentAdded: function (element) {
                    var modal = new AgentModal({
                        popup: element,
                        tabModal: "quick-add",
                        handler: {
                            onSelected: function (guid, name) {                                                               
                                $(element).modal("hide");
                                _.addSelectedAgent({ Text: name, Value: guid });
                                _.updateSelectedAgents();
                                _.model.Dominant.Target.Guid(guid);
                                _.model.Dominant.Target.Name(name); 
                            }
                        }
                    });
                    ko.applyBindings(modal, element);
                    modal.start();
                }
            });
        };
        QuickAdd.prototype.searchSubordinateClicked = function () {
            var _ = this;
            openModal("/Static/Templates/Agent/SearchModal.html", {
                name: "Find Subordinate (Agent)",
                ajaxContentAdded: function (element) {
                    var modal = new AgentModal({
                        popup: element,
                        tabModal: "search",
                        handler: {
                            onSelected: function (guid, name) {
                                _.addSelectedAgent({ Text: name, Value: guid });
                                _.updateSelectedAgents();
                                _.model.Subordinate.Target.Guid(guid);
                                _.model.Subordinate.Target.Name(name);
                                $(element).modal("hide");
                            }
                        }
                    });
                    ko.applyBindings(modal, element);
                    modal.start();
                }
            });
        };
        QuickAdd.prototype.addSubordinateClicked = function () {
            var _ = this;
            openModal("/Static/Templates/Agent/SearchModal.html", {
                name: "Add Subordinate (Agent)",
                ajaxContentAdded: function (element) {
                    var modal = new AgentModal({
                        popup: element,
                        tabModal: "quick-add",
                        handler: {
                            onSelected: function (guid, name) {
                                _.addSelectedAgent({ Text: name, Value: guid });
                                _.updateSelectedAgents();
                                _.model.Subordinate.Target.Guid(guid);
                                _.model.Subordinate.Target.Name(name);
                                $(element).modal("hide");
                            }
                        }
                    });
                    ko.applyBindings(modal, element);
                    modal.start();
                }
            });
        };
        QuickAdd.prototype.searchMetaRelationTypeClicked = function () {
            var _ = this;
            openModal("/Static/Templates/MetaRelationType/SearchModal.html", {
                name: "Find Meta Relation Type",
                ajaxContentAdded: function (element) {
                    var modal = new MetaRelationTypeModal({
                        popup: element,
                        tabModal: "search",
                        handler: {
                            onSelected: function (guid, name) {
                                _.addMetaRelationType({ Text: name, Value: guid });
                                _.updateMetaRelationTypes();
                                _.model.MetaRelationType.Target.Guid(guid);
                                _.model.MetaRelationType.Target.Name(name);
                                $(element).modal("hide");
                            }
                        }
                    });
                    ko.applyBindings(modal, element);
                    modal.start();
                }
            });
        };
        QuickAdd.prototype.addMetaRelationTypeClicked = function () {
            var _ = this;
            openModal("/Static/Templates/MetaRelationType/SearchModal.html", {
                name: "Add Meta Relation Type",
                ajaxContentAdded: function (element) {
                    var modal = new MetaRelationTypeModal({
                        popup: element,
                        tabModal: "quick-add",
                        handler: {
                            onSelected: function (guid, name) {
                                _.addMetaRelationType({ Text: name, Value: guid });
                                _.updateMetaRelationTypes();
                                _.model.MetaRelationType.Target.Guid(guid);
                                _.model.MetaRelationType.Target.Name(name);
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
            $.post("/Admin/MetaRelation/QuickAdd", model, function (response) {
                console.log(response);
                if (!response.Success) {
                    alert("There was an error ...");
                    return;
                }
                _.handler.onSelected(response.Data.Guid, model.MetaRelationType.Target.Name);
            });
        };
        return QuickAdd;
    })();

    return QuickAdd;
}));
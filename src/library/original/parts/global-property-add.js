(function (factory) {
    define("parts/global-property-add", ["knockout", "app/helpers", "modals/search-agents"], factory);
}(function (ko, Helper, AgentModal) {

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

    function closeModal(element) {
        $(element).modal("hide");
        ko.cleanNode(element);
        element.remove();
    }

    var QuickAdd = (function () {
        function QuickAdd(cons) {
            this.prepare(cons);
            this.service = cons.service;
            this.model = {                
                HasStandoffProperty: {
                    Source: { // Text
                        Guid: ko.observable()
                    },
                    Relation: {
                        Guid: ko.observable()
                    },
                    Target: { // StandoffProperty
                        Guid: ko.observable()
                    }
                },
                RefersToAgent: {
                    Source: { // StandoffProperty
                        Guid: ko.observable(),
                        Type: ko.observable()
                    },
                    Relation: {
                        Guid: ko.observable()
                    },
                    Target: { // Agent
                        Guid: ko.observable(),
                        Name: ko.observable()
                    }
                }
            };
            this.list = {
                annotationTypes: ko.observableArray([]),
                agents: ko.observableArray([])
            };
            this.handler = {
                onSelected: cons.handler.onSelected
            };
            this.setup(cons);
        }
        QuickAdd.prototype.prepare = function (cons) {
            cons = cons || {};
            cons.model = cons.model || {};
            cons.model.Entity = cons.model.Entity || {};

            cons.model.HasStandoffProperty = cons.model.HasStandoffProperty || {};
            cons.model.HasStandoffProperty.Source = cons.model.HasStandoffProperty.Source || {};
            cons.model.HasStandoffProperty.Relation = cons.model.HasStandoffProperty.Relation || {};
            cons.model.HasStandoffProperty.Target = cons.model.HasStandoffProperty.Target || {};

            cons.model.RefersToAgent = cons.model.RefersToAgent || {};
            cons.model.RefersToAgent.Source = cons.model.RefersToAgent.Source || {};
            cons.model.RefersToAgent.Relation = cons.model.RefersToAgent.Relation || {};
            cons.model.RefersToAgent.Target = cons.model.RefersToAgent.Target || {};
        };
        QuickAdd.prototype.applyBindings = function (node) {
            ko.applyBindings(this, node);
        };
        QuickAdd.prototype.bind = function (cons) {
            if (cons.list) {
                if (cons.list.annotationTypes) {
                    this.list.annotationTypes(cons.list.annotationTypes);
                }
                if (cons.list.agents) {
                    this.list.agents(cons.list.agents);
                }                
            }
            if (cons.model) {
                if (cons.model.HasStandoffProperty) {
                    if (this.model.HasStandoffProperty.Source) {
                        this.model.HasStandoffProperty.Source.Guid(cons.model.HasStandoffProperty.Source.Guid);
                    }
                    if (this.model.HasStandoffProperty.Relation) {
                        this.model.HasStandoffProperty.Relation.Guid(cons.model.HasStandoffProperty.Relation.Guid);
                    }
                    if (this.model.HasStandoffProperty.Target) {
                        this.model.HasStandoffProperty.Target.Guid(cons.model.HasStandoffProperty.Target.Guid);
                    }
                }
                if (cons.model.RefersToAgent) {
                    if (this.model.RefersToAgent.Source) {
                        this.model.RefersToAgent.Source.Guid(cons.model.RefersToAgent.Source.Guid);
                        this.model.RefersToAgent.Source.Type(cons.model.RefersToAgent.Source.Type);
                    }
                    if (this.model.RefersToAgent.Relation) {
                        this.model.RefersToAgent.Relation.Guid(cons.model.RefersToAgent.Relation.Guid);
                    } 
                    if (this.model.RefersToAgent.Target) {
                        this.model.RefersToAgent.Target.Guid(cons.model.RefersToAgent.Target.Guid);
                    }                    
                }
            }
        };
        QuickAdd.prototype.setup = function (cons) {            
            this.bind({
                model: cons.model,
                list: {
                    annotationTypes: [
                        { Text: "represents", Value: "represents" },
                        { Text: "author", Value: "author" },
                        { Text: "language", Value: "language" },
                    ],
                    agents: this.getAgents()
                }
            });
        };
        QuickAdd.prototype.getAgents = function () {
            var agents = JSON.parse(sessionStorage.getItem("selected/agents")) || [];
            agents.splice(0, 0, emptyItem);
            return agents;
        };       
        QuickAdd.prototype.addAgent = function (item) {
            addToList("selected/agents", item);
        };
        QuickAdd.prototype.searchAgentClicked = function () {
            this.loadAgent("Find Agent", "search");
        };
        QuickAdd.prototype.addAgentClicked = function () {
            this.loadAgent("Add Agent", "quickAdd");
        };
        QuickAdd.prototype.loadAgent = function (name, tabMode) {
            var _this = this;
            openModal("/Static/Templates/Agent/SearchModal.html", {
                name: name,
                ajaxContentAdded: function (element) {
                    var modal = new AgentModal({
                        popup: element,
                        tabModal: tabMode,                        
                        handler: {
                            onSelected: function (guid, name) {
                                closeModal(element);
                                _this.addAgent({ Text: name, Value: guid });
                                _this.bind({
                                    list: {
                                        agents: _this.getAgents()
                                    }
                                });
                                _this.model.RefersToAgent.Target.Guid(guid);
                                _this.model.RefersToAgent.Target.Name(guid);
                            }
                        }
                    });
                    ko.applyBindings(modal, element);
                }
            });
        };
        QuickAdd.prototype.clearClicked = function () {
            this.model.RefersToAgent.Source.Type(null);
            this.model.RefersToAgent.Target.Guid(null);
        };
        QuickAdd.prototype.submitClicked = function () {
            this.save();
        };
        QuickAdd.prototype.cancelClicked = function () {
            this.cancel();
        };
        QuickAdd.prototype.cancel = function () {
            this.handler.onCancelled(model.HasStandoffProperty.Source.Guid);
        };
        QuickAdd.prototype.save = function () {
            var _this = this;
            var model = ko.toJS(this.model);
            if (!model.HasStandoffProperty.Target.Guid) {
                model.HasStandoffProperty.Target.QuickAdd = true;
            }
            model.HasStandoffProperty.Target.Value = model.RefersToAgent.Target.Guid;
            $.post("/Admin/Text/EditGlobalProperty", model, response => {
                var data = response.Data;
                var text = data.HasStandoffProperty.Source;
                _this.handler.onSelected(text.Guid, text.Name);
            });
        };
        return QuickAdd;
    })();

    return QuickAdd;
}));
(function (factory) {
    define("parts/structure-add", ["knockout", "jquery", "app/helpers", "modals/search-agents"], factory);
}(function (ko, $, Helper, AgentModal) {

    var openModal = Helper.openModal;
    var emptyItem = Helper.emptyItem;
    var addToList = Helper.storeItemInList;

    var QuickAdd = (function () {
        function QuickAdd(cons) {
            this.prepare(cons);
            this.model = {
                Entity: {
                    Guid: cons.model.Entity.Guid,
                    Name: ko.observable(cons.model.Entity.Name),
                    Code: ko.observable(cons.model.Entity.Code),
                    Description: ko.observable(cons.model.Entity.Description),
                },
                Parent: {
                    Target: {
                        Guid: ko.observable(cons.model.Parent.Target.Guid),
                        Name: ko.observable(cons.model.Parent.Target.Name),
                    }
                },
                Agent: {
                    Target: {
                        Guid: ko.observable(cons.model.Agent.Target.Guid),
                        Name: ko.observable(cons.model.Agent.Target.Name),
                    }
                }
            };
            this.handler = cons.handler;
            this.list = {
                Parents: ko.observableArray([]),
                Agents: ko.observableArray([])
            };
        }
        QuickAdd.prototype.prepare = function (cons) {
            cons = cons || {};
            cons.model = cons.model || {};
            cons.model.Entity = cons.model.Entity || {};
            cons.model.Parent = cons.model.Parent || {};
            cons.model.Parent.Target = cons.model.Parent.Target || {};
            cons.model.Agent = cons.model.Agent || {};
            cons.model.Agent.Target = cons.model.Agent.Target || {};
        };
        QuickAdd.prototype.setLists = function (data) {
            this.updateParents();
        };
        QuickAdd.prototype.updateAgents = function () {
            var list = JSON.parse(sessionStorage.getItem("selected/agents")) || [];
            list.splice(0, 0, emptyItem);
            this.list.Agents(list);
        };
        QuickAdd.prototype.addAgent = function (item) {
            addToList("selected/agents", item);
        };
        QuickAdd.prototype.updateParents = function () {
            var list = JSON.parse(sessionStorage.getItem("selected/structures")) || [];
            list.splice(0, 0, emptyItem);
            this.list.Parents(list);
        };        
        QuickAdd.prototype.addParent = function (item) {
            addToList("selected/structures", item);
        };
        QuickAdd.prototype.searchAgentClicked = function () {
            this.loadAgents("Find Agent", "search");
        };
        QuickAdd.prototype.addAgentClicked = function () {
            this.loadAgents("Add Agent", "quickAdd");
        };
        QuickAdd.prototype.loadAgents = function (name, tabModal) {
            var _ = this;
            openModal("/Static/Templates/Agent/SearchModal.html", {
                name: name,
                ajaxContentAdded: function (element) {
                    var modal = new AgentModal({
                        popup: element,
                        tabModal: tabModal,
                        handler: {
                            onSelected: function (guid, name) {
                                $(element).modal("hide");
                                _.addAgent({ Text: name, Value: guid });
                                _.updateAgents();
                                _.model.Agent.Target.Guid(guid);
                                _.model.Agent.Target.Name(name);
                            }
                        }
                    });
                    ko.applyBindings(modal, element);
                }
            });
        };
        QuickAdd.prototype.searchParentClicked = function () {
            this.loadParents("Find Parent (Concept)", "search");
        };
        QuickAdd.prototype.addParentClicked = function () {
            this.loadParents("Add Parent (Concept)", "quickAdd");
        };
        QuickAdd.prototype.loadParents = function (name, tabModal) {
            var _ = this;
            openModal("/Static/Templates/Structure/SearchModal.html", {
                name: name,
                ajaxContentAdded: function (element) {
                    var StructureModal = require("modals/search-structures");
                    var modal = new StructureModal({
                        popup: element,
                        tabModal: tabModal,
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
                    ko.applyBindings(modal, element);
                }
            });
        };
        QuickAdd.prototype.submitClicked = function () {
            this.saveClicked();
        };
        QuickAdd.prototype.saveClicked = function () {
            this.save();
        };
        QuickAdd.prototype.setParents = function (list) {
            var parent = this.model.ParentGuid();
            this.list.Parents(list);
            this.model.ParentGuid(parent);
        };
        QuickAdd.prototype.save = function () {
            var _ = this;
            var data = ko.toJS(this.model);
            $.post("/Admin/Structure/QuickAdd", data, function (response) {
                console.log(response);
                if (!response.Success) {
                    alert("There was an error ...");
                    return;
                }
                _.handler.onSelected(response.Data.Guid, _.model.Entity.Name());
            });
        };
        return QuickAdd;
    })();

    return QuickAdd;
}));
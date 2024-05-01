(function (factory) {
    define("modals/search-claims", ["knockout", "jquery", "parts/claim-add", "app/helpers"], factory);
}(function (ko, $, AddClaim, Helpers) {

    var openModal = Helpers.openModal;
    var emptyItem = Helpers.emptyItem;
    var addToList = Helpers.storeItemInList;
    var store = Helpers.store;
    var retrieve = Helpers.retrieve;

    function closeModal(element) {
        $(element).modal("hide");
        ko.cleanNode(element);
        element.remove();
    }

    var Search = (function () {
        function Search(cons) {
            cons.filter = cons.filter || {};
            cons.list = cons.list || {};
            this.popup = cons.popup;
            this.results = ko.observableArray([]);
            this.total = ko.observable();
            this.filter = {
                Guid: ko.observable(cons.filter.Guid),
                AgentGuid: ko.observable(cons.filter.AgentGuid),
                AgentName: ko.observable(cons.filter.AgentName),
                TextGuid: ko.observable(cons.filter.TextGuid),
                ClaimRole: ko.observable(cons.filter.ClaimRole),
                ClaimType: ko.observable(cons.filter.ClaimType),
                Name: ko.observable(cons.filter.Name),
                Place: ko.observable(cons.filter.Place),
                Section: ko.observable(cons.filter.Section),

                Page: ko.observable(cons.filter.Page || 1),
                PageRows: ko.observable(cons.filter.PageRows),
                Order: ko.observable(cons.filter.Order || "ByName"),
                Direction: ko.observable(cons.filter.Direction || "Ascending"),
            };
            this.list = {
                Sections: ko.observableArray(cons.list.Sections),
                ClaimTypes: ko.observableArray(cons.list.ClaimTypes),
                ClaimRoles: ko.observableArray(cons.list.ClaimRoles),
                Places: ko.observableArray(cons.list.Places),
                Entities: ko.observableArray(cons.list.Entities),

                SortOptions: ko.observableArray(cons.list.SortOptions),
                Records: ko.observableArray(cons.list.Records || [5, 10, 20]),
                Directions: ko.observableArray(cons.list.Directions),
                Pages: ko.observableArray([1])
            };
            this.handler = {
                onSelected: cons.handler.onSelected,
                closeClicked: cons.handler.closeClicked
            };
            this.setupEventHandlers();
        }
        Search.prototype.claimRole = function (item) {
            switch (item.Entity.Role) {
                case "Event": return "Event";
                case "claim-role-event": return "Event";
                case "claim-role-opinion": return "Opinion";
                case "claim-role-thought": return "Thought";
                case "claim-role-intention": return "Intention";
                case "claim-role-trait": return "Trait";
                case "Trait": return "Trait";
                default: return item.Entity.Role;
            }
        };
        Search.prototype.dateAdded = function (item) {
            var date = this.toDate(item.Entity.DateAddedUTC);
            return "{yyyy}/{MM}/{dd}".fmt({ yyyy: date.getFullYear(), MM: date.getMonth() + 1, dd: date.getDate() });
        };
        Search.prototype.subjectName = function (item) {
            var subject = item.ActedOnBy.find(function (x) {
                return x.Relation.AgentRole == 0;
            });
            return subject ? "(Subject) " + subject.Target.Name : null;
        };
        Search.prototype.nonSubjects = function (item) {
            return item.ActedOnBy.filter(function (x) {
                return x.Relation.AgentRole != 0;
            });
        };
        Search.prototype.agentRole = function (item) {
            switch (item.Relation.AgentRole) {
                case 0: return "Subject";
                case 1: return "Object";
                case 2: return "With";
                case 3: return "By";
                case 4: return "At";
                case 5: return "From";
                case 6: return "Of";
                case 7: return "To";
                case 8: return "As";
                case 9: return "In";
                case 10: return "On";
                case 11: return "About";
                case 12: return "Under";
                case 13: return "According To";
                case 14: return "Dominant";
                case 15: return "Subordinate";
                default: return item.Relation.AgentRole;
            }
        };
        Search.prototype.setupEventHandlers = function () {

        };
        Search.prototype.start = function () {
            this.loadPage();
        };
        Search.prototype.toDate = function (json) {
            return new Date(json.match(/\d+/)[0] * 1);
        };
        Search.prototype.loadPage = function () {
            var _ = this;
            var filter = ko.toJS(this.filter);
            $.get("/Admin/Claim/SearchJson", filter, function (response) {
                console.log("response", response);
                if (!response.Success) {
                    return;
                }
                _.results(response.Data.Results);
                _.list.Pages([]);
                for (var page = 1; page <= response.Data.MaxPage; page++) {
                    _.list.Pages.push(page);
                }
                _.filter.Page(filter.Page);
                _.total(response.Data.Count);
            });
        };
        Search.prototype.addStatementClicked = function () {
            var _this = this;
            openModal("/Static/Templates/Claim/SearchModal.html", {
                name: "Add Statement",
                ajaxContentAdded: function (element) {
                    var modal = new Modal({
                        popup: element,
                        currentTab: "quickAdd",
                        tabs: ["quickAdd"],
                        handler: {
                            onSelected: function () {
                                closeModal(element);
                                _this.submitClicked();
                            }
                        }
                    });
                    ko.applyBindings(modal, element);
                }
            });
        };
        Search.prototype.addEntity = function (item) {
            addToList("selected/agents", item);
        };
        Search.prototype.updateEntities = function () {
            var list = JSON.parse(sessionStorage.getItem("selected/agents")) || [];
            list.splice(0, 0, emptyItem);
            this.list.Entities(list);
        };
        Search.prototype.addClaimType = function (item) {
            addToList("selected/claim-types", item);
        };
        Search.prototype.updateClaimTypes = function () {
            var list = JSON.parse(sessionStorage.getItem("selected/claim-types")) || [];
            list.splice(0, 0, emptyItem);
            this.list.ClaimTypes(list);
        };
        Search.prototype.searchEntityClicked = function () {
            var _this = this;
            require(["modals/search-agents", "jquery-ui"], function (AgentModal) {
                $.get("/Static/Templates/Agent/search-panel.html?v=27", function (html) {
                    var inline = _this.createInlineAgentSelector();
                    var agentGuids = inline ? inline().map(item => item.value) : [];
                    var container = div({
                        classList: ["text-window"],
                        style: {
                            position: "absolute",
                            zIndex: 31,
                            top: "200px",
                            right: "20px",
                            width: "600px",
                            maxHeight: "600px"
                        }
                    });
                    var modal = new AgentModal({
                        popup: container,
                        currentTab: "search",
                        tabs: ["search"],
                        tab: {
                            search: {
                                filter: {
                                    Guid: prop.value,
                                    Name: !prop.value ? prop.text : null
                                }
                            },
                            quickAdd: {
                                model: {
                                    Entity: {
                                        Name: prop.text ? prop.text : null
                                    }
                                }
                            },
                            sourceAgents: {
                                filter: {
                                    Guids: agentGuids
                                }
                            }
                        },
                        handler: {
                            inlineAgentSelector: _this.createInlineAgentSelector(),
                            onSelected: function (value, text) {
                                _this.addEntity({ Text: text, Value: value })
                                _this.updateEntities();
                                _this.filter.Entity(value);
                                container.remove();
                            },
                            closeClicked: function () {
                                container.remove();
                            }
                        }
                    });
                    modal.start();
                    var node = applyBindings(html, modal);
                    container.appendChild(node);
                    document.body.appendChild(container);
                    $(container).draggable();
                });
            });
            //require(["modals/search-agents"], function (AgentModal) {
            //    openModal("/Static/Templates/Agent/SearchModal.html", {
            //        name: "Search Entities",
            //        ajaxContentAdded: function (element) {
            //            var modal = new AgentModal({
            //                popup: element,
            //                currentTab: "search",
            //                tabs: ["search"],
            //                handler: {
            //                    onSelected: function (value, text) {
            //                        closeModal(element);
            //                        _this.addEntity({ Text: text, Value: value })
            //                        _this.updateEntities();
            //                        _this.filter.Entity(value);
            //                    }
            //                }
            //            });
            //            ko.applyBindings(modal, element);
            //        }
            //    });
            //});
        };
        Search.prototype.searchClaimTypeClicked = function () {
            var _this = this;
            require(["modals/search-concepts"], function (ConceptModel) {
                openModal("/Static/Templates/Concept/SearchModal.html", {
                    name: "Search Types",
                    ajaxContentAdded: function (element) {
                        var modal = new ConceptModel({
                            popup: element,
                            currentTab: "search",
                            tabs: ["search"],                            
                            handler: {
                                onSelected: function (value, text) {
                                    closeModal(element);
                                    _this.addClaimType({ Text: text, Value: value })
                                    _this.updateClaimTypes();
                                    _this.filter.ClaimType(value);
                                }
                            }
                        });                        
                        ko.applyBindings(modal, element);
                    }
                });
            });
        };
        Search.prototype.addTraitClicked = function () {
            var _this = this;
            require(["modals/search-traits"], function (TraitModal) {
                openModal("/Static/Templates/Trait/SearchModal.html", {
                    name: "Add Trait",
                    ajaxContentAdded: function (element) {
                        var modal = new TraitModal({
                            popup: element,
                            currentTab: "quickAdd",
                            tabs: ["quickAdd"],
                            tab: {
                                quickAdd: {
                                    model: {
                                        Subject: {
                                            Target: {
                                                Guid: _this.filter.AgentGuid(),
                                                Name: _this.filter.AgentName()
                                            }                                            
                                        }
                                    }
                                }
                            },
                            handler: {
                                onSelected: function (guid) {
                                    closeModal(element);
                                    _this.submitClicked();
                                }
                            }
                        });
                        var quickAdd = modal.tab.quickAdd;
                        quickAdd.addAgent({ Text: _this.filter.AgentName(), Value: _this.filter.AgentGuid() });
                        quickAdd.updateAgents();
                        quickAdd.model.Subject.Target.Guid(_this.filter.AgentGuid());
                        ko.applyBindings(modal, element);
                    }
                });
            });
        };
        Search.prototype.selectClicked = function (item) {
            this.selected(item.Entity.Guid);
        };
        Search.prototype.selected = function (guid) {
            this.handler.onSelected(guid);
        };
        Search.prototype.submitClicked = function () {
            this.loadPage();
        };
        Search.prototype.clearClicked = function () {
            this.clear();
            this.loadPage();
        };
        Search.prototype.closeClicked = function () {
            this.close();
        };
        Search.prototype.close = function () {
            this.handler.closeClicked();
        };
        Search.prototype.clear = function () {
            this.filter.Guid(null);
            this.filter.Place(null);
            this.filter.Entity(null);
            this.filter.ClaimRole(null);
            this.filter.ClaimType(null);
            this.filter.Name(null);
            this.filter.Order(null);
            this.filter.PageRows(null);
            this.filter.Page(null);
            this.filter.Section(null);
            this.filter.Direction("Ascending");
        };
        return Search;
    })();

    var Modal = (function () {
        function Modal(cons) {
            var _this = this;
            this.prepare(cons);
            this.popup = cons.popup;
            this.currentTab = ko.observable(cons.currentTab || "search");
            this.tabMode = ko.observable(cons.tabMode || "search");
            this.tabs = ko.observableArray(cons.tabs || ["search", "quickAdd"]);
            this.tab = {
                search: new Search({
                    popup: cons.popup,
                    handler: cons.handler,
                    filter: cons.tab.search.filter
                }),
                quickAdd: new AddClaim({
                    popup: cons.popup,
                    handler: cons.handler,
                    model: cons.tab.quickAdd.model
                })
            };
            this.handler = {
                onSelected: cons.handler.onSelected,
                closeClicked: cons.handler.closeClicked
            };
            this.fade = false;
            this.setupEventHandlers();
            this.start(cons);
        }
        Modal.prototype.fadeClicked = function () {
            this.fade = !this.fade;
            if (this.fade) {
                $(".modal").css("opacity", "0.3");
                $(".modal-backdrop").hide();
            }
            else {
                $(".modal").css("opacity", "1");
                $(".modal-backdrop").show();
            }
        };
        Modal.prototype.prepare = function (cons) {
            cons = cons || {};
            cons.list = cons.list || {};
            cons.handler = cons.handler || {};
            cons.tab = cons.tab || {};
            cons.tab.search = cons.tab.search || {};
            cons.tab.quickAdd = cons.tab.quickAdd || {};
            cons.tab.quickAdd.model = cons.tab.quickAdd.model || {};
            cons.tab.quickAdd.model.Entity = cons.tab.quickAdd.model.Entity || {};
        };
        Modal.prototype.setupEventHandlers = function () {

        };
        Modal.prototype.tabClicked = function (tab) {
            this.currentTab(tab);
        };
        Modal.prototype.isTabVisible = function (tab) {
            var _this = this;
            return ko.computed(function () {
                return _this.tabs().indexOf(tab) >= 0;
            });
        };
        Modal.prototype.start = function (cons) {
            var _this = this;
            this.loadLists(function () {
                var search = _this.tab.search;
                if (cons.tab) {
                    if (cons.tab.search) {
                        if (cons.tab.search.filter) {
                            search.filter.Order(cons.tab.search.filter.Order);
                            search.filter.Direction(cons.tab.search.filter.Direction);
                        }
                    }
                }
                search.start();
            });
        };
        Modal.prototype.closeClicked = function () {
            this.close();
        };
        Modal.prototype.close = function () {
            $(this.popup).modal("hide");
        };
        Modal.prototype.loadLists = function (callback) {
            var _ = this;
            $.get("/Admin/Claim/SearchModalLists", null, function (response) {
                console.log("response", response);
                if (!response.Success) {
                    return;
                }
                var data = response.Data;
                _.tab.search.list.Sections(data.Sections);
                _.tab.search.list.SortOptions(data.SortOptions);
                _.tab.search.list.Directions(data.Directions);
                _.tab.search.list.ClaimTypes(data.ClaimTypes);
                _.tab.search.list.ClaimRoles(data.ClaimRoles);
                _.tab.search.list.Places(data.Places);
                _.tab.quickAdd.setLists(data);
                _.tab.quickAdd.model.Entity.Role("Event");
                if (callback) {
                    callback();
                }
            });
            $.get("/Admin/Time/SearchModalLists", null, function (response) {
                console.log("response", response);
                if (!response.Success) {
                    return;
                }
                var data = response.Data;
                _.tab.quickAdd.setLists(data);
                _.tab.quickAdd.model.Time.Target.Around("On");
            });
        };
        Modal.prototype.close = function () {
            this.handler.closeClicked();
        };
        return Modal;
    })();

    return Modal;
}));
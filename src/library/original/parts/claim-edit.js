(function (factory) {
    define("parts/claim-edit", ["knockout", "jquery", "app/helpers", "app/utils"], factory);
}(function (ko, $, Helper, Utils) {

    var openModal = Helper.openModal;
    var setList = Helper.setList;
    var any = Utils.any;
    var emptyItem = { Text: null, Value: null };

    function closeModal(element) {
        $(element).modal("hide");
        ko.cleanNode(element);
        element.remove();
    }

    function addToList(key, item) {
        var list = JSON.parse(sessionStorage.getItem(key)) || [];
        if (any(list, function (x) { return JSON.stringify(x) == JSON.stringify(item); })) {
            return;
        }
        list.splice(0, 0, item);
        sessionStorage.setItem(key, JSON.stringify(list));
    }

    var Edit = (function () {
        function Edit(cons) {
            var _ = this;
            this.setDefaults(cons);
            this.popup = cons.popup;
            this.form = {
                AndThen: ko.observable(false)
            };
            this.chain = [];
            this.model = {
                PrecedingClaim: {
                    Guid: null
                },
                Entity: {
                    Guid: cons.model.Entity.Guid,
                    Name: ko.observable(cons.model.Entity.Name),
                    Role: ko.observable(cons.model.Entity.Role || "claim-role-event")
                },
                Subject: {
                    Target: {
                        Guid: ko.observable(cons.model.Subject.Target.Guid),
                        Name: ko.observable(cons.model.Subject.Target.Name)
                    },
                    Relation: {
                        AgentRole: ko.observable(cons.model.Subject.Relation.AgentRole)
                    }
                },
                Object: {
                    Target: {
                        Guid: ko.observable(cons.model.Object.Target.Guid),
                        Name: ko.observable(cons.model.Object.Target.Name)
                    },
                    Relation: {
                        AgentRole: ko.observable(cons.model.Object.Relation.AgentRole)
                    }
                },
                AccordingTo: {
                    Target: {
                        Guid: ko.observable(cons.model.AccordingTo.Target.Guid),
                        Name: ko.observable(cons.model.AccordingTo.Target.Name)
                    }
                },
                About: {
                    Target: {
                        Guid: ko.observable(cons.model.About.Target.Guid),
                        Name: ko.observable(cons.model.About.Target.Name)
                    }
                },
                At: {
                    Target: {
                        Guid: ko.observable(cons.model.At.Target.Guid),
                        Name: ko.observable(cons.model.At.Target.Name)
                    }
                },
                Of: {
                    Target: {
                        Guid: ko.observable(cons.model.Of.Target.Guid),
                        Name: ko.observable(cons.model.Of.Target.Name)
                    }
                },
                From: {
                    Target: {
                        Guid: ko.observable(cons.model.From.Target.Guid),
                        Name: ko.observable(cons.model.From.Target.Name)
                    }
                },
                With: {
                    Target: {
                        Guid: ko.observable(cons.model.With.Target.Guid),
                        Name: ko.observable(cons.model.With.Target.Name)
                    }
                },
                By: {
                    Target: {
                        Guid: ko.observable(cons.model.By.Target.Guid),
                        Name: ko.observable(cons.model.By.Target.Name)
                    }
                },
                To: {
                    Target: {
                        Guid: ko.observable(cons.model.To.Target.Guid),
                        Name: ko.observable(cons.model.To.Target.Name)
                    }
                },
                ClaimType: {
                    Target: {
                        Guid: ko.observable(cons.model.ClaimType.Target.Guid),
                        Name: ko.observable(cons.model.ClaimType.Target.Name)
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
                        Second: ko.observable(cons.model.Time.Target.Second)
                    }
                },
                Section: {
                    Target: {
                        Guid: ko.observable(cons.model.Section.Target.Guid),
                        Name: ko.observable(cons.model.Section.Target.Name)
                    }
                }
            };
            this.handler = cons.handler;
            this.inlineAgentSelector = this.handler.inlineAgentSelector;
            this.list = {
                Agents: ko.observableArray([emptyItem]),
                ClaimTypes: ko.observableArray([emptyItem]),
                Places: ko.observableArray([emptyItem]),
                ClaimRoles: ko.observableArray([]),

                Around: ko.observableArray([]),
                Months: ko.observableArray([]),
                Seasons: ko.observableArray([]),
                Sections: ko.observableArray([])
            };
        }
        Edit.prototype.bind = function (data) {
            if (data.list) {
                var list = data.list;
                if (list.ClaimRoles) {
                    setList(this.model.Entity.Role, this.list.ClaimRoles, list.ClaimRoles);
                }
                if (list.Around) {
                    setList(this.model.Time.Target.Around, this.list.Around, list.Around);
                }
                if (list.Seasons) {
                    setList(this.model.Time.Target.Season, this.list.Seasons, list.Seasons);
                }
                if (list.Months) {
                    setList(this.model.Time.Target.Month, this.list.Months, list.Months);
                }
                if (list.Sections) {
                    setList(this.model.Time.Target.Section, this.list.Sections, list.Sections);
                }
                if (list.Agents) {
                    this.updateAgents(list.Agents);
                }
                if (list.ClaimTypes) {
                    this.updateClaimTypes(list.ClaimTypes);
                }
                if (list.Places) {
                    this.updatePlaces(list.Places);
                }
            }
            if (data.model) {
                var model = data.model;
                if (model.Entity) {
                    this.model.Entity.Guid = model.Entity.Guid;
                    this.model.Entity.Name(model.Entity.Name);
                    this.model.Entity.Role(model.Entity.Role);
                }
                if (model.Subject) {
                    if (model.Subject.Target) {
                        this.model.Subject.Target.Guid(model.Subject.Target.Guid);
                        this.model.Subject.Target.Name(model.Subject.Target.Name);
                    }
                    if (model.Subject.Relation) {
                        this.model.Subject.Relation.AgentRole(model.Subject.Relation.AgentRole);
                    }
                }
                if (model.Object) {
                    if (model.Object.Target) {
                        this.model.Object.Target.Guid(model.Object.Target.Guid);
                        this.model.Object.Target.Name(model.Object.Target.Name);
                    }
                    if (model.Object.Relation) {
                        this.model.Object.Relation.AgentRole(model.Object.Relation.AgentRole);
                    }
                }
                if (model.AccordingTo) {                    
                    if (model.AccordingTo.Target) {
                        this.model.AccordingTo.Target.Guid(model.AccordingTo.Target.Guid);
                        this.model.AccordingTo.Target.Name(model.AccordingTo.Target.Name);
                    }
                }
                if (model.At) {
                    if (model.At.Target) {
                        this.model.At.Target.Guid(model.At.Target.Guid);
                        this.model.At.Target.Name(model.At.Target.Name);
                    }
                }
                if (model.Of) {
                    if (model.Of.Target) {
                        this.model.Of.Target.Guid(model.Of.Target.Guid);
                        this.model.Of.Target.Name(model.Of.Target.Name);
                    }
                }
                if (model.From) {
                    if (model.From.Target) {
                        this.model.From.Target.Guid(model.From.Target.Guid);
                        this.model.From.Target.Name(model.From.Target.Name);
                    }
                }
                if (model.With) {
                    if (model.With.Target) {
                        this.model.With.Target.Guid(model.With.Target.Guid);
                        this.model.With.Target.Name(model.With.Target.Name);
                    }
                }
                if (model.By) {
                    if (model.By.Target) {
                        this.model.By.Target.Guid(model.By.Target.Guid);
                        this.model.By.Target.Name(model.By.Target.Name);
                    }
                }
                if (model.To) {
                    if (model.To.Target) {
                        this.model.To.Target.Guid(model.To.Target.Guid);
                        this.model.To.Target.Name(model.To.Target.Name);
                    }
                }
                if (model.ClaimType) {
                    if (model.ClaimType.Target) {
                        this.model.ClaimType.Target.Guid(model.ClaimType.Target.Guid);
                        this.model.ClaimType.Target.Name(model.ClaimType.Target.Name);
                    }
                }
                if (model.Section) {
                    if (model.Section.Target) {
                        this.model.Section.Target.Guid(model.Section.Target.Guid);
                        this.model.Section.Target.Name(model.Section.Target.Name);
                    }
                }
                if (model.Time) {
                    if (model.Time.Target) {
                        this.model.Time.Target.Guid(model.Time.Target.Guid);
                        
                    }
                }
            }
        };
        Edit.prototype.updateAgents = function (items) {
            if (items) {
                items.forEach(x => addToList("selected/agents", x));
            }
            var agents = JSON.parse(sessionStorage.getItem("selected/agents")) || [];
            agents.splice(0, 0, emptyItem);
            this.list.Agents(agents);
        };
        Edit.prototype.updateClaimTypes = function (items) {
            if (items) {
                items.forEach(x => addToList("selected/claim-types", x));
            }
            var list = JSON.parse(sessionStorage.getItem("selected/claim-types")) || [];
            list.splice(0, 0, emptyItem);
            this.list.ClaimTypes(list);
        };
        Edit.prototype.updatePlaces = function (items) {
            if (items) {
                items.forEach(x => addToList("selected/places", x));
            }
            var list = JSON.parse(sessionStorage.getItem("selected/places")) || [];
            list.splice(0, 0, emptyItem);
            this.list.Places(list);
        };
        Edit.prototype.addAgent = function (item) {
            addToList("selected/agents", item);
        };
        Edit.prototype.addClaimType = function (item) {
            addToList("selected/claim-types", item);
        };
        Edit.prototype.addPlace = function (item) {
            addToList("selected/places", item);
        };
        Edit.prototype.setDefaults = function (cons) {
            cons = cons || {};
            cons.model = cons.model || {};
            cons.model.Entity = cons.model.Entity || {};

            cons.model.Subject = cons.model.Subject || {};
            cons.model.Subject.Target = cons.model.Subject.Target || {};
            cons.model.Subject.Relation = cons.model.Subject.Relation || {};

            cons.model.Object = cons.model.Object || {};
            cons.model.Object.Target = cons.model.Object.Target || {};
            cons.model.Object.Relation = cons.model.Object.Relation || {};

            cons.model.About = cons.model.At || {};
            cons.model.About.Target = cons.model.About.Target || {};
            cons.model.About.Relation = cons.model.About.Relation || {};

            cons.model.AccordingTo = cons.model.AccordingTo || {};
            cons.model.AccordingTo.Target = cons.model.AccordingTo.Target || {};
            cons.model.AccordingTo.Relation = cons.model.AccordingTo.Relation || {};

            cons.model.At = cons.model.At || {};
            cons.model.At.Target = cons.model.At.Target || {};
            cons.model.At.Relation = cons.model.At.Relation || {};

            cons.model.Of = cons.model.Of || {};
            cons.model.Of.Target = cons.model.Of.Target || {};
            cons.model.Of.Relation = cons.model.Of.Relation || {};

            cons.model.From = cons.model.From || {};
            cons.model.From.Target = cons.model.From.Target || {};
            cons.model.From.Relation = cons.model.From.Relation || {};

            cons.model.With = cons.model.With || {};
            cons.model.With.Target = cons.model.With.Target || {};
            cons.model.With.Relation = cons.model.With.Relation || {};

            cons.model.By = cons.model.By || {};
            cons.model.By.Target = cons.model.By.Target || {};
            cons.model.By.Relation = cons.model.By.Relation || {};

            cons.model.To = cons.model.To || {};
            cons.model.To.Target = cons.model.To.Target || {};
            cons.model.To.Relation = cons.model.To.Relation || {};

            cons.model.ClaimType = cons.model.ClaimType || {};
            cons.model.ClaimType.Target = cons.model.ClaimType.Target || {};

            cons.model.Time = cons.model.Time || {};
            cons.model.Time.Target = cons.model.Time.Target || {};

            cons.model.Section = cons.model.Section || {};
            cons.model.Section.Target = cons.model.Section.Target || {};
        };
        Edit.prototype.swapClicked = function () {
            var sub = this.model.Subject.Target.Guid();
            var obj = this.model.Object.Target.Guid();
            this.model.Subject.Target.Guid(obj);
            this.model.Object.Target.Guid(sub);
        };
        Edit.prototype.searchAccordingToClicked = function () {
            this.loadAccordingTo("Find According To (Agent)", "search");
        };
        Edit.prototype.addAccordingToClicked = function () {
            this.loadAccordingTo("Add According To (Agent)", "quickAdd");
        };
        Edit.prototype.loadAccordingTo = function (name, tabMode) {
            var _ = this;
            this.loadAgent(name, tabMode, function (guid, name) {
                _.model.AccordingTo.Target.Guid(guid);
                _.model.AccordingTo.Target.Name(name);
            });
        };
        Edit.prototype.searchAboutClicked = function () {
            this.loadAbout("Find About (Agent)", "search");
        };
        Edit.prototype.addAboutClicked = function () {
            this.loadAbout("Add About (Agent)", "quickAdd");
        };
        Edit.prototype.loadAbout = function (name, tabMode) {
            var _ = this;
            this.loadAgent(name, tabMode, function (guid, name) {
                _.model.About.Target.Guid(guid);
                _.model.About.Target.Name(name);
            });
        };
        Edit.prototype.searchByClicked = function () {
            this.loadBy("Find By (Agent)", "search");
        };
        Edit.prototype.addByClicked = function () {
            this.loadBy("Add By (Agent)", "quickAdd");
        };
        Edit.prototype.loadBy = function (name, tabMode) {
            var _ = this;
            this.loadAgent(name, tabMode, function (guid, name) {
                _.model.By.Target.Guid(guid);
                _.model.By.Target.Name(name);
            });
        };
        Edit.prototype.loadAgent = function (name, tabMode, callback) {
            var _ = this;
            require(["modals/search-agents"], function (AgentModal) {
                var agentGuids = _.inlineAgentSelector().map(function (item) { return item.value; });
                openModal("/Static/Templates/Agent/SearchModal.html", {
                    name: name,
                    ajaxContentAdded: function (element) {
                        var modal = new AgentModal({
                            popup: element,
                            tabs: ["search", "recentlyUsed", "quickAdd", "sourceAgents"],
                            currentTab: "sourceAgents",
                            tab: {
                                sourceAgents: {
                                    filter: {
                                        Guids: agentGuids
                                    }
                                }
                            },
                            handler: {
                                onSelected: function (guid, name) {
                                    closeModal(element);
                                    _.addAgent({ Text: name, Value: guid });
                                    _.updateAgents();
                                    callback(guid, name);
                                }
                            }
                        });
                        ko.applyBindings(modal, element);
                        modal.start();
                    }
                });
            });
        };
        Edit.prototype.searchFromClicked = function () {
            this.loadFrom("Find From (Agent)", "search");
        };
        Edit.prototype.addFromClicked = function () {
            this.loadFrom("Add From (Agent)", "quickAdd");
        };
        Edit.prototype.loadFrom = function (name, tabMode) {
            var _ = this;
            this.loadAgent(name, tabMode, function (guid, name) {
                _.model.From.Target.Guid(guid);
                _.model.From.Target.Name(name);
            });
        };
        Edit.prototype.searchSubjectClicked = function () {
            this.loadSubject("Find Subject", "search");
        };
        Edit.prototype.addSubjectClicked = function () {
            this.loadSubject("Add Subject", "quickAdd");
        };
        Edit.prototype.loadSubject = function (name, tabMode) {
            var _ = this;
            this.loadAgent(name, tabMode, function (guid, name) {
                _.model.Subject.Target.Guid(guid);
                _.model.Subject.Target.Name(name);
            });
        };
        Edit.prototype.searchObjectClicked = function () {
            this.loadObject("Find Object", "search");
        };
        Edit.prototype.addObjectClicked = function () {
            this.loadObject("Add Object", "quickAdd");
        };
        Edit.prototype.loadObject = function (name, tabMode) {
            var _ = this;
            this.loadAgent(name, tabMode, function (guid, name) {
                _.model.Object.Target.Guid(guid);
                _.model.Object.Target.Name(name);
            });
        };
        Edit.prototype.searchClaimTypeClicked = function () {
            this.loadClaimType("Find Action", "search");
        };
        Edit.prototype.addClaimTypeClicked = function () {
            this.loadClaimType("Add Action", "quickAdd");
        };
        Edit.prototype.loadClaimType = function (name, tabMode) {
            var _ = this;
            require(["modals/search-concepts"], function (ConceptModal) {
                openModal("/Static/Templates/Concept/SearchModal.html", {
                    name: name,
                    ajaxContentAdded: function (element) {
                        var modal = new ConceptModal({
                            popup: element,
                            tabModal: tabMode,
                            filter: {
                                ChildrenOfCode: "event"
                            },
                            handler: {
                                onSelected: function (guid, name) {
                                    _.addClaimType({ Text: name, Value: guid });
                                    _.updateClaimTypes();
                                    _.model.ClaimType.Target.Guid(guid);
                                    _.model.ClaimType.Target.Name(name);
                                    closeModal(element);
                                }
                            }
                        });
                        ko.applyBindings(modal, element);
                    }
                });
            });
        };
        Edit.prototype.addSectionClicked = function () {

        };
        Edit.prototype.addOfClicked = function () {
            this.loadOf("Add Of (Cause)", "quickAdd");
        };
        Edit.prototype.searchOfClicked = function () {
            this.loadOf("Find Of (Cause)", "search");
        };
        Edit.prototype.loadOf = function (name, tabMode) {
            var _ = this;
            this.loadAgent(name, tabMode, function (guid, name) {
                _.model.Of.Target.Guid(guid);
                _.model.Of.Target.Name(name);
            });
        };
        Edit.prototype.addAtClicked = function () {
            this.loadAt("Add At (Place)", "quickAdd");
        };
        Edit.prototype.searchAtClicked = function () {
            this.loadAt("Find At (Place)", "search");
        };
        Edit.prototype.loadAt = function (name, tabMode) {
            var _ = this;
            this.loadAgent(name, tabMode, function (guid, name) {
                _.model.At.Target.Guid(guid);
                _.model.At.Target.Name(name);
            });
        };
        Edit.prototype.addToClicked = function () {
            this.loadTo("Add To (Agent)", "quickAdd");
        };
        Edit.prototype.searchToClicked = function () {
            this.loadTo("Find To (Agent)", "search");
        };
        Edit.prototype.loadTo = function (name, tabMode) {
            var _ = this;
            this.loadAgent(name, tabMode, function (guid, name) {
                _.model.To.Target.Guid(guid);
                _.model.To.Target.Name(name);
            });
        };
        Edit.prototype.addWithClicked = function () {
            this.loadWith("Add With (Agent)", "quickAdd");
        };
        Edit.prototype.searchWithClicked = function () {
            this.loadWith("Find With (Agent)", "search");
        };
        Edit.prototype.loadWith = function (name, tabMode) {
            var _ = this;
            this.loadAgent(name, tabMode, function (guid, name) {
                _.model.With.Target.Guid(guid);
                _.model.With.Target.Name(name);
            });
        };
        Edit.prototype.submitClicked = function () {
            this.saveClicked();
        };
        Edit.prototype.closeClicked = function () {
            $(this.popup).modal("hide");
        };
        Edit.prototype.saveClicked = function () {
            this.save();
        };
        Edit.prototype.clearForFollowingClaim = function () {
            this.model.Entity.Guid = null;
            this.model.Subject.Target.Guid(null);
            this.model.Subject.Relation.AgentRole(null);
            this.model.Object.Target.Guid(null);
            this.model.Object.Relation.AgentRole(null);            
            this.model.About.Target.Guid(null);            
            this.model.Of.Target.Guid(null);
            this.model.From.Target.Guid(null);
            this.model.With.Target.Guid(null);
            this.model.By.Target.Guid(null);
            this.model.To.Target.Guid(null);
        };
        Edit.prototype.save = function () {
            var _this = this;
            var model = ko.toJS(this.model);
            if (false == this.form.AndThen()) {
                model.PrecedingClaim = null;
            }
            $.post("/Admin/Claim/Edit", model, function (response) {
                console.log(response);
                if (!response.Success) {
                    alert("There was an error ...");
                    return;
                }
                var guid = response.Data.Guid;
                if (_this.form.AndThen()) {
                    _this.model.PrecedingClaim.Guid = guid;
                    _this.chain.push(guid);
                    _this.clearForFollowingClaim();
                    return;
                }
                _this.handler.onSelected(guid, model.Entity.Name);
            });
        };
        return Edit;
    })();

    return Edit;
}));
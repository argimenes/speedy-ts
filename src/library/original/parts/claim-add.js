(function (factory) {
    define("parts/claim-add", ["knockout", "jquery", "pubsub", "app/helpers", "app/utils"], factory);
}(function (ko, $, pubsub, Helper, Utils) {

    var openModal = Helper.openModal;
    var setList = Helper.setList;
    var any = Utils.any;
    var emptyItem = { Text: null, Value: null };

    const div = (config) => {
        return newElement("DIV", config);
    }

    const span = (config) => {
        return newElement("SPAN", config);
    }

    const newElement = (type, config) => {
        var el = document.createElement(type);
        return updateElement(el, config);
    };

    const applyBindings = (html, model) => {
        var node = newElement("DIV", { innerHTML: html });
        ko.applyBindings(model, node);
        return node;
    }

    const updateElement = (el, config) => {
        config = config || {};
        if (config.property) {
            el.property = config.property;
        }
        if (config.innerHTML) {
            el.innerHTML = config.innerHTML;
        }
        if (config.style) {
            for (var key in config.style) {
                el.style[key] = config.style[key];
            }
        }
        if (config.handler) {
            for (var key in config.handler) {
                el.addEventListener(key, config.handler[key]);
            }
        }
        if (config.attribute) {
            for (var key in config.attribute) {
                el.setAttribute(key, config.attribute[key]);
            }
        }
        if (config.dataset) {
            for (var key in config.dataset) {
                el.dataset[key] = config.dataset[key];
            }
        }
        if (config.classList) {
            config.classList.forEach(x => el.classList.add(x));
        }
        if (config.children) {
            config.children.forEach(x => el.appendChild(x));
        }
        return el;
    };

    const extendElement = (source, config) => {
        var el = source.cloneNode(true);
        return updateElement(el, config);
    };

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

    var QuickAdd = (function () {
        function QuickAdd(cons) {
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
                        Name: ko.observable(cons.model.Subject.Target.Name),
                    },
                    Relation: {
                        AgentRole: ko.observable(cons.model.Subject.Relation.AgentRole)
                    }
                },
                Object: {
                    Target: {
                        Guid: ko.observable(cons.model.Object.Target.Guid),
                        Name: ko.observable(cons.model.Object.Target.Name),
                    },
                    Relation: {
                        AgentRole: ko.observable(cons.model.Object.Relation.AgentRole)
                    }
                },
                AccordingTo: {
                    Target: {
                        Guid: ko.observable(cons.model.AccordingTo.Target.Guid),
                        Name: ko.observable(cons.model.AccordingTo.Target.Name),
                    }
                },
                About: {
                    Target: {
                        Guid: ko.observable(cons.model.About.Target.Guid),
                        Name: ko.observable(cons.model.About.Target.Name),
                    }
                },
                At: {
                    Target: {
                        Guid: ko.observable(cons.model.At.Target.Guid),
                        Name: ko.observable(cons.model.At.Target.Name),
                    }
                },
                Of: {
                    Target: {
                        Guid: ko.observable(cons.model.Of.Target.Guid),
                        Name: ko.observable(cons.model.Of.Target.Name),
                    }
                },
                From: {
                    Target: {
                        Guid: ko.observable(cons.model.From.Target.Guid),
                        Name: ko.observable(cons.model.From.Target.Name),
                    }
                },
                With: {
                    Target: {
                        Guid: ko.observable(cons.model.With.Target.Guid),
                        Name: ko.observable(cons.model.With.Target.Name),
                    }
                },
                By: {
                    Target: {
                        Guid: ko.observable(cons.model.By.Target.Guid),
                        Name: ko.observable(cons.model.By.Target.Name),
                    }
                },
                To: {
                    Target: {
                        Guid: ko.observable(cons.model.To.Target.Guid),
                        Name: ko.observable(cons.model.To.Target.Name),
                    }
                },
                ClaimType: {
                    Target: {
                        Guid: ko.observable(cons.model.ClaimType.Target.Guid),
                        Name: ko.observable(cons.model.ClaimType.Target.Name),
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
        QuickAdd.prototype.setLists = function (list) {
            setList(this.model.Entity.Role, this.list.ClaimRoles, list.ClaimRoles);
            setList(this.model.Time.Target.Around, this.list.Around, list.Around);
            setList(this.model.Time.Target.Season, this.list.Seasons, list.Seasons);
            setList(this.model.Time.Target.Month, this.list.Months, list.Months);
            setList(this.model.Time.Target.Section, this.list.Sections, list.Sections);
            this.updateAgents();
            this.updateClaimTypes();
            this.updatePlaces();
        };
        QuickAdd.prototype.updateAgents = function () {
            var agents = JSON.parse(sessionStorage.getItem("selected/agents")) || [];
            agents.splice(0, 0, emptyItem);
            this.list.Agents(agents);
        };
        QuickAdd.prototype.updateClaimTypes = function () {
            var list = JSON.parse(sessionStorage.getItem("selected/claim-types")) || [];
            list.splice(0, 0, emptyItem);
            this.list.ClaimTypes(list);
        };
        QuickAdd.prototype.updatePlaces = function () {
            var list = JSON.parse(sessionStorage.getItem("selected/places")) || [];
            list.splice(0, 0, emptyItem);
            this.list.Places(list);
        };
        QuickAdd.prototype.addAgent = function (item) {
            addToList("selected/agents", item);
        };
        QuickAdd.prototype.addClaimType = function (item) {
            addToList("selected/claim-types", item);
        };
        QuickAdd.prototype.addPlace = function (item) {
            addToList("selected/places", item);
        };
        QuickAdd.prototype.setDefaults = function (cons) {
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
        QuickAdd.prototype.swapClicked = function () {
            var sub = this.model.Subject.Target.Guid();
            var obj = this.model.Object.Target.Guid();
            this.model.Subject.Target.Guid(obj);
            this.model.Object.Target.Guid(sub);
        };
        QuickAdd.prototype.searchAccordingToClicked = function () {
            this.loadAccordingTo("Find According To (Agent)", "search");
        };
        QuickAdd.prototype.addAccordingToClicked = function () {
            this.loadAccordingTo("Add According To (Agent)", "quickAdd");
        };
        QuickAdd.prototype.loadAccordingTo = function (name, tabMode) {
            var _ = this;
            this.loadAgent(name, tabMode, function (guid, name) {
                _.model.AccordingTo.Target.Guid(guid);
                _.model.AccordingTo.Target.Name(name);
            });
        };
        QuickAdd.prototype.searchAboutClicked = function () {
            this.loadAbout("Find About (Agent)", "search");
        };
        QuickAdd.prototype.addAboutClicked = function () {
            this.loadAbout("Add About (Agent)", "quickAdd");
        };
        QuickAdd.prototype.loadAbout = function (name, tabMode) {
            var _ = this;
            this.loadAgent(name, tabMode, function (guid, name) {
                _.model.About.Target.Guid(guid);
                _.model.About.Target.Name(name);
            });
        };
        QuickAdd.prototype.searchByClicked = function () {
            this.loadBy("Find By (Agent)", "search");
        };
        QuickAdd.prototype.addByClicked = function () {
            this.loadBy("Add By (Agent)", "quickAdd");
        };
        QuickAdd.prototype.loadBy = function (name, tabMode) {
            var _ = this;
            this.loadAgent(name, tabMode, function (guid, name) {
                _.model.By.Target.Guid(guid);
                _.model.By.Target.Name(name);
            });
        };
        QuickAdd.prototype.loadAgent = function (name, tabMode, callback) {
            var _this = this;
            require(["modals/search-agents", "jquery-ui"], function (AgentModal) {
                $.get("/Static/Templates/Agent/search-panel.html?v=28", function (html) {
                    var agentGuids = _this.inlineAgentSelector ? _this.inlineAgentSelector().map(function (item) { return item.Entity.Guid; }) : [];
                    var container = div({
                        classList: ["text-window"],
                        style: {
                            position: "absolute",
                            zIndex: 32,
                            top: "200px",
                            right: "20px",
                            width: "800px",
                            maxHeight: "600px"
                        }
                    });
                    var modal = new AgentModal({
                        popup: container,
                        tabs: ["search", "quickAdd"],
                        currentTab: "search",
                        tab: {
                            search: {
                                filter: {
                                    Inline: true,
                                    Guids: agentGuids
                                }
                            },
                        },
                        handler: {
                            inlineAgentSelector: _this.inlineAgentSelector,
                            onSelected: function (guid, name) {
                                _this.addAgent({ Text: name, Value: guid });
                                _this.updateAgents();
                                callback(guid, name);
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
        };
        QuickAdd.prototype.searchFromClicked = function () {
            this.loadFrom("Find From (Agent)", "search");
        };
        QuickAdd.prototype.addFromClicked = function () {
            this.loadFrom("Add From (Agent)", "quickAdd");
        };
        QuickAdd.prototype.loadFrom = function (name, tabMode) {
            var _ = this;
            this.loadAgent(name, tabMode, function (guid, name) {
                _.model.From.Target.Guid(guid);
                _.model.From.Target.Name(name);
            });
        };
        QuickAdd.prototype.searchSubjectClicked = function () {
            this.loadSubject("Find Subject", "search");
        };
        QuickAdd.prototype.addSubjectClicked = function () {
            this.loadSubject("Add Subject", "quickAdd");
        };
        QuickAdd.prototype.loadSubject = function (name, tabMode) {
            var _ = this;
            this.loadAgent(name, tabMode, function (guid, name) {
                _.model.Subject.Target.Guid(guid);
                _.model.Subject.Target.Name(name);
            });
        };
        QuickAdd.prototype.searchObjectClicked = function () {
            this.loadObject("Find Object", "search");
        };
        QuickAdd.prototype.addObjectClicked = function () {
            this.loadObject("Add Object", "quickAdd");
        };
        QuickAdd.prototype.loadObject = function (name, tabMode) {
            var _ = this;
            this.loadAgent(name, tabMode, function (guid, name) {
                _.model.Object.Target.Guid(guid);
                _.model.Object.Target.Name(name);
            });
        };
        QuickAdd.prototype.searchClaimTypeClicked = function () {
            this.loadClaimType("Find Action", "search");
        };
        QuickAdd.prototype.addClaimTypeClicked = function () {
            this.loadClaimType("Add Action", "quickAdd");
        };
        QuickAdd.prototype.loadClaimType = function (name, tabMode) {
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
        QuickAdd.prototype.addSectionClicked = function () {

        };
        QuickAdd.prototype.addOfClicked = function () {
            this.loadOf("Add Of (Cause)", "quickAdd");
        };
        QuickAdd.prototype.searchOfClicked = function () {
            this.loadOf("Find Of (Cause)", "search");
        };
        QuickAdd.prototype.loadOf = function (name, tabMode) {
            var _ = this;
            this.loadAgent(name, tabMode, function (guid, name) {
                _.model.Of.Target.Guid(guid);
                _.model.Of.Target.Name(name);
            });
        };
        QuickAdd.prototype.addAtClicked = function () {
            this.loadAt("Add At (Place)", "quickAdd");
        };
        QuickAdd.prototype.searchAtClicked = function () {
            this.loadAt("Find At (Place)", "search");
        };
        QuickAdd.prototype.loadAt = function (name, tabMode) {
            var _ = this;
            this.loadAgent(name, tabMode, function (guid, name) {
                _.model.At.Target.Guid(guid);
                _.model.At.Target.Name(name);
            });
        };
        QuickAdd.prototype.addToClicked = function () {
            this.loadTo("Add To (Agent)", "quickAdd");
        };
        QuickAdd.prototype.searchToClicked = function () {
            this.loadTo("Find To (Agent)", "search");
        };
        QuickAdd.prototype.loadTo = function (name, tabMode) {
            var _ = this;
            this.loadAgent(name, tabMode, function (guid, name) {
                _.model.To.Target.Guid(guid);
                _.model.To.Target.Name(name);
            });
        };
        QuickAdd.prototype.addWithClicked = function () {
            this.loadWith("Add With (Agent)", "quickAdd");
        };
        QuickAdd.prototype.searchWithClicked = function () {
            this.loadWith("Find With (Agent)", "search");
        };
        QuickAdd.prototype.loadWith = function (name, tabMode) {
            var _ = this;
            this.loadAgent(name, tabMode, function (guid, name) {
                _.model.With.Target.Guid(guid);
                _.model.With.Target.Name(name);
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
        QuickAdd.prototype.clearForFollowingClaim = function () {
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
        QuickAdd.prototype.save = function () {
            var _this = this;
            var model = ko.toJS(this.model);
            if (false == this.form.AndThen()) {
                model.PrecedingClaim = null;
            }
            $.post("/Admin/Claim/QuickAdd", model, function (response) {
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
        return QuickAdd;
    })();

    return QuickAdd;
}));
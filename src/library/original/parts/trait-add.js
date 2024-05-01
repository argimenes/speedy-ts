(function (factory) {
    define("parts/trait-add", ["knockout", "jquery", "app/helpers", "app/utils"], factory);
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
            this.model = {
                Entity: {
                    Guid: cons.model.Entity.Guid,
                    Name: ko.observable(cons.model.Entity.Name),
                    Role: ko.observable("Trait")
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
                AccordingTo: {
                    Target: {
                        Guid: ko.observable(cons.model.AccordingTo.Target.Guid),
                        Name: ko.observable(cons.model.AccordingTo.Target.Name),
                    }
                },
                Trait: {
                    Target: {
                        Guid: ko.observable(cons.model.Trait.Target.Guid),
                        Name: ko.observable(cons.model.Trait.Target.Name),
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
                Traits: ko.observableArray([emptyItem]),

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
            this.updateAgents();
            this.updateTraits();
        };
        QuickAdd.prototype.updateAgents = function () {
            var agents = JSON.parse(sessionStorage.getItem("selected/agents")) || [];
            agents.splice(0, 0, emptyItem);
            this.list.Agents(agents);
        };
        QuickAdd.prototype.updateTraits = function () {
            var list = JSON.parse(sessionStorage.getItem("selected/traits")) || [];
            list.splice(0, 0, emptyItem);
            this.list.Traits(list);
        };
        QuickAdd.prototype.addAgent = function (item) {
            addToList("selected/agents", item);
        };
        QuickAdd.prototype.addTrait = function (item) {
            addToList("selected/traits", item);
        };
        QuickAdd.prototype.setDefaults = function (cons) {
            cons = cons || {};
            cons.model = cons.model || {};
            cons.model.Entity = cons.model.Entity || {};

            cons.model.Subject = cons.model.Subject || {};
            cons.model.Subject.Target = cons.model.Subject.Target || {};
            cons.model.Subject.Relation = cons.model.Subject.Relation || {};

            cons.model.AccordingTo = cons.model.AccordingTo || {};
            cons.model.AccordingTo.Target = cons.model.AccordingTo.Target || {};
            cons.model.AccordingTo.Relation = cons.model.AccordingTo.Relation || {};

            cons.model.Trait = cons.model.Trait || {};
            cons.model.Trait.Target = cons.model.Trait.Target || {};

            cons.model.Time = cons.model.Time || {};
            cons.model.Time.Target = cons.model.Time.Target || {};

            cons.model.Section = cons.model.Section || {};
            cons.model.Section.Target = cons.model.Section.Target || {};
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
        QuickAdd.prototype.searchTraitClicked = function () {
            this.loadTrait("Find Trait", "search");
        };
        QuickAdd.prototype.addTraitClicked = function () {
            this.loadTrait("Add Trait", "quickAdd");
        };
        QuickAdd.prototype.loadTrait = function (name, tabMode) {
            var _ = this;
            openModal("/Static/Templates/Concept/SearchModal.html", {
                name: name,
                ajaxContentAdded: function (element) {
                    require(["modals/search-concepts"], function (ConceptModal) {
                        var modal = new ConceptModal({
                            popup: element,
                            currentTab: tabMode, 
                            tab: {
                                quickAdd: {
                                    filter: _.model.Entity.Name
                                }
                            },
                            handler: {
                                onSelected: function (guid, name) {
                                    _.addTrait({ Text: name, Value: guid });
                                    _.updateTraits();
                                    _.model.Trait.Target.Guid(guid);
                                    _.model.Trait.Target.Name(name);
                                    closeModal(element);
                                }
                            }
                        });
                        ko.applyBindings(modal, element);
                    });                    
                }
            });
        };
        QuickAdd.prototype.addSectionClicked = function () {

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
            var _this = this;
            var model = ko.toJS(this.model);
            $.post("/Admin/Claim/QuickAddTrait", model, function (response) {
                console.log(response);
                if (!response.Success) {
                    alert("There was an error ...");
                    return;
                }
                var guid = response.Data.Guid;
                _this.handler.onSelected(guid, model.Entity.Name);
            });
        };
        return QuickAdd;
    })();

    return QuickAdd;
}));
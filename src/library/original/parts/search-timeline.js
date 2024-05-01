(function (factory) {
    define("parts/search-timeline", ["jquery", "knockout", "app/helpers", "parts/window-manager", "pubsub", "knockout/speedy-viewer", "jquery-ui"], factory);
}(function ($, ko, Helper, _WindowManager, pubsub) {

    const { div, setList } = Helper;
    const WindowManager = _WindowManager.getWindowManager();
    const emptyItem = { Text: null, Value: null };

    function addToList(key, item) {
        var list = JSON.parse(sessionStorage.getItem(key)) || [];
        if (list.some(x => JSON.stringify(x) == JSON.stringify(item))) {
            return;
        }
        list.splice(0, 0, item);
        sessionStorage.setItem(key, JSON.stringify(list));
    }

    function closeModal(element) {
        $(element).modal("hide");
        ko.cleanNode(element);
        element.remove();
    }

    class Component {
        constructor(cons) {
            cons = cons || {};
            cons.filter = cons.filter || {};
            this.win = null;
            this.list = {
                months: ko.observableArray([]),
                agents: ko.observableArray([]),
                agentRoles: ko.observableArray([]),
                claimTypes: ko.observableArray([]),
                sections: ko.observableArray([]),
            };
            this.filter = {
                agentName: ko.observable(cons.filter.agentName),
                agentGuid: ko.observable(cons.filter.agentGuid),
                sectionGuid: ko.observable(cons.filter.sectionGuid),
                agentRole: ko.observable(cons.filter.agentRole),
                claimTypeGuid: ko.observable(cons.filter.claimTypeGuid),
                year: ko.observable(cons.filter.year),
                month: ko.observable(cons.filter.month),
                day: ko.observable(cons.filter.day)
            };
            this.container = div({
                style: {
                    position: "absolute",
                    top: 0,
                    right: 0,
                    width: "550px",
                    height: "100%",
                    padding: "10px",
                    backgroundColor: "#fff",
                    zIndex: WindowManager.getNextIndex()
                },
                classList: ["text-window"]
            });
            this.items = ko.observableArray([]);
            this.glass = false;
            this.setup();
        }
        setup() {
            this.setupLists();
        }
        setupLists() {
            const _this = this;
            $.get("/Admin/Time/SearchModalLists", response => {
                if (!response.Success) {
                    return;
                }
                const list = response.Data;
                _this.setLists(list);
            });
        }
        setLists(list) {
            const agents = [emptyItem, { Text: this.filter.agentName, Value: this.filter.agentGuid }];
            setList(this.filter.agentGuid, this.list.agents, agents);
            setList(this.filter.agentRole, this.list.agentRoles, this.getAgentRoles());
            setList(this.filter.month, this.list.months, list.Months);
            setList(this.filter.sectionGuid, this.list.sections, list.Sections);
            this.setClaimTypes();
        }
        setAgents() {
            var agents = JSON.parse(sessionStorage.getItem("selected/agents")) || [];
            agents.splice(0, 0, emptyItem);
            setList(this.filter.agentGuid, this.list.agents, agents);
        }
        setClaimTypes() {
            var list = JSON.parse(sessionStorage.getItem("selected/claim-types")) || [];
            list.splice(0, 0, emptyItem);
            setList(this.filter.claimTypeGuid, this.list.claimTypes, list);
        }
        addAgent(item) {
            addToList("selected/agents", item);
        }
        addClaimType(item) {
            addToList("selected/claim-types", item);
        }
        loadAgentClicked() {
            this.loadAgent();
        }
        loadAgent() {
            var _this = this;
            require(["modals/search-agents", "jquery-ui"], function (AgentModal) {
                $.get("/Static/Templates/Agent/search-panel.html?v=29", function (html) {
                    var container = div({
                        classList: ["text-window"],
                        style: {
                            position: "absolute",
                            zIndex: 32,
                            top: "200px",
                            right: "300px",
                            width: "800px",
                            maxHeight: "600px"
                        }
                    });
                    var modal = new AgentModal({
                        popup: container,
                        tabs: ["search"],
                        currentTab: "search",
                        tab: {
                            search: {
                                filter: {

                                }
                            },
                        },
                        handler: {
                            onSelected: function (guid, name) {
                                _this.addAgent({ Text: name, Value: guid });
                                _this.filter.agentGuid(guid);
                                _this.setAgents();
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
        }
        loadClaimTypeClicked() {
            this.loadClaimType();
        }
        loadClaimType() {
            const _this = this;
            require(["modals/search-concepts"], function (ConceptModal) {
                openModal("/Static/Templates/Concept/SearchModal.html?v=1", {
                    name: "Action",
                    ajaxContentAdded: function (element) {
                        var modal = new ConceptModal({
                            popup: element,
                            tabModal: "Search",
                            filter: {
                                ChildrenOfCode: "event"
                            },
                            handler: {
                                onSelected: function (guid, name) {
                                    _this.addClaimType({ Text: name, Value: guid });
                                    _this.filter.claimTypeGuid(guid);
                                    _this.setClaimTypes();
                                    closeModal(element);
                                }
                            }
                        });
                        ko.applyBindings(modal, element);
                    }
                });
            });
        }
        getAgentRoles() {
            return [
                { Text: null, Value: null },
                { Text: "Subject", Value: 0 },
                { Text: "Object", Value: 1 },
                { Text: "With", Value: 2 },
                { Text: "By", Value: 3 },
                { Text: "At", Value: 4 },
                { Text: "From", Value: 5 },
                { Text: "Of", Value: 6 },
                { Text: "To", Value: 7 },
                { Text: "As", Value: 8 },
                { Text: "In", Value: 9 },
                { Text: "On", Value: 10 },
                { Text: "About", Value: 11 },
                { Text: "Under", Value: 12 },
                { Text: "According To", Value: 13 },
                { Text: "Dominant", Value: 14 },
                { Text: "Subordinate", Value: 15 }
            ];
        }
        agentSelected(item) {
            pubsub.publish("dock/load-entity", item.Agent.Guid);
        }
        textSelected(item) {
            pubsub.publish("load-text-window", { guid: item.TextGuid });
        }
        closeClicked() {
            this.win.close();
        }
        toggleGlassModeClicked() {
            this.glass = !this.glass;
            if (this.glass) {
                this.container.classList.add("glass-window");

            } else {
                this.container.classList.remove("glass-window");
            }
        }
        minimizeClicked() {
            this.win.minimize();
        }
        clearClicked() {
            this.clear();
        }
        clear() {
            this.filter.agentGuid(null);
            this.filter.claimTypeGuid(null);
            this.filter.agentRole(null);
            this.filter.day(null);
            this.filter.month(null);
            this.filter.year(null);
            this.items([]);
        }
        searchClicked() {
            this.search();
        }
        search() {
            const _this = this;
            const filter = ko.toJS(this.filter);
            $.get("/Admin/Agent/Timeline", filter, function (response) {
                console.log("/Admin/Agent/Timeline", { response });
                if (!response.Success) {
                    return;
                }
                _this.items(response.Data);
            });
        }
        load() {
            const _this = this;
            $.get("/Static/Templates/Agent/search-timeline-panel.html?v=6", html => {
                const node = div({
                    template: {
                        view: html,
                        model: _this
                    }
                });
                _this.container.appendChild(node);
                const win = _this.win = WindowManager.addWindow({
                    type: "timeline-sidebar",
                    node: _this.container,
                    draggable: {
                        node: node.querySelector("[data-role='handle']")
                    }
                });
                win.layer.container.appendChild(_this.container);
            });
        }
    }

    return Component;

}));
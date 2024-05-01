(function (factory) {
    define("components/linked-references", ["jquery", "knockout", "app/helpers", "pubsub", "knockout/speedy-viewer"], factory);
}(function ($, ko, Helper, pubsub) {

    /**
     * Manager for multiple linked references panels.
     * */

    const { div, generateUUID, groupBy } = Helper;

    const ResultState = {
        "NotLoaded": "NotLoaded",
        "Loading": "Loading",
        "Loaded": "Loaded"
    };

    class LinkedReference {
        constructor(cons) {
            cons = cons || {};
            cons.filter = cons.filter || {};
            this.manager = cons.manager;
            this.node = div({
                style: {
                    width: "100%",
                    padding: "5px",
                    backgroundColor: "#fff"
                }
            });
            this.filter = {
                agentGuid: ko.observable(cons.filter.agentGuid),
                infinite: ko.observable(false),
                page: ko.observable(1),
                pageRows: ko.observable(10),
                order: ko.observable("ByDateAdded"),
                direction: ko.observable("Descending")
            };
            this.state = {
                groups: ko.observable(ResultState.NotLoaded),
                loader: ko.observable("")
            };
            this.maxPage = ko.observable(1);
            this.agent = {
                guid: cons.agent.guid,
                name: cons.agent.name
            };
            this.handler = cons.handler;
            this.groups = ko.observableArray([]);
            this.setupLoops();
        }
        setupLoops() {
            const _this = this;
            window.setInterval(() => {
                if (_this.state.groups() == ResultState.Loading) {
                    _this.updateLoader();
                }
            }, 250);
        }
        addHandler(name, callback) {
            this.handler[name] = callback;
        }
        destroy() {
            this.node.remove();
        }
        closeClicked() {
            //if (this.handler.onCloseClicked) {
            //    this.handler.onCloseClicked({ component: this });
            //    return;
            //}
            this.destroy();
        }
        popoutClicked() {
            this.manager.popout(this);
        }
        removeTextClicked(item) {
            const textGroup = this.groups().find(x => x[1][0].TextGuid == item.TextGuid);
            this.groups.remove(textGroup);
            //const textBlockIndex = textGroup[1].findIndex(block => block.TextBlockGuid == item.TextBlockGuid);
            //textGroup[1].splice(textBlockIndex, 1);
            // const text = this.results().find(x => x.TextGuid == item.TextGuid);
            // this.results.remove(text);
            //this.groups.remove(text);
        }
        textSelected(item) {
            const guid = item[0];
            if (this.handler.onTextSelected) {
                this.handler.onTextSelected(guid);
                return;
            }
            this.loadTextWindow(guid);
        }
        popoutTextBlockClicked(item) {
            if (this.handler.onPopoutTextBlockClicked) {
                this.handler.onPopoutTextBlockClicked({ textBlockGuid: item.TextBlockGuid });
            }
        }
        getAgentHighlights(agentGuid, standoffProperties) {
            const agentProps = standoffProperties.filter(sp => sp.Type == "agent" && !sp.IsDeleted && sp.Value == agentGuid);
            const highlights = agentProps.map(ap => {
                return {
                    Guid: generateUUID(),
                    Type: "highlight",
                    StartIndex: ap.StartIndex,
                    EndIndex: ap.EndIndex,
                    Value: "yellow",
                    Attributes: []
                }
            });
            return highlights;
        }
        search() {
            this.fetchSearchResults();
        }
        loadMoreClicked() {
            if (!this.filter.page() >= this.maxPage()) {
                return;
            }
            this.filter.page(this.filter.page() + 1);
            this.fetchSearchResults();
        }
        fetchSearchResults() {
            const _this = this;
            var filter = ko.toJS(this.filter);
            filter.agentGuid = this.agentGuid || filter.agentGuid;
            if (this.state.groups() == ResultState.Loading) {
                return;
            }
            this.state.loader("");
            this.state.groups(ResultState.Loading);
            $.get("/Admin/Text/SearchTextBlocks", filter, response => {
                console.log("/Admin/Text/SearchTextBlocks", { response });
                if (!response.Success) {
                    return;
                }
                const data = response.Data;
                _this.setSearchResults(data);
            });
        }
        updateLoader() {
            this.state.loader(this.state.loader() + ".");
        }
        setSearchResults(data) {
            const _this = this;
            const results = data.Results;
            const agentGuid = this.filter.agentGuid();
            if (agentGuid) {
                results.forEach(tb => {
                    const highlights = _this.getAgentHighlights(agentGuid, tb.StandoffProperties);
                    tb.StandoffProperties = tb.StandoffProperties.concat(highlights);
                });
            }
            this.filter.page(data.Page);
            this.maxPage(data.MaxPage);
            const groups = Array.from(groupBy(results, x => x.TextGuid));
            this.state.groups(ResultState.Loaded);
            this.state.loader("");
            groups.forEach(group => _this.groups.push(group));
            //this.groups(groups);
            // this.results(results);
        }
        async mount(callback) {
            const response = await fetch("/Static/Templates/Component/linked-references-panel.html?v=6");
            const html = await response.text();
            const _node = div({
                template: {
                    view: html,
                    model: this
                }
            });
            this.node.appendChild(_node);
            callback(this.node);
        }
    }

    class Manager {
        constructor(cons) {
            cons = cons || {};
            this.client = cons.client;
            this.node = div({
                style: {
                    width: "100%",
                    maxHeight: "750px",
                    height: "auto",
                    padding: 0
                }
            });
            this.handle = div({
                template: {
                    view: `
<div data-role="handle">
    <div data-bind="click: $data.closeClicked" class="safari_close"></div>
    <div data-bind="click: $data.toggleGlassModeClicked" class="safari_glass"></div>
</div>
`,
                    model: this
                }
            });
            this.container = div({
                dataset: {
                    role: "container"
                },
                style: {
                    width: "100%"
                }
            });
            this.node.appendChild(this.handle);
            this.node.appendChild(this.container);
            if (cons.container) {
                cons.container.appendChild(this.node);
            }
            this.handler = cons.handler;
            this.references = [];
        }
        toggleGlassModeClicked() {
            this.glass = !this.glass;
            if (this.glass) {
                this.node.classList.add("glass-window");

            } else {
                this.node.classList.remove("glass-window");
            }
        }
        closeClicked() {
            this.node.remove();
            if (this.handler.closeClicked) {
                this.handler.closeClicked({ manager: this });
            }
        }
        popout(reference) {
            const _this = this;
            reference.destroy();
            pubsub.publish("client/" + this.client.index + "/load-linked-references-manager", {
                client: this.client,
                agent: reference.agent
            });
        }
        async addLinkedReferenceComponent(args) {
            const _this = this;
            const { agent } = args;
            var reference = new LinkedReference({
                manager: this,
                filter: {
                    agentGuid: agent.guid
                },
                agent: agent,
                handler: args.linkedReferenceComponent.handler
            });
            reference.fetchSearchResults();
            this.references.push(reference);
            await reference.mount((componentNode) => {
                if (_this.node.children.length == 0) {
                    _this.container.appendChild(componentNode);
                } else {
                    _this.container.insertBefore(componentNode, _this.container.children[0]);
                }
                if (args.handler.onMounted) {
                    args.handler.onMounted(this);
                }
            });
        }
    }

    return Manager;

}));
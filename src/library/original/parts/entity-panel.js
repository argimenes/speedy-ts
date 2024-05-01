(function (factory) {
    define("parts/entity-panel", ["knockout","jquery","app/helpers"], factory);
}(function (ko, $, Helper) {

    var WindowManager = Helper.getWindowManager();
    var div = Helper.div;
    var distinct = Helper.distinct;

    var Panel = (function () {
        function Panel() {

        }
        Panel.prototype.load = function (options) {
            options = options || {};
            var guid = options.guid;
            var _this = this;
            options = options || {};
            options.top = options.top || 200;
            options.left = options.left || 1000;
            options.tab = options.tab || "overview";
            $.get("/Static/Templates/Agent/entity-panel.html?v=12", function (html) {
                $.get("/Admin/Agent/Overview", { id: guid }, function (response) {
                    if (!response.Success) {
                        return;
                    }
                    var overview = response.Data;
                    var container = div({
                        classList: ["text-window"],
                        style: {
                            position: "absolute",
                            top: options.top + "px",
                            left: options.left + "px",
                            width: "700px",
                            height: "450px",
                            backgroundColor: "#fff"
                        }
                    });
                    var model =
                    {
                        Entity: overview.Entity,
                        tab: ko.observable(options.tab),
                        closeClicked: function () {
                            win.close();
                        },
                        minimizeClicked: function () {
                            win.minimize({ name: "entity / " + overview.Entity.Name });
                        },
                        overviewClicked: function () {
                            this.tab("overview");
                            let preview = container.querySelectorAll('[data-role="preview"]')[0];
                            preview.innerHTML = "&nbsp;";
                            if (overview.NoteGuid) {
                                let options = {
                                    guid: overview.NoteGuid
                                };
                                $.get("/Admin/Text/LoadEditorJson", { id: options.guid }, function (response) {
                                    console.log({ response });
                                    var data = _this.decompress(response.Data);
                                    options.name = response.Data.Name;

                                    options.node = preview;
                                    var users = distinct(data.Properties.filter(x => !!x.userGuid).map(x => x.userGuid));
                                    _this.loadTextEditorClient(options, function (client) {
                                        client.bind({
                                            guid: guid,
                                            name: options.name || data.Name
                                        });
                                        if (data.Sections) {
                                            client.model.sections(data.Sections.filter(x => !!x.Target).map(x => x.Target.Name));
                                        }
                                        client.editor.bind({
                                            text: data.Text,
                                            properties: data.Properties
                                        });
                                        client.showHideExpansions();
                                        var animations = client.editor.data.properties.filter(p => !p.isDeleted && p.schema && p.schema.animation);
                                        if (animations.length) {
                                            animations.forEach(p => {
                                                if (p.schema.animation.init) {
                                                    p.schema.animation.init(p, client.editor);
                                                }
                                                if (p.schema.animation.start) {
                                                    p.schema.animation.start(p, client.editor);
                                                }
                                            });
                                        }
                                        _this.loadUserBubbles(users, client);
                                        if (options.onLoaded) {
                                            options.onLoaded(client);
                                        }
                                    });
                                });
                            }
                            $.get("/Admin/Agent/Properties", { id: guid }, function (response) {
                                console.log({ response });
                                if (!response.Success) {
                                    return;
                                }
                                var data = response.Data;
                                var videos = response.Data.filter(x => !!x.TypeOfProperty.Target && x.TypeOfProperty.Target.Code == "video-url");
                                if (videos.length) {
                                    var video = videos[0];
                                    preview.innerHTML = "&nbsp;";
                                    _this.loadVideo({
                                        node: preview,
                                        entity: {
                                            guid: guid
                                        },
                                        video: {
                                            url: video.AgentHasProperty.Target.Value
                                        }
                                    });
                                }
                            });
                        },
                        relationsClicked: function () {
                            this.tab("relations");
                            let preview = container.querySelectorAll('[data-role="preview"]')[0];
                            preview.innerHTML = "&nbsp;";
                            require(["parts/agent-graph"], (AgentGraph) => {
                                preview.innerHTML = "&nbsp;";
                                let node = div({
                                    style: {
                                        width: "600px",
                                        height: "600px",
                                    }
                                });
                                preview.appendChild(node);
                                var graph = new AgentGraph({
                                    node: node,
                                    agentGuid: guid
                                });
                            });
                        },
                        timelineClicked: function () {
                            this.tab("timeline");
                            let preview = container.querySelectorAll('[data-role="preview"]')[0];
                            preview.innerHTML = "&nbsp;";
                            require(["knockout/speedy-viewer", "jquery-ui"], function (rr) {
                                $.get("/Static/Templates/Agent/timeline-panel.html?v=19", function (html) {
                                    $.get("/Admin/Agent/Timeline", { id: guid }, function (response) {
                                        console.log({ response });
                                        if (!response.Success) {
                                            return;
                                        }

                                        var content = applyBindings(html, {
                                            items: response.Data,
                                            agent: {
                                                guid: guid,
                                                name: overview.Entity.Name
                                            },
                                            textSelected: function (item) {
                                                //_this.loadTextWindow(item.TextGuid, document.body);
                                            },
                                            closeClicked: function () {
                                                //container.remove();
                                            },
                                            diagram: function (item) {

                                            }
                                        });
                                        preview.appendChild(content);
                                    });
                                });
                            });
                        },
                        propertiesClicked: function () {
                            this.tab("properties");
                            let preview = container.querySelectorAll('[data-role="preview"]')[0];
                            preview.innerHTML = "&nbsp;";
                            $.get("/Static/Templates/Agent/properties-panel.html?v=3", function (html) {
                                $.get("/Admin/Agent/Properties", { id: guid }, function (response) {
                                    console.log({ response });
                                    if (!response.Success) {
                                        return;
                                    }
                                    var content = applyBindings(html, {
                                        items: response.Data,
                                        agent: {
                                            guid: guid,
                                            name: overview.Entity.Name
                                        },
                                        closeClicked: function () {

                                        },
                                        diagram: function (item) {

                                        }
                                    });
                                    preview.appendChild(content);
                                });
                            });
                        },
                        referencesClicked: function () {
                            this.tab("references");
                            let preview = container.querySelectorAll('[data-role="preview"]')[0];
                            preview.innerHTML = "&nbsp;";
                            require(["knockout/speedy-viewer", "jquery-ui"], function () {
                                let cache = {};
                                $.get("/Static/Templates/Agent/sentences-panel.html?v=26", function (html) {
                                    preview.innerHTML = "&nbsp;";
                                    var node = div({
                                        style: {
                                            //position: "absolute",
                                            top: 0,
                                            left: 0,
                                            width: "100%",
                                            height: "auto",
                                            padding: "10px",
                                            overflowY: "auto",
                                            overflowX: "hidden"
                                        },
                                        innerHTML: html
                                    });
                                    var Model = (function () {
                                        function Model(cons) {
                                            this.list = {
                                                sections: ko.observableArray([]),
                                                sentiment: [null, "Positive", "Negative"],
                                                sortOptions: [{ Text: "By name", Value: "ByName" }, { Text: "By date added", Value: "ByDateAdded" }],
                                                directions: ["Ascending", "Descending"],
                                                pages: ko.observableArray([1]),
                                                pageRows: [5, 10, 20]
                                            };
                                            this.filter = {
                                                agentGuid: ko.observable(cons.filter.agentGuid),
                                                sectionGuid: ko.observable(),
                                                page: ko.observable(),
                                                sentiment: ko.observable(),
                                                order: ko.observable("ByName"),
                                                direction: ko.observable("Ascending"),
                                                pageRows: ko.observable(5)
                                            };
                                            this.cache = {};
                                            this.count = ko.observable();
                                            this.page = ko.observable(1);
                                            this.maxPage = ko.observable(1);
                                            this.results = ko.observableArray([]);
                                            this.setLists();
                                            this.focus = false;
                                        }
                                        Model.prototype.closeClicked = function () {
                                            node.remove();
                                        };
                                        Model.prototype.setPages = function (page, maxPage) {
                                            var pages = [];
                                            for (var i = 1; i <= maxPage; i++) {
                                                pages.push(i);
                                            }
                                            this.list.pages(pages);
                                            this.filter.page(page);
                                            this.maxPage(maxPage);
                                        };
                                        Model.prototype.previousPageClicked = function () {
                                            var page = this.filter.page();
                                            if (page <= 1) {
                                                return;
                                            }
                                            this.filter.page(page - 1);
                                            this.searchClicked();
                                        };
                                        Model.prototype.nextPageClicked = function () {
                                            var page = this.filter.page();
                                            if (page >= this.maxPage()) {
                                                return;
                                            }
                                            this.filter.page(page + 1);
                                            this.searchClicked();
                                        };
                                        Model.prototype.textSelected = function (item) {
                                            var guid = item.Text.Guid;
                                            var model = new QuickAdd();
                                            model.loadTextWindow(guid);
                                        };
                                        Model.prototype.setLists = function () {
                                            var _this = this;
                                            $.get("/Admin/Agent/SearchModalLists", (response) => {
                                                _this.list.sections(response.Data.Sections);
                                            });
                                        };
                                        Model.prototype.clearClicked = function () {
                                            this.results([]);
                                        };
                                        Model.prototype.searchClicked = function () {
                                            var _this = this;
                                            var filter = ko.toJS(this.filter);
                                            var key = JSON.stringify(filter);
                                            if (cache[key]) {
                                                var data = JSON.parse(cache[key]);
                                                this.results(data.Results);
                                                this.count(data.Count);
                                                this.setPages(data.Page, data.MaxPage);
                                                return;
                                            }
                                            $.get("/Admin/Agent/Sentences", filter, function (response) {
                                                console.log({ response });
                                                if (!response.Success) {
                                                    return;
                                                }
                                                cache[key] = JSON.stringify(response.Data);
                                                _this.results(response.Data.Results);
                                                _this.count(response.Data.Count);
                                                _this.setPages(response.Data.Page, response.Data.MaxPage);
                                            });
                                        };
                                        Model.prototype.applyBindings = function (node) {
                                            ko.applyBindings(this, node);
                                        };
                                        return Model;
                                    })();
                                    var model = new Model({
                                        filter: {
                                            agentGuid: guid,
                                        }
                                    });
                                    model.searchClicked();
                                    model.applyBindings(node);
                                    preview.appendChild(node);
                                });
                            });
                        }
                    };
                    var node = applyBindings(html, model);
                    var handle = node.querySelectorAll("[data-role='draggable'")[0];
                    container.appendChild(node);
                    document.body.appendChild(container);
                    var win = WindowManager.addWindow({
                        type: "entity-panel",
                        node: container,
                        draggable: {
                            node: handle
                        }
                    });
                    $(container).draggable();
                    if (!!overview.NoteGuid) {
                        model.overviewClicked();
                    } else {
                        model.referencesClicked();
                    }
                    if (options.onReady) {
                        options.onReady(win);
                    }
                });
            });
        };
    })();

    return Panel;
    
}));
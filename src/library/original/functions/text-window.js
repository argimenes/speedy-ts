define("functions/text-window", ["jquery", "knockout", "app/helpers", "pubsub", "parts/window-manager"], function ($, ko, Helper, pubsub, _WindowManager) {

    const { applyBindings, div, groupBy, newElement, updateElement, distinct, openModal } = Helper;
    const WindowManager = _WindowManager.getWindowManager();
    const Functions = {};
    const el = (config) => {
        var _el = document.createElement(config.type);
        return updateElement(_el, config);
    };
    function closeModal(element) {
        $(element).modal("hide");
        ko.cleanNode(element);
        element.remove();
    }

    Functions.createInlineAgentSelector = function (editor) {
        const func = function () {
            const data = editor.unbind();
            const agents = data.properties.filter((item) => {
                return item.type == "agent" && !item.isDeleted;
            }).filter((value, index, self) => {
                return self.indexOf(value) == index;
            }).map(x => {
                return {
                    Entity: {
                        Guid: x.value,
                        Name: x.text
                    },
                    Aliases: [],
                    Types: []
                };
            });
            return agents;
        };
        return func;
    };

    Functions.pronounRecognitionClicked = (editor) => {
        openModal("/Static/Templates/Text/ner-processor.html", {
            name: "Pronoun Recognition",
            ajaxContentAdded: function (element) {
                require(["parts/pronoun-processor"], function (PronounProcessor) {
                    const data = _this.editor.unbind();
                    const modal = new PronounProcessor({
                        popup: element,
                        text: data.text,
                        handler: {
                            inlineAgentSelector: Functions.createInlineAgentSelector(editor),
                            onMergeProperties: (properties) => {
                                closeModal(element);
                                editor.addProperties(properties);
                            },
                            onCancel: () => {
                                closeModal(element);
                            }
                        }
                    });
                    ko.applyBindings(modal, element);
                });
            }
        });
    };

    Functions.syntaxClicked = (editor, lang) => {
        const selection = editor.getSelection();
        $.post("/Admin/Text/GetSyntaxAnnotations", { text: selection.text, lang: lang }, function (response) {
            if (!response.Success) {
                return;
            }
            const si = selection.startIndex;
            const properties = response.Data.Data.map(function (item) {
                return {
                    type: item.Type,
                    startIndex: item.StartIndex + si,
                    endIndex: item.EndIndex + si,
                    attributes: _this.deserializeAttributes(item.Attributes)
                };
            });
            editor.addProperties(properties);
        });
    };

    Functions.loadUserBubbles = (users, client) => {
        const rect = client.window.text.node.getBoundingClientRect();
        const y = rect.y - 30;
        const x = rect.x + rect.width - 175;
        const items = users.map(u => {
            var name = u == "fb067f75-a121-47c1-8767-99271c75cfc0" ? "iian" : "argimenes";
            return {
                name: name, guid: u
            }
        });
        const container = div({
            style: {
                float: "right",
                marginTop: "5px",
                zIndex: WindowManager.getNextIndex()
            },
            template: {
                view: `
<ul data-bind="foreach: $data.items">
    <li style="list-style: none; padding: 0; margin-right: 5px; display: inline-block;" data-bind="click: $parent.selectClicked.bind($parent)"><span class="statement_agent-role" data-bind="text: $data.name, css: { tag_selected: $parent.selected() == $data.guid }"></span></li>
</ul>
`,
                model: {
                    items: items,
                    selected: ko.observable(),
                    selectClicked: function (item) {
                        var guid = item.guid,
                            selected = this.selected();
                        if (selected == guid) {
                            this.selected(null);
                            window.requestAnimationFrame(() => {
                                client.resetUserAnnotations();
                            })
                            return;
                        }
                        window.requestAnimationFrame(() => {
                            client.showUserAnnotations(guid);
                        });
                        this.selected(guid);
                    }
                }
            }
        });
        client.window.text.node.insertBefore(container, client.window.text.node.firstChild);
    };

    Functions.imageBackgroundClicked = () => {
        //var url = this.model.imageBackground();
        //var panel = this.editor.container;
        //panel.style["background-size"] = "cover";
        //panel.style.background = "url(" + url + ") no-repeat center center fixed";
    };

    Functions.addTextFrameClicked = () => {
        //var frame = 1;
        //var path = this.list.frames()[frame].Value;
        //var attributes = {};
        //if (frame == 1) {
        //    attributes = {
        //        imgHeight: 800,
        //        offsetLeft: 61,
        //        offsetTop: 86,
        //        width: 393,
        //        height: 519,
        //        editorHeight: 425,
        //        backgroundColor: "#d1c6ae"
        //    };
        //} else if (frame == 2) {
        //    attributes = {
        //        imgHeight: 800,
        //        offsetLeft: 0,
        //        offsetTop: 83,
        //        width: 549,
        //        height: 645,
        //        editorHeight: 545,
        //        backgroundColor: "#e6dfc4"
        //    };
        //}
        //var p = this.editor.createMetadataProperty({
        //    type: "text-frame",
        //    value: path,
        //    attributes: attributes
        //});
        //p.schema.animation.init(p);
    };

    Functions.spotlightSentence = (p) => {
        const { editor, schema } = p;
        p.setStyle({ opacity: 1, filter: "unset" });
        const sentences = editor.data.properties.filter(x => x.type == "text/sentence" && !x.isDeleted);
        const otherSentences = sentences.filter(x => x != p);
        const si = sentences.indexOf(p);
        if (!schema.spotlight) {
            sentences.forEach(s => {
                s.setStyle({ opacity: 1, filter: "unset" });
            });
            return;
        }
        otherSentences.forEach(s => {
            s.setStyle({ opacity: 0.25, filter: "blur(1px)" });
        });
        if (si > 0) {
            const previous = sentences[si - 1];
            previous.setStyle({ opacity: 0.5 });
        }
        if (si < sentences.length - 2 && sentences.length >= 2) {
            const next = sentences[si + 1];
            next.setStyle({ opacity: 0.5 });
        }
    };

    Functions.videoBackgroundClicked = () => {
        //https://jsfiddle.net/kiirosora/36Lj4kxt/
        //this.darkModeClicked();
        //var src = this.model.videoBackground();
        //var videoContainer = this.videoContainer;
        //if (!videoContainer) {
        //    videoContainer = this.videoContainer = document.createElement("DIV");
        //    videoContainer.style.position = "relative";
        //    videoContainer.style.width = "100%";
        //    videoContainer.style.height = "100%";
        //    videoContainer.style.backgroundAttachment = "scroll";
        //    videoContainer.style.overflow = "hidden";

        //    var video = document.createElement("VIDEO");
        //    //object-fit: cover;
        //    video.style["object-fit"] = "cover";
        //    video.setAttribute("playsinline", "playsinline");
        //    video.setAttribute("autoplay", "autoplay");
        //    video.setAttribute("muted", "muted");
        //    video.setAttribute("loop", "loop");
        //    video.style.minWidth = "100%";
        //    video.style.minHeight = "100%";
        //    video.style.position = "relative";
        //    video.style.zIndex = z++;

        //    var source = document.createElement("SOURCE");
        //    source.setAttribute("src", src);
        //    source.setAttribute("type", "video/mp4");
        //    video.appendChild(source);
        //    this.editor.container.style.backgroundColor = "rgb(255, 255, 255, 0)";
        //    this.editor.container.style.zIndex = z++;
        //    this.editor.container.style.top = 0;
        //    this.editor.container.style.left = 0;
        //    this.editor.container.style.minWidth = "100%";
        //    this.editor.container.style.minHeight = "100%";
        //    this.editor.container.style.position = "absolute";

        //    videoContainer.appendChild(video);
        //    this.editor.container.parentNode.appendChild(videoContainer);
        //    videoContainer.insertBefore(this.editor.container, video);
        //    //videoContainer.parentNode.insertBefore(videoContainer, this.editor.monitors[0].monitor);
        //} else {
        //    var source = this.videoContainer.firstChild().firstChild();
        //    source.setAttribute("src", src);
        //}
    };

    Functions.starWarsClicked = () => {
        //this.backgroundColour("#111");
        //this.changeBackgroundColourClicked();
        //this.editor.container.style.marginTop = "-67px";
        //this.editor.container.style.transform = "perspective(456px) rotateX(25deg)";
        //this.textColour("#feda4a");
        //this.changeTextColourClicked();
        //this.fontFamily("NewsGothicW01-Bold");
        //this.changeFontFamilyClicked();
    };

    Functions.lightModeClicked = () => {
        //this.backgroundColour("#fff");
        //this.changeBackgroundColourClicked();
        //this.textColour("#333");
        //this.changeTextColourClicked();
        //var monitor = this.editor.monitors[0].monitor;
        //monitor.style.backgroundColor = "#fff";
        //monitor.style.color = "#333";
    };

    Functions.darkModeClicked = () => {
        //this.backgroundColour("#121212");
        //this.changeBackgroundColourClicked();
        //this.textColour("#ccc");
        //this.changeTextColourClicked();
        //var monitor = this.editor.monitors[0].monitor;
        //monitor.style.backgroundColor = "#121212";
        //monitor.style.color = "#ccc";
    };

    Functions.loadSketchfabWindow = (data) => {
        var value = data.value;
        const entityGuid = data.entityGuid;
        const y = data.y || 100;
        const x = data.x || 800;
        const container = div({
            classList: ["text-window"],
            style: {
                position: "absolute",
                top: y + "px",
                left: x + "px",
                backgroundColor: "#000"
            }
        });
        const sketchfab = div({
            style: {
                width: "640px",
                height: "480px"
            },
            innerHTML: value
        });
        var focus = false;
        const handle = div({
            template: {
                view: `
<div class="safari_buttons">
    <div>
        <div data-bind="click: $data.closeClicked" class="safari_close"></div><div data-bind="click: $data.minimizeClicked" class="safari_minimize"></div><div class="safari_zoom"></div><div data-bind="click: $data.focusClicked" class="safari_focus"></div>
    </div>
    <div style="float: right; padding:0; margin: 0; margin-top: -10px; margin-right: 5px;">
        <span data-bind="click: $data.settingsClicked"><i style="font-size: 1.25rem;" class="fas fa-angle-double-right"></i></span>
    </div>
</div>`,
                model: {
                    settingsClicked: () => {
                        const rect = container.getBoundingClientRect();
                        const x = rect.x + rect.width + 10;
                        const y = rect.y;
                        pubsub.publish("load-entity", {
                            guid: entityGuid,
                            options: {
                                left: x, top: y,
                                onReady: (ew) => win.children.push(ew)
                            }
                        });
                    },
                    closeClicked: () => win.close(),
                    minimizeClicked: () => win.minimize(),
                    focusClicked: function () {
                        focus = !focus;
                        if (focus) {
                            win.focus();
                        } else {
                            win.unfocus();
                        }
                    }
                }
            }
        });
        container.appendChild(handle);
        container.appendChild(sketchfab);
        const layer = data.layer || document.body;
        layer.appendChild(container);
        const win = WindowManager.addWindow({
            type: "sketchfab",
            draggable: {
                node: handle,
                stop: function (e, ui) {
                    var rect = container.getBoundingClientRect();
                    //prop.attributes = {
                    //    x: rect.x,
                    //    y: rect.y,
                    //    width: rect.width,
                    //    height: rect.height
                    //};
                }
            },
            loader: {
                params: {
                    entityGuid: entityGuid
                }
            },
            node: container,
            zIndex: data.zIndex
        });
    };

    Functions.loadAgentGraph = (args) => {
        require(["parts/agent-graph"], (AgentGraph) => {
            const x = args.x || 800;
            const y = args.y || 200;
            const w = args.width || 700;
            const h = args.height || 700;
            const shape = args.shape || "Rectilinear";
            const surface = args.surface || "Default";
            const z = args.z || WindowManager.getNextIndex();
            const container = div({
                classList: ["text-window"],
                style: {
                    position: "absolute",
                    left: x + "px",
                    top: y + "px",
                    width: w + "px",
                    height: h + "px",
                    zIndex: z,
                    //backgroundColor: "#000"
                }
            });
            const node = div({
                style: {
                    backgroundColor: "transparent",
                    //background: "url(/Images/backgrounds/star-sphere.jpg) center center / cover no-repeat",
                    width: w + "px",
                    height: h + "px",
                    zIndex: 99
                }
            });
            const model = {
                data: [],
                model: {
                    relationTypeGuid: ko.observable()
                },
                list: {
                    relationTypes: ko.observableArray([])
                },
                setVideo: function (src) {
                    //https://jsfiddle.net/kiirosora/36Lj4kxt/
                    /**
                     * { Text: "rain", Value: "/content/video/rain.mp4" },
                            { Text: "water", Value: "/content/video/water.mp4" },
                            { Text: "peak", Value: "/content/video/peak.mp4" },
                            { Text: "lights", Value: "/content/video/lights.mp4" },
                            { Text: "stars", Value: "/content/video/constellations.mp4" }
                     * */
                    src = src || "/content/video/clouds.mp4";
                    var videoContainer = this.videoContainer;
                    if (videoContainer) {
                        videoContainer.remove();
                    }
                    videoContainer = this.videoContainer = div({
                        style: {
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            backgroundAttachment: "scroll",
                            overflow: "hidden",
                            zIndex: 10
                        }
                    });
                    const video = newElement("VIDEO", {
                        style: {
                            position: "relative",
                            objectFit: "cover",
                            minWidth: "100%",
                            minHeight: "100%",
                        },
                        attribute: {
                            playsinline: "playsinline",
                            autoplay: "autoplay",
                            muted: "muted",
                            loop: "loop"
                        }
                    });
                    const source = newElement("SOURCE", {
                        attribute: {
                            src: src,
                            type: "video/mp4"
                        }
                    });

                    video.appendChild(source);
                    videoContainer.appendChild(video);
                    container.appendChild(videoContainer);
                },
                zoomClicked: function () {
                    if (this.circle) {
                        this.toggleCircleModeClicked();
                    }
                    this.zoom = !this.zoom;
                    if (this.zoom) {
                        updateElement(container, {
                            style: {
                                left: 0,
                                top: 0,
                                width: "100%",
                                height: "100%"
                            }
                        });
                        updateElement(node, {
                            style: {
                                width: "100%",
                                height: "100%"
                            }
                        });
                    } else {
                        updateElement(container, {
                            style: {
                                left: x + "px",
                                top: y + "px",
                                width: w + "px",
                                height: h + "px"
                            }
                        });
                        updateElement(node, {
                            style: {
                                width: w + "px",
                                height: h + "px"
                            }
                        });
                    }
                    graph.resize();
                },
                toggleCircleModeClicked: function () {
                    this.circle = !this.circle;
                    if (this.circle) {
                        this.switchToCircleMode();

                    } else {
                        this.switchToRectilinearMode();
                    }
                },
                switchToRectilinearMode: function () {
                    win.shape = "Rectilinear";
                    container.classList.remove("circle-window");
                    updateElement(handle, {
                        style: {
                            top: 0,
                            left: 0
                        }
                    });
                },
                switchToCircleMode: function () {
                    win.shape = "Circle";
                    container.classList.add("circle-window");
                    updateElement(handle, {
                        style: {
                            top: "3px",
                            left: "293px"
                        }
                    });
                },
                switchToGlassSurface: function () {
                    win.surface = "Glass";
                    container.classList.add("glass-window");
                },
                switchToDefaultSurface: function () {
                    win.surface = "Default";
                    container.classList.remove("glass-window");
                },
                toggleGlassModeClicked: function () {
                    this.glass = !this.glass;
                    if (this.glass) {
                        this.switchToGlassSurface();
                    } else {
                        this.switchToDefaultSurface();
                    }
                    win.surface = this.glass ? "Glass" : "Default";
                },
                closeClicked: () => win.close(),
                filterClicked: function () {
                    var relationTypeGuid = this.model.relationTypeGuid();
                    if (!relationTypeGuid) {
                        return; // not right, but fix later
                    }
                    this.showRelations = !this.showRelations;
                    if (this.showRelations) {
                        graph.showRelations(relationTypeGuid);
                    } else {
                        graph.hideRelations(relationTypeGuid);
                    }
                }
            };
            const handle = div({
                style: {
                    position: "relative",
                    height: "20px",
                    zIndex: WindowManager.getNextIndex()
                },
                children: [applyBindings(
                    `
<div class="safari_buttons">
    <div data-bind="click: $data.closeClicked" class="safari_close"></div>
<div data-bind="click: $data.minimizeClicked" class="safari_minimize"></div>
<div data-bind="click: $data.zoomClicked" class="safari_zoom"></div>
<div data-bind="click: $data.focusClicked" class="safari_focus"></div>
<div data-bind="click: $data.toggleGlassModeClicked" class="safari_glass"></div>
<div data-bind="click: $data.toggleCircleModeClicked" class="safari_circle"></div>
</div>
<!-- <div class="row">
    <div class="col-md-2">
        <select class="form-control" data-bind="value: $data.model.relationTypeGuid, options: $data.list.relationTypes, optionsText: 'Text', optionsValue: 'Value'"></select>
    </div>
    <div class="col-md-1">
        <button class="btn btn-default" data-bind="click: $data.filterClicked">Filter</button>
    </div>
</div> -->
`, model)]
            });
            container.appendChild(handle);
            container.appendChild(node);
            container.appendChild(div({ innerHTML: "&nbsp;" }));
            //model.setVideo();
            const graph = new AgentGraph({
                node: node,
                agentGuid: args.guid,
                agentGuids: args.guids,
                handler: {
                    loaded: (data) => {
                        model.data = data;
                        var types = distinct(data.map(x => {
                            return {
                                Text: x.Type.DominantCode || x.Type.DisplayName,
                                Value: x.Type.Guid
                            };
                        }), (existing, item) => existing.Value == item.Value);
                        types.unshift({
                            Text: null,
                            Value: null
                        });
                        model.list.relationTypes(types || []);
                    }
                }
            });
            const win = WindowManager.addWindow({
                type: "agent-graph",
                loader: {
                    params: {
                        guid: args.guid,
                        guids: args.guids
                    }
                },
                node: container,
                draggable: {
                    node: handle,
                    stop: () => {
                        graph.resize();
                    }
                }
            });
            if (shape == "Circle") {
                model.switchToCircleMode();
            }
            if (surface == "Glass") {
                model.switchToGlassSurface();
            }
            win.addNodeToLayer(container);
        });
    };

    Functions.generateSentenceProperties = (editor) => {
        const properties = editor.data.properties.filter(p => p.type == "text/sentence");
        properties.forEach(p => editor.removeProperty(p));
        const sentences = editor.getSentences();
        const _properties = sentences.map((s, i) => {
            return { ...s, type: "text/sentence", value: i + 1 };
        });
        const matches = editor.addProperties(_properties);
    };

    Functions.scrollToGuid = (editor, guid) => {
        const properties = editor.data.properties.filter(x => x.guid == guid);
        const sorted = properties.concat().sort((a, b) => a.startIndex() > b.startIndex() ? 1 : a.startIndex() == b.startIndex() ? 0 : -1);
        const first = sorted[0];
        first.scrollTo();
    };

    Functions.loadTweetWindow = (data) => {
        var value = data.value;
        const entityGuid = data.entityGuid;
        const y = data.y || 100;
        const x = data.x || 800;
        const container = div({
            classList: ["text-window"],
            style: {
                position: "absolute",
                top: y + "px",
                left: x + "px",
                width: "560px",
                height: "auto",
                maxHeight: "550px",
                overflowY: "hidden",
                overflowX: "hidden",
                backgroundColor: "#fff"
            }
        });
        const tweet = div({
            style: {
                width: "550px",
                height: "auto"
            },
            innerHTML: value
        });
        var focus = false;
        const handle = div({
            template: {
                view: `
<div class="safari_buttons">
    <div>
        <div data-bind="click: $data.closeClicked" class="safari_close"></div><div data-bind="click: $data.minimizeClicked" class="safari_minimize"></div><div data-bind="click: $data.zoomClicked" class="safari_zoom"></div><div data-bind="click: $data.focusClicked" class="safari_focus"></div><div data-bind="click: $data.toggleGlassModeClicked" class="safari_glass"></div>
    </div>
    <div style="float: right; padding:0; margin: 0; margin-top: -10px; margin-right: 5px;">
        <span data-bind="click: $data.togglePinClicked, style: { color: $data.pinned() ? '#ccc' : '#6f7b8a' }"><i class="fas fa-thumbtack"></i></span>
        <span data-bind="click: $data.settingsClicked"><i style="font-size: 1.25rem;" class="fas fa-angle-double-right"></i></span>
    </div>
</div>`,
                model: {
                    pinned: ko.observable(false),
                    togglePinClicked: function () {
                        win.togglePin();
                        this.pinned(win.pin);
                    },
                    position: {},
                    zoomClicked: function () {
                        //this.zoomed = !this.zoomed;
                        //if (this.zoomed) {
                        //    var w = screen.width, h = screen.height;
                        //    var fh = h - 30;
                        //    var rect = container.getBoundingClientRect();
                        //    this.position.x = rect.x;
                        //    this.position.y = rect.y;
                        //    tweet.style.width= w + "px";
                        //    tweet.style.height = fh + "px";
                        //    container.style.position = "fixed";
                        //    container.style.top = 0;
                        //    container.style.left = 0;
                        //    container.style.maxHeight = "unset";
                        //    container.style.height = fh + "px";
                        //    container.style.width = "100%";
                        //    container.style.zIndex = "10";
                        //    win.state = "fullscreen";
                        //} else {
                        //    tweet.style.width = "550px";
                        //    tweet.style.height = "auto";
                        //    container.style.position = "absolute";
                        //    container.style.left = this.position.x + "px";
                        //    container.style.top = this.position.y + "px";
                        //    container.style.height = "auto";
                        //    container.style.width = "560px";
                        //    container.style.maxHeight = "550px";
                        //    container.style.zIndex = WindowManager.getNextIndex().toString();
                        //    win.state = "open";
                        //}
                    },
                    glass: false,
                    toggleGlassModeClicked: function () {
                        this.glass = !this.glass;
                        if (this.glass) {
                            container.classList.add("glass-window");
                            tweet.style.opacity = 0.2;

                        } else {
                            container.classList.remove("glass-window");
                            tweet.style.opacity = 1;
                        }
                    },
                    settingsClicked: () => {
                        var rect = container.getBoundingClientRect();
                        var x = rect.x + rect.width + 10;
                        var y = rect.y;
                        pubsub.publish("load-entity", {
                            guid: entityGuid,
                            options: {
                                left: x, top: y,
                                onReady: (ew) => {
                                    win.children.push(ew);
                                }
                            }
                        });
                        //_this.loadEntityClicked(entityGuid, {
                        //    left: x, top: y,
                        //    onReady: (ew) => {
                        //        win.children.push(ew);
                        //    }
                        //});
                    },
                    closeClicked: () => win.close(),
                    minimizeClicked: () => win.minimize(),
                    focusClicked: function () {
                        focus = !focus;
                        if (focus) {
                            win.focus();
                        } else {
                            win.unfocus();
                        }
                    }
                }
            }
        });
        container.appendChild(handle);
        container.appendChild(tweet);
        const layer = data.layer || document.body;
        layer.appendChild(container);
        Helper.nodeScriptReplace(tweet);
        const win = WindowManager.addWindow({
            type: "tweet",
            draggable: {
                node: handle,
                stop: function (e, ui) {
                    var rect = container.getBoundingClientRect();
                    //prop.attributes = {
                    //    x: rect.x,
                    //    y: rect.y,
                    //    width: rect.width,
                    //    height: rect.height
                    //};
                }
            },
            loader: {
                params: {
                    entityGuid: entityGuid
                }
            },
            node: container,
            zIndex: data.zIndex
        });
    };

    Functions.showSidePanel = (client) => {
        client.tabsVisible(!client.tabsVisible());
        if (client.tabsVisible()) {
            const textPanel = client.window.text.node;
            const rect = textPanel.getBoundingClientRect();
            const y = rect.y;
            const x = rect.x + rect.width + 20;
            const w = rect.width;
            client.sidePanel = div({
                classList: ["text-window"],
                style: {
                    position: "absolute",
                    top: y + "px",
                    left: x + "px",
                    width: w + "px",
                    backgroundColor: "#fff",
                    zIndex: WindowManager.getNextIndex()
                }
            });
            $.get("/Static/Templates/Text/text-editor-side-panel.html?v=6", function (html) {
                const node = applyBindings(html, client);
                client.sidePanel.appendChild(node);
                document.body.appendChild(client.sidePanel);
            });
        } else {
            client.sidePanel.remove();
        }
    };

    Functions.createYouTubeContent = (args) => {
        const { container, url, name, entityGuid, zIndex, loader, win } = args;
        const parsedUrl = new URL(url);
        const v = parsedUrl.searchParams.get("v");
        var player;
        const playerContainer = div({});
        const handle = div({
            template: {
                view: `
<div class="safari_buttons">
    <div>
        <div data-bind="click: $data.closeClicked" class="safari_close"></div><div data-bind="click: $data.minimizeClicked" class="safari_minimize"></div><div data-bind="click: $data.zoomClicked" class="safari_zoom"></div><div data-bind="click: $data.focusClicked" class="safari_focus"></div><div data-bind="click: $data.toggleGlassModeClicked" class="safari_glass"></div>
    </div>
    <div style="float: right; padding:0; margin: 0; margin-top: -10px; margin-right: 5px;">
        <span data-bind="click: $data.skip30Clicked">skip 30</span>
        <span data-bind="click: $data.togglePinClicked, style: { color: $data.pinned() ? '#fff' : '#6f7b8a' }"><i class="fas fa-thumbtack"></i></span>
        <span data-bind="click: $data.settingsClicked"><i style="font-size: 1.25rem;" class="fas fa-angle-double-right"></i></span>
    </div>
</div>`,
                model: {
                    zoomed: false,
                    position: {},
                    pinned: ko.observable(false),
                    togglePinClicked: function () {
                        win.togglePin();
                        this.pinned(win.pin);
                    },
                    glass: false,
                    toggleGlassModeClicked: function () {
                        console.log({ player });
                        const iframe = player.getIframe();
                        this.glass = !this.glass;
                        if (this.glass) {
                            container.classList.add("glass-window");
                            iframe.style.opacity = 0.2;

                        } else {
                            container.classList.remove("glass-window");
                            iframe.style.opacity = 1;
                        }
                    },
                    zoomClicked: function () {
                        console.log({ player });
                        const iframe = player.getIframe();
                        this.zoomed = !this.zoomed;
                        if (this.zoomed) {
                            var w = screen.width, h = screen.height;
                            var fh = h - 30;
                            var rect = container.getBoundingClientRect();
                            this.position.x = rect.x;
                            this.position.y = rect.y;
                            iframe.setAttribute("width", w);
                            iframe.setAttribute("height", fh);
                            container.style.position = "fixed";
                            container.style.top = 0;
                            container.style.left = 0;
                            container.style.height = "100%";
                            container.style.width = "100%";
                            container.style.zIndex = "10";
                            win.state = "fullscreen";
                        } else {
                            iframe.setAttribute("width", 560);
                            iframe.setAttribute("height", 315);
                            container.style.position = "absolute";
                            container.style.left = this.position.x + "px";
                            container.style.top = this.position.y + "px";
                            container.style.height = "auto";
                            container.style.width = "560px";
                            container.style.zIndex = WindowManager.getNextIndex().toString();
                            win.state = "open";
                        }
                    },
                    skip30Clicked: () => {
                        player.skip(30);
                    },
                    settingsClicked: () => {
                        const rect = container.getBoundingClientRect();
                        const x = rect.x + rect.width + 10;
                        const y = rect.y;
                        pubsub.publish("load-entity", {
                            guid: entityGuid,
                            options: {
                                left: x, top: y, onReady: (entityWindow) => {
                                    win.children.push(entityWindow);
                                }
                            }
                        });
                        //_this.loadEntityClicked(entityGuid, {
                        //    left: x, top: y, onReady: (entityWindow) => {
                        //        win.children.push(entityWindow);
                        //    }
                        //});
                    },
                    closeClicked: () => {
                        player.player.destroy();
                        win.close();
                    },
                    minimizeClicked: () => win.minimize({
                        name: name,
                        thumbnail: div({
                            innerHTML: `<div><i style="font-size: 40px; color: #c4302b;" class="fab fa-youtube"></i></div>`
                        })
                    }),
                    focusClicked: function () {
                        focus = !focus;
                        if (focus) {
                            win.focus();
                        } else {
                            win.unfocus();
                        }
                    }
                }
            }
        });
        const content = div({
            children: [handle, playerContainer]
        });
        updateElement(container, {
            style: {
                width: "560px",
                height: "341px"
            }
        });
        win.setDraggable({ node: handle });
        //var win = WindowManager.addWindow({
        //    type: "video",
        //    draggable: {
        //        node: handle
        //    },
        //    loader: {
        //        params: {
        //            entityGuid: entityGuid
        //        }
        //    },
        //    node: container,
        //    zIndex: zIndex
        //});
        require(["parts/youtube-player"], function (YouTubePlayer) {
            player = new YouTubePlayer({
                container: playerContainer,
                identifier: v,
                handler: {
                    onPlayerReady: () => {
                        loader.remove();
                    }
                }
            });
        });
        return content;
    };

    Functions.createVideoFileContent = (args) => {
        const { container, url, loader, win, entityGuid } = args;
        const src = url;
        loader.remove();
        const videoContainer = div({
            classList: ["text-window"],
            style: {
                overflow: "hidden",
                zIndex: WindowManager.getNextIndex(),
                backgroundColor: "#000"
            }
        });
        const handle = div({
            style: {
                backgroundColor: "#000"
            },
            template: {
                view: `
<div class="safari_buttons">
    <div>
        <div data-bind="click: $data.closeClicked" class="safari_close"></div><div data-bind="click: $data.minimizeClicked" class="safari_minimize"></div><div data-bind="click: $data.zoomClicked" class="safari_zoom"></div><div data-bind="click: $data.focusClicked" class="safari_focus"></div><div data-bind="click: $data.toggleGlassModeClicked" class="safari_glass"></div>
    </div>
    <div style="float: right; padding:0; margin: 0; margin-top: -10px; margin-right: 5px;">
        <span data-bind="click: $data.togglePinClicked, style: { color: $data.pinned() ? '#fff' : '#6f7b8a' }"><i class="fas fa-thumbtack"></i></span>
        <span data-bind="click: $data.settingsClicked"><i style="font-size: 1.25rem;" class="fas fa-angle-double-right"></i></span>
    </div>
</div>`,
                model: {
                    zoomed: false,
                    position: {},
                    pinned: ko.observable(false),
                    togglePinClicked: function () {
                        win.togglePin();
                        this.pinned(win.pin);
                    },
                    glass: false,
                    toggleGlassModeClicked: function () {
                        this.glass = !this.glass;
                        if (this.glass) {
                            container.classList.add("glass-window");
                            video.style.opacity = 0.2;

                        } else {
                            container.classList.remove("glass-window");
                            video.style.opacity = 1;
                        }
                    },
                    zoomClicked: function () {
                        this.zoomed = !this.zoomed;
                        if (this.zoomed) {
                            const w = screen.width, h = screen.height;
                            const fh = h - 30;
                            const rect = container.getBoundingClientRect();
                            this.position.x = rect.x;
                            this.position.y = rect.y;
                            video.setAttribute("width", w);
                            video.setAttribute("height", fh);
                            container.style.position = "fixed";
                            container.style.top = 0;
                            container.style.left = 0;
                            container.style.height = "100%";
                            container.style.width = "100%";
                            container.style.zIndex = "10";
                            win.state = "fullscreen";
                        } else {
                            video.setAttribute("width", 640);
                            video.setAttribute("height", 480);
                            container.style.position = "absolute";
                            container.style.left = this.position.x + "px";
                            container.style.top = this.position.y + "px";
                            container.style.height = "auto";
                            container.style.width = "640px";
                            container.style.zIndex = WindowManager.getNextIndex().toString();
                            win.state = "open";
                        }
                    },
                    settingsClicked: () => {
                        const rect = container.getBoundingClientRect();
                        const x = rect.x + rect.width + 10;
                        const y = rect.y;
                        pubsub.publish("load-entity", {
                            guid: entityGuid,
                            options: {
                                left: x, top: y, onReady: (entityWindow) => {
                                    win.children.push(entityWindow);
                                }
                            }
                        });
                        //_this.loadEntityClicked(entityGuid, {
                        //    left: x, top: y, onReady: (entityWindow) => {
                        //        win.children.push(entityWindow);
                        //    }
                        //});
                    },
                    closeClicked: () => win.close(),
                    minimizeClicked: () => win.minimize({
                        name: name,
                        thumbnail: div({
                            innerHTML: `<div><i style="font-size: 40px; color: #c4302b;" class="fab fa-youtube"></i></div>`
                        })
                    }),
                    focusClicked: function () {
                        focus = !focus;
                        if (focus) {
                            win.focus();
                        } else {
                            win.unfocus();
                        }
                    }
                }
            }
        });
        const video = newElement("VIDEO", {
            style: {
                position: "relative",
                width: "100%"
            },
            attribute: {
                playsinline: "playsinline",
                autoplay: "autoplay",
                muted: "muted",
                loop: "loop"
            }
        });
        const source = newElement("SOURCE", {
            attribute: {
                src: src,
                type: "video/mp4"
            }
        });
        video.appendChild(source);
        const content = div({
            children: [handle, video]
        });
        videoContainer.appendChild(content);
        win.setDraggable({ node: handle });
        return videoContainer;
    };

    Functions.createVimeoContent = (args) => {
        const { container, url, name, entityGuid, zIndex, loader } = args;
        const parts = url.split("/");
        const id = parts[parts.length - 1];
        const embedUrl = "https://player.vimeo.com/video/" + id;
        container.style.width = "640px";
        container.style.height = "504px";
        var iframe = newElement("IFRAME", {
            attribute: {
                width: 640,
                height: 480,
                src: embedUrl,
                frameborder: 0,
                allow: "autoplay; fullscreen",
                allowfullscreen: "allowfullscreen"
            },
            handler: {
                load: () => {
                    loader.remove();
                }
            }
        });
        var handle = div({
            template: {
                view: `
<div class="safari_buttons">
    <div>
        <div data-bind="click: $data.closeClicked" class="safari_close"></div><div data-bind="click: $data.minimizeClicked" class="safari_minimize"></div><div data-bind="click: $data.zoomClicked" class="safari_zoom"></div><div data-bind="click: $data.focusClicked" class="safari_focus"></div><div data-bind="click: $data.toggleGlassModeClicked" class="safari_glass"></div>
    </div>
    <div style="float: right; padding:0; margin: 0; margin-top: -10px; margin-right: 5px;">
        <span data-bind="click: $data.togglePinClicked, style: { color: $data.pinned() ? '#fff' : '#6f7b8a' }"><i class="fas fa-thumbtack"></i></span>
        <span data-bind="click: $data.settingsClicked"><i style="font-size: 1.25rem;" class="fas fa-angle-double-right"></i></span>
    </div>
</div>`,
                model: {
                    zoomed: false,
                    position: {},
                    pinned: ko.observable(false),
                    togglePinClicked: function () {
                        win.togglePin();
                        this.pinned(win.pin);
                    },
                    glass: false,
                    toggleGlassModeClicked: function () {
                        this.glass = !this.glass;
                        if (this.glass) {
                            container.classList.add("glass-window");
                            iframe.style.opacity = 0.2;

                        } else {
                            container.classList.remove("glass-window");
                            iframe.style.opacity = 1;
                        }
                    },
                    zoomClicked: function () {
                        this.zoomed = !this.zoomed;
                        if (this.zoomed) {
                            const w = screen.width, h = screen.height;
                            const fh = h - 30;
                            const rect = container.getBoundingClientRect();
                            this.position.x = rect.x;
                            this.position.y = rect.y;
                            iframe.setAttribute("width", w);
                            iframe.setAttribute("height", fh);
                            container.style.position = "fixed";
                            container.style.top = 0;
                            container.style.left = 0;
                            container.style.height = "100%";
                            container.style.width = "100%";
                            container.style.zIndex = "10";
                            win.state = "fullscreen";
                        } else {
                            iframe.setAttribute("width", 640);
                            iframe.setAttribute("height", 480);
                            container.style.position = "absolute";
                            container.style.left = this.position.x + "px";
                            container.style.top = this.position.y + "px";
                            container.style.height = "auto";
                            container.style.width = "640px";
                            container.style.zIndex = WindowManager.getNextIndex().toString();
                            win.state = "open";
                        }
                    },
                    settingsClicked: () => {
                        var rect = container.getBoundingClientRect();
                        var x = rect.x + rect.width + 10;
                        var y = rect.y;
                        pubsub.publish("load-entity", {
                            guid: entityGuid,
                            options: {
                                left: x, top: y, onReady: (entityWindow) => {
                                    win.children.push(entityWindow);
                                }
                            }
                        });
                        //_this.loadEntityClicked(entityGuid, {
                        //    left: x, top: y, onReady: (entityWindow) => {
                        //        win.children.push(entityWindow);
                        //    }
                        //});
                    },
                    closeClicked: () => win.close(),
                    minimizeClicked: () => win.minimize({
                        name: name,
                        thumbnail: div({
                            innerHTML: `<div><i style="font-size: 40px; color: #c4302b;" class="fab fa-youtube"></i></div>`
                        })
                    }),
                    focusClicked: function () {
                        focus = !focus;
                        if (focus) {
                            win.focus();
                        } else {
                            win.unfocus();
                        }
                    }
                }
            }
        });
        const content = div({
            children: [handle, iframe]
        });
        win.setDraggable({ node: handle });
        //var win = WindowManager.addWindow({
        //    type: "video",
        //    draggable: {
        //        node: handle
        //    },
        //    loader: {
        //        params: {
        //            entityGuid: entityGuid
        //        }
        //    },
        //    node: container,
        //    zIndex: zIndex
        //});
        return content;
    };

    Functions.loadWebsiteWindow = (data) => {
        const url = data.url;
        const entityGuid = data.entityGuid;
        const y = data.y || 200;
        const x = data.x || 800;
        const width = data.width || 600;
        const height = data.height || 800;
        const container = div({
            classList: ["text-window"],
            style: {
                position: "absolute",
                top: y + "px",
                left: x + "px",
                width: width + "px",
                height: height + "px",
                minHeight: height + "px",
                backgroundColor: "#000"
            }
        });
        var loader = div({
            classList: ["loader", "loader-center"]
        });
        container.appendChild(loader);
        const layer = document.body; // data.layer || WindowManager.currentLayer.container;
        layer.appendChild(container);
        const iframe = newElement("IFRAME", {
            attribute: {
                width: width,
                height: height,
                src: url,
                frameborder: 0
            },
            handler: {
                load: (e) => {
                    console.log("iframe loaded", iframe, e, iframe.contentDocument);
                    loader.remove();
                    if (win.state == "fullscreen") {
                        return;
                    }
                    //win.maximize();
                }
            }
        });
        const model = {
            zoomed: false,
            position: {},
            settingsClicked: () => {
                var rect = container.getBoundingClientRect();
                var x = rect.x + rect.width + 10;
                var y = rect.y;
                pubsub.publish("load-entity", {
                    guid: entityGuid, options: {
                        left: x, top: y, onReady: (entityWindow) => {
                            win.children.push(entityWindow);
                        }
                    }
                });
                //_this.loadEntityClicked(entityGuid, {
                //    left: x, top: y, onReady: (entityWindow) => {
                //        win.children.push(entityWindow);
                //    }
                //});
            },
            closeClicked: () => {
                Helper.destroyIFrame(iframe);
                win.close();
            },
            minimizeClicked: () => win.minimize({
                name: data.name,
                thumbnail: div({
                    innerHTML: `<div><i style="font-size: 40px;" class="fas fa-link"></i></div>`
                })
            }),
            glass: false,
            toggleGlassModeClicked: function () {
                this.glass = !this.glass;
                if (this.glass) {
                    container.classList.add("glass-window");
                    iframe.style.opacity = 0.2;

                } else {
                    container.classList.remove("glass-window");
                    iframe.style.opacity = 1;
                }
            },
            zoomClicked: function () {
                this.zoomed = !this.zoomed;
                if (this.zoomed) {
                    var w = screen.width, h = screen.height;
                    var fh = h - 30;
                    var rect = container.getBoundingClientRect();
                    this.position.x = rect.x;
                    this.position.y = rect.y;
                    iframe.setAttribute("width", w);
                    iframe.setAttribute("height", fh);
                    container.style.position = "fixed";
                    container.style.top = 0;
                    container.style.left = 0;
                    container.style.height = "100%";
                    container.style.width = "100%";
                    container.style.zIndex = "10";
                    win.state = "fullscreen";
                } else {
                    iframe.setAttribute("width", width);
                    iframe.setAttribute("height", height);
                    container.style.position = "absolute";
                    container.style.left = this.position.x + "px";
                    container.style.top = this.position.y + "px";
                    container.style.height = "auto";
                    container.style.width = width + "px";
                    container.style.zIndex = WindowManager.getNextIndex().toString();
                    win.state = "open";
                }
            },
            focusClicked: function () {
                focus = !focus;
                if (focus) {
                    win.focus();
                } else {
                    win.unfocus();
                }
            }
        };
        var handle = div({
            template: {
                view: `
<div class="safari_buttons">
    <div>
        <div data-bind="click: $data.closeClicked" class="safari_close"></div><div data-bind="click: $data.minimizeClicked" class="safari_minimize"></div><div data-bind="click: $data.zoomClicked" class="safari_zoom"></div><div data-bind="click: $data.focusClicked" class="safari_focus"></div><div data-bind="click: $data.toggleGlassModeClicked" class="safari_glass"></div>
    </div>
    <div style="float: right; padding:0; margin: 0; margin-top: -10px; margin-right: 5px;">
        <span data-bind="click: $data.settingsClicked"><i style="font-size: 1.25rem;" class="fas fa-angle-double-right"></i></span>
    </div>
</div>`,
                model: model
            }
        });
        container.appendChild(handle);
        container.appendChild(iframe);
        const win = WindowManager.addWindow({
            type: "website",
            draggable: {
                node: handle,
                stop: function (e, ui) {
                    var rect = container.getBoundingClientRect();
                    //prop.attributes = {
                    //    x: rect.x,
                    //    y: rect.y,
                    //    width: rect.width,
                    //    height: rect.height
                    //};
                }
            },
            loader: {
                params: {
                    entityGuid: entityGuid
                }
            },
            node: container,
            zIndex: data.zIndex
        });
    };

    Functions.loadLinkedReferencesManager = (args) => {
        const { client, agent, property } = args;
        const caret = args.caret || property.editor.getCaret();
        require(["components/linked-references"], (Manager) => {
            const rect = client.window.text.node.getBoundingClientRect();
            //const y = rect.y;
            const left = rect.x;
            const width = 440;
            // const x = (left - width - 10);
            const caretRect = caret.right.getBoundingClientRect();
            const x = caretRect.x - 30;
            const y = caretRect.y + 30;
            const container = div({
                classList: ["text-window"],
                style: {
                    position: "absolute",
                    top: y + "px",
                    left: x + "px",
                    width: width + "px",
                    height: "auto",
                    padding: "0 5px",
                    maxHeight: "400px",
                    overflowY: "auto",
                    overflowX: "hidden",
                    zIndex: WindowManager.getNextIndex()
                }
            });
            document.body.appendChild(container);
            $(container).draggable({
                handle: container.querySelector("[data-role='handle']")
            });
            var manager = new Manager({
                client: client,
                container: container,
                handler: {
                    closeClicked: () => {
                        client.linkedReferencesManager = null;
                        // reset this so it's recreated next time
                    },
                    onTextSelected: (textGuid) => {
                        pubsub.publish("load-text-window", { guid: textGuid });
                        // client.loadTextWindow(textGuid);
                    }
                }
            });
            client.linkedReferencesManager = manager;
            (async () => {
                await manager.addLinkedReferenceComponent({
                    agent: agent,
                    handler: {
                        onCloseClicked: (manager) => {
                            container.remove();
                        }
                    },
                    linkedReferenceComponent: {
                        handler: {
                            onCloseClicked: (component) => {
                                component.destroy();
                            },
                            onTextSelected: (textGuid) => {
                                pubsub.publish("load-text-window", { guid: textGuid });
                                // client.loadTextWindow(textGuid);
                            },
                            onPopoutTextBlockClicked: (args) => {
                                const { textBlockGuid } = args;
                            }
                        }
                    }
                });
            })();
        });
    };

    Functions.batchUpdate = (data) => {
        const { editor, properties } = data;
        const fragment = document.createDocumentFragment();
        const { container } = editor;
        const containerRect = container.getBoundingClientRect();
        const containerWidth = containerRect.width;
        const blockGroup = groupBy(properties, p => editor.getCurrentContainer(p.startNode));
        const blockRows = Array.from(blockGroup);
        blockRows.forEach(row => {
            let container = row[0];
            let blockProperties = row[1];
            blockProperties.forEach(p => {
                const { schema } = p;
                const { options } = schema.render;
                const svg = Helper.drawUnderline(p, { containerWidth, stroke: options.colour, strokeOpacity: options.opacity, offsetY: options.offsetY });
                fragment.appendChild(svg);
            });
            container.appendChild(fragment);
        });
    };

    Functions.showKeyBindings = () => {
        $.get("/Static/Templates/Text/key-bindings.html?v=11", function (html) {
            const container = div({
                style: {
                    position: "absolute",
                    padding: "10px 20px",
                    right: "20px",
                    bottom: "20px",
                    width: "550px",
                    backgroundColor: "#fff",
                    zIndex: 60
                },
                classList: ["text-window"]
            });
            var node = applyBindings(html, {
                closeClicked: function () {
                    win.close();
                }
            });
            container.appendChild(node);
            document.body.appendChild(container);
            const win = WindowManager.addWindow({
                type: "key-bindings",
                node: container
            });
            require(["jquery-ui"], () => {
                $(container).draggable();
            });
        });
    };

    Functions.lemmatize = (editor) => {
        var data = editor.unbind();
        $.post("/Admin/Text/Lemmatize", { text: data.text }, function (response) {
            console.log(response);
            if (!response.Success) {
                return;
            }
            var lemmas = response.Data.Lemmas;
            editor.addProperties(lemmas.map((item) => {
                return {
                    type: "lemma",
                    value: item.Word,
                    text: item.Word,
                    startIndex: item.StartIndex,
                    endIndex: item.EndIndex
                };
            }));
        });
    };

    Functions.generateLabels = (list) => {
        const labels = list.map(item => {
            const text = item.text;
            const label = div({
                style: {
                    position: "absolute",
                    display: "inline",
                    top: "-10px",
                    left: "0px",
                    backgroundColor: item.colour || "gray"
                },
                classList: ["letter-circle"],
                innerHTML: text,
                attribute: {
                    alt: text,
                    title: text
                }
            });
            label.speedy = {
                role: 3,
                stream: 1
            };
            return {
                label: label,
                property: item.property
            };
        });
        return labels;
    };

    Functions.loadPdfWindow = (data) => {
        const url = data.url;
        const entityGuid = data.entityGuid;
        var y = data.y || 200;
        var x = data.x || 800;
        var width = data.width || 600;
        var height = data.height || 800;
        var container = div({
            classList: ["text-window"],
            style: {
                position: "absolute",
                top: y + "px",
                left: x + "px",
                width: width + "px",
                height: height + "px",
                backgroundColor: "#000",
                zIndex: data.zIndex || WindowManager.getNextIndex()
            }
        });
        var loader = div({
            classList: ["loader", "loader-center"]
        });
        container.appendChild(loader);
        var embed = el({
            type: "EMBED",
            attribute: {
                width: "630px",
                height: "800px",
                src: url,
                type: "application/pdf"
            },
            handler: {
                load: () => {
                    loader.remove();
                }
            }
        });
        var handle = div({
            template: {
                view: `
<div class="safari_buttons">
    <div>
        <div data-bind="click: $data.closeClicked" class="safari_close"></div><div data-bind="click: $data.minimizeClicked" class="safari_minimize"></div><div data-bind="click: $data.zoomClicked" class="safari_zoom"></div><div data-bind="click: $data.focusClicked" class="safari_focus"></div><div data-bind="click: $data.toggleGlassModeClicked" class="safari_glass"></div>
    </div>
    <div style="float: right; padding:0; margin: 0; margin-top: -10px; margin-right: 5px;">
<span data-bind="click: $data.togglePinClicked, style: { color: $data.pinned() ? '#fff' : '#6f7b8a' }"><i class="fas fa-thumbtack"></i></span>
        <span data-bind="click: $data.settingsClicked"><i style="font-size: 1.25rem;" class="fas fa-angle-double-right"></i></span>
    </div>
</div>`,
                model: {
                    settingsClicked: () => {
                        var rect = container.getBoundingClientRect();
                        var x = rect.x + rect.width + 10;
                        var y = rect.y;
                        pubsub.publish("load-entity", {
                            guid: entityGuid,
                            options: {
                                left: x,
                                top: y,
                                onReady: (entityWindow) => {
                                    win.children.push(entityWindow);
                                }
                            }
                        });
                        //_this.loadEntityClicked(entityGuid, {
                        //    left: x, top: y, onReady: (entityWindow) => {
                        //        win.children.push(entityWindow);
                        //    }
                        //});
                    },
                    position: {},
                    zoomClicked: function () {
                        this.zoomed = !this.zoomed;
                        if (this.zoomed) {
                            var w = screen.width, h = screen.height;
                            var fh = h - 30;
                            var rect = container.getBoundingClientRect();
                            this.position.x = rect.x;
                            this.position.y = rect.y;
                            embed.setAttribute("width", w + "px");
                            embed.setAttribute("height", fh + "px");
                            container.style.position = "fixed";
                            container.style.top = 0;
                            container.style.left = 0;
                            container.style.height = "100%";
                            container.style.width = "100%";
                            container.style.zIndex = "10";
                            win.state = "fullscreen";
                        } else {
                            embed.setAttribute("width", width + "px");
                            embed.setAttribute("height", height + "px");
                            container.style.position = "absolute";
                            container.style.left = this.position.x + "px";
                            container.style.top = this.position.y + "px";
                            container.style.height = "auto";
                            container.style.width = width + "px";
                            container.style.zIndex = WindowManager.getNextIndex().toString();
                            win.state = "open";
                        }
                    },
                    pinned: ko.observable(false),
                    togglePinClicked: function () {
                        win.togglePin();
                        this.pinned(win.pin);
                    },
                    glass: false,
                    toggleGlassModeClicked: function () {
                        this.glass = !this.glass;
                        if (this.glass) {
                            container.classList.add("glass-window");
                            embed.style.opacity = 0.2;

                        } else {
                            container.classList.remove("glass-window");
                            embed.style.opacity = 1;
                        }
                    },
                    closeClicked: () => win.close(),
                    minimizeClicked: () => win.minimize(),
                    focusClicked: function () {
                        focus = !focus;
                        if (focus) {
                            win.focus();
                        } else {
                            win.unfocus();
                        }
                    }
                }
            }
        });
        container.appendChild(handle);
        container.appendChild(embed);
        const layer = data.layer || WindowManager.currentLayer.container;
        //layer.appendChild(container);
        document.body.appendChild(container);
        const win = WindowManager.addWindow({
            type: "pdf",
            draggable: {
                node: handle,
                stop: function (e, ui) {
                    var rect = container.getBoundingClientRect();
                    //prop.attributes = {
                    //    x: rect.x,
                    //    y: rect.y,
                    //    width: rect.width,
                    //    height: rect.height
                    //};
                }
            },
            loader: {
                params: {
                    entityGuid: entityGuid
                }
            },
            node: container,
            zIndex: WindowManager.getNextIndex()
        });
    };

    return Functions;
});
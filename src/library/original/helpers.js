define("app/helpers", ["jquery", "knockout", "app/utils", "pubsub", "bootstrap"], function ($, ko, Utils, pubsub) {

    var Helper = {};

    function forEach(array, callback, scope) {
        for (var i = 0, n = array.length; i < n; i++) {
            callback.call(scope, array[i], i, array);
        }
    } // passes back stuff we need

    Helper.closeModal = (element) => {
        $(element).modal("hide");
        ko.cleanNode(element);
        element.remove();
    };

    Helper.serialiseAttributes = function (attributes) {
        if (!attributes) {
            return [];
        }
        var propertyAttributes = Object.getOwnPropertyNames(attributes);
        if (propertyAttributes && propertyAttributes.length) {
            var pairs = [];
            for (var key in attributes) {
                var value = attributes[key] || "";
                pairs.push(key + "|" + value);
            }
            return pairs;
        }
        return [];
    };

    Helper.nodeScriptReplace = (node) => {
        const nodeScriptIs = (node) => node.tagName === 'SCRIPT';
        const nodeScriptClone = (node) => {
            const script = document.createElement("script");
            script.text = node.innerHTML;
            for (var i = node.attributes.length - 1; i >= 0; i--) {
                script.setAttribute(node.attributes[i].name, node.attributes[i].value);
            }
            return script;
        };
        if (nodeScriptIs(node) === true) {
            node.parentNode.replaceChild(nodeScriptClone(node), node);
        }
        else {
            var i = 0;
            var children = node.childNodes;
            while (i < children.length) {
                Helper.nodeScriptReplace(children[i++]);
            }
        }
        return node;
    };

    Helper.loadTextWindow = (guid, node, options) => {
        const _this = this;
        options = options || {};
        options = {
            guid: guid,
            node: options.layer || node, // || document.body,
            top: options.top || "100px",
            left: options.left || "600px",
            minWidth: options.minWidth,
            minHeight: options.minHeight,
            width: options.width || "750px", // A4
            // height: options.height || "750px", // A4
            height: options.height || "auto", // A4
            maxHeight: options.maxHeight || "550px", // 800px
            zIndex: options.zIndex || 10,
            chromeless: options.chromeless,
            focus: options.focus,
            border: options.border,
            onSaved: options.onSaved,
            onLoaded: options.onLoaded
        };
        require("modals/search-texts");
        if (guid) {
            Helper.loadTextEditorClient(options, function (client) {
                var loader = div({
                    classList: ["loader", "loader-center"]
                });
                client.editor.container.parentNode.appendChild(loader);
                $.get("/Admin/Text/LoadEditorJson", { id: guid }, function (response) {
                    console.log({ response });
                    loader.remove();
                    var data = Helper.decompress(response.Data);
                    options.name = response.Data.Name;
                    var users = Helper.distinct(data.Properties.filter(x => !!x.userGuid).map(x => x.userGuid));
                    const name = options.name || data.Name || (response.Data.Value ? response.Data.Value.substr(0, 20) : response.Data.Guid)
                    client.bind({
                        guid: guid,
                        name: name
                    });
                    if (data.Sections) {
                        client.model.sections(data.Sections.filter(x => !!x.Target).map(x => x.Target.Name));
                    }
                    var properties = data.Properties.filter(x => x.type != "text/block");
                    window._editor = client.editor;
                    client.editor.container.style.display = "none";
                    client.editor.bind({
                        text: data.Text,
                        properties: properties
                    });
                    client.editor.addToHistory();
                    client.characterCount(data.Text.length);
                    client.wordCount(data.Text.split(" ").length);
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
                    // _this.loadUserBubbles(users, client);
                    //if (options.focus) {
                    //    client.editor.focus();
                    //}
                    if (options.onLoaded) {
                        options.onLoaded(client);
                    }
                    client.editor.container.style.display = "block";
                    client.window.text.name = name;
                });
            });
        }
        else {
            options.name = "<new>";
            const builder = options.chromeless ? Helper.loadChromelessTextEditorClient.bind(this) : Helper.loadTextEditorClient.bind(this);
            builder(options, function (client) {
                client.model.Name(null);
                client.model.Type("Document");
                client.editor.bind({
                    text: "",
                    properties: []
                });
                if (options.onLoaded) {
                    options.onLoaded(client);
                }
            });
        }
    };

    Helper.loadChromelessTextEditorClient = (options, callback) => {
        $.get("/Static/Templates/Text/chromeless-text-editor.html?v=76", function (html) {
            const container = div({
                style: {
                    position: "absolute",
                    fontSize: "0.8rem",
                    top: options.top,
                    left: options.left,
                    width: options.width,
                    minWidth: options.minWidth,
                    minHeight: options.minHeight,
                    height: options.height,
                    border: options.border,
                    backgroundColor: options.backgroundColor || "transparent"
                }
            });
            const add = new QuickAdd({
                tabsVisible: false,
                monitorVisible: false,
                chromeless: options.chromeless,
                handler: {
                    onSelected: function (id) {
                        //win.close();
                        //win.loader.guid = id;
                        //_this.loadTextWindow(id, null, {
                        //    onLoaded: function (client) {
                        //        if (options.onSaved) {
                        //            options.onSaved({ isNew: !options.guid, client: client });
                        //        }
                        //    }
                        //});
                        //delete add;
                    },
                    onCancelled: function () {
                        this.removeMonitor();
                        win.close();
                    },
                    removeMonitor: function () {
                        const { editor } = add;
                        if (editor.monitors.length) {
                            const monitorBar = editor.monitors[0];
                            const monitor = monitorBar.monitor;
                            if (!!monitor) {
                                monitor.remove();
                            }
                            if (!!monitorBar.caretUp) {
                                monitorBar.caretUp.remove();
                            }
                        }
                    },
                    settingsClicked: function () {

                    },
                    closeClicked: function () {
                        this.removeMonitor();
                        win.close();
                    }
                }
            });
            const handle = div({
                classList: ["chromeless-editor-handle"]
            });
            var content = applyBindings(html, add);
            container.appendChild(handle);
            container.appendChild(content);
            var editor = container.querySelectorAll("[data-role='editor'")[0];
            if (!options.guid) {
                editor.style.height = "auto";
            }
            var monitor = div({
                classList: ["context-monitor"],
                style: {
                    display: "none"
                }
            });
            add.setupEditor({ container: editor });
            var monitorBar = new MonitorBar({
                monitor: monitor,
                monitorOptions: {
                    highlightProperties: true
                },
                monitorButton: {
                    link: '<button data-toggle="tooltip" data-original-title="Edit" class="btn btn-sm"><span class="fa fa-link"></span></button>',
                    layer: '<button data-toggle="tooltip" data-original-title="Layer" class="btn btn-sm"><span class="fa fa-cog"></span></button>',
                    load: '<button data-toggle="tooltip" data-original-title="Load" class="btn btn-sm"><span class="fa fa-download"></span></button>',
                    remove: '<button data-toggle="tooltip" data-original-title="Delete" class="btn btn-sm"><span class="fa fa-trash"></span></button>',
                    comment: '<button data-toggle="tooltip" data-original-title="Comment" class="btn btn-sm"><span class="fa fa-comment"></span></button>',
                    shiftLeft: '<button data-toggle="tooltip" data-original-title="Left" class="btn btn-sm"><span class="fa fa-arrow-circle-left"></span></button>',
                    shiftRight: '<button data-toggle="tooltip" data-original-title="Right" class="btn btn-sm"><span class="fa fa-arrow-circle-right"></span></button>',
                    redraw: '<button data-toggle="tooltip" data-original-title="Redraw" class="btn btn-sm"><i class="fas fa-pencil-alt"></i></button>',
                    expand: '<button data-toggle="tooltip" data-original-title="Expand" class="btn btn-sm"><span class="fa fa-plus-circle"></span></button>',
                    contract: '<button data-toggle="tooltip" data-original-title="Contract" class="btn btn-sm"><span class="fa fa-minus-circle"></span></button>',
                    toZeroPoint: '<button data-toggle="tooltip" data-original-title="Convert to zero point" class="btn btn-sm"><span style="font-weight: 600;">Z</span></button>',
                    zeroPointLabel: '<button data-toggle="tooltip" data-original-title="Label" class="btn btn-sm"><span class="fa fa-file-text-o"></span></button>',
                },
                propertyType: add.editor.propertyType,
                css: {
                    highlight: "text-highlight"
                },
                updateCurrentRanges: add.editor.updateCurrentRanges.bind(add.editor)
            });
            add.editor.addMonitor(monitorBar);
            const win = WindowManager.addWindow({
                type: options.windowType || "text",
                scroller: {
                    node: container
                },
                draggable: {
                    node: handle
                },
                loader: {
                    params: {
                        guid: options.guid
                    },
                    handler: _this.loadTextWindow
                },
                node: container,
                zIndex: options.zIndex
            });
            if (options.node) {
                options.node.appendChild(container);
                options.node.appendChild(monitor);
            } else {
                win.addNodeToLayer(container);
                win.addNodeToLayer(monitor);
            }
            add.window.text = win;
            if (callback) {
                callback(add);
            }
        });
    };

    Helper.loadTextEditorClient = (options, callback) => {
        const _this = this;
        require(["parts/text-add", "speedy/monitor-bar", "parts/window-manager"], (QuickAdd, MonitorBar, _WindowManager) => {
            const WindowManager = _WindowManager.getWindowManager();
            $.get("/Static/Templates/Text/text-editor.html?v=67", function (html) {
                const container = div({
                    classList: ["text-window"],
                    style: {
                        position: "absolute",
                        fontSize: "14px",
                        lineHeight: "1.5em",
                        top: options.top,
                        left: options.left ? options.left : "unset",
                        right: !options.left ? options.right : "unset",
                        width: options.width,
                        height: options.height,
                        backgroundColor: "#fff"
                    }
                });
                const client = new QuickAdd({
                    tabsVisible: false,
                    monitorVisible: false,
                    chromeless: options.chromeless,
                    model: {
                        Type: "Document"
                    },
                    handler: {
                        onSelected: function (id) {
                            console.log("onSelected", { id });
                        },
                        onCancelled: function () {
                            this.removeMonitor();
                            win.close();
                            delete client;
                        },
                        removeMonitor: function () {
                            const { editor } = client;
                            if (editor.monitors.length) {
                                const monitorBar = editor.monitors[0];
                                const monitor = monitorBar.monitor;
                                if (!!monitor) {
                                    monitor.remove();
                                }
                                if (!!monitorBar.caretUp) {
                                    monitorBar.caretUp.remove();
                                }
                            }
                        },
                        togglePinClicked: function () {
                            win.togglePin();
                            _this.pinned(win.pin);
                        },
                        toggleGlassModeClicked: function () {
                            this.glass = !this.glass;
                            if (this.glass) {
                                container.classList.add("glass-window");
                                editor.classList.add("glass-editor");

                            } else {
                                container.classList.remove("glass-window");
                                editor.classList.remove("glass-editor");
                            }
                        },
                        closeClicked: function () {
                            this.removeMonitor();
                            win.close();
                        },
                        pinClicked: function () {
                            win.pin();
                        },
                        focusClicked: function () {
                            this.focus = !this.focus;
                            if (this.focus) {
                                win.focus();
                            } else {
                                win.unfocus();
                            }
                        },
                        minimizeClicked: function () {
                            win.minimize({ name: options.name });
                        },
                        zoomClicked: function () {
                            const { editor } = client;
                            if (win.state == "open") {
                                win.zoom();
                                win.state = "zoom";
                            } else {
                                win.unzoom();
                                win.state = "open";
                            }
                            editor.updateOffsets();
                        }
                    }
                });
                var content = Helper.applyBindings(html, client);
                container.appendChild(content);
                var editor = container.querySelectorAll("[data-role='editor'")[0];
                if (!options.guid) {
                    editor.style.height = "350px";
                }
                var handle = container.querySelectorAll("[data-role='drag-handle']")[0];
                var monitor = div({
                    classList: ["context-monitor"],
                    style: {
                        display: "none"
                    }
                });
                client.setupEditor({ container: editor });
                var monitorBar = new MonitorBar({
                    monitor: monitor,
                    monitorOptions: {
                        highlightProperties: true
                    },
                    monitorButton: {
                        link: '<button data-toggle="tooltip" data-original-title="Edit" class="btn btn-sm"><span class="fa fa-link"></span></button>',
                        layer: '<button data-toggle="tooltip" data-original-title="Layer" class="btn btn-sm"><span class="fa fa-cog"></span></button>',
                        load: '<button data-toggle="tooltip" data-original-title="Load" class="btn btn-sm"><span class="fa fa-download"></span></button>',
                        remove: '<button data-toggle="tooltip" data-original-title="Delete" class="btn btn-sm"><span class="fa fa-trash"></span></button>',
                        comment: '<button data-toggle="tooltip" data-original-title="Comment" class="btn btn-sm"><span class="fa fa-comment"></span></button>',
                        shiftLeft: '<button data-toggle="tooltip" data-original-title="Left" class="btn btn-sm"><span class="fa fa-arrow-circle-left"></span></button>',
                        shiftRight: '<button data-toggle="tooltip" data-original-title="Right" class="btn btn-sm"><span class="fa fa-arrow-circle-right"></span></button>',
                        redraw: '<button data-toggle="tooltip" data-original-title="Redraw" class="btn btn-sm"><i class="fas fa-pencil-alt"></i></button>',
                        expand: '<button data-toggle="tooltip" data-original-title="Expand" class="btn btn-sm"><span class="fa fa-plus-circle"></span></button>',
                        contract: '<button data-toggle="tooltip" data-original-title="Contract" class="btn btn-sm"><span class="fa fa-minus-circle"></span></button>',
                        toZeroPoint: '<button data-toggle="tooltip" data-original-title="Convert to zero point" class="btn btn-sm"><span style="font-weight: 600;">Z</span></button>',
                        zeroPointLabel: '<button data-toggle="tooltip" data-original-title="Label" class="btn btn-sm"><span class="fa fa-file-text-o"></span></button>',
                    },
                    propertyType: client.editor.propertyType,
                    css: {
                        highlight: "text-highlight"
                    },
                    updateCurrentRanges: client.editor.updateCurrentRanges.bind(client.editor)
                });
                client.editor.addMonitor(monitorBar);
                var win = WindowManager.addWindow({
                    type: options.windowType || "text",
                    scroller: {
                        node: editor
                    },
                    draggable: {
                        node: handle
                    },
                    loader: {
                        params: {
                            guid: options.guid
                        },
                        handler: client.loadTextWindow
                    },
                    node: container,
                    zIndex: options.zIndex
                });
                if (options.node) {
                    document.body.appendChild(container);
                    document.body.appendChild(monitor);
                } else {
                    win.addNodeToLayer(container);
                    win.addNodeToLayer(monitor);
                }
                client.window.text = win;
                if (callback) {
                    callback(client);
                }
            });
        });
    };

    Helper.generateNamedEntities = (editor, callback) => {
        const data = editor.unbind();
        $.post("/Admin/Text/GenerateNamedEntities", { text: data.text }, (response) => {
            console.log("/Admin/Text/GenerateNamedEntities", { response });
            if (!response.Success) {
                return [];
            }
            var standoffProperties = [];
            const _entities = response.Data;
            const accepted = ["PERSON", "LOCATION", "WORK_OF_ART", "CONSUMER_GOOD", "ORGANIZATION"];
            const entities = _entities.filter(x => accepted.some(a => a == x.Entity.Type));
            entities.forEach(item => {
                const entity = item.Entity;
                item.StandoffProperties.forEach(sp => {
                    const attributes = {
                        "entity/name": entity.Name,
                        "entity/type": entity.Type,
                        "entity/knowledge-graph-mid": entity.KnowledgeGraphMid,
                        "entity/wikipedia-url": entity.WikipediaUrl
                    };
                    const standoff = {
                        type: "named-entity/agent",
                        startIndex: sp.StartIndex,
                        endIndex: sp.EndIndex,
                        text: entity.Name,
                        value: entity.Name,
                        attributes: attributes
                    };
                    standoffProperties.push(standoff);
                });
            });
            callback(standoffProperties);
        });
    };

    Helper.toHSL = (magnitude, score) => {
        var score = parseFloat(score);
        var magnitude = Math.abs(parseFloat(magnitude) * 10);
        var H = score >= 0 ? 125 : 0;
        var S = 100;
        var diff = 10 - Math.ceil(magnitude);
        var L = 90 + diff;
        return "hsl({H}, {S}%, {L}%)".fmt({ H, S, L });
    };

    Helper.highlightSentiments = (args) => {
        const { highlight, editor } = args;
        const properties = editor.data.properties.filter(x => x.type == "sentiment/sentence");
        if (!properties.length) {
            return;
        }
        properties.forEach(p => {
            if (highlight) {
                const colour = Helper.toHSL(p.attributes.magnitude, p.attributes.score);
                p.colour = colour;
                Helper.drawClippedRectangle(p, { fill: colour });
            } else {
                if (p.svg) {
                    p.svg.remove();
                }
            }
        });
        const schema = properties[0].schema;
        if (highlight) {
            require(["parts/minimap"], function (Minimap) {
                const caret = editor.getCaret();
                const cursor = caret.left || caret.right;
                var minimap = schema.minimap = new Minimap({ editor, container: editor.container });
                minimap.createBar({ backgroundColor: "none" });
                minimap.addMarkers(properties, { hide: false, opacity: "1", usePropertyHeight: true, mixBlendMode: "multiply" });
                minimap.setArrowAt(cursor);
            });
        } else {
            if (schema.minimap) {
                schema.minimap.remove();
            }
        }
    };

    Helper.removeFromArray = (arr, item) => {
        var i = arr.findIndex(x => x == item);
        if (i > -1) {
            arr.splice(i, 1);
        }
    };

    Helper.generateUUID = function () {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    Helper.getMatches = (args) => {
        const { text, search } = args;
        var options = args.options || "gi";
        const re = new RegExp(search, options);
        var results = [], match;
        while ((match = re.exec(text)) != null) {
            if (re.lastIndex == 0) {
                return [];
            }
            let span = match[0];
            results.push({
                start: match.index,
                end: match.index + span.length - 1,
                text: text.substr(match.index, span.length)
            });
        }
        return results;
    };

    Helper.createSnapshotWindow = (args) => {
        const { win } = args;
        const thumbnailWidth = args.thumbnailWidth || 200;
        const thumbnailHeight = args.thumbnailHeight || 112;
        const iconScale = args.iconScale || 1;
        const ratioX = args.ratioX || (thumbnailWidth / 1920);
        const ratioY = args.ratioY || (thumbnailHeight / 1080);
        const borderRadius = args.borderRadius || 2;
        const borderColor = args.borderColor || "cyan";
        const x = win.x * ratioX;
        const y = win.y * ratioY;
        const w = win.width * ratioX;
        const h = win.height * ratioY;
        //flaticon.com
        const thumbnail = div({
            classList: ["snapshot-thumbnail-rectangle"],
            style: {
                top: y + "px",
                left: x + "px",
                width: w + "px",
                height: h + "px",
                borderColor: borderColor,
                z: win.z,
                borderRadius: borderRadius + "px"
            }
        });
        if (args.win.shape == "Circle") {
            thumbnail.style.borderRadius = "50%";
        }
        if (win.type == "video") {
            let cx = 35 * iconScale;
            let cy = 27 * iconScale;
            let x = (w / 2) - (cx / 2);
            let y = (h / 2) - (cy / 2);
            let content = div({
                style: {
                    position: "absolute",
                    top: y + "px",
                    left: x + "px"
                },
                innerHTML: `<img src="/Images/icons/youtube.svg" style="width: ${cx}px; height: ${cy}px;" />`
            });
            thumbnail.style.backgroundColor = "#000";
            thumbnail.appendChild(content)
        }
        if (win.type == "image") {
            let cx = 30 * iconScale;
            let cy = 20 * iconScale;
            let x = (w / 2) - (cx / 2);
            let y = (h / 2) - (cy / 2);
            let content = div({
                style: {
                    position: "absolute",
                    top: y + "px",
                    left: x + "px"
                },
                innerHTML: `<img src="/Images/icons/camera.svg" style="width: ${cx}px; height: ${cy}px;" />`
            });
            thumbnail.style.backgroundColor = "#999";
            thumbnail.appendChild(content)
        }
        if (win.type == "tweet") {
            let cx = 20 * iconScale;
            let cy = 20 * iconScale;
            let x = (w / 2) - (cx / 2);
            let y = (h / 2) - (cy / 2);
            let content = div({
                style: {
                    position: "absolute",
                    top: y + "px",
                    left: x + "px"
                },
                innerHTML: `<img src="/Images/icons/twitter.svg" style="width: ${cx}px; height: ${cy}px;" />`
            });
            thumbnail.style.backgroundColor = "#eee";
            thumbnail.appendChild(content)
        }
        if (win.type == "text" || win.type == "text-block") {
            let cx = 20 * iconScale;
            let cy = 30 * iconScale;
            let x = (w / 2) - (cx / 2);
            let y = (h / 2) - (cy / 2);
            let content = div({
                style: {
                    position: "absolute",
                    top: y + "px",
                    left: x + "px"
                },
                innerHTML: `<img src="/Images/icons/left-align.svg" style="width: ${cx}px; height: ${cy}px;" />`
            });
            thumbnail.style.backgroundColor = "#eee";
            thumbnail.appendChild(content)
        }
        if (win.type == "pdf") {
            let cx = 30 * iconScale;
            let cy = 40 * iconScale;
            let x = (w / 2) - (cx / 2);
            let y = (h / 2) - (cy / 2);
            let content = div({
                style: {
                    position: "absolute",
                    top: y + "px",
                    left: x + "px"
                },
                innerHTML: `<img src="/Images/icons/pdf.svg" style="width: ${cx}px; height: ${cy}px;" />`
            });
            thumbnail.appendChild(content)
        }
        if (win.type == "website") {
            let cx = 40 * iconScale;
            let cy = 40 * iconScale;
            let x = (w / 2) - (cx / 2);
            let y = (h / 2) - (cy / 2);
            let content = div({
                style: {
                    position: "absolute",
                    top: y + "px",
                    left: x + "px"
                },
                innerHTML: `<img src="/Images/icons/world-wide-web.svg" style="width: ${cx}px; height: ${cy}px;" />`
            });
            thumbnail.appendChild(content)
        }
        if (win.type == "timeline") {
            let cx = 30 * iconScale;
            let cy = 40 * iconScale;
            let x = (w / 2) - (cx / 2);
            let y = (h / 2) - (cy / 2);
            let content = div({
                style: {
                    position: "absolute",
                    top: y + "px",
                    left: x + "px"
                },
                innerHTML: `<img src="/Images/icons/timeline.svg" style="width: ${cx}px; height: ${cy}px;" />`
            });
            thumbnail.appendChild(content)
        }
        if (win.type == "snapshot") {
            let cx = 15 * iconScale;
            let cy = 15 * iconScale;
            let x = (w / 2) - (cx / 2);
            let y = (h / 2) - (cy / 2);
            let content = div({
                style: {
                    position: "absolute",
                    top: "-6px",
                    left: "2px"
                },
                innerHTML: `<img src="/Images/icons/dot.svg" style="width: ${cx}px; height: ${cy}px;" />`
            });
            thumbnail.appendChild(content)
        }
        if (win.name) {
            const name = div({
                classList: ["snapshot-thumbnail-name", "truncate"],
                innerHTML: win.name
            });
            //thumbnail.appendChild(name);
        }
        //thumbnail.setAttribute("title", win.name);
        return thumbnail;
    };

    Helper.groupBy = (list, keyGetter) => {
        const map = new Map();
        list.forEach((item) => {
            const key = keyGetter(item);
            const collection = map.get(key);
            if (!collection) {
                map.set(key, [item]);
            } else {
                collection.push(item);
            }
        });
        return map;
    };

    Helper.drawUnderlineRainbow = (p, options) => {
        const { editor } = p;
        options = options || {};
        options.offsetY = typeof (options.offsetY) == "undefined" ? 3 : options.offsetY;
        if (p.svg) {
            p.svg.remove();
        }
        const spans = p.getSpanRange();
        const containerRect = editor.container.getBoundingClientRect();
        const rows = Array.from(Helper.groupBy(spans, x => x.speedy.offset.y));
        const ordered = rows.sort((a, b) => a[0] > b[0] ? 1 : a[0] < b[0] ? -1 : 0);
        const topY = spans[0].speedy.offset.y;
        const topH = spans[0].speedy.offset.h;
        const bottomY = spans[spans.length - 1].speedy.offset.y;
        const bottomH = spans[spans.length - 1].speedy.offset.h;
        const width = containerRect.width;
        const height = bottomY + bottomH - topY + 10;
        var svg = p.svg = Helper.svg({
            style: {
                position: "absolute",
                left: 0,
                top: topY + "px",
                width: width + "px",
                height: height + "px",
                "pointer-events": "none"
            }
        });
        svg.speedy = {
            role: 3,
            stream: 1
        };
        function createLine(args) {
            const { x1, x2, y1, y2, colour, strokeWidth } = args;
            var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.style.stroke = colour;
            line.style.strokeWidth = "2";
            line.setAttribute("x1", x1);
            line.setAttribute("y1", y1);
            line.setAttribute("x2", x2);
            line.setAttribute("y2", y2);
            return line;
        }
        const colours = ["#ff0000", "#ffa500", "#ffff00", "#008000", "#0000ff", "#4b0082", "#ee82ee"];
        ordered.forEach(group => {
            const cells = group[1];
            const start = cells[0], end = cells[cells.length - 1];
            const startOffset = start.speedy.offset, endOffset = end.speedy.offset;
            colours.forEach((c, i) => {
                const offsetY = (i * 1) - 1;
                const line = createLine({
                    colour: c,
                    strokeOpacity: options.strokeOpacity,
                    strokeWidth: options.strokeWidth || 2,
                    x1: startOffset.x,
                    y1: startOffset.y + startOffset.h - topY + offsetY,
                    x2: endOffset.x + endOffset.w,
                    y2: endOffset.y + endOffset.h - topY + offsetY
                });
                svg.appendChild(line);
            });
        });
        return svg;

    };

    Helper.drawUnderline = (p, options) => {
        options.offsetY = typeof (options.offsetY) == "undefined" ? 3 : options.offsetY;
        if (p.svg) {
            p.svg.remove();
        }
        const spans = p.getSpanRange().filter(p => !!p && !p.isDeleted);
        if (spans.length == 0) {
            return;
        }
        const rows = Array.from(Helper.groupBy(spans, x => x.speedy.offset.y));
        const ordered = rows.sort((a, b) => a[0] > b[0] ? 1 : a[0] < b[0] ? -1 : 0);
        const topY = spans[0].speedy.offset.y;
        const bottomY = spans[spans.length - 1].speedy.offset.y;
        const bottomH = spans[spans.length - 1].speedy.offset.h;
        const width = options.containerWidth;
        const height = bottomY + bottomH - topY + 10;
        var svg = p.svg = Helper.svg({
            style: {
                position: "absolute",
                left: 0,
                top: topY + "px",
                width: width + "px",
                height: height + "px",
                "pointer-events": "none"
            }
        });
        svg.speedy = {
            role: 3,
            stream: 1
        };
        ordered.forEach(group => {
            const cells = group[1];
            const start = cells[0], end = cells[cells.length - 1];
            const startOffset = start.speedy.offset, endOffset = end.speedy.offset;
            var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.style.stroke = options.stroke || "blue";
            line.style.strokeWidth = options.strokeWidth || "2";
            if (options.strokeOpacity) {
                line.style.strokeOpacity = options.strokeOpacity;
            }
            const x1 = startOffset.x;
            const y1 = startOffset.y + startOffset.h - topY + options.offsetY;
            const x2 = endOffset.x + endOffset.w;
            const y2 = endOffset.y + startOffset.h - topY + options.offsetY;
            line.setAttribute("x1", x1);
            line.setAttribute("y1", y1);
            line.setAttribute("x2", x2);
            line.setAttribute("y2", y2);
            svg.appendChild(line);
        });
        return svg;
    };

    Helper.drawClippedRectangle = (p, options) => {
        const editor = p.editor;
        options = options || {};
        if (p.svg) {
            p.svg.remove();
        }
        var mx = 60;
        var mx2 = 3;
        var my2 = 4;
        var container = editor.container;
        var containerRect = container.getBoundingClientRect();
        var buffer = p.startNode.offsetTop;
        var topLeftX = p.startNode.offsetLeft;
        var topLeftY = p.startNode.offsetTop;
        var bottomRightX = p.endNode.offsetLeft + p.endNode.offsetWidth;
        var bottomRightY = p.endNode.offsetTop + p.endNode.offsetHeight;
        var svg = p.svg = Helper.svg({
            style: {
                position: "absolute",
                left: 0,
                top: topLeftY - 2,
                width: containerRect.width,
                height: bottomRightY - topLeftY + my2,
                "pointer-events": "none"
            }
        });
        var pairs = [];
        var onSameLine = (p.startNode.offsetTop == p.endNode.offsetTop);
        if (onSameLine) {
            pairs = [
                [topLeftX - mx2, topLeftY - buffer],
                [topLeftX - mx2, bottomRightY - buffer + my2],
                [bottomRightX + mx2, bottomRightY - buffer + my2],
                [bottomRightX + mx2, topLeftY - buffer],
                [topLeftX - mx2, topLeftY - buffer]
            ];
        } else {
            pairs = [
                [topLeftX - mx2, topLeftY - buffer],
                [topLeftX - mx2, topLeftY + p.startNode.offsetHeight - buffer + my2],
                [mx, topLeftY + p.startNode.offsetHeight - buffer + my2],
                [mx, bottomRightY - buffer + my2],
                [bottomRightX + mx2, bottomRightY - buffer + my2],
                [bottomRightX + mx2, p.endNode.offsetTop - buffer],
                [containerRect.width - mx, p.endNode.offsetTop - buffer],
                [containerRect.width - mx, topLeftY - buffer],
                [topLeftX - mx2, topLeftY - buffer]
            ];
        }
        var path = pairs.map(x => { return x[0] + " " + x[1]; }).join(", ");
        var polygon = Helper.svgElement(svg, "polygon", {
            attribute: {
                points: path,
                fill: "transparent"
            }
        });
        if (options.fill) {
            polygon.style.fill = options.fill;
            //polygon.style.fillOpacity = "0.4";
            polygon.style.strokeOpacity = "0";
            polygon.style["mix-blend-mode"] = "multiply";
        }
        if (options.stroke) {
            polygon.style.stroke = options.stroke;
            polygon.style.strokeWidth = options.strokeWidth || "1";
        }
        svg.speedy = {
            stream: 1
        };
        svg.appendChild(polygon);
        var parent = p.startNode.parentNode;
        parent.insertBefore(svg, p.startNode);
        return svg;
    };

    Helper.drawRectangleAroundNodes = (args) => {
        const { startNode, endNode, editor } = args;
        const options = args.options || {};
        if (editor.rectangleSvg) {
            editor.rectangleSvg.remove();
        }
        var mx = 60;
        var mx2 = 3;
        var my2 = 4;
        var container = editor.container;
        var containerRect = container.getBoundingClientRect();
        var buffer = startNode.speedy.offset.y;
        var topLeftX = startNode.speedy.offset.x;
        var topLeftY = startNode.speedy.offset.y;
        var bottomRightX = endNode.speedy.offset.x + endNode.speedy.offset.w;
        var bottomRightY = endNode.speedy.offset.y + endNode.speedy.offset.h;
        var rectangleSvg = editor.rectangleSvg = Helper.svg({
            style: {
                position: "absolute",
                left: 0,
                top: topLeftY - 2,
                width: containerRect.width,
                height: bottomRightY - topLeftY + my2,
                "pointer-events": "none"
            }
        });
        var pairs = [];
        var onSameLine = (startNode.offsetTop == endNode.offsetTop);
        if (onSameLine) {
            pairs = [
                [topLeftX - mx2, topLeftY - buffer],
                [topLeftX - mx2, bottomRightY - buffer + my2],
                [bottomRightX + mx2, bottomRightY - buffer + my2],
                [bottomRightX + mx2, topLeftY - buffer],
                [topLeftX - mx2, topLeftY - buffer]
            ];
        } else {
            pairs = [
                [topLeftX - mx2, topLeftY - buffer],
                [topLeftX - mx2, topLeftY + startNode.offsetHeight - buffer + my2],
                [mx, topLeftY + startNode.offsetHeight - buffer + my2],
                [mx, bottomRightY - buffer + my2],
                [bottomRightX + mx2, bottomRightY - buffer + my2],
                [bottomRightX + mx2, endNode.offsetTop - buffer],
                [containerRect.width - mx, endNode.offsetTop - buffer],
                [containerRect.width - mx, topLeftY - buffer],
                [topLeftX - mx2, topLeftY - buffer]
            ];
        }
        var path = pairs.map(x => { return x[0] + " " + x[1]; }).join(", ");
        var polygon = Helper.svgElement(rectangleSvg, "polygon", {
            attribute: {
                points: path,
                fill: "transparent"
            }
        });
        if (options.fill) {
            polygon.style.fill = options.fill;
            polygon.style.strokeOpacity = "0";
            polygon.style["mix-blend-mode"] = "multiply";
        }
        if (options.stroke) {
            polygon.style.stroke = options.stroke;
            polygon.style.strokeWidth = options.strokeWidth || "1";
        }
        rectangleSvg.speedy = {
            stream: 1
        };
        rectangleSvg.appendChild(polygon);
        var parent = startNode.parentNode;
        parent.insertBefore(rectangleSvg, startNode);
        return rectangleSvg;
    };

    Helper.openFullScreen = (elem) => {
        elem = elem || document.body;
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.mozRequestFullScreen) { /* Firefox */
            elem.mozRequestFullScreen();
        } else if (elem.webkitRequestFullscreen) { /* Chrome, Safari and Opera */
            elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) { /* IE/Edge */
            elem.msRequestFullscreen();
        }
    };

    Helper.exitFullScreen = () => {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) { /* Firefox */
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) { /* Chrome, Safari and Opera */
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { /* IE/Edge */
            document.msExitFullscreen();
        }
    };

    // See ref: https://developpaper.com/native-js-and-jquery-delete-iframe-and-release-memory-ie/
    Helper.destroyIFrame = (iframe) => {
        // Pointing iframe to a blank page frees up most of the memory. 
        iframe.src = 'about:blank';
        try {
            iframe.contentWindow.document.write('');
            iframe.contentWindow.document.clear();
        } catch (e) { }
        iframe.parentNode.removeChild(iframe);
    }

    Helper.decompress = function (data) {
        const types = data.Types;
        const userGuids = data.UserGuids;
        const values = data.Values;
        const attributes = data.Attributes;
        const properties = data.Properties.map(x => {
            const temp = {
                index: x.i,
                startIndex: x.s,
                type: types[x.y],
                text: x.t,
                isZeroPoint: x.z,
                isDeleted: x.d,
                guid: x.g,
                attributes: x.a
            };
            if (typeof x.l != "undefined") {
                temp.endIndex = temp.startIndex + x.l;
            }
            if (typeof x.v != "undefined") {
                temp.value = values[x.v];
            }
            if (typeof x.u != "undefined") {
                temp.userGuid = userGuids[x.u];
            }
            if (typeof x.a != "undefined") {
                temp.attributes = attributes[x.a];
            }
            return temp;
        });
        data.Properties = properties;
        return data;
    };

    Helper.changeCss = function (selectorText, tgtAttribName, newValue) {
        var styleSheets = document.styleSheets;
        forEach(styleSheets, styleSheetFunc);

        function styleSheetFunc(sheet) {
            try {
                forEach(sheet.cssRules, cssRuleFunc);
            } catch (ex) {

            }
        }

        function cssRuleFunc(rule) {
            if (selectorText.indexOf(rule.selectorText) != -1) {
                forEach(rule.style, cssRuleAttributeFunc);
            }

            function cssRuleAttributeFunc(attribName) {
                if (attribName == tgtAttribName) {
                    rule.style[attribName] = newValue;
                    console.log('attribute replaced');
                }
            }
        }
    }

    const div = Helper.div = (config) => {
        return Helper.newElement("DIV", config);
    };

    Helper.span = (config) => {
        return Helper.newElement("SPAN", config);
    };

    Helper.newElement = (type, config) => {
        var el = document.createElement(type);
        return Helper.updateElement(el, config);
    };

    Helper.loadScript = (src) => {
        var tag = Helper.newElement("script", {
            attribute: {
                src: src
            }
        });
        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    };

    Helper.svg = (config) => {
        var el = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        return Helper.updateSVGElement(el, config);
    };

    Helper.svgElement = (svg, type, config) => {
        var el = document.createElementNS(svg.namespaceURI, type);
        return Helper.updateSVGElement(el, config);
    };

    Helper.updateSVGElement = (el, config) => {
        if (config.property) {
            el.property = config.property;
        }
        if (config.attribute) {
            for (var key in config.attribute) {
                if (key.indexOf("xlink") < 0) {
                    el.setAttributeNS(null, key, config.attribute[key]);
                } else {
                    el.setAttribute(key, config.attribute[key]);
                }
            }
        }
        if (config.style) {
            for (var key in config.style) {
                var value = config.style[key];
                el.style[key] = value;
            }
        }
        if (config.children) {
            config.children.forEach(n => el.appendChild(n));
        }
        return el;
    };

    Helper.updateElement = (el, config) => {
        if (config.property) {
            el.property = config.property;
        }
        if (config.innerHTML) {
            el.innerHTML = config.innerHTML;
        }
        var pixelFields = ["left", "top", "width", "height", "x", "y"];
        if (config.style) {
            for (var key in config.style) {
                var value = config.style[key];
                el.style[key] = value;
            }
        }
        if (config.children) {
            config.children.forEach(n => el.appendChild(n));
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
        if (config.parent) {
            config.parent.appendChild(el);
        }
        if (config.template) {
            var temp = Helper.applyBindings(config.template.view, config.template.model);
            el.appendChild(temp);
            if (config.template.onAdded) {
                window.setTimeout(() => {
                    config.template.onAdded(temp);
                }, 1);
            }
        }
        return el;
    };

    Helper.extendElement = (source, config) => {
        var el = source.cloneNode(true);
        return Helper.updateElement(el, config);
    };

    Helper.distinct = function (list, comparer) {
        var results = [];
        comparer = comparer || function (existing, item) {
            return existing == item;
        };
        list.forEach(item => {
            var found = results.some(existing => comparer(existing, item));
            if (false == found) {
                results.push(item);
            }
        });
        return results;
    };

    Helper.copyToClipboard = function (text) {
        var textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.display = "none";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
    };

    Helper.getParent = function (startNode, func) {
        var s = startNode, loop = true;
        while (loop) {
            if (func(s)) {
                return s;
            }
            if (s) {
                s = s.parentElement;
            } else {
                loop = false;
            }
        }
        return null;
    }

    Helper.openModal = function (url, settings) {
        settings = settings || {};
        var modal = document.createElement("DIV");
        modal.classList.add("modal");
        modal.style.display = "none";
        document.body.appendChild(modal);
        $.get(url, function (response) {
            modal.innerHTML = response;
            modal.style.visibility = "visible";
            $(modal).modal("show");
            if (settings.onClose) {
                $(modal).on("hidden.bs.modal", function (e) {
                    settings.onClose(modal);
                });
            }
            var content = modal.children[0];
            content.classList.add("modal-dialog");
            if (settings.ajaxContentAdded) {
                settings.ajaxContentAdded(modal);
            }
            pubsub.publish("modal/opened", settings.name || url);
        });
    }

    Helper.emptyItem = { Text: null, Value: null };

    Helper.store = function (key, item, equals) {
        equals = equals || function (value) { return true; }
        var list = JSON.parse(localStorage.getItem(key)) || [];
        if (Utils.any(list, function (x) { return equals(x); })) {
            return;
        }
        list.splice(0, 0, item);
        localStorage.setItem(key, JSON.stringify(list));
    }

    Helper.retrieve = function (key) {
        return JSON.parse(localStorage.getItem(key)) || [];
    }

    Helper.setList = function (valueObservable, arrayObservable, list) {
        if (!valueObservable || !arrayObservable || !list) {
            return;
        }
        var value = valueObservable();
        arrayObservable(list);
        valueObservable(value);
    };

    Helper.last = (arr) => {
        if (!arr || arr.length == 0) {
            return null;
        }
        const len = arr.length;
        return arr[len - 1];
    };

    Helper.storeItemInList = function (key, item) {
        var list = JSON.parse(sessionStorage.getItem(key)) || [];
        if (Utils.any(list, function (x) { return JSON.stringify(x) == JSON.stringify(item); })) {
            return;
        }
        list.splice(0, 0, item);
        sessionStorage.setItem(key, JSON.stringify(list));
    }

    Helper.applyBindings = (html, model) => {
        var node = Helper.div({ innerHTML: html });
        ko.applyBindings(model, node);
        return node;
    }

    return Helper;
});
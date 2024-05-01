(function (factory) {
    define("parts/window-manager", ["knockout", "jquery", "plugins/html2canvas", "pubsub", "app/helpers", "modals/search-texts", "parts/text-add", "plugins/zoom-pan", "jquery-ui"], factory);
}(function (ko, $, html2canvas, pubsub, Helper, SearchTexts, QuickAdd, renderer) {

    const { createSnapshotWindow, div, updateElement } = Helper;
    const Shape = {
        "Rectilinear": "Rectilinear",
        "Circle": "Circle",
        "Hexagon": "Hexagon"
    };
    const Mode = {
        "Free": "free",
        "Column": "column",
        "Focus": "focus"
    };
    const State = {
        "Open": "open",
        "Closed": "closed",
        "Minimized": "minimized",
        "Fullscreen": "fullscreen"
    };
    const Surface = {
        "Default": "Default",
        "Glass": "Glass"
    };
    var index = 0;
    var topIndex = 11;

    class Window {
        constructor(cons) {
            var _this = this;
            cons = cons || {};
            cons.loader = cons.loader || {};
            this.index = index++;
            this.active = cons.active;
            this.manager = cons.manager;
            this.layer = cons.layer;
            this.state = cons.state || State.Open;
            this.mode = cons.mode || Mode.Free;
            this.node = cons.node;
            this.type = cons.type;
            this.shape = cons.shape || Shape.Rectilinear;
            this.surface = cons.surface || Surface.Default;
            this.name = cons.name;
            this.parent = cons.parent;
            this.children = [];
            this.synced = cons.synced;
            this.loader = {
                params: cons.loader.params,
                handler: cons.loader.handler
            };
            this.pin = cons.pin;
            this.data = {

            };
            this.handler = cons.handler;
            this.z = cons.z;
            this.node.style.zIndex = this.z;
            $(this.node).on("click", function (e) {
                if (_this.mode == Mode.Focus || _this.state == State.Fullscreen) {
                    return;
                }
                _this.layer.setActiveWindow(_this);
                if (_this.z == topIndex) {
                    return;
                }
                console.log("setting new z top");
                var top = _this.manager.getNextIndex();
                _this.node.style.zIndex = top;
                _this.z = top;
                topIndex = top;
            });
            this.click = {};
            if (cons.draggable) {
                this.setDraggable(cons.draggable);
            }
            if (cons.scroller) {
                require(["jquery-ui", "jquery/nicescroll"], () => {
                    $(cons.scroller.node).niceScroll({ cursorcolor: "#333", horizrailenabled: false });
                });
            }
            if (cons.resizable) {
                $(cons.resizable.node).draggable({
                    stop: function (e) {
                        if (cons.draggable.stop) {
                            cons.draggable.stop(e);
                        }
                    }
                });
            }
            this.node.addEventListener("resize", (e) => this.setNiceScroll());
        }
        addNodeToLayer(node) {
            document.body.appendChild(node);
            //this.layer.container.appendChild(node);
        }
        setDraggable(draggable) {
            const _this = this;
            $(this.node).draggable({
                handle: draggable.node || this.node,
                cancel: draggable.cancel,
                start: function (e) {
                    _this.click.x = e.clientX;
                    _this.click.y = e.clientY;
                },
                drag: function (e, ui) {
                    const { scale } = _this.layer;
                    const { click } = _this;
                    const original = ui.originalPosition;
                    ui.position = {
                        left: (e.clientX - click.x + original.left) / scale,
                        top: (e.clientY - click.y + original.top) / scale,
                    };
                    //if (_this.synced) {
                    //    let node = _this.synced.node;
                    //    var rect = node.getBoundingClientRect();
                    //    //var offsetX = ui.position.left - ui.originalPosition.left;
                    //    //var offsetY = ui.position.top - ui.originalPosition.top;
                    //    var offsetX = ui.offset.left - ui.originalPosition.left;
                    //    var left = (rect.x + offsetX);
                    //    node.style.top = ui.position.top + "px";
                    //    node.style.left = left + "px";
                    //    console.log({ rectLeft: rect.left, offsetX });
                    //}
                },
                scroll: draggable.scroll,
                stop: function (e, ui) {
                    if (draggable.stop) {
                        draggable.stop(e);
                    }

                }
            });
        }
        togglePin() {
            this.pin = !this.pin;
        }
        getNodeInfo() {
            if (this.type == "text") {
                return {
                    type: "text",
                    guid: this.loader.params.guid
                }
            }
            if (this.type == "agent-graph") {
                return {
                    type: "entity",
                    guid: this.loader.params.guid
                }
            }
            if (this.type == "timeline") {
                return {
                    type: "entity",
                    guid: this.loader.params.guid
                }
            }
            if (this.type == "marginalia") {
                return {
                    type: "text",
                    guid: this.loader.params.guid
                }
            }
            var mediaTypes = ["image", "video", "tweet", "pdf", "website", "sketchfab"];
            if (mediaTypes.some(x => x == this.type)) {
                return {
                    type: "entity",
                    guid: this.loader.params.entityGuid
                }
            }
            return {
                type: this.type,
                guid: null
            };
        };
        drawArrow() {
            require(["app/helpers"], function (Helper) {
                var x1, y1, x2, y2;
                var svg = Helper.svg({
                    style: {
                        position: "absolute",
                        left: x,
                        top: y,
                        width: w,
                        height: w
                    }
                });
                var defs = Helper.svgElement(svg, "defs", {
                    children: [
                        Helper.svgElement(svg, "marker", {
                            attribute: {
                                id: "arrowhead",
                                markerWidth: 10,
                                markerHeight: 7,
                                refX: 0, refY: 3.5,
                                orient: "auto"
                            },
                            children: [
                                Helper.svgElement(svg, "polygon", {
                                    attribute: {
                                        points: "0 0, 10 3.5, 0 7"
                                    }
                                })
                            ]
                        })
                    ]
                });
                var line = Helper.svgElement(svg, "line", {
                    attribute: {
                        x1, y1, x2, y2,
                        stroke: "#000",
                        "stroke-width": 8,
                        "marker-end": "url(#arrowhead)"
                    }
                });
                svg.appendChild(defs);
                svg.appendChild(line);
                document.body.appendChild(svg);
                /*
                 * <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 350 100">
                      <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="7"
                        refX="0" refY="3.5" orient="auto">
                          <polygon points="0 0, 10 3.5, 0 7" />
                        </marker>
                      </defs>
                      <line x1="0" y1="50" x2="250" y2="50" stroke="#000"
                      stroke-width="8" marker-end="url(#arrowhead)" />
                    </svg>
                 */
            });
        }
        setNiceScroll(data) {
            var $editor = $(this.node).find("[data-role='editor']");
            if (!$editor.length) {
                return;
            }
            var scroll = $editor.getNiceScroll();
            if (!scroll.length) {
                scroll = $editor.niceScroll({ cursorcolor: "#333", horizrailenabled: false });
            }
            if (scroll) {
                scroll.resize();
            }
        }
        deserialise(data) {

        }
        close() {
            if (this.pin) {
                // A pinned window can't be closed without first unpinning it.
                return;
            }
            if (this.mode == Mode.Focus) {
                this.unfocus();
            }
            if (this.handler && this.handler.close) {
                this.handler.close();
            } else {
                this.node.remove();
            }
            if (!!this.thumbnail) {
                if (!!this.thumbnail.wrapper) {
                    this.thumbnail.wrapper.remove();
                }
            }
            if (this.children.length) {
                this.children.forEach(x => x.close());
            }
            this.state = State.Closed;
        }
        focus() {
            console.log("focus");
            this.layer.focus(this);
        }
        unfocus() {
            console.log("unfocus");
            this.layer.unfocus(this);
        }
        pin() {
            console.log("pin");
            pubsub.publish("window/pin", this);
        }
        unpin() {
            console.log("unpin");
        }
        hide() {
            this.node.style.display = "none";
        }
        show() {
            this.node.style.display = "block";
        }
        saveState() {
            var container = this.node;
            var rect = container.getBoundingClientRect();
            this.data = {
                state: State.Open,
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height,
                maxHeight: getComputedStyle(container).getPropertyValue("max-height"),
                z: this.z
            };
        }
        zoom(args) {
            args = args || {};
            var container = this.node;
            var rect = container.getBoundingClientRect();
            this.saveState();
            this.data.borderRadius = "10px";
            this.data.editorMaxHeight = "700px";
            this.state = "zoom";
            container.style.top = 0;
            container.style.left = 0;
            container.style.width = "100%";
            container.style.height = "100%";
            container.style.padding = "0 20%";
            container.style.maxHeight = "";
            container.style.borderRadius = 0;
            container.style.zIndex = this.manager.getNextIndex();
            var content = args.content || container.querySelector("[data-role='editor']");
            if (content) {
                content.style.maxHeight = "800px";
            }
            require(["jquery/nicescroll"], () => {
                $(container).find("[data-role='editor']").getNiceScroll().resize();
            });
        }
        unzoom(args) {
            args = args || {};
            var container = this.node;
            this.state = State.Open;
            container.style.top = this.data.y + "px";
            container.style.left = this.data.x + "px";
            container.style.width = this.data.width + "px";
            container.style.height = this.data.height + "px";
            container.style.zIndex = this.data.z;
            container.style.maxHeight = "800px";
            container.style.borderRadius = this.data.borderRadius;
            container.style.padding = "0";
            var content = args.content || container.querySelector("[data-role='editor']");
            if (content) {
                content.style.maxHeight = this.data.editorMaxHeight;
            }
            this.data = {};
            require(["jquery/nicescroll"], () => {
                $(container).find("[data-role='editor']").getNiceScroll().resize();
            });
        }
        minimize(options) {
            var _this = this;
            options = options || {};
            this.state = State.Minimized;
            if (this.mode == Mode.Focus) {
                this.unfocus();
            }
            require(["app/helpers"], function (Helper) {
                _this.thumbnail = $.extend(_this.thumbnail || {}, {
                    icon: null,
                    location: {},
                    container: null,
                    wrapper: null
                });
                const div = Helper.div;
                const newElement = Helper.newElement;
                const applyBindings = Helper.applyBindings;
                const manager = _this.manager;
                var container = _this.node;
                var hasThumbnail = !!options.thumbnail;
                var exists = !!_this.thumbnail.icon;
                var icon = _this.thumbnail.icon || options.thumbnail || div({
                    innerHTML: `<div data-role="thumbnail-icon"><i style="font-size: 5em;" class="far fa-file-alt"></i></div>`
                });
                _this.thumbnail.icon = icon;
                if (false == exists && false == hasThumbnail) {
                    html2canvas(options.minimizeNode || container).then(function (canvas) {
                        window.requestAnimationFrame(() => {
                            var imgUrl = canvas.toDataURL('image/jpeg', 0.25);
                            var img = newElement("img", {
                                attribute: {
                                    src: imgUrl
                                },
                                style: {
                                    width: "150px",
                                }
                            });
                            _this.thumbnail.icon.parentNode.appendChild(img);
                            _this.thumbnail.icon.remove();
                            _this.thumbnail.icon = img;
                        });
                    });
                }
                var rect = container.getBoundingClientRect();
                var x = false == exists ? rect.x + (rect.width / 2) - 25 : _this.thumbnail.location.x;
                var y = false == exists ? rect.y + (rect.height / 2) - 25 : _this.thumbnail.location.y;
                var thumbnail = div({
                    classList: ["text-window", "text-window-small"],
                    style: {
                        width: "170px",
                        padding: "10px",
                        backgroundColor: "#fff"
                    },
                    children: [icon],
                    handler: {
                        dblclick: function (e) {
                            _this.maximize();
                        }
                    }
                });
                var label = applyBindings(`<div class="dock-item" style="max-width: 150px; margin-top: 10px;"><div style="font-size: 0.8em; line-height: 1em;" data-bind="text: $data.name"></div></div>`, { name: options.name });
                var wrapper = div({
                    style: {
                        position: "absolute",
                        top: y + "px",
                        left: x + "px",
                        color: "#000",
                        textAlign: "center",
                        zIndex: manager.getNextIndex()
                    },
                    children: [thumbnail, label]
                });
                _this.thumbnail.container = container;
                _this.thumbnail.wrapper = wrapper;
                _this.thumbnail.location = { x, y };
                container.style.display = "none";
                document.body.appendChild(wrapper);
                $(wrapper).draggable({
                    stop: function (e, ui) {
                        _this.thumbnail.location = { x: ui.position.left, y: ui.position.top };
                    }
                });
            });
        }
        maximize() {
            var _this = this;
            require(["app/helpers"], function (Helper) {
                const manager = _this.manager;
                _this.thumbnail.container.style.display = "block";
                _this.thumbnail.container.style.zIndex = manager.getNextIndex();
                _this.thumbnail.wrapper.remove();
                _this.state = State.Open;
            });
        }
        switchToColumnsMode() {
            this.saveState();
            this.mode == Mode.Column;
            var node = this.node;
            node.style.position = "relative";
            node.style.top = 0;
            node.style.left = "unset";
            node.style.right = "unset";
            node.style.display = "inline-block";
            node.style.width = "450px";
            node.style.maxHeight = "100%";
            node.style.height = "100%";
            node.style.verticalAlign = "top";
        }
        switchToFreeMode() {
            var node = this.node;
            this.mode = Mode.Free;
            node.style.position = "absolute";
            node.style.display = "block";
            node.style.top = this.data.y + "px";
            node.style.left = this.data.x + "px";
            node.style.width = this.data.width + "px";
            node.style.height = this.data.height + "px";
        }
        serialise() {
            var rect = this.node.getBoundingClientRect();
            var result = {
                refersToGuid: this.getNodeInfo().guid,
                type: this.type,
                state: this.state,
                surface: this.surface,
                mode: this.mode,
                shape: this.shape,
                name: this.name,
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height,
                z: this.z,
                loader: {
                    params: this.loader.params
                },
                nodeInfo: this.getNodeInfo()
            };
            return result;
        }
    }

    class Layer {
        constructor(args) {
            args = args || {};
            this.active = false;
            this.manager = args.manager;
            this.guid = args.guid;
            this.snapshot = args.snapshot;
            this.windows = args.windows || [];
            this.scale = args.scale || 1;
            this.w = args.w || window.innerWidth;
            this.h = args.h || window.innerHeight + 200;
            this.z = args.z || 11;
            this.container = div({
                classList: ["desktop-container"],
                dataset: {
                    role: "desktop-layer"
                },
                style: {
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: this.w + "px",
                    height: this.h + "px",
                    zIndex: this.z
                }
            });
            this.overlay = null;
            this.columns = null;
            this.mode = Mode.Free;
            if (this.snapshot) {
                this.deserialise(this.snapshot);
            }
        }
        setActiveWindow(win) {
            this.windows.forEach(w => w.active = false);
            win.active = true;
            // win.node.focus();
        }
        getActiveWindow() {
            return this.windows.find(w => w.active);
        }
        zoomIn() {
            if (this.scale >= 3) {
                return;
            }
            const scale = this.scale + 0.1;
            this.setScale(scale);
        }
        resetZoom() {
            this.setScale(1);
        }
        setScale(scale) {
            this.scale = scale;
            const rect = this.container.getBoundingClientRect();
            const w = rect.width * (-1 * scale);
            const h = rect.height * (-1 * scale);
            updateElement(this.container, {
                style: {
                    position: "absolute",
                    transformOrigin: "top left",
                    width: w + "px",
                    height: h + "px",
                    transform: `scale(${scale})`
                }
            });
            //this.windows.forEach(w => {
            //    let rect = w.node.getBoundingClientRect();
            //    let x = scale <= 1 ? rect.x + (rect.x * scale ) : rect.x;
            //    let y = scale <= 1 ? rect.y + (rect.y * scale) : rect.y;
            //    updateElement(w.node, {
            //        style: {
            //            left: x + "px",
            //            top: y + "px"
            //        }
            //    });
            //});
            // this.windows.forEach(w => w.setNiceScroll());
        }
        zoomOut() {
            if (this.scale <= 0.15) {
                return;
            }
            const scale = this.scale - 0.1;
            this.setScale(scale);
        }
        attachToDOM() {
            // document.body.appendChild(this.container);
        }
        addWindow(args) {
            var window = new Window({
                manager: this.manager,
                layer: this,
                state: "open",
                node: args.node,
                shape: args.shape,
                surface: args.surface,
                type: args.type,
                pin: args.pin,
                name: args.name,
                draggable: args.draggable,
                resizable: args.resizable,
                scroller: args.scroller,
                parent: args.parent,
                loader: args.loader,
                handler: args.handler,
                z: args.zIndex || this.getNextIndex()
            });
            this.windows.push(window);
            return window;
        }
        getNextIndex() {
            return this.manager.getNextIndex();
        }
        switchToColumnsMode() {
            this.mode = Mode.Column;
            var columns = this.columns = div({
                style: {
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "6000px",
                    height: "100%",
                    zIndex: this.getNextIndex()
                }
            });
            this.windows.filter(w => w.state == State.Open).forEach(w => {
                w.switchToColumnsMode();
                columns.appendChild(w.node);
            });
            this.container.appendChild(columns);
        }
        switchToFreeMode() {
            const container = this.container;
            this.mode = Mode.Free;
            this.windows.filter(w => w.state == State.Open).forEach(w => {
                w.switchToFreeMode();
                container.appendChild(w.node);
            });
            this.columns.remove();
        }
        focus(win) {
            this.overlay = div({
                style: {
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: "100%",
                    height: "100%",
                    zIndex: 9990,
                    backdropFilter: "blur(2em)"
                }
            });
            win.node.style.zIndex = 9991;
            win.mode = Mode.Focus;
            this.container.appendChild(this.overlay);
        }
        unfocus(win) {
            if (!this.overlay) {
                return;
            }
            this.overlay.remove();
            win.mode = Mode.Free;
            win.node.style.zIndex = win.z;
        }
        showAll() {
            this.windows.forEach(w => w.show());
        }
        hideAll() {
            this.windows.forEach(w => w.hide());
        }
        hide() {
            this.container.style.display = "none";
        }
        show() {
            this.container.style.display = "block";
        }
        close() {
            this.hide();
            this.active = false;
        }
        open() {
            this.show();
        }
        closeAll() {
            this.windows.forEach(w => w.close());
            this.mode = Mode.Free;
            if (this.columns) {
                this.columns.remove();
            }
        }
        deserialise(data) {
            const _this = this;
            const { windows } = data;
            const { container } = this;
            this.snapshot = data;
            require(["modals/search-texts"]);
            require(["parts/text-add"], (QuickAdd) => {
                windows.filter(w => w.loader).forEach(w => {
                    const client = new QuickAdd();
                    if (_this.manager.z < w.z) {
                        _this.manager.z = w.z + 1;
                    }
                    if (w.type == "text") {
                        client.loadTextWindow(w.loader.params.guid, null, {
                            layer: container,
                            left: w.x + "px",
                            top: w.y + "px",
                            width: w.width + "px",
                            height: (w.height + 30) + "px",
                            maxHeight: (w.height + 30) + "px",
                            zIndex: w.z
                        });
                    } else if (w.type == "snapshot") {
                        require(["parts/snapshot-window"], function (SnapshotWindow) {
                            console.log("snapshot section", { w });
                            const snapshotGuid = w.loader.params.guid;
                            if (!snapshotGuid) {
                                return;
                            }
                            var snapshot = new SnapshotWindow();
                            snapshot.load({
                                layer: container,
                                guid: w.loader.params.guid,
                                shape: w.shape,
                                surface: w.surface,
                                x: w.x,
                                y: w.y,
                                width: w.width,
                                height: w.height,
                                zIndex: w.z
                            });
                        });
                    } else if (w.type == "text-block") {
                        client.loadTextBlockWindow({
                            layer: container,
                            textBlockGuid: w.loader.params.guid,
                            left: w.x + "px",
                            top: w.y + "px",
                            width: w.width + "px",
                            height: (w.height + 30) + "px",
                            maxHeight: (w.height + 30) + "px",
                            zIndex: w.z
                        });
                    } else if (w.type == "timeline") {
                        client.loadTimeline({
                            layer: container,
                            guid: w.loader.params.guid,
                            name: w.loader.params.name,
                            top: w.y + "px",
                            left: w.x + "px",
                            width: w.width + "px",
                            height: w.height + "px",
                            zIndex: w.z
                        });
                    } else if (w.type == "agent-graph") {
                        client.loadAgentGraph({
                            layer: container,
                            guid: w.loader.params.guid,
                            shape: w.shape,
                            surface: w.surface,
                            y: w.y,
                            x: w.x,
                            width: w.width,
                            height: w.height,
                            zIndex: w.z
                        });
                    } else if (w.type == "inline-entities") {

                    } else if (w.type == "marginalia") {
                        client.loadMarginaliaText({
                            node: container,
                            guid: w.loader.params.guid,
                            top: w.y + "px",
                            left: w.x + "px",
                            width: w.width + "px",
                            height: w.height + "px",
                            name: "marginalia",
                            zIndex: w.z
                        });
                    } else if (w.type == "image") {
                        client.loadImageWindow({
                            layer: container,
                            fetchUrl: true,
                            entityGuid: w.loader.params.entityGuid,
                            //name: response.Data.Entity.Name,
                            x: w.x,
                            y: w.y,
                            width: w.width,
                            height: w.height,
                            zIndex: w.z
                        });
                    } else if (w.type == "video") {
                        client.loadVideoWindow({
                            layer: container,
                            fetchUrl: true,
                            entityGuid: w.loader.params.entityGuid,
                            x: w.x,
                            y: w.y,
                            zIndex: w.z
                        });
                    } else if (w.type == "website") {
                        $.get("/Admin/Agent/Overview", { id: w.loader.params.entityGuid }, function (response) {
                            client.loadWebsiteWindow({
                                layer: container,
                                url: response.Data.WebsiteUrl,
                                entityGuid: w.loader.params.entityGuid,
                                x: w.x,
                                y: w.y,
                                width: w.width,
                                height: w.height,
                                zIndex: w.z
                            });
                        });
                    } else if (w.type == "pdf") {
                        $.get("/Admin/Agent/Overview", { id: w.loader.params.entityGuid }, function (response) {
                            client.loadPdfWindow({
                                layer: container,
                                url: response.Data.PdfUrl,
                                entityGuid: w.loader.params.entityGuid,
                                x: w.x,
                                y: w.y,
                                width: w.width,
                                height: w.height,
                                zIndex: w.z
                            });
                        });
                    } else if (w.type == "sketchfab") {
                        $.get("/Admin/Agent/Overview", { id: w.loader.params.entityGuid }, function (response) {
                            client.loadSketchfabWindow({
                                layer: container,
                                value: response.Data.SketchfabEmbedCode,
                                entityGuid: w.loader.params.entityGuid,
                                x: w.x,
                                y: w.y,
                                width: w.width,
                                height: w.height,
                                zIndex: w.z
                            });
                        });
                    } else if (w.type == "tweet") {
                        $.get("/Admin/Agent/Overview", { id: w.loader.params.entityGuid }, function (response) {
                            client.loadTweetWindow({
                                layer: container,
                                value: response.Data.TweetEmbedCode,
                                entityGuid: w.loader.params.entityGuid,
                                x: w.x,
                                y: w.y,
                                width: w.width,
                                height: w.height,
                                zIndex: w.z
                            });
                        });
                    }
                });
            });
        }
        serialise() {
            const windows = this.windows.filter(x => !!x.node && x.state != "closed").map(x => x.serialise());
            return {
                z: this.z,
                windowWidth: window.innerWidth,
                windowHeight: window.innerHeight,
                windows: windows
            };
        }
        activate() {
            this.attachToDOM();
            this.show();
            this.active = true;
        }
    }

    class WindowManager {
        constructor() {
            this.z = 10;
            this.layers = [];           // snapshotContainer[]: DOMElement[]
            this.currentLayer = null;   // snapshotContainer: DOMElement
        }
        setCurrentLayer(layer) {
            if (this.currentLayer) {
                this.currentLayer.container.remove();
            }
            this.currentLayer = layer;
            this.currentLayer.activate();
        }
        addWindow(args) {
            return this.currentLayer.addWindow(args);
        }
        closeAll() {
            this.currentLayer.close();
            this.addEmptyLayer();
        }
        switchToColumnsMode() {
            if (this.currentLayer) {
                this.currentLayer.switchToColumnsMode();
            }
        }
        switchToFreeMode() {
            if (this.currentLayer) {
                this.currentLayer.switchToFreeMode();
            }
        }
        addEmptyLayer() {
            var layer = new Layer({
                manager: this
            });
            this.layers.push(layer);
            this.setCurrentLayer(layer);
            return layer;
        }
        addLayer(args) {
            var layer = new Layer({
                manager: this,
                guid: args.guid,
                snapshot: args.snapshot
            });
            this.layers.push(layer);
            this.setCurrentLayer(layer);
            return layer;
        }
        findLayerBySnapshotGuid(guid) {
            const layer = this.layers.find(x => x.guid == guid);
            return layer;
        }
        serialise() {
            return this.currentLayer.serialise();
        }
        getNextIndex() {
            this.z++;
            return this.z;
        }
    }

    WindowManager.getLayerType = function () {
        return Layer;
    };

    WindowManager.getWindowManager = function () {
        if (!window.Codex) {
            window.Codex = {};
        }
        if (!window.Codex.WindowManager) {
            window.Codex.WindowManager = new WindowManager();
        }
        return window.Codex.WindowManager;
    };

    return WindowManager;

}));
(function (factory) {
    define("parts/dock", ["jquery", "knockout", "app/helpers", "parts/text-add", "pubsub", "parts/window-manager", "jquery-ui", "jquery/nicescroll", "plugins/ripples"], factory);
}(function ($, ko, Helper, QuickAdd, pubsub, _WindowManager) {

    const { newElement, applyBindings, div, getParent, createSnapshotWindow } = Helper;
    const WindowManager = _WindowManager.getWindowManager();

    var Dock = (function () {
        function Dock(cons) {
            cons = cons || {};
            cons.desktop = cons.desktop || {

            };
            this.node = null;
            this.loadingAnimationComplete = false;
            this.images = ko.observableArray([]);
            var container = this.node = div({
                classList: ["noselect", "glass-window"],
                style: {
                    position: "fixed",
                    bottom: 0,
                    left: 0,
                    width: "100%",
                    height: "50px",
                    zIndex: 9998
                }
            });
            this.desktop = {
                snapshot: {
                    guid: null,
                    history: []
                },
                dockItemColour: "#fff",
                backgroundImage: null
            };
            this.mode = ko.observable("free"); // free; column
            this.modeClass = ko.observable("far fa-window-restore");
            this.snapshots = ko.observableArray([]);
            this.loadSnapshots({
                showLauncher: true
            });
            this.state = "bar"; // bar; icon
            this.fullscreen = ko.observable(false);
            this.clock = ko.observable(new Date());
            this.scale = ko.observable(100);
            this.memory = ko.observable(this.usedMemorySize());
            this.menu = {
                create: {
                    selected: false,
                    node: null
                },
                loadOutliner: {
                    selected: false
                },
                searchTextBlocks: {
                    selected: false
                },
                loadText: {
                    selected: false
                },
                loadEntity: {
                    selected: false
                },
                showSnapshots: {
                    selected: false
                },
                showFolders: {
                    selected: false
                },
                showHelp: {
                    selected: false
                },
                selectBackgroundImage: {
                    selected: false
                } 
            };
            var bar = applyBindings(`
<div class="dock">
    <div class="dock-item" data-bind="click: $data.showCreateMenuClicked"><img src="/Images/icons/plus.svg" style="position: relative; top: -5px; height: 25px; width: 25px; filter: invert(100%);" /></div>
    <!-- <div class="dock-item" data-bind="click: $data.searchTextBlocksClicked"><img src="/Images/icons/searching-magnifying-glass.svg" style="position: relative; top: -5px; height: 25px; width: 25px; filter: invert(100%);" /></div> -->
    <div class="dock-item" data-bind="click: $data.loadTextClicked"><img src="/Images/icons/blank-folded-page.svg" style="position: relative; top: -5px; height: 25px; width: 25px; filter: invert(100%);" /></div>
    <div class="dock-item" data-bind="click: $data.loadEntityClicked"><img src="/Images/icons/circle.svg" style="position: relative; top: -5px; height: 25px; width: 25px; filter: invert(100%);" /></div>    
    <!-- <div class="dock-item" data-bind="click: $data.loadWorkbookClicked"><img src="/Images/icons/notebook.svg" style="position: relative; top: -5px; height: 25px; width: 25px; filter: invert(100%);" /></div> -->
    <div class="dock-item" data-bind="click: $data.loadOutlinerClicked"><img src="/Images/icons/list.svg" style="position: relative; top: -5px; height: 25px; width: 25px; filter: invert(100%);" /></div>
    <div class="dock-item" data-bind="click: $data.loadEntityExplorerClicked"><img src="/Images/icons/folder-1.svg" style="position: relative; top: -5px; height: 25px; width: 25px; filter: invert(100%);" /></div>  
    <div style="display: inline-block; float: right;">
         <div class="dock-item" data-bind="click: $data.saveSnapshotClicked"><img src="/Images/icons/dot.svg" style="position: relative; top: -5px; height: 30px; width: 40px; filter: invert(100%);" /></div>    
        <div class="dock-item" data-bind="click: $data.showSnapshotsClicked"><img src="/Images/icons/inbox.svg" style="position: relative; top: -5px; height: 35px; width: 35px; filter: invert(100%);" /></div>   
        <div class="dock-item" data-bind="click: $data.closeAllClicked"><img src="/Images/icons/windows-close.svg" style="position: relative; top: -5px; height: 28px; width: 30px; filter: invert(100%);" /></div>
        <div class="dock-item" data-bind="click: $data.selectBackgroundImageClicked"><img src="/Images/icons/monitor.svg" style="position: relative; top: -5px; height: 30px; width: 35px; filter: invert(100%);" /></div>
        <!-- <div class="dock-item" data-bind="visible: !!$data.memory()"><span data-bind="text: $data.memory"></span> MBs</div> -->
        <div class="dock-item" data-bind="visible: $data.fullscreen()">
            <div style="margin-top: -10px; text-align: right;">
                <div data-bind="text: clock().getHours() + ':' + clock().getMinutes()"></div>
                <div data-bind="text: clock().getDate() + '/' + (clock().getMonth() + 1) + '/' + clock().getFullYear()"></div>
            </div>
        </div>
        <div class="dock-item" data-bind="click: $data.toggleFullScreenClicked">
            <!-- ko if: !$data.fullscreen() -->
            <img src="/Images/icons/expand.svg" style="position: relative; top: -5px; height: 25px; width: 25px; filter: invert(100%);" />
            <!-- /ko -->
            <!-- ko if: $data.fullscreen() -->
            <img src="/Images/icons/minimize.svg" style="position: relative; top: -5px; height: 25px; width: 25px; filter: invert(100%);" />
            <!-- /ko -->
        </div>
        <!-- <div class="dock-item">
             <div style="margin-top: -12px; text-align: right;">
                <div data-bind="click: $data.zoomInClicked"><img src="/Images/icons/plus.svg" style="height: 12px; filter: invert(100%);" /></div>
                
                <div data-bind="click: $data.zoomOutClicked"><img src="/Images/icons/remove.svg" style="height: 12px; filter: invert(100%);" /></div>
            </div>
        </div>  
        <div class="dock-item">
            <div style="margin-top: -5px; text-align: right;" data-bind="click: $data.resetScaleClicked">
                <span data-bind="text: $data.scale" style="font-size: 10px;"></span>%
            </div>                
        </div> -->
    </div>
</div>
`, this);
            container.appendChild(bar);
            document.body.style.overflow = "hidden";
            document.body.appendChild(container);
            this.container = container;
            this.setup();
        }
        Dock.prototype.setScrollWheelEvents = function () {
            const _this = this;
            //WindowManager.currentLayer.container.addEventListener("wheel", (e) => {
            //    const layer = WindowManager.currentLayer;
            //    if (layer.container != e.target || !layer.container.contains(e.target)) {
            //        return;
            //    }
            //    const scale = layer.scale + ((e.deltaY * -0.15) / 100);
            //    console.log({ scale, deltaY: e.deltaY });
            //    if (scale < 0.1 || scale > 4) {
            //        return;
            //    }
            //    layer.setScale(scale);
            //    _this.setScaleText(scale);
            //});
        };
        Dock.prototype.resetScaleClicked = function () {
            const layer = WindowManager.currentLayer;
            if (!layer) {
                return;
            }
            layer.resetZoom();
            this.setScaleText(1);
        };
        Dock.prototype.loadVantaCloudsBackground = function () {
            VANTA.CLOUDS({
                el: ".page-content",
                mouseControls: true,
                touchControls: true,
                gyroControls: false,
                minHeight: 200.00,
                minWidth: 200.00
            })
        };
        Dock.prototype.loadVantaGlobeBackground = function () {
            VANTA.GLOBE({
                el: ".page-content",
                mouseControls: true,
                touchControls: true,
                gyroControls: false,
                minHeight: 200.00,
                minWidth: 200.00,
                scale: 1.00,
                scaleMobile: 1.00
            });
        };
        Dock.prototype.zoomInClicked = function () {
            const layer = WindowManager.currentLayer;
            if (!layer) {
                return;
            }
            layer.zoomIn();
            this.setScaleText(layer.scale);
        };
        Dock.prototype.setScaleText = function (scale) {
            this.scale(parseInt(scale * 100));
        }
        Dock.prototype.zoomOutClicked = function () {
            const layer = WindowManager.currentLayer;
            if (!layer) {
                return;
            }
            layer.zoomOut();
            this.setScaleText(layer.scale);
        };
        Dock.prototype.createDockIcon = function () {
            const _this = this;
            const w = 40;
            const h = 40;
            const x = ((window.innerWidth / 2) - (w / 20));
            const icon = div({
                style: {
                    position: "absolute",
                    bottom: "10px",
                    left: "50%",
                    color: "#fff",
                    opacity: 0.75,
                    bottom: "5px",
                    "mix-blend-mode": "overlay",
                    zIndex: 9999
                },
                handler: {
                    click: () => {
                        _this.toggleDockState();
                    }
                },
                innerHTML: `<img src="/Images/icons/spiral.svg" style="width: ${w}px; height: ${h}px; filter: invert(100%); " />`
            });
            document.body.appendChild(icon);
            return icon;
        };
        Dock.prototype.toggleDockState = function () {
            const state = this.state == "bar" ? "icon" : "bar";
            this.setState(state);
        };
        Dock.prototype.setState = function (state) {
            this.state = state;
            if (this.state == "bar") {
                this.node.style.display = "block";
                // this.icon.style["mix-blend-mode"] = "overlay";
            } else {
                this.node.style.display = "none";
                // this.icon.style["mix-blend-mode"] = "exclusion";
            }
        };
        Dock.prototype.setupImages = function () {
            this.images([
                {
                    name: "Lightscape",
                    thumbnail: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=150&q=80",
                    url: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1950&q=80"
                },
                {
                    name: "Aurora lake",
                    thumbnail: "https://images.unsplash.com/photo-1525220964737-6c299398493c?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=150&q=80",
                    url: "https://images.unsplash.com/photo-1525220964737-6c299398493c?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1950&q=80"
                },
                {
                    name: "Green light",
                    thumbnail: "https://images.unsplash.com/photo-1488415032361-b7e238421f1b?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=150&q=80",
                    url: "https://images.unsplash.com/photo-1488415032361-b7e238421f1b?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1949&q=80"
                },
                {
                    name: "Duomo",
                    thumbnail: "https://blog.urbanadventures.com/wp-content/uploads/2018/03/florence-city-featured.jpg",
                    url: "https://blog.urbanadventures.com/wp-content/uploads/2018/03/florence-city-featured.jpg"
                },
                {
                    name: "Library",
                    thumbnail: "https://images.unsplash.com/photo-1495741545814-2d7f4d75ea09?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=150&q=80",
                    url: "https://images.unsplash.com/photo-1495741545814-2d7f4d75ea09?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1954&q=80"
                },
                {
                    name: "Illuminated",
                    thumbnail: "https://images.unsplash.com/photo-1514890547357-a9ee288728e0?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=150&q=80",
                    url: "https://images.unsplash.com/photo-1514890547357-a9ee288728e0?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1950&q=80"
                },
                {
                    name: "Perspective",
                    thumbnail: "https://static01.nyt.com/images/2012/05/09/arts/09iht-conway09-span/09iht-conway09-span-superJumbo.jpg",
                    url: "https://static01.nyt.com/images/2012/05/09/arts/09iht-conway09-span/09iht-conway09-span-superJumbo.jpg"
                },
                {
                    name: "Codex",
                    thumbnail: "https://julianharrison.typepad.com/.a/6a013488b55a86970c01b7c7e391c5970b-pi",
                    url: "https://julianharrison.typepad.com/.a/6a013488b55a86970c01b7c7e391c5970b-pi"
                },
                {
                    name: "Siena",
                    thumbnail: "https://images.unsplash.com/photo-1531944213227-db53a6d0f3bd?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=150&q=80",
                    url: "https://images.unsplash.com/photo-1531944213227-db53a6d0f3bd?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1941&q=80"
                },
                {
                    name: "Tuscany",
                    thumbnail: "https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=150&q=80",
                    url: "https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1936&q=80"
                },
                {
                    name: "Space",
                    thumbnail: "https://images.unsplash.com/photo-1464802686167-b939a6910659?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=150&q=80",
                    url: "https://images.unsplash.com/photo-1464802686167-b939a6910659?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1933&q=80"
                },
                {
                    name: "Leopard",
                    thumbnail: "https://512pixels.net/downloads/macos-wallpapers-thumbs/10-5--thumb.png",
                    url: "https://512pixels.net/downloads/macos-wallpapers-thumbs/10-5--thumb.png"
                },
                {
                    name: "Lion",
                    thumbnail: "https://512pixels.net/downloads/macos-wallpapers-thumbs/10-7--thumb.png",
                    url: "https://512pixels.net/downloads/macos-wallpapers-thumbs/10-7--thumb.png"
                },
                {
                    name: "Catalina",
                    thumbnail: "https://512pixels.net/wp-content/uploads/2020/06/10-15-Night-thumb.jpg",
                    url: "https://512pixels.net/wp-content/uploads/2020/06/10-15-Night-thumb.jpg"
                }
            ]);
        };
        Dock.prototype.usedMemorySize = function () {
            if (!window.performance || !window.performance.memory) {
                return null;
            }
            var bytes = window.performance.memory.usedJSHeapSize;
            return Math.ceil(bytes / (1024 * 1024));
        };
        Dock.prototype.setup = function () {
            var _this = this;
            this.setupImages();
            window.setInterval(() => _this.clock(new Date()), 1000);
            window.setInterval(() => _this.memory(_this.usedMemorySize()), 1000);
            WindowManager.addEmptyLayer();
            this.restoreDesktop();
            this.setupEventHandlers();
        };
        Dock.prototype.addPortalClicked = function () {
            var portal = div({
                dataset: {
                    role: "portal"
                },
                //classList: ["hexagon"],
                style: {
                    position: "absolute",
                    top: "200px",
                    right: "100px",
                    width: "500px",
                    height: "500px",
                    border: "2px dotted #ccc",
                    borderRadius: "50%",
                    padding: "20px",
                    overflowY: "hidden",
                    overflowX: "hidden",
                    backdropFilter: "blur(2em)",

                    zIndex: WindowManager.getNextIndex()
                }
            });
            var hole = div({
                style: {
                    width: "100%",
                    height: "100%",
                    //zoom: "60%",
                }
            });
            portal.appendChild(hole);
            document.body.appendChild(portal);
            $(portal).draggable();
            //$(portal).niceScroll();
            $(portal).droppable({
                create: function (e, ui) {
                    console.log({ event: "create", e, ui });
                },
                drop: function (e, ui) {
                    console.log({ event: "drop", e, ui });
                    let win = ui.draggable[0];
                    if (win.parentNode == hole) {
                        return;
                    }
                    hole.appendChild(win);
                    win.style.top = "10px";
                    win.style.left = "10px";
                }
            });
            var win = WindowManager.addWindow({
                type: "portal",
                loader: {
                    params: {

                    }
                },
                node: portal
            });
            this.youTubeApiReady = ko.observable(false);
        };
        Dock.prototype.loadWebsiteWindow = function (data) {
            var client = new QuickAdd();
            client.loadWebsiteWindow(data);
        };
        Dock.prototype.loadPdfWindow = function (data) {
            var client = new QuickAdd();
            client.loadPdfWindow(data);
        };
        Dock.prototype.loadVideoWindow = function (data) {
            var client = new QuickAdd();
            client.loadVideoWindow(data);
        };
        Dock.prototype.loadImageWindow = function (data) {
            var client = new QuickAdd();
            client.loadImageWindow(data);
        };
        Dock.prototype.loadTweetWindow = function (data) {
            var client = new QuickAdd();
            client.loadTweetWindow(data);
        };
        Dock.prototype.loadSketchfabWindow = function (data) {
            var client = new QuickAdd();
            client.loadSketchfabWindow(data);
        };
        Dock.prototype.toggleFullScreenClicked = function () {
            this.fullscreen(!this.fullscreen());
            if (this.fullscreen()) {
                Helper.openFullScreen();
            } else {
                Helper.exitFullScreen();
            }
        };
        Dock.prototype.getIconImageUrl = function (type) {
            if (type == "Folder") {
                return "/Images/icons/folder-2.svg";
            }
            if (type == "Video") {
                return "/Images/icons/youtube.svg";
            }
            if (type == "Image") {
                return "/Images/icons/photos.svg";
            }
            return null;
        };
        Dock.prototype.createIcon = function (iconData) {
            const imageUrl = this.getIconImageUrl(iconData.type);
            const container = div({
                style: {
                    position: "absolute",
                    left: "200px",
                    top: "600px",
                    width: "80px",
                    height: "auto",
                    zIndex: WindowManager.getNextIndex()
                },
                template: {
                    view: `
<div data-bind="event: { dblclick: $data.iconDoubleClicked }" style="text-align: center;">
    <div><img src="${imageUrl}" style="width: 40px;" /></div>
    <div><span style="background-color: #efefef; color: #000; padding: 3px;" data-bind="text: $data.data.name"></span></div>
</div>
`,
                    model: {
                        data: iconData,
                        iconDoubleClicked: function () {
                            this.load();
                        },
                        load: function () {
                            const { type, guid } = this.data;
                            const client = new QuickAdd();
                            if (type == "Folder") {
                                require(["components/entity-explorer"], function (Explorer) {
                                    const model = new Explorer();
                                    model.load((m) => {
                                        m.loadFolder(guid);
                                    });
                                });
                            }
                            if (type == "Image") {
                                client.loadImageWindow({ entityGuid: guid });
                            }
                            if (type == "Video") {
                                client.loadVideoWindow({ entityGuid: guid, fetchUrl: true });
                            }
                            // etc 
                        }
                    }
                }
            });
            const layer = WindowManager.currentLayer;
            const win = layer.addWindow({
                node: container,
                loader: iconData
            });
            win.addNodeToLayer(container);
            $(container).draggable();
        };
        Dock.prototype.setupEventHandlers = function () {
            var _this = this;
            this.setScrollWheelEvents();
            pubsub.subscribe("dock/add-icon-to-desktop", (__, icon) => {
                _this.createIcon(icon)
            });
            pubsub.subscribe("load-text-search", () => {
                _this.textSearch();
            });
            pubsub.subscribe("load-text-window", (__, args) => {
                var client = new QuickAdd();
                client.loadTextWindow(args.guid, args.node, args.options);
            });
            pubsub.subscribe("dock/load-entity-explorer", (__, folderGuid) => {
                require(["components/entity-explorer"], function (Explorer) {
                    const model = new Explorer();
                    model.load((m) => {
                        m.loadFolder(folderGuid);
                    });
                });
            });
            pubsub.subscribe("dock/load-entity", (__, agentGuid) => {
                var client = new QuickAdd();
                client.loadEntityClicked(agentGuid, { tab: "references" });
            });
            pubsub.subscribe("load-agent-snapshots", (__, agentGuid) => {
                _this.showAgentSnapshots(agentGuid);
            });
            pubsub.subscribe("dock/load-snapshot", (__, guid) => {
                _this.loadSnapshotByGuid(guid);
            });
            pubsub.subscribe("window/pin", (win) => {
                console.log({ win });
                var pin = div({
                    style: {
                        border: "1px dotted #ccc",
                        padding: "10px",
                        height: "100%",
                        width: "auto"
                    },
                    innerHTML: win.name || "test"
                });
                _this.container.firstChild.appendChild(pin);
            });
        };
        Dock.prototype.newLayerClicked = function () {
            WindowManager.closeAll();
            this.desktop.snapshot.guid = null;
            this.storeDesktop();
        };
        Dock.prototype.closeAllClicked = function () {
            WindowManager.currentLayer.closeAll();
        };
        Dock.prototype.switchModeClicked = function () {
            var mode = this.mode();
            if (mode == "free") {
                this.mode("column");
                this.modeClass("fas fa-columns");
                WindowManager.switchToColumnsMode();
            } else {
                this.mode("free");
                this.modeClass("far fa-window-restore");
                WindowManager.switchToFreeMode();
            }
        };
        Dock.prototype.loadImage = function (data) {
            const url = new URL(data.image.url);
            var img = newElement("IMG", {
                attribute: {
                    maxWidth: "500px",
                    maxHeight: "500px",
                    src: url
                }
            });
            var node = data.node || document.body;
            node.appendChild(img);
        };
        Dock.prototype.loadVideo = function (data) {
            const parsedUrl = new URL(data.video.url);
            const v = parsedUrl.searchParams.get("v");
            const embedUrl = "https://www.youtube.com/embed/" + v;
            var iframe = newElement("IFRAME", {
                attribute: {
                    width: 560,
                    height: 315,
                    src: embedUrl,
                    frameborder: 0
                }
            });
            var node = data.node || document.body;
            node.appendChild(iframe);
        };
        Dock.prototype.addPdfClicked = function () {
            var _this = this;
            this.loadMediaEntityForm(data => {
                const { url, name } = data;
                var model = {
                    Entity: {
                        Name: name,
                        Attributes: ["pdf-url|" + url]
                    },
                    Property: {
                        Value: url
                    }
                };
                $.post("/Admin/Agent/AddPdfEntity", model, function (response) {
                    console.log("addPdfClicked", { response });
                    if (!response.Success) {
                        return;
                    }
                    _this.loadPdfWindow({
                        url: url,
                        entityGuid: response.Data.Entity.Guid
                    });
                });
            });
        };
        Dock.prototype.addWebsiteClicked = function () {
            var _this = this;
            this.loadMediaEntityForm(data => {
                const { url, name } = data;
                var model = {
                    Entity: {
                        Name: name,
                        Attributes: ["website-url|" + url]
                    },
                    Property: {
                        Value: url
                    }
                };
                $.post("/Admin/Agent/AddWebsiteEntity", model, function (response) {
                    console.log({ post: "/Admin/Agent/AddWebsiteEntity", response });
                    if (!response.Success) {
                        return;
                    }
                    _this.loadWebsiteWindow({
                        url: url,
                        entityGuid: response.Data.Entity.Guid
                    });
                });
            });
        };
        Dock.prototype.addImageClicked = function () {
            var _this = this;
            this.loadMediaEntityForm(data => {
                const { url, name } = data;
                var model = {
                    Entity: {
                        Name: name,
                        Attributes: ["image-url|" + url]
                    },
                    Property: {
                        Value: url
                    }
                };
                $.post("/Admin/Agent/AddImageEntity", model, function (response) {
                    console.log({ post: "/Admin/Agent/AddImageEntity", response });
                    if (!response.Success) {
                        return;
                    }
                    _this.loadImageWindow({
                        url: url,
                        entityGuid: response.Data.Entity.Guid
                    });
                });
            });
        };
        Dock.prototype.addAssetClicked = function () {
            var _this = this;
            this.loadAssetEntityForm(results => {
                for (const asset of results) {
                    const assetUrl = `/api/asset?id=${asset.id}`;
                    const filename = asset.filename;
                    const attributes = [
                        `contentLength|${asset.contentLength}`,
                        `contentType|${asset.contentType}`,
                        `filename|${asset.filename}`,
                    ];
                    var model = {
                        Entity: {
                            Name: filename,
                            Attributes: attributes
                        },
                        Property: {
                            Value: assetUrl,
                        }
                    };
                    const images = [".jpg", ".gif", ".jpeg", ".tiff", ".bmp"];
                    const video = [".mov", ".mp4", ".avi"];
                    if (images.some(x => filename.indexOf(x) >= 0)) {
                        model.Entity.Attributes.push("image-url|" + assetUrl);
                        $.post("/Admin/Agent/AddImageEntity", model, function (response) {
                            console.log({ post: "/Admin/Agent/AddImageEntity", response });
                            if (!response.Success) {
                                return;
                            }
                            _this.loadImageWindow({
                                url: assetUrl,
                                entityGuid: response.Data.Entity.Guid
                            });
                        });
                    } else if (video.some(x => filename.indexOf(x) >= 0)) {
                        model.Entity.Attributes.push("video-url|" + assetUrl);
                        $.post("/Admin/Agent/AddVideoEntity", model, function (response) {
                            console.log({ post: "/Admin/Agent/AddVideoEntity", response });
                            if (!response.Success) {
                                return;
                            }
                            _this.loadVideoWindow({
                                url: assetUrl,
                                entityGuid: response.Data.Entity.Guid
                            });
                        });
                    } else if (filename.indexOf(".pdf")) {
                        model.Entity.Attributes.push("pdf-url|" + assetUrl);
                        $.post("/Admin/Agent/AddPdfEntity", model, function (response) {
                            console.log({ post: "/Admin/Agent/AddPdfEntity", response });
                            if (!response.Success) {
                                return;
                            }
                            _this.loadPdfWindow({
                                url: assetUrl,
                                entityGuid: response.Data.Entity.Guid
                            });
                        });
                    }
                }
            });
        };
        Dock.prototype.addTweetClicked = function () {
            var _this = this;
            this.loadMediaEntityEmbedCodeForm(data => {
                const { value, name } = data;
                var model = {
                    Entity: {
                        Name: name
                    },
                    Property: {
                        Value: value
                    }
                };
                $.post("/Admin/Agent/AddTweetEntity", model, function (response) {
                    console.log({ post: "/Admin/Agent/AddTweetEntity", response });
                    if (!response.Success) {
                        return;
                    }
                    _this.loadTweetWindow({
                        value: value,
                        entityGuid: response.Data.Entity.Guid
                    });
                });
            });
        };
        Dock.prototype.searchTextBlocksClicked = function () {
            require(["parts/search-text-blocks"], function (SearchTextBlocks) {
                var search = new SearchTextBlocks();
                (async () => {
                    await search.load();
                })();
            });
        };
        Dock.prototype.getHighlights = function (text, searchTerm, startIndex) {
            const exp = '\\' + searchTerm + '\\';
            const re = new RegExp(searchTerm, "gi");
            var results = [], match;
            while ((match = re.exec(text)) != null) {
                let span = match[0];
                results.push({ StartIndex: startIndex + match.index, EndIndex: startIndex + match.index + span.length - 1 });
            }
            return results;
        };
        Dock.prototype.addSketchfabClicked = function () {
            var _this = this;
            this.loadMediaEntityEmbedCodeForm(data => {
                const { value, name } = data;
                var model = {
                    Entity: {
                        Name: name
                    },
                    Property: {
                        Value: value
                    }
                };
                $.post("/Admin/Agent/AddSketchfabEntity", model, function (response) {
                    console.log({ post: "/Admin/Agent/AddSketchfabEntity", response });
                    if (!response.Success) {
                        return;
                    }
                    _this.loadSketchfabWindow({
                        value: value,
                        entityGuid: response.Data.Entity.Guid
                    });
                });
            });
        };
        Dock.prototype.loadMediaEntityEmbedCodeForm = function (callback) {
            const container = div({
                classList: ["text-window"],
                style: {
                    position: "absolute",
                    left: "100px",
                    bottom: "100px",
                    width: "400px",
                    height: "400px",
                    backgroundColor: "#fff",
                    padding: "10px",
                    zIndex: 9990
                }
            });
            const form = div({
                template: {
                    view: `
<div>
    <form data-bind="submit: $data.saveClicked">
        <div>
            <label>Name</label>
            <input type="text" data-bind="value: $data.name" name="name" class="form-control" />
        </div>
        <div>
            <label>Embed Code</label>
            <textarea type="text" data-bind="value: $data.value" name="value" class="form-control" rows="8"></textarea>
        </div>
        <div style="margin-top: 10px;">
            <button class="btn btn-default" data-bind="click: $data.cancelClicked" type="button">Cancel</button> <button class="btn btn-primary" type="submit">Save</button>
        </div>
    </form>
</div>`,
                    model: {
                        name: ko.observable(),
                        value: ko.observable(),
                        cancelClicked: function () {
                            container.remove();
                        },
                        saveClicked: function () {
                            container.remove();
                            if (callback) {
                                callback({ value: this.value(), name: this.name() });
                            }
                        }
                    },
                    onAdded: (panel) => {
                        const nameField = panel.querySelectorAll("[name='name']")[0];
                        nameField.focus();
                    }
                }
            });
            container.appendChild(form);
            document.body.appendChild(container);
        };
        Dock.prototype.loadMediaEntityForm = function (callback) {
            const container = div({
                classList: ["text-window"],
                style: {
                    position: "absolute",
                    left: "100px",
                    bottom: "100px",
                    width: "400px",
                    height: "200px",
                    backgroundColor: "#fff",
                    padding: "10px",
                    zIndex: 9990
                }
            });
            const form = div({
                template: {
                    view: `
<div>
    <form data-bind="submit: $data.saveClicked">
        <div>
            <label>URL</label>
            <input type="text" data-bind="value: $data.url" name="url" class="form-control" />
        </div>
        <div>
            <label>Name</label>
            <input type="text" data-bind="value: $data.name" name="name" class="form-control" />
        </div>
        <div style="margin-top: 10px;">
            <button class="btn btn-default" data-bind="click: $data.cancelClicked" type="button">Cancel</button> <button class="btn btn-primary" type="submit">Save</button>
        </div>
    </form>
</div>`,
                    model: {
                        url: ko.observable(),
                        name: ko.observable(),
                        cancelClicked: function () {
                            container.remove();
                        },
                        saveClicked: function () {
                            container.remove();
                            if (callback) {
                                callback({ url: this.url(), name: this.name() });
                            }
                        }
                    },
                    onAdded: (panel) => {
                        const urlField = panel.querySelectorAll("[name='url']")[0];
                        urlField.focus();
                    }
                }
            });
            container.appendChild(form);
            document.body.appendChild(container);
        };

        //
        // Uploads a file from the browser to the server.
        //
        function uploadFile(file) {

            console.log(`Uploading file ${file.name}`);

            const uploadRoute = `/api/asset`;
            return fetch(uploadRoute, {
                body: file,
                method: "PUT",
                headers: {
                    "file-name": file.name,
                    "content-type": file.type,
                },
            })
                .then(response => {
                    console.log(`File uploaded: ${file.name}`);
                    return response.json();
                })
                .then(responseBody => {
                    return {
                        id: responseBody.id,
                        filename: file.name,
                        contentLength: responseBody.contentLength,
                        contentType: responseBody.contentType
                    }
                });
        }

        //
        // Uploads a collection of files to the server.
        //
        function uploadFiles(files) {
            return Promise.all(Array.from(files).map(file => uploadFile(file)));
        }

        //
        // Custom KO binding for file inputs.
        //
        // https://stackoverflow.com/a/35800382
        //
        ko.bindingHandlers.fileUpload = {
            init: function (element, valueAccessor) {
                $(element).change(function () {
                    valueAccessor()(element.files);
                });
            },
            update: function (element, valueAccessor) {
                if (ko.unwrap(valueAccessor()) === null) {
                    $(element).wrap('<form>').closest('form').get(0).reset();
                    $(element).unwrap();
                }
            }
        };
        Dock.prototype.loadAssetEntityForm = function (callback) {
            const container = div({
                classList: ["text-window"],
                style: {
                    position: "absolute",
                    left: "100px",
                    bottom: "100px",
                    width: "400px",
                    height: "200px",
                    backgroundColor: "#fff",
                    padding: "10px",
                    zIndex: 9990
                }
            });
            const form = div({
                template: {
                    view: `
<div>
    <form data-bind="submit: $data.saveClicked">
        <div>
            <label>Choose files to upload</label>
            <input 
                type="file" 
                multiple
                data-bind="fileUpload: files"
                />
        </div>
        <div style="margin-top: 10px;">
            <button class="btn btn-default" data-bind="click: $data.cancelClicked" type="button">Cancel</button> 
            <button class="btn btn-primary" type="submit">Upload</button>
        </div>
    </form>
</div>`,
                    model: {
                        files: ko.observable(),
                        cancelClicked: function () {
                            container.remove();
                        },
                        saveClicked: function () {
                            container.remove();
                            const files = this.files();
                            const filesArray = [...files];
                            const filenames = filesArray.map(x => x.name);
                            uploadFiles(files)
                                .then(results => {
                                    callback(results);
                                });
                        }
                    }
                }
            });
            container.appendChild(form);
            document.body.appendChild(container);
        };
        Dock.prototype.addVideoClicked = function () {
            var _this = this;
            this.loadMediaEntityForm(data => {
                const { url, name } = data;
                var model = {
                    Entity: {
                        Name: name
                    },
                    Property: {
                        Value: url
                    }
                };
                $.post("/Admin/Agent/AddVideoEntity", model, function (response) {
                    console.log({ post: "/Admin/Agent/AddVideoEntity", response });
                    if (!response.Success) {
                        return;
                    }
                    _this.loadVideoWindow({
                        url: url,
                        name: response.Data.Entity.Name,
                        entityGuid: response.Data.Entity.Guid
                    });
                });
            });
        };
        Dock.prototype.showFoldersClicked = async function () {
            this.menu.showFolders.selected = !this.menu.showFolders.selected;
            if (!this.menu.showFolders.selected) {
                pubsub.publish("show-folders/close");
                return;
            }
            const response = await fetch("/Static/Templates/Text/table-of-contents-panel.html?v=5");
            const html = await response.text();
            var container = div({
                classList: ["text-window"],
                style: {
                    position: "fixed",
                    backgroundColor: "transparent",
                    color: "#fff",
                    backdropFilter: "blur(2em)",
                    top: 0,
                    left: 0,
                    padding: "10px",
                    width: "250px",
                    height: "100%",
                    zIndex: 9999
                }
            });
            var cache = {};
            class ShowFolders {
                constructor() {
                    this.model = {
                        sectionGuid: ko.observable()
                    };
                    this.list = {
                        sections: ko.observableArray([])
                    };
                    this.texts = ko.observableArray([]);
                    this.setup();
                }
                setup() {
                    var _this = this;
                    pubsub.subscribe("show-folders/close", () => {
                        _this.close();
                    });
                }
                textSelected(item) {
                    var client = new QuickAdd();
                    client.loadTextWindow(item.Guid);
                }
                closeClicked() {
                    this.close();
                }
                close() {
                    win.close();
                }
                minimizeClicked() {
                    win.minimize();
                }
                async loadTexts(guid) {
                    if (!guid) {
                        return;
                    }
                    var item = cache[guid];
                    if (!item) {
                        const response = await fetch("/Admin/Text/AllInSection?id=" + guid);
                        const json = await response.json();
                        console.log("Dock.showFoldersClicked.loadTexts", { json });
                        cache[guid] = json.Data;
                        this.texts(cache[guid]);
                    }
                    else {
                        this.texts(cache[guid]);
                    }
                }
                async loadSections() {
                    const response = await fetch("/Admin/Text/SearchModalLists");
                    const json = await response.json();
                    console.log("Dock.showFoldersClicked.loadSections", json);
                    this.list.sections(json.Data.Sections);
                }
                start() {
                    var _this = this;
                    this.loadSections();
                    this.model.sectionGuid.subscribe(function (guid) {
                        _this.loadTexts(guid);
                    })
                }
            };
            var model = new ShowFolders();
            model.start();
            var content = div({
                style: {
                    overflowY: "auto",
                    overflowX: "hidden"
                },
                template: {
                    view: html,
                    model: model
                }
            });
            container.appendChild(content);
            document.body.appendChild(container);
            require(["jquery/nicescroll"], () => {
                $(content).niceScroll({ cursorcolor: "#333", horizrailenabled: false });
            });
            var win = WindowManager.addWindow({
                type: "table-of-contents-panel",
                node: container
            });
        };
        Dock.prototype.showHelpClicked = function () {
            var model = new QuickAdd();
            model.showKeyBindings();
        };
        Dock.prototype.showAgentSnapshots = function (agentGuid) {
            var _this = this;
            $.get("/Admin/Agent/GetAgentSnapshots", { id: agentGuid }, function (response) {
                console.log("/Admin/Agent/GetAgentSnapshotsAsync", { response });
                const container = div({
                    classList: ["text-window", "glass-window"],
                    style: {
                        position: "absolute",
                        height: "300px",
                        left: "0px",
                        width: "100%",
                        bottom: "53px",
                        padding: "10px",
                        zIndex: WindowManager.getNextIndex()
                    }
                });
                const handle = div({
                    template: {
                        view: `
<div class="safari_buttons" data-role="draggable">
        <div data-bind="click: $data.closeClicked" class="safari_close"></div>
</div>`,
                        model: {
                            closeClicked: () => {
                                win.close();
                            }
                        }
                    }
                });
                container.appendChild(handle);
                const snapshots = response.Data.map(s => {
                    s.Name = ko.observable(s.Name);
                    s.mode = ko.observable("read");
                    return s;
                });
                const thumbnails = snapshots.map(s => _this.generateSnapshotThumbnail({ snapshot: s, isOpen: false }));
                thumbnails.forEach(t => {
                    container.appendChild(t);
                });
                document.body.appendChild(container);
                var win = WindowManager.addWindow({
                    type: "snapshot-thumbnails-panel",
                    node: container,
                    draggable: {
                        node: handle
                    }
                });
            });
        };
        Dock.prototype.showSnapshotHistoryClicked = function () {
            this.showSnapshotHistory();
        };
        Dock.prototype.showSnapshotHistory = function () {
            const history = this.desktop.snapshot.history;
            // const history = WindowManager.layers.filter(x => !!x.snapshot).map(x => x.snapshot);
            this.showSnapshotThumbnails(history);
        };
        Dock.prototype.showSnapshotThumbnails = function (snapshots) {
            var _this = this;
            const ratio = .75;
            const ww = window.innerWidth, wh = window.innerHeight;
            const cw = ww * ratio, ch = wh * ratio;
            const cx = (ww / 2) - (cw / 2), cy = (wh / 2) - (ch / 2);
            const container = div({
                classList: ["text-window", "glass-window"],
                style: {
                    position: "absolute",
                    left: cx + "px",
                    top: cy + "px",
                    width: cw + "px",
                    height: ch + "px",
                    padding: "40px 50px",
                    zIndex: WindowManager.getNextIndex()
                },
                template: {
                    view: `
<div style="height: 20px; position: absolute; top: 5px; left: 5px;" data-role="handle">
    <div class="safari_buttons" style="margin-bottom: 10px; position: fixed;">
        <div data-bind="click: $data.closeClicked" class="safari_close"></div>
    </div>
</div>`,
                    model: {
                        closeClicked: () => {
                            win.close();
                        }
                    }
                }
            });
            const panel = div({
                style: {
                    overflowY: "auto",
                    height: (ch - 80) + "px",
                    textAlign: "center"
                }
            });
            document.body.appendChild(container);
            var win = WindowManager.addWindow({
                type: "snapshot-thumbnails-panel",
                node: container
            });
            const thumbnails = snapshots.map(s => _this.generateSnapshotThumbnail({ snapshot: s, loaderWindow: win, isOpen: _this.desktop.snapshot.guid == s.Guid }));
            thumbnails.forEach(t => {
                t.style.display = "inline-block";
                t.style.marginRight = "40px";
                t.style.marginBottom = "40px";
                panel.appendChild(t);
            });
            container.appendChild(panel);
            $(panel).niceScroll({ cursorcolor: "#333", horizrailenabled: false });
        };
        Dock.prototype.generateDesktopSnapshotSketch = function (snapshot) {
            var _this = this;
            const w = window.innerWidth;
            const h = window.innerHeight;
            const container = div({
                style: {
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: w + "px",
                    height: h + "px",
                    zIndex: WindowManager.getNextIndex()
                }
            });
            const data = JSON.parse(snapshot.Value);
            const thumbnails = data.windows.filter(x => !x.isDeleted).map(win => _this.generateWindowThumbnail({
                thumbnailWidth: win.width, thumbnailHeight: win.height,
                win: win, iconScale: 5, ratioX: 1, ratioY: 1,
                borderRadius: 10, borderColor: "#333"
            }));
            thumbnails.forEach(t => container.appendChild(t));
            return container;
        };
        Dock.prototype.generateWindowThumbnail = function (args) {
            return createSnapshotWindow(args);
        };

        Dock.prototype.generateSnapshotThumbnail = function (args) {
            var _this = this;
            const { snapshot, isOpen } = args;
            const thumbnailWidth = args.thumbnailWidth || 200;
            const thumbnailHeight = args.thumbnailHeight || 112;
            const borderColor = isOpen ? "yellow" : "#ccc";
            const container = div({
                classList: ["snapshot-thumbnail"],
                style: {
                    //width: thumbnailWidth + "px",
                    //height: thumbnailHeight + "px",
                    border: `2px solid ${borderColor}`
                }
            });
            const inner = div({
                classList: ["snapshot-thumbnail-inner"],
                style: {
                    position: "relative",
                    margin: 0,
                    padding: 0,
                    width: thumbnailWidth + "px",
                    height: thumbnailHeight + "px"
                }
            });
            const data = JSON.parse(snapshot.Value);
            const thumbnails = data.windows.filter(x => !x.isDeleted).map(win => _this.generateWindowThumbnail({ ...args, win: win }));
            thumbnails.forEach(t => inner.appendChild(t));
            container.appendChild(inner);
            container.snapshot = snapshot;
            container.addEventListener("click", (e) => {
                const snapshotNode = getParent(e.target, x => !!x.snapshot);
                let snapshot = snapshotNode.snapshot;
                //_this.loadDesktopThumbnail(snapshot);
                _this.loadSnapshotByGuid(snapshot.Guid);
                args.loaderWindow.close();
            });
            const wrapper = div({
                classList: ["snapshot-thumbnail-container"]
            });
            wrapper.appendChild(container);
            const label = div({
                classList: ["snapshot-thumbnail-label"],
                style: {
                    color: isOpen ? "yellow" : "#fff",
                },
                template: {
                    view: `
<div>
    <div style="text-align: center;"><span data-bind="text: $data.name"></span></div>
    <span style="float: left; margin-top: -17px;">
        <span style="margin-right: 5px;" data-bind="click: $data.listViewClicked"><i class="far fa-list-alt"></i></span>
        <span data-bind="click: $data.editNameClicked"><i class="far fa-edit"></i></span>
    </span>
    <span style="float: right; margin-top: -17px;">
        <span data-bind="click: $data.popoutClicked" style="margin-right: 5px;"><i class="far fa-window-restore"></i></span>
        <span data-bind="click: $data.removeClicked"><img src="/Images/icons/x-mark.svg" style="width: 15px; filter: invert(100%);" /></span>
    </span>
</div>
`,
                    model: {
                        guid: snapshot.Guid,
                        container: container,
                        name: snapshot.Name(),
                        mode: ko.observable("read"),
                        listVisible: false,
                        list: null,
                        setNameClicked: () => {
                            console.log("setNameClicked");
                        },
                        editNameClicked: () => {
                            console.log("editNameClicked");
                        },
                        removeClicked: function () {
                            container.parentNode.remove();
                            _this.removeSnapshotFromHistory(this.guid);
                        },
                        deleteClicked: () => {
                            console.log("deleteClicked");
                            const guid = this.guid;
                            if (!confirm("Are you sure?")) {
                                return;
                            }
                            $.get("/Admin/Agent/DeleteSnapshot", { id: guid }, function (response) {
                                pubsub.publish("snapshot/delete", guid);
                            });
                        },
                        popoutClicked: function () {
                            _this.popoutSnapshotWindow(container.snapshot);
                        },
                        listViewClicked: function () {
                            this.listVisible = !this.listVisible;
                            if (this.listVisible) {
                                this.list = _this.loadListView(this.container);
                            } else {
                                this.list.remove();
                            }
                        }
                    }
                },
                //innerHTML: snapshot.Name()
            })
            wrapper.appendChild(label);
            return wrapper;
        };
        Dock.prototype.removeSnapshotFromHistory = function (guid) {
            var history = this.desktop.snapshot.history;
            const snapshot = history.find(x => x.Guid == guid);
            const i = history.indexOf(snapshot);
            history.splice(i, 1);
        };
        Dock.prototype.popoutSnapshotWindow = function (snapshot) {
            const container = div({
                style: {
                    position: "absolute",
                    top: "284px",
                    left: "860px",
                    zIndex: WindowManager.getNextIndex()
                },
                template: {
                    view: `
<div class="safari_buttons handle" style="margin-bottom: 10px;">
    <div data-bind="click: $data.closeClicked" class="safari_close"></div>
</div>
`, model:
                    {
                        closeClicked: () => {
                            win.close();
                        }
                    }
                }
            });
            const thumbnail = this.generateSnapshotThumbnail({ snapshot: snapshot, isOpen: false });
            container.appendChild(thumbnail);
            document.body.appendChild(container);
            var win = WindowManager.addWindow({
                type: "snapshot",
                node: container,
                loader: {
                    params: {
                        guid: snapshot.Guid
                    }
                },
                draggable: {
                    node: container.querySelectorAll(".handle")[0]
                }
            });
            $(container).draggable();
        };
        Dock.prototype.loadListView = function (container) {
            const { snapshot } = container;
            const data = JSON.parse(snapshot.Value);
            const windows = data.windows;
            const items = windows.map(w => {
                return {
                    type: w.type,
                    name: w.name
                };
            });
            console.log("loadListView", { container, snapshot, windows, items });
            const y = container.offsetTop;
            const x = container.offsetLeft + container.offsetWidth + 10;
            const list = div({
                style: {
                    position: "absolute",
                    top: y + "px",
                    left: x + "px",
                    padding: "10px",
                    color: "#333",
                    backgroundColor: "#fff",
                    textShadow: "none",
                    zIndex: WindowManager.getNextIndex()
                },
                template: {
                    view: `
<div>
    <table class="table">
        <tr>
            <th>Type</th>
            <th>Name</th>
        </tr>
        <!-- ko foreach: $data.items -->
        <tr>
            <td><span data-bind="text: $data.type"></span></td>
            <td><span data-bind="text: $data.name"></span></td>
        </tr>
        <!-- /ko -->
    </table>
</div>
`,
                    model: {
                        items: items
                    }
                }
            });
            container.parentNode.appendChild(list);
            return list;
        };
        Dock.prototype.loadSnapshots = function () {
            var _this = this;
            $.get("/Admin/Agent/GetSnapshots", null, function (response) {
                console.log({ response });
                var snapshots = response.Data.map(s => {
                    s.Name = ko.observable(s.Name);
                    s.mode = ko.observable("read");
                    return s;
                });
                _this.snapshots(snapshots);
            });
        };
        Dock.prototype.showCreateMenuClicked = function () {
            var _this = this;
            this.menu.create.selected = !this.menu.create.selected;
            if (!this.menu.create.selected) {
                pubsub.publish("show-create-menu/close");
                return;
            }
            var container = div({
                classList: ["text-window", "noselect"],
                style: {
                    position: "absolute",
                    bottom: "43px",
                    left: 0,
                    width: "50px",
                    height: "auto",
                    color: "#fff",
                    padding: "5px",
                    paddingTop: "15px",
                    backgroundColor: "transparent",
                    backdropFilter: "blur(2em)",
                    zIndex: 9990
                }
            });
            class CreateMenu {
                constructor() {
                    this.setup();
                }
                setup() {
                    var _this = this;
                    pubsub.subscribe("show-create-menu/close", () => {
                        _this.close();
                    });
                }
                closeClicked() {
                    this.close();
                }
                close() {
                    _this.menu.create.selected = false;
                    container.remove();
                }
                addTextClicked() {
                    this.close();
                    _this.addTextClicked()
                }
                addImageClicked() {
                    this.close();
                    _this.addImageClicked();
                }
                addAssetClicked() {
                    this.close();
                    _this.addAssetClicked();
                }
                addVideoClicked() {
                    this.close();
                    _this.addVideoClicked();
                }
                addWebsiteClicked() {
                    this.close();
                    _this.addWebsiteClicked()
                }
                addPdfClicked() {
                    this.close();
                    _this.addPdfClicked();
                }
                addSketchfabClicked() {
                    this.close();
                    _this.addSketchfabClicked();
                }
                addTweetClicked() {
                    this.close();
                    _this.addTweetClicked();
                }
                drawTextClicked() {
                    this.close();
                    _this.drawTextClicked();
                }
            }
            var model = new CreateMenu();
            var menu = applyBindings(`
<div class="safari_buttons" style="top: 3px; left: 0px; position: fixed;">
    <div data-bind="click: $data.closeClicked" class="safari_close"></div>
</div>
<!-- <div class="dock-item" data-bind="click: $data.drawTextClicked"><img src="/Images/icons/writing.svg" style="position: relative; height: 30px; width: 30px; filter: invert(100%);" /></div>  -->   
<!-- <div class="dock-item" data-bind="click: $data.addSketchfabClicked"><img src="/Images/icons/cube.svg" style="position: relative; height: 30px; width: 30px; filter: invert(100%);" /></div> -->
<div class="dock-item" data-bind="click: $data.addPdfClicked"><img src="/Images/icons/pdf-1.svg" style="position: relative; height: 30px; width: 30px; filter: invert(100%);" /></div>
<div class="dock-item" data-bind="click: $data.addWebsiteClicked"><img src="/Images/icons/chain.svg" style="position: relative; height: 30px; width: 30px; filter: invert(100%);" /></div>
<!-- <div class="dock-item" data-bind="click: $data.addTweetClicked"><img src="/Images/icons/twitter-3.svg" style="position: relative; height: 30px; width: 30px; filter: invert(100%);" /></div> -->
<div class="dock-item" data-bind="click: $data.addVideoClicked"><img src="/Images/icons/video-player.svg" style="position: relative; height: 30px; width: 30px; filter: invert(100%);" /></div>
<div class="dock-item" data-bind="click: $data.addImageClicked"><img src="/Images/icons/image.svg" style="position: relative; height: 30px; width: 30px; filter: invert(100%);" /></div>
<div class="dock-item" data-bind="click: $data.addAssetClicked"><img src="/Images/icons/upload.svg" style="position: relative; height: 30px; width: 30px; filter: invert(100%);" /></div>
<div class="dock-item" data-bind="click: $data.addTextClicked"><img src="/Images/icons/blank-folded-page.svg" style="position: relative; height: 30px; width: 30px; filter: invert(100%);" /></div> 
`, model);
            container.appendChild(menu);
            document.body.appendChild(container);
        };
        Dock.prototype.showSnapshotsClicked = function () {
            const snapshots = this.snapshots();
            // const snapshots = WindowManager.layers.map(x => x.snapshot);
            this.showSnapshotThumbnails(snapshots);
        };
        Dock.prototype.loadDesktopThumbnail = function (snapshot) {
            //WindowManager.closeAll();
            const container = this.generateDesktopSnapshotSketch(snapshot);
            document.body.appendChild(container);
            let win = WindowManager.addWindow({
                node: container
            });
        };
        Dock.prototype.loadSnapshotByGuid = function (guid) {
            var _this = this;
            const layer = WindowManager.findLayerBySnapshotGuid(guid);
            if (layer) {
                WindowManager.setCurrentLayer(layer);
                this.setScrollWheelEvents();
                return;
            }
            $.get("/Admin/Agent/LoadSnapshotJson", { id: guid }, function (response) {
                if (!response.Success) {
                    return;
                }
                _this.loadSnapshot(response.Data);
            });
        };
        Dock.prototype.loadSnapshot = function (item) {
            var snapshot = JSON.parse(item.Value);
            this.desktop.snapshot.guid = item.Guid;
            if (false == this.desktop.snapshot.history.some(x => x.Guid == item.Guid)) {
                this.desktop.snapshot.history.unshift({ ...item, Name: ko.observable(item.Name) });
            }
            // this.loadSnapshotByGuid(item.Guid);
            WindowManager.addLayer({ guid: item.Guid, snapshot });
            this.setScrollWheelEvents();
            this.storeDesktop();
        };
        Dock.prototype.saveSnapshotClicked = function () {
            this.saveSnapshot();
        };
        Dock.prototype.loadNameForm = function (callback) {
            const container = div({
                classList: ["text-window"],
                style: {
                    position: "absolute",
                    left: "250px",
                    bottom: "50px",
                    width: "400px",
                    backgroundColor: "#fff",
                    padding: "10px",
                    zIndex: 9990
                }
            });
            const form = div({
                template: {
                    view: `
<div>
    <form data-bind="submit: $data.saveClicked">
        <div>
            <label>Name</label>
            <input type="text" data-bind="value: $data.name" class="form-control" />
        </div>
        <div style="margin-top: 10px;">
            <button class="btn btn-default" data-bind="click: $data.cancelClicked" type="button">Cancel</button> <button class="btn btn-primary" type="submit">Save</button>
        </div>
    </form>
</div>`,
                    model: {
                        name: ko.observable(),
                        cancelClicked: function () {
                            container.remove();
                        },
                        saveClicked: function () {
                            container.remove();
                            if (callback) {
                                callback({ name: this.name() });
                            }
                        }
                    },
                    onAdded: (c) => {
                        const nameField = c.querySelectorAll("input")[0];
                        nameField.focus();
                    }
                }
            });
            container.appendChild(form);
            document.body.appendChild(container);
        };
        Dock.prototype.saveSnapshot = function () {
            var _this = this;
            this.loadNameForm((args) => {
                const { name } = args;
                var snapshot = WindowManager.serialise();
                snapshot.name = name;
                var json = JSON.stringify(snapshot);
                var entityGuids = snapshot.windows.filter(x => !!x.nodeInfo && x.nodeInfo.type == "entity").map(x => x.nodeInfo.guid);
                var textGuids = snapshot.windows.filter(x => !!x.nodeInfo && x.nodeInfo.type == "text").map(x => x.nodeInfo.guid);
                const existingGuid = _this.desktop.snapshot.guid;
                var params = {
                    entityGuids: entityGuids,
                    textGuids: textGuids,
                    snapshot: {
                        Guid: existingGuid,
                        Name: name,
                        Value: json
                    }
                };
                $.post("/Admin/Agent/SaveSnapshot", params, function (response) {
                    console.log({ response });
                    _this.desktop.snapshot.guid = response.Data;
                    _this.loadSnapshots();
                });
            });
        };
        Dock.prototype.storeDesktop = function () {
            var json = JSON.stringify(this.desktop);
            localStorage.setItem("desktop/settings", json);
        };
        Dock.prototype.restoreDesktop = function () {
            var json = localStorage.getItem("desktop/settings");
            if (!json) {
                this.setBackgroundImage(this.images()[0].url);
                return;
            }
            var desktop = JSON.parse(json);
            this.desktop = desktop;
            this.desktop.snapshot.history = [];
            if (this.desktop.backgroundImage) {
                this.setBackgroundImage(this.desktop.backgroundImage);
            }
            //if (this.desktop.snapshot.guid) {
            //    this.loadSnapshotByGuid(this.desktop.snapshot.guid);
            //}
            if (this.desktop.dockItemColour) {
                this.setDockColourClicked(this.desktop.dockItemColour);
            }
        };
        Dock.prototype.streamWebcam = function () {
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
                    filter: "blur(8px)",
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
                    // playsinline: "playsinline",
                    autoplay: true,
                    muted: "muted",
                }
            });
            const source = newElement("SOURCE", {
                attribute: {
                    type: "video/mp4"
                }
            });
            if (navigator.mediaDevices.getUserMedia) {
                navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 4096 },
                        height: { ideal: 2160 }
                    }
                })
                    .then(function (stream) {
                        video.srcObject = stream;
                    })
                    .catch(function (err0r) {
                        console.log("Something went wrong!");
                    });
            }
            video.appendChild(source);
            videoContainer.appendChild(video);
            document.body.appendChild(videoContainer);
        };
        Dock.prototype.setVideo = function (src) {
            //https://jsfiddle.net/kiirosora/36Lj4kxt/
            /**
             * { Text: "rain", Value: "/content/video/rain.mp4" },
                    { Text: "water", Value: "/content/video/water.mp4" },
                    { Text: "peak", Value: "/content/video/peak.mp4" },
                    { Text: "lights", Value: "/content/video/lights.mp4" },
                    { Text: "stars", Value: "/content/video/constellations.mp4" }
             * */
            var src = src || "/content/video/rain.mp4";
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
            var video = newElement("VIDEO", {
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
            var source = newElement("SOURCE", {
                attribute: {
                    src: src,
                    type: "video/mp4"
                }
            });

            video.appendChild(source);
            videoContainer.appendChild(video);
            document.body.appendChild(videoContainer);
            this.setLoadingAnimation(videoContainer);
        };
        Dock.prototype.selectBackgroundImageClicked = function () {
            this.menu.selectBackgroundImage.selected = !this.menu.selectBackgroundImage.selected;
            if (!this.menu.selectBackgroundImage.selected) {
                pubsub.publish("select-background-image/close");
                return;
            }
            var container = div({
                classList: ["text-window", "noselect"],
                style: {
                    position: "absolute",
                    bottom: "43px",
                    left: "150px",
                    width: "auto",
                    height: "180px",
                    color: "#fff",
                    maxHeight: "600px",
                    padding: "5px 20px 20px 20px",
                    backgroundColor: "transparent",
                    backdropFilter: "blur(2em)",
                    zIndex: WindowManager.getNextIndex()
                }
            });
            var _this = this;
            class SelectBackgroundImage {
                constructor() {
                    this.images = _this.images;
                    this.setup();
                }
                closeClicked() {
                    this.close();
                }
                close() {
                    win.close();
                }
                setup() {
                    var _this = this;
                    pubsub.subscribe("select-background-image/close", () => {
                        _this.close();
                    });
                }
                minimizeClicked() {
                    win.minimize();
                }
                addBackgroundImageClicked() {
                    var url = prompt("url");
                    _this.setBackgroundImage(url);
                    this.close();
                }
                setDockColourClicked() {
                    var colour = prompt("colour") || "#fff";
                    _this.setDockColourClicked(colour);
                }
                loadVantaCloudsBackground() {
                    _this.loadVantaCloudsBackground();
                }
                loadVantaGlobeBackground() {
                    _this.loadVantaGlobeBackground();
                }
                setVideoClicked(src) {
                    _this.setVideo(src);
                    this.close();
                }
                streamWebcamClicked() {
                    _this.streamWebcam();
                    this.close();
                }
                setCustomVideoClicked() {
                    var filename = prompt("filename?");
                    _this.setVideo("/content/video/" + filename);
                    this.close();
                }
                selectClicked(item) {
                    _this.setBackgroundImage(item.url);
                    this.close();
                }
            }
            var model = new SelectBackgroundImage();
            model.setup();
            var node = applyBindings(`
<div class="safari_buttons" style="margin-bottom: 10px;">
    <div data-bind="click: $data.closeClicked" class="safari_close"></div><div data-bind="click: $data.minimizeClicked" class="safari_minimize"></div><div class="safari_zoom"></div>
</div>
<div style="float: right; width: 300px;">
    <span data-bind="click: $data.addBackgroundImageClicked" style="text-decoration: underline;">image</span> | 
    <span data-bind="click: $data.setDockColourClicked" style="text-decoration: underline;">colour</span> | 
    <span data-bind="click: $data.streamWebcamClicked" style="text-decoration: underline;"><img src="/Images/icons/webcam.svg" style="width: 25px; filter: invert(100%);" /></span> | 
    <span data-bind="click: $data.setCustomVideoClicked" style="text-decoration: underline;">custom</span> | 
    <span data-bind="click: function() { $data.setVideoClicked('/content/video/rain.mp4') }" style="text-decoration: underline;">rain</span> | 
    <span data-bind="click: function() { $data.setVideoClicked('/content/video/milkyway.mp4') }" style="text-decoration: underline;">milkyway</span> | 
    <span data-bind="click: function() { $data.setVideoClicked('/content/video/purple.mp4') }" style="text-decoration: underline;">purple</span> |
    <span data-bind="click: function() { $data.setVideoClicked('/content/video/hexagons.mp4') }" style="text-decoration: underline;">hexagons</span> |
    <span data-bind="click: function() { $data.setVideoClicked('/content/video/sapphire.mp4') }" style="text-decoration: underline;">sapphire</span> |
    <span data-bind="click: function() { $data.setVideoClicked('/content/video/bokeh.mp4') }" style="text-decoration: underline;">bokeh</span> |
    <span data-bind="click: function() { $data.setVideoClicked('/content/video/clouds.mp4') }" style="text-decoration: underline;">clouds</span> |
    <span data-bind="click: function() { $data.setVideoClicked('/content/video/matrix.mp4') }" style="text-decoration: underline;">matrix</span> |
    <span data-bind="click: function() { $data.setVideoClicked('/content/video/grid.mov') }" style="text-decoration: underline;">grid</span> |
    <span data-bind="click: function() { $data.setVideoClicked('https://video.twimg.com/tweet_video/EosYnw-VEAEoOg0.mp4') }" style="text-decoration: underline;">fractal</span> | <span data-bind="click: $data.loadVantaCloudsBackground" style="text-decoration: underline;">3D clouds</span> | <span data-bind="click: $data.loadVantaGlobeBackground" style="text-decoration: underline;">3D globe</span>

</div>
<div data-bind="foreach: $data.images">
    <div style="display: inline-block; margin-right: 20px; margin-bottom: 20px;" data-bind="click: $parent.selectClicked.bind($parent)">
        <img data-bind="attr: { src: $data.thumbnail }" style="width: 150px; height: auto;" />
        <h4 style="color: #fff;"><span data-bind="text: $data.name"></span></h4>
    </div>
</div>
`,
                model);
            container.appendChild(node);
            //https://video.twimg.com/tweet_video/EiFepSvVkAA8MMs.mp4
            document.body.appendChild(container);
            var win = WindowManager.addWindow({
                type: "background-image-selector-panel",
                node: container
            });
            $(container).draggable();
        };
        Dock.prototype.setDockColourClicked = function (colour) {
            var changeCss = Helper.changeCss;
            this.desktop.dockItemColour = colour;
            changeCss(".dock-item", "color", colour);
            this.storeDesktop();
        };
        Dock.prototype.setLoadingAnimation = function (container) {
            const w = 5000, h = 5000;
            const x = (window.innerWidth / 2) - (w / 2), y = (window.innerHeight / 2) - (h / 2);
            const codex = newElement("img", {
                classList: ["noselect", "fade-out", "triskelion"],
                attribute: {
                    src: "/Images/icons/spiral.svg"
                },
                style: {
                    position: "fixed",
                    left: x + "px",
                    top: y + "px",
                    width: w + "px",
                    height: h + "px",
                    mixBlendMode: "overlay",
                    zIndex: 11,
                    pointerEvents: "none"
                }
            });
            container.appendChild(codex);
            window.setTimeout(() => {
                codex.remove();
            }, 1800);
        };
        Dock.prototype.setBackgroundImage = function (url) {
            var _this = this;
            if (this.videoContainer) {
                this.videoContainer.remove();
            }
            var page = document.body.querySelectorAll(".page-content")[0];
            //$(page).ripples('destroy');
            page.innerHTML = "";
            page.style.background = "url('" + url + "')";
            page.style.backgroundPosition = "center";
            page.style.backgroundRepeat = "no-repeat";
            page.style.backgroundSize = "cover";
            this.desktop.backgroundImage = url;
            this.setLoadingAnimation(page);
            this.storeDesktop();
            //$(page).ripples({
            //    resolution: 512,
            //    dropRadius: 20,
            //    perturbance: 0.04,
            //    interactive: true
            //}).ripples('play');
        };
        Dock.prototype.loadEntityExplorerClicked = function () {
            require(["components/entity-explorer"], function (Explorer) {
                const model = new Explorer();
                model.load((m) => {
                    m.loadDefaultFolder();
                });
            });
        };
        Dock.prototype.loadNotebookClicked = function () {
            require(["components/notebook"], function (Notebook) {
                const model = new Notebook();
                model.load((m) => {
                    m.startWithBlankPage();
                });
            });
        };
        Dock.prototype.getCentreCoords = function (w, h) {
            const dh = 51; // dock height
            const x = (window.innerWidth) / 2 - (w / 2);
            const y = (window.innerHeight - dh) / 2 - (h / 2);
            return { x, y };
        };
        Dock.prototype.loadOutlinerClicked = function () {
            require(["components/outliner"], function (Outliner) {
                const outliner = new Outliner({
                    container: document.body
                });
            });
        };
        Dock.prototype.loadWorkbookClicked = function () {
            require(["components/workbook"], (Workbook) => {
                const workbook = new Workbook();
                workbook.appendToNode(document.body);
            });
        };
        Dock.prototype.loadTextClicked = function () {
            this.menu.loadText.selected = !this.menu.loadText.selected;
            if (!this.menu.loadText.selected) {
                pubsub.publish("load-text/close");
            }
            this.textSearch();            
        };
        Dock.prototype.textSearch = function () {
            require(["components/text-search"], (TextLoader) => {
                const loader = new TextLoader();
            });
        };
        Dock.prototype.addTextClicked = function () {
            const model = new QuickAdd();
            model.loadTextWindow();
        };
        Dock.prototype.drawTextClicked = function () {
            const model = new QuickAdd();
            model.createMarginaliaText({
                top: "400px",
                left: "1300px"
            });
        };
        Dock.prototype.loadEntityClicked = function () {
            require(["parts/entity-loader"], (EntityLoader) => {
                var loader = new EntityLoader();
                loader.load();
            });
            //this.menu.loadEntity.selected = !this.menu.loadEntity.selected;
            //if (!this.menu.loadEntity.selected) {
            //    if (this.menu.loadEntity.window) {
            //        this.menu.loadEntity.window.close();
            //    }
            //    return;
            //}
            //var _this = this;
            //require(["modals/search-agents", "jquery-ui"], function (AgentModal) {
            //    $.get("/Static/Templates/Agent/loader-panel.html?v=23", function (html) {
            //        var loader = _this.menu.loadEntity.node = div({
            //            classList: ["text-window"],
            //            style: {
            //                position: "absolute",
            //                bottom: "43px",
            //                left: "-7px",
            //                width: "600px",
            //                height: "600px",
            //                maxHeight: "600px",
            //                padding: "20px",
            //                backdropFilter: "blur(2em)",
            //                color: "#fff",
            //                backgroundColor: "transparent",
            //                zIndex: 9990
            //            }
            //        });
            //        var modal = new AgentModal({
            //            popup: loader,
            //            tabs: ["search"],
            //            currentTab: "search",
            //            tab: {
            //                search: {
            //                    filter: {
            //                        Order: "ByDateAdded",
            //                        Direction: "Descending"
            //                    }
            //                }
            //            },
            //            handler: {
            //                onSelected: function (guid, name) {
            //                    console.log({ guid, name });
            //                    win.close();
            //                    $.get("/Static/Templates/Agent/entity-panel.html?v=7", function (html) {
            //                        $.get("/Admin/Agent/Overview", { id: guid }, function (response) {
            //                            if (!response.Success) {
            //                                return;
            //                            }
            //                            var overview = response.Data;
            //                            if (!!overview.ImageUrl) {
            //                                _this.loadImageWindow({
            //                                    entityGuid: overview.Entity.Guid,
            //                                    name: overview.Entity.Name,
            //                                    url: overview.ImageUrl
            //                                });
            //                                return;
            //                            }
            //                            if (!!overview.PdfUrl) {
            //                                _this.loadPdfWindow({
            //                                    entityGuid: overview.Entity.Guid,
            //                                    url: overview.PdfUrl
            //                                });
            //                                return;
            //                            }
            //                            if (!!overview.TweetEmbedCode) {
            //                                _this.loadTweetWindow({
            //                                    entityGuid: overview.Entity.Guid,
            //                                    value: overview.TweetEmbedCode
            //                                });
            //                                return;
            //                            }
            //                            if (!!overview.VideoUrl) {
            //                                _this.loadVideoWindow({
            //                                    entityGuid: overview.Entity.Guid,
            //                                    name: overview.Entity.Name,
            //                                    url: overview.VideoUrl
            //                                });
            //                                return;
            //                            }
            //                            if (!!overview.SketchfabEmbedCode) {
            //                                _this.loadSketchfabWindow({
            //                                    entityGuid: overview.Entity.Guid,
            //                                    value: overview.SketchfabEmbedCode
            //                                });
            //                                return;
            //                            }
            //                            if (!!overview.WebsiteUrl) {
            //                                _this.loadWebsiteWindow({
            //                                    entityGuid: overview.Entity.Guid,
            //                                    url: overview.WebsiteUrl
            //                                });
            //                                return;
            //                            }
            //                            var container = div({
            //                                classList: ["text-window"],
            //                                style: {
            //                                    position: "absolute",
            //                                    top: "200px",
            //                                    right: "200px",
            //                                    width: "1000px",
            //                                    height: "600px",
            //                                    backgroundColor: "#fff"
            //                                }
            //                            });
            //                            var node = applyBindings(html, {
            //                                Entity: {},
            //                                tab: ko.observable("overview"),
            //                                closeClicked: function () {
            //                                    win.close();
            //                                },
            //                                minimizeClicked: function () {
            //                                    win.minimize({ name: "entity :: " + overview.Entity.Name });
            //                                },
            //                                overviewClicked: function () {
            //                                    this.tab("overview");
            //                                    $.get("/Admin/Agent/Properties", { id: guid }, function (response) {
            //                                        console.log({ response });
            //                                        if (!response.Success) {
            //                                            return;
            //                                        }
            //                                        var data = response.Data;
            //                                        var videos = response.Data.filter(x => !!x.TypeOfProperty.Target && x.TypeOfProperty.Target.Code == "video-url");
            //                                        if (videos.length) {
            //                                            var video = videos[0];
            //                                            let preview = container.querySelectorAll('[data-role="preview"]')[0];
            //                                            preview.innerHTML = "&nbsp;";
            //                                            _this.loadVideo({
            //                                                node: preview,
            //                                                entity: {
            //                                                    guid: guid
            //                                                },
            //                                                video: {
            //                                                    url: video.AgentHasProperty.Target.Value
            //                                                }
            //                                            });
            //                                        }
            //                                        var images = response.Data.filter(x => !!x.TypeOfProperty.Target && x.TypeOfProperty.Target.Code == "image-url");
            //                                        if (images.length) {
            //                                            var image = images[0];
            //                                            let preview = container.querySelectorAll('[data-role="preview"]')[0];
            //                                            preview.innerHTML = "&nbsp;";
            //                                            _this.loadImage({
            //                                                node: preview,
            //                                                entity: {
            //                                                    guid: guid
            //                                                },
            //                                                image: {
            //                                                    url: image.AgentHasProperty.Target.Value
            //                                                }
            //                                            });
            //                                        }
            //                                    });
            //                                },
            //                                relationsClicked: function () {
            //                                    this.tab("relations");
            //                                    require(["parts/agent-graph"], (AgentGraph) => {
            //                                        let preview = container.querySelectorAll('[data-role="preview"]')[0];
            //                                        preview.innerHTML = "&nbsp;";
            //                                        let node = div({
            //                                            style: {
            //                                                width: "600px",
            //                                                height: "600px",
            //                                            }
            //                                        });
            //                                        preview.appendChild(node);
            //                                        var graph = new AgentGraph({
            //                                            node: node,
            //                                            agentGuid: guid
            //                                        });
            //                                    });
            //                                },
            //                                timelineClicked: function () {
            //                                    this.tab("timeline");
            //                                    let preview = container.querySelectorAll('[data-role="preview"]')[0];
            //                                    preview.innerHTML = "&nbsp;";
            //                                    require(["knockout/speedy-viewer", "jquery-ui"], function (rr) {
            //                                        $.get("/Static/Templates/Agent/timeline-panel.html?v=19", function (html) {
            //                                            $.get("/Admin/Agent/Timeline", { id: guid }, function (response) {
            //                                                console.log({ response });
            //                                                if (!response.Success) {
            //                                                    return;
            //                                                }

            //                                                var content = applyBindings(html, {
            //                                                    items: response.Data,
            //                                                    agent: {
            //                                                        guid: guid,
            //                                                        name: overview.Entity.Name
            //                                                    },
            //                                                    textSelected: function (item) {
            //                                                        //_this.loadTextWindow(item.TextGuid, document.body);
            //                                                    },
            //                                                    closeClicked: function () {
            //                                                        //container.remove();
            //                                                    },
            //                                                    diagram: function (item) {

            //                                                    }
            //                                                });
            //                                                preview.appendChild(content);
            //                                            });
            //                                        });
            //                                    });
            //                                },
            //                                propertiesClicked: function () {
            //                                    this.tab("properties");
            //                                    let preview = container.querySelectorAll('[data-role="preview"]')[0];
            //                                    preview.innerHTML = "&nbsp;";
            //                                    $.get("/Static/Templates/Agent/properties-panel.html?v=3", function (html) {
            //                                        $.get("/Admin/Agent/Properties", { id: guid }, function (response) {
            //                                            console.log({ response });
            //                                            if (!response.Success) {
            //                                                return;
            //                                            }
            //                                            var content = applyBindings(html, {
            //                                                items: response.Data,
            //                                                agent: {
            //                                                    guid: guid,
            //                                                    name: overview.Entity.Name
            //                                                },
            //                                                closeClicked: function () {

            //                                                },
            //                                                diagram: function (item) {

            //                                                }
            //                                            });
            //                                            preview.appendChild(content);
            //                                        });
            //                                    });
            //                                },
            //                                referencesClicked: function () {
            //                                    this.tab("references");
            //                                    let preview = container.querySelectorAll('[data-role="preview"]')[0];
            //                                    preview.innerHTML = "&nbsp;";

            //                                    require(["parts/search-text-blocks"], function (SearchTextBlocks) {
            //                                        var search = new SearchTextBlocks({
            //                                            filter: {
            //                                                agentGuid: guid
            //                                            }
            //                                        });
            //                                        (async () => {
            //                                            await search.load();
            //                                            search.search();
            //                                        })();
            //                                    });

            //                                    /*
            //                                    require(["knockout/speedy-viewer", "jquery-ui"], function () {
            //                                        let cache = {};
            //                                        $.get("/Static/Templates/Agent/sentences-panel.html?v=26", function (html) {
            //                                            let container = loader.querySelectorAll('[data-role="preview"]')[0];
            //                                            container.innerHTML = "&nbsp;";
            //                                            var node = div({
            //                                                style: {
            //                                                    position: "absolute",
            //                                                    top: 0,
            //                                                    left: 0,
            //                                                    width: "100%",
            //                                                    height: "auto",
            //                                                    padding: "10px",
            //                                                    overflowY: "auto",
            //                                                    overflowX: "hidden"
            //                                                },
            //                                                innerHTML: html
            //                                            });
            //                                            var Model = (function () {
            //                                                function Model(cons) {
            //                                                    this.list = {
            //                                                        sections: ko.observableArray([]),
            //                                                        sentiment: [null, "Positive", "Negative"],
            //                                                        sortOptions: [{ Text: "By name", Value: "ByName" }, { Text: "By date added", Value: "ByDateAdded" }],
            //                                                        directions: ["Ascending", "Descending"],
            //                                                        pages: ko.observableArray([1]),
            //                                                        pageRows: [5, 10, 20]
            //                                                    };
            //                                                    this.filter = {
            //                                                        agentGuid: ko.observable(cons.filter.agentGuid),
            //                                                        sectionGuid: ko.observable(),
            //                                                        page: ko.observable(),
            //                                                        sentiment: ko.observable(),
            //                                                        order: ko.observable("ByName"),
            //                                                        direction: ko.observable("Ascending"),
            //                                                        pageRows: ko.observable(5)
            //                                                    };
            //                                                    this.cache = {};
            //                                                    this.count = ko.observable();
            //                                                    this.page = ko.observable(1);
            //                                                    this.maxPage = ko.observable(1);
            //                                                    this.results = ko.observableArray([]);
            //                                                    this.setLists();
            //                                                }
            //                                                Model.prototype.closeClicked = function () {
            //                                                    node.remove();
            //                                                };
            //                                                Model.prototype.setPages = function (page, maxPage) {
            //                                                    var pages = [];
            //                                                    for (var i = 1; i <= maxPage; i++) {
            //                                                        pages.push(i);
            //                                                    }
            //                                                    this.list.pages(pages);
            //                                                    this.filter.page(page);
            //                                                    this.maxPage(maxPage);
            //                                                };
            //                                                Model.prototype.previousPageClicked = function () {
            //                                                    var page = this.filter.page();
            //                                                    if (page <= 1) {
            //                                                        return;
            //                                                    }
            //                                                    this.filter.page(page - 1);
            //                                                    this.searchClicked();
            //                                                };
            //                                                Model.prototype.nextPageClicked = function () {
            //                                                    var page = this.filter.page();
            //                                                    if (page >= this.maxPage()) {
            //                                                        return;
            //                                                    }
            //                                                    this.filter.page(page + 1);
            //                                                    this.searchClicked();
            //                                                };
            //                                                Model.prototype.textSelected = function (item) {
            //                                                    var guid = item.Text.Guid;
            //                                                    var model = new QuickAdd();
            //                                                    model.loadTextWindow(guid);
            //                                                };
            //                                                Model.prototype.setLists = function () {
            //                                                    var _this = this;
            //                                                    $.get("/Admin/Agent/SearchModalLists", (response) => {
            //                                                        _this.list.sections(response.Data.Sections);
            //                                                    });
            //                                                };
            //                                                Model.prototype.clearClicked = function () {
            //                                                    this.results([]);
            //                                                };
            //                                                Model.prototype.searchClicked = function () {
            //                                                    var _this = this;
            //                                                    var filter = ko.toJS(this.filter);
            //                                                    var key = JSON.stringify(filter);
            //                                                    if (cache[key]) {
            //                                                        var data = JSON.parse(cache[key]);
            //                                                        this.results(data.Results);
            //                                                        this.count(data.Count);
            //                                                        this.setPages(data.Page, data.MaxPage);
            //                                                        return;
            //                                                    }
            //                                                    $.get("/Admin/Agent/Sentences", filter, function (response) {
            //                                                        console.log({ response });
            //                                                        if (!response.Success) {
            //                                                            return;
            //                                                        }
            //                                                        cache[key] = JSON.stringify(response.Data);
            //                                                        _this.results(response.Data.Results);
            //                                                        _this.count(response.Data.Count);
            //                                                        _this.setPages(response.Data.Page, response.Data.MaxPage);
            //                                                    });
            //                                                };
            //                                                Model.prototype.applyBindings = function (node) {
            //                                                    ko.applyBindings(this, node);
            //                                                };
            //                                                return Model;
            //                                            })();
            //                                            var model = new Model({
            //                                                filter: {
            //                                                    agentGuid: guid,
            //                                                }
            //                                            });
            //                                            model.searchClicked();
            //                                            model.applyBindings(node);
            //                                            preview.appendChild(node);
            //                                        });
            //                                    });
            //                                    */
            //                                }
            //                            });
            //                            container.appendChild(node);
            //                            document.body.appendChild(container);
            //                            var win = WindowManager.addWindow({
            //                                type: "entity-panel",
            //                                node: container
            //                            });
            //                            $(container).draggable();
            //                        });
            //                    });
            //                },
            //                closeClicked: function () {
            //                    win.close();
            //                }
            //            }
            //        });
            //        modal.start();
            //        var node = applyBindings(html, modal);
            //        loader.appendChild(node);
            //        document.body.appendChild(loader);
            //        $(loader).find("[data-role='niceScroll']").niceScroll();
            //        var win = _this.menu.loadEntity.window = WindowManager.addWindow({
            //            type: "load-agents",
            //            node: loader
            //        });
            //    });
            //});
        };
        Dock.prototype.show = function () {
            this.node.style.display = "block";
        };
        return Dock;
    })();

    var dock = new Dock();
    dock.show();

    return dock;

}));
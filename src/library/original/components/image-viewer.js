(function (factory) {
    define("components/image-viewer", ["knockout", "jquery", "parts/window-manager", "app/helpers"], factory);
}(function (ko, $, _WindowManager, Helper) {

    const WindowManager = _WindowManager.getWindowManager();
    const { div, newElement, updateElement } = Helper;

    class ImageViewer {
        constructor(cons) {
            const _this = this;
            this.entityGuid = cons.entityGuid;
            this.url = cons.url;
            this.fetchUrl = cons.fetchUrl;
            this.x = cons.x;
            this.y = cons.y;
            this.zIndex = cons.zIndex;
            this.width = cons.width;
            this.height = cons.height;
            this.container = div({
                classList: ["text-window", "noselect"],
                style: {
                    position: "absolute",
                    top: this.y + "px",
                    left: this.x + "px",
                    width: this.width ? this.width + "px" : "auto",
                    height: this.height ? this.height + "px" : "auto",
                    backgroundColor: "#000",
                    zIndex: WindowManager.getNextIndex()
                }
            });
            this.layer = cons.layer || document.body; // WindowManager.currentLayer.container;
            this.layer.appendChild(this.container);
            if (false == this.fetchUrl) {
                this.addImageToContainer({ container: this.container, url: this.url, entityGuid: this.entityGuid, zIndex: this.zIndex });
            } else {
                $.get("/Admin/Agent/Overview", { id: this.entityGuid }, function (response) {
                    let url = response.Data.ImageUrl;
                    _this.addImageToContainer({ container: _this.container, url: url, entityGuid: _this.entityGuid, zIndex: _this.zIndex });
                });
            }
        }
        addImageToContainer(data) {
            const { container, url, entityGuid, zIndex } = data;
            var _this = this;
            var loader = div({
                classList: ["loader", "loader-center"]
            });
            container.appendChild(loader);
            var model = {
                container: container,
                focus: false,
                pinned: ko.observable(false),
                togglePinClicked: function () {
                    win.togglePin();
                    this.pinned(win.pin);
                },
                glass: false,
                toggleCircleModeClicked: function () {
                    this.circle = !this.circle;
                    if (this.circle) {
                        this.container.classList.add("circle-window");
                        this.container.dataset.originalWidth = this.container.style.width;
                        this.container.style.width = container.style.height;
                        const width = this.container.offsetWidth;
                        const x = (width / 2) - 50;
                        updateElement(handle, {
                            style: {
                                position: "relative",
                                top: "5px",
                                left: x + "px"
                            }
                        });
                        updateElement(img, {
                            style: {
                                maxWidth: "none",
                                maxHeight: "none",
                                width: "100%",
                                height: "100%"
                            }
                        });
                    } else {
                        this.container.classList.remove("circle-window");
                        this.container.style.width = this.container.dataset.originalWidth;
                        updateElement(handle, {
                            style: {
                                top: 0,
                                left: 0
                            }
                        });
                        updateElement(img, {
                            style: {
                                maxWidth: "640px",
                                maxHeight: "640px",
                                width: "auto",
                                height: "auto"
                            }
                        });
                    }
                },
                toggleGlassModeClicked: function () {
                    this.glass = !this.glass;
                    if (this.glass) {
                        this.container.classList.add("glass-window");
                        img.style.opacity = 0.2;

                    } else {
                        this.container.classList.remove("glass-window");
                        img.style.opacity = 1;
                    }
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
                        this.position.w = rect.width;
                        this.position.h = rect.height;
                        img.style.maxWidth = w + "px";
                        img.style.maxHeight = h + "px";
                        img.style.width = "auto";
                        img.style.height = "100%";
                        container.style.position = "fixed";
                        container.style.top = 0;
                        container.style.left = 0;
                        container.style.textAlign = "center";
                        container.style.height = "100%";
                        container.style.width = "100%";
                        container.style.zIndex = "10";
                        win.state = "fullscreen";
                    } else {
                        img.style.maxWidth = "600px";
                        img.style.maxHeight = "600px";
                        container.style.position = "absolute";
                        container.style.textAlign = "left";
                        container.style.left = this.position.x + "px";
                        container.style.top = this.position.y + "px";
                        container.style.height = this.position.h + "px";
                        container.style.width = this.position.w + "px";
                        container.style.zIndex = WindowManager.getNextIndex().toString();
                        win.state = "open";
                    }
                },
                settingsClicked: () => {
                    var rect = container.getBoundingClientRect();
                    var x = rect.x + rect.width + 10;
                    var y = rect.y;
                    pubsub.publish("load-entity", {
                        guid: entityGuid, left: x, top: y, onReady: (ew) => {
                            win.children.push(ew);
                        }
                    });
                    //_this.loadEntityClicked(entityGuid, {
                    //    left: x, top: y, onReady: (ew) => {
                    //        win.children.push(ew);
                    //    }
                    //});
                },
                closeClicked: () => win.close(),
                minimizeClicked: () => win.minimize({
                    thumbnail: div({
                        innerHTML: `<div><i style="font-size: 40px; " class="far fa-file-image"></i></div>`
                    }),
                }),
                focusClicked: function () {
                    this.focus = !this.focus;
                    if (this.focus) {
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
        <div data-bind="click: $data.closeClicked" class="safari_close"></div><div data-bind="click: $data.minimizeClicked" class="safari_minimize"></div><div data-bind="click: $data.zoomClicked" class="safari_zoom"></div><div data-bind="click: $data.focusClicked" class="safari_focus"></div><div data-bind="click: $data.toggleGlassModeClicked" class="safari_glass"></div><div data-bind="click: $data.toggleCircleModeClicked" class="safari_circle"></div>
    </div>
     <div style="float: right; padding:0; margin: 0; margin-top: -10px; margin-right: 5px;">
        <span data-bind="click: $data.togglePinClicked, style: { color: $data.pinned() ? '#fff' : '#6f7b8a' }"><i class="fas fa-thumbtack"></i></span>
        <span data-bind="click: $data.settingsClicked"><i style="font-size: 1.25rem;" class="fas fa-angle-double-right"></i></span>
    </div>
</div>`,
                    model: model
                }
            });
            container.appendChild(handle);
            var img = newElement("IMG", {
                attribute: {
                    src: url
                },
                style: {
                    maxWidth: "640px",
                    maxHeight: "640px",
                    //width: "100%",
                    //height: "100%"
                },
                handler: {
                    load: () => {
                        loader.remove();
                        container.style.width = img.width + "px";
                    }
                }
            });
            container.appendChild(img);
            $(img).on("click", function (e) {
                if (e.ctrlKey) {
                    changeSize("+", 0.1);
                } else {
                    changeSize("-", 0.1);
                }
                if (model.circle) {
                    const width = container.offsetWidth;
                    const x = (width / 2) - 50;
                    updateElement(handle, {
                        style: {
                            left: x + "px"
                        }
                    });
                }
            });
            function changeSize(op, ratio) {
                var rect = img.getBoundingClientRect();
                var width = rect.width, height = rect.height;
                var w, h;
                if (op == "+") {
                    w = width + (width * ratio);
                    h = height + (height * ratio);
                } else {
                    w = width - (width * ratio);
                    h = height - (height * ratio);
                }
                img.style.width = w + "px";
                img.style.maxWidth = w + "px";
                img.style.height = h + "px";
                img.style.maxHeight = h + "px";
                container.style.width = w + "px";
                container.style.height = h + "px";
            }
            var win = WindowManager.addWindow({
                type: "image",
                draggable: {
                    node: handle
                },
                loader: {
                    params: {
                        entityGuid: entityGuid
                    }
                },
                node: container,
                zIndex: data.zIndex
            });
        }
    }

    return ImageViewer;

}));
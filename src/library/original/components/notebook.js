(function (factory) {
    define("components/notebook", ["knockout", "jquery", "app/helpers", "parts/window-manager", "components/clipboard", "pubsub", "parts/text-add", "modals/search-texts", "jquery-ui"], factory);
}(function (ko, $, Helper, _WindowManager, _Clipboard, pubsub, QuickAdd, TextModal) {

    const { applyBindings, div } = Helper;
    const WindowManager = _WindowManager.getWindowManager();
    const Clipboard = _Clipboard.getInstance();

    class Page {
        constructor(cons) {
            cons = cons || {};
            cons.model = cons.model || {};
            this.model = {
                backgroundColor: cons.model.backgroundColor || "#fff",
                x: cons.model.x,
                y: cons.model.y,
                w: cons.model.w,
                h: cons.model.h,
                z: cons.model.z
            };
            this.node = this.createNode();
            this.win = null;
        }
        createNode() {
            const node = div({
                style: {
                    position: "absolute",
                    backgroundColor: this.model.backgroundColor,
                    left: this.model.x + "px",
                    top: this.model.y + "px",
                    width: this.model.w + "px",
                    height: this.model.h + "px",
                    overflow: "hidden",
                    zIndex: this.model.z || WindowManager.getNextIndex()
                }
            });
            return node;
        }
        fetchEntity(callback) {
            require(["parts/entity-loader"], (EntityLoader) => {
                var loader = new EntityLoader({
                    handler: {
                        entitySelected: (guid) => {
                            $.get("/Admin/Agent/GetAgent", { id: guid }, (response) => {
                                console.log("/Admin/Agent/GetAgent", { guid, response });
                                if (!response.Success) {
                                    return;
                                }
                                const entity = response.Data;
                                callback(entity);
                            });
                        }
                    }
                });
                loader.load();
            });
        }
        addTextBlock() {
            var client = new QuickAdd();
            const options = {
                top: "20px",
                left: "20px",
                width: "auto",
                minWidth: "200px",
                minHeight: "100px",
                height: "auto",
                layer: this.node,
                chromeless: true,
                //border: "1px dotted #ccc",
                zIndex: WindowManager.getNextIndex()
            };
            client.loadTextWindow(null, null, options);
        }
        addEntity() {
            const _this = this;
            const client = new QuickAdd();
            this.fetchEntity(function (entity) {
                if (entity.AgentType == "Image") {
                    client.loadImageWindow({
                        entityGuid: entity.Guid,
                        layer: _this.node
                    });
                    return;
                }
            }.bind(this));
        }
    }

    class Notebook {
        constructor(cons) {
            cons = cons || {};
            cons.model = cons.model || {};
            const w = cons.w || 1060; // Two A4 sheets side-by-side
            const h = cons.h || 815; // A4
            const ww = window.innerWidth;
            const wh = window.innerHeight;
            const wx = (ww / 2) - (w / 2);
            const wy = (wh / 2) - (h / 2);
            const x = cons.model.x || wx;
            const y = cons.model.y || wy;
            this.model = {
                x, y, w, h
            };
            this.pages = [];
            this.page = null;
            this.node = null;
            this.toolbox = null;
            this.win = null;
        }
        startWithBlankPage() {
            const page = this.createPage();
            this.pages.push(page);
            this.page = page;
            this.node.appendChild(page.node);
        }
        createPage() {
            const page = new Page({
                model: {
                    side: "left",
                    backgroundColor: "#fff",
                    x: 0,
                    y: "20px",
                    w: 530,
                    h: 750
                }
            });
            return page;
        }
        closeClicked() {
            this.win.close();
        }
        focusClicked() {
            this.focus = !this.focus;
            if (this.focus) {
                this.win.focus();
            } else {
                this.win.unfocus();
            }
        }
        toggleGlassModeClicked() {
            this.glass = !this.glass;
            if (this.glass) {
                this.win.node.classList.add("glass-window");

            } else {
                this.win.node.classList.remove("glass-window");
            }
        }
        minimizeClicked() {

        }
        addTextBlockClicked() {
            this.page.addTextBlock();
        }
        addEntityClicked() {
            this.page.addEntity()
        }
        createToolbox() {
            const node = div({
                style: {
                    position: "absolute",
                    backgroundColor: "none",
                    left: 0,
                    bottom: 0,
                    width: 600,
                    height: 50,
                    zIndex: WindowManager.getNextIndex()
                },
                template: {
                    view: `
<div>
    <div class="dock-item" data-bind="click: $data.addTextBlockClicked"><img src="/Images/icons/blank-folded-page.svg" style="position: relative; top: -5px; height: 25px; width: 25px; filter: invert(100%);" /></div>
    <div class="dock-item" data-bind="click: $data.addEntityClicked"><img src="/Images/icons/circle.svg" style="position: relative; top: -5px; height: 25px; width: 25px; filter: invert(100%);" /></div>
</div>
`,
                    model: this
                }
            });
            return node;
        }
        load(callback) {
            const node = this.node = div({
                style: {
                    position: "absolute",
                    backgroundColor: "none",
                    left: this.model.x + "px",
                    top: this.model.y + "px",
                    width: this.model.w + "px",
                    height: this.model.h + "px",
                    overflow: "hidden",
                    zIndex: WindowManager.getNextIndex()
                }
            });
            const handle = div({
                template: {
                    view: `
<div class="safari_buttons" data-role="draggable">
            <div data-bind="click: $data.closeClicked" class="safari_close"></div><div data-bind="click: $data.minimizeClicked" class="safari_minimize"></div><div class="safari_zoom"></div><div data-bind="click: $data.focusClicked" class="safari_focus"></div><div data-bind="click: $data.toggleGlassModeClicked" class="safari_glass"></div>
</div>
`,
                    model: this
                }
            });
            const toolbox = this.toolbox = this.createToolbox();
            this.node.appendChild(toolbox);
            this.node.appendChild(handle);
            const win = this.win = WindowManager.addWindow({
                node: this.node,
                draggable: {
                    node: handle
                }
            });
            win.addNodeToLayer(this.node);
            if (callback) {
                callback(this);
            }
        }
    }

    return Notebook;

}));
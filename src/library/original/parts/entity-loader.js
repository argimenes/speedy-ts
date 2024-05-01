(function (factory) {
    define("parts/entity-loader", ["modals/search-agents", "jquery", "app/helpers", "parts/window-manager", "parts/text-add", "modals/search-texts", "jquery-ui"], factory);
}(function (AgentModal, $, Helper, _WindowManager, QuickAdd, TextModal) {

    const { applyBindings, div } = Helper;
    const WindowManager = _WindowManager.getWindowManager();

    class Component {
        constructor(cons) {
            cons = cons || {};
            cons.handler = cons.handler || {};
            const ratio = .75;
            const ww = window.innerWidth, wh = window.innerHeight;
            const cw = ww * ratio, ch = wh * ratio;
            const cx = (ww / 2) - (cw / 2), cy = (wh / 2) - (ch / 2);
            this.node = div({
                classList: ["text-window"],
                style: {
                    position: "absolute",
                    left: cx + "px",
                    top: cy + "px",
                    width: cw + "px",
                    height: ch + "px",
                    padding: "40px 50px",
                    backdropFilter: "blur(2em)",
                    color: "#fff",
                    backgroundColor: "transparent",
                    zIndex: WindowManager.getNextIndex()
                }
            });
            this.handler = cons.handler;
            this.client = new QuickAdd();
        }
        loadEntity(entityGuid) {
            this.client.loadEntityClicked(entityGuid);
        }
        load() {
            const _this = this;
            $.get("/Static/Templates/Agent/loader-panel-wide.html?v=17", function (html) {
                var modal = new AgentModal({
                    popup: _this.node,
                    tabs: ["search"],
                    currentTab: "search",
                    tab: {
                        search: {
                            filter: {
                                PageRows: 40,
                                Order: "ByDateAdded",
                                Direction: "Descending"
                            }
                        }
                    },
                    handler: {
                        onSelected: function (guid, name) {
                            win.close();
                            if (_this.handler.entitySelected) {
                                _this.handler.entitySelected(guid);
                                return;
                            }
                            _this.loadEntity(guid);
                        },
                        closeClicked: function () {
                            win.close();
                        }
                    }
                });
                modal.start();
                const win = WindowManager.addWindow({
                    type: "entity-loader",
                    node: _this.node,
                    draggable: {
                        node: _this.node
                    }
                });
                const node = applyBindings(html, modal);
                _this.node.appendChild(node);
                document.body.appendChild(_this.node);
                // win.layer.container.appendChild(_this.node);
                win.setDraggable({ handle: _this.node });
            });
        }
    }

    return Component;

}));
(function (factory) {
    define("components/text-search", ["knockout", "parts/window-manager", "app/helpers", "modals/search-texts", "pubsub", "jquery-ui"], factory);
}(function (ko, _WindowManager, Helper, TextModal, pubsub) {

    const WindowManager = _WindowManager.getWindowManager();
    const { div, applyBindings } = Helper;

    class TextLoader {
        constructor(args) {
            args = args || {};
            this.handler = args.handler;
            this.container = null;
            this.window = null;
            this.createContainer();
        }
        createContainer() {
            const _this = this;
            $.get("/Static/Templates/Text/search-panel.html?v=48", function (html) {
                const container = div({
                    classList: ["text-window", "glass-window"],
                    style: {
                        position: "absolute",
                        top: 0,
                        bottom: "43px",
                        left: "-7px",
                        width: "480px",
                        maxWidth: "480px",
                        height: "100%",
                        color: "#fff",
                        padding: "10px 20px",
                        zIndex: 9990
                    }
                });
                const modal = new TextModal({
                    popup: container,
                    tabMode: "search",
                    tab: {
                        search: {
                            filter: {
                                Type: "Document",
                                Order: "ByDateAdded",
                                Direction: "Descending"
                            }
                        }
                    },
                    handler: {
                        onSelected: function (guid) {
                            if (_this.args?.handler?.onSelected) {
                                _this.handler.onSelected(guid);
                                return;
                            }
                            pubsub.publish("load-text-window", { guid: guid, options: { focus: true } });
                        },
                        deleteClicked: (guid) => {
                            $.get("/Admin/Text/DeleteJson", { id: guid });
                        },
                        closeClicked: function () {
                            _this.window.close();
                        }
                    }
                });
                var node = applyBindings(html, modal);
                container.appendChild(node);
                document.body.appendChild(container);
                $(container).draggable();
                $(container).find("[data-role='niceScroll']").niceScroll();
                const win = WindowManager.addWindow({
                    type: "text-search",
                    node: container
                });
                _this.container = container;
                _this.window = win;
            });
        }
    }

    return TextLoader;

}));
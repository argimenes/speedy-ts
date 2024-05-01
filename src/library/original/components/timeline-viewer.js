(function (factory) {
    define("components/timeline-viewer", ["knockout", "jquery", "parts/window-manager", "app/helpers", "pubsub", "knockout/speedy-viewer", "jquery-ui"], factory);
}(function (ko, $, _WindowManager, Helper, pubsub) {

    const WindowManager = _WindowManager.getWindowManager();
    const { div, applyBindings } = Helper;

    class TimelineViewer {
        constructor(cons) {
            this.top = cons.top || 100;
            this.left = cons.left;
            this.right = cons.right;
            this.width = cons.width || 800;
            this.items = ko.observableArray([]);
            this.agent = {
                guid: cons.agent.guid,
                name: cons.agent.name
            };
            this.glass = false;
            this.container = null;
            this.window = null;
            this.setup();
        }
        toggleGlassModeClicked() {
            this.glass = !this.glass;
            if (this.glass) {
                this.container.classList.add("glass-window");

            } else {
                this.container.classList.remove("glass-window");
            }
        }
        textSelected(item) {
            pubsub.publish("load-text-window", { guid: item.TextGuid });
        }
        closeClicked() {
            this.container.remove();
        }
        minimizeClicked() {
            this.window.minimize({ name: "timeline :: " + this.agent.name });
        }
        setupContainer(html) {
            const container = this.container = div({
                classList: ["text-window"],
                style: {
                    position: "absolute",
                    top: this.top + "px",
                    width: this.width + "px",
                    maxHeight: "700px",
                    fontSize: "0.8rem",
                    padding: "20px 20px",
                    zIndex: WindowManager.getNextIndex()
                }
            });
            // if (options.left) {
            //     container.style.left = this.left + "px";
            // } else {
            //     container.style.right = (this.right || 20) + "px";
            // }
            var content = applyBindings(html, this);
            container.appendChild(content);
            $(container).draggable();
            $(container).resizable();
            $(container).niceScroll({ cursorcolor: "#333", horizrailenabled: false });
            this.window = WindowManager.addWindow({
                type: "timeline",
                loader: {
                    params: {
                        guid: this.agent.guid
                    }
                },
                node: container
            });
            this.window.addNodeToLayer(container);
        }
        setup() {
            const _this = this;
            $.get("/Static/Templates/Agent/timeline-panel.html?v=22", function (html) {
                $.get("/Admin/Agent/Timeline", { id: _this.agent.guid }, function (response) {
                    console.log({ response });
                    if (!response.Success) {
                        return;
                    }
                    _this.items(response.Data);
                    _this.setupContainer(html);
                });
            });
        }
    }

    return TimelineViewer;
}));
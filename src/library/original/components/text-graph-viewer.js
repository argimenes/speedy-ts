(function (factory) {
    define("components/text-graph-viewer", ["knockout", "parts/window-manager", "app/helpers", "parts/text-graph", "jquery-ui"], factory);
}(function (ko, _WindowManager, Helper, TextGraph) {

    const WindowManager = _WindowManager.getWindowManager();
    const { div, applyBindings } = Helper;

    class TextGraphViewer {
        constructor(cons) {
            this.guid = cons.guid;
            this.guids = cons.guids;
            this.container = cons.container || document.body;
            this.createWindow();
        }
        createWindow() {
            const panel = div({
                style: {
                    position: "absolute",
                    top: "100px",
                    right: "100px",
                    padding: "20px",
                    width: "850px",
                    zIndex: WindowManager.getNextIndex()
                },
                children: [
                    applyBindings(`
<div class="safari_buttons">
    <div data-bind="click: $data.closeClicked" class="safari_close"></div><div data-bind="click: $data.minimizeClicked" class="safari_minimize"></div><div class="safari_zoom"></div>
</div>
 <div data-role="drag-handle" style="text-align: right;"><span style="text-decoration: underline;" data-bind="click: closeClicked">close</span></div>
 `,
                        {
                            closeClicked: () => {
                                panel.remove();
                                win.close();
                            },
                            minimizeClicked: () => win.minimize()
                        })
                ],
                classList: ["text-window"]
            });
            const node = div({
                style: {
                    backgroundColor: "#fff",
                    width: "850px",
                    height: "450px"
                }
            });
            panel.appendChild(node);
            this.container.appendChild(panel);
            const graph = new TextGraph({
                layout: "cose",
                node: node,
                textGuid: this.guid,
                textGuids: this.guids
            });
            var handle = panel.querySelectorAll("[data-role='drag-handle'")[0]
            $(panel).draggable({ handle: handle });
            var win = WindowManager.addWindow({
                type: "text-graph",
                loader: {
                    params: {
                        guid: this.guid,
                        guids: this.guids
                    }
                },
                node: panel
            });
        }
    }

    return TextGraphViewer;

}));
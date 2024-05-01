(function (factory) {
    define("components/workbook", ["text!/Static/Templates/Component/workbook.html", "jquery", "app/helpers", "knockout", "modals/search-texts", "parts/text-add", "pubsub", "parts/window-manager"], factory);
}(function (_view, $, Helper, ko, SearchTextsModal, TextClient, pubsub, _WindowManager) {

    const { div, applyBindings } = Helper;
    const WindowManager = _WindowManager.getWindowManager();

    class FileItem {
        constructor(cons) {
            this.agent = null;
        }
        isFolder() {
            return this.agent.Type == "Folder";
        }
        toggleFolder() {

        }
    }

    class FolderListing {
        constructor() {
            this.files = ko.observableArray([]);
        }
    }

    class TextPanel {
        constructor() {
            this.state = {
                active: ko.observable()
            };
        }
        saveClicked() {

        }
        loadGraphClicked() {

        }
    }

    const UIMode = {
        "Dark": "Dark",
        "Light": "Light",
        "Glass": "Glass"
    };

    class Workbook {
        constructor(cons) {
            cons = cons || {};
            cons.handler = cons.handler || {};
            this.mode = ko.observable(UIMode.Dark);
            this.container = div({
                style: {
                    position: "absolute",
                    backgroundColor: "#333",
                    color: "#fff",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    zIndex: WindowManager.getNextIndex()
                },
                classList: ["text-window", "workbook"],
                template: {
                    view: _view,
                    model: this
                }
            });
            this.handler = cons.handler;
            this.panels = ko.observableArray([]);
            this.panelsNode = this.container.querySelector("[data-role='panels']");
        }
        closeClicked() {
            this.container.remove();
        }
        minimizeClicked() {

        }
        zoomClicked() {

        }
        focusClicked() {
            this.focus = !this.focus;
        }
        glassClicked() {
            this.glass = !this.glass;
        }
        appendToNode(node) {
            node.appendChild(this.container);
        }
        loadGlobalGraphClicked() {
            console.log("loadGlobalGraphClicked");
        }
        newTextClicked() {
            console.log("newTextClicked");
            const _this = this;
            var client = new TextClient();
            client.loadTextWindow(null, null, {
                onLoaded: (_client) => {
                    _this.panels.push(_client);
                    _this.panelsNode.appendChild(_client.editor.container); /// something like this
                }
            });
        }
        showFolderListingClicked() {
            console.log("showFolderListingClicked");
            var client = new TextClient();
            client.textLoader({

            });
        }
        load() {

        }
    }

    require(["text!/Static/Templates/Component/workbook.html"], (view) => {
        console.log({ view });
    });

    return Workbook;

}));
(function (factory) {
    define("components/toc", ["knockout", "parts/window-manager", "app/helpers"], factory);
}(function (ko, _WindowManager, Helper) {

    const WindowManager = _WindowManager.getWindowManager();
    const { div } = Helper;

    class TOC {
        constructor(cons) {
            this.editor = cons.editor;
            this.layer = cons.layer || document.body;
            this.container = this.createContainer();
            this.window = this.createWindow(this.container);
        }
        createContainer() {
            const _this = this;
            const { editor } = this;
            const sections = editor.data.properties
                .filter(x => x.type == "section" && !x.isDeleted)
                .map(p => { p.text = p.getText(); return p; });
            const rect = editor.container.getBoundingClientRect();
            const x = (rect.x + rect.width + 20);
            const y = rect.y - 20;
            const container = div({
                classList: ["text-window"],
                style: {
                    position: "absolute",
                    left: x + "px",
                    top: y + "px",
                    width: "300px",
                    backgroundColor: "#fff"
                },
                template: {
                    view: `
<div class="safari_buttons">
    <div data-bind="click: $data.closeClicked" class="safari_close"></div><div data-bind="click: $data.toggleGlassModeClicked" class="safari_glass"></div>
</div>
<ul data-bind="foreach: $data.sections"><li style="margin-bottom: 10px;"><span data-bind="text: $data.text, click: $parent.itemClicked"></span></li></ul>
`,
                    model: {
                        sections: ko.observableArray(sections),
                        toggleGlassModeClicked: function () {
                            this.glass = !this.glass;
                            if (this.glass) {
                                _this.container.classList.add("glass-window");

                            } else {
                                _this.container.classList.remove("glass-window");
                            }
                        },
                        itemClicked: (item) => {
                            item.scrollTo();
                        },
                        closeClicked: () => {
                            _this.window.close();
                        }
                    }
                }
            });
            return container;
        }
        createWindow(container) {
            this.layer.appendChild(container);
            var win = WindowManager.addWindow({
                node: container,
                draggable: {
                    node: container
                }
            });
            return win;
        }
    }

    return TOC;

}));
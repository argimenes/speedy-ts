(function (factory) {
    define("parts/word-cloud", ["jquery", "app/helpers", "parts/window-manager", "plugins/jqcloud"], factory);
}(function ($, Helper, _WindowManager) {

    const { div } = Helper;
    const WindowManager = _WindowManager.getWindowManager();

    class Component {
        constructor() {
            this.win = null;
            this.node = null;
            this.words = [];
        }
        close() {
            this.win.close();
        }
        removeWord(word) {
            const i = this.words.findIndex(w => w.text == word);
            this.words.splice(i, 1);
            $(this.node).jQCloud("update", this.words);
        }
        load(args) {
            const { words } = args;
            this.words = words;
            const name = args.name || "<untitled>";
            const settings = args.settings || {};
            const container = args.container || document.body;
            const backgroundColor = settings.backgroundColor || "#fff";
            const x = settings.x || 400;
            const y = settings.y || 200;
            const w = settings.width || 800;
            const h = settings.height || 600;
            const z = settings.z || WindowManager.getNextIndex();
            const panel = div({
                classList: ["text-window"],
                style: {
                    position: "absolute",
                    backgroundColor: backgroundColor,
                    top: y + "px",
                    left: x + "px",
                    width: w + "px",
                    height: h + "px",
                    zIndex: z
                },
                template: {
                    view: `
<div class="safari_buttons">
    <div data-bind="click: $data.closeClicked" class="safari_close"></div>
</div>
<div style="padding: 20px;">
    <p><span style="font-weight: 600;" data-bind="text: $data.name"></span></p>
    <p><span data-bind="text: $data.totalWords"></span> words</p>
</div>
`, model:
                    {
                        name: name,
                        totalWords: words.length,
                        closeClicked: () => {
                            win.close();
                        }
                    }
                }
            });
            const node = this.node = div({
                style: {
                    maxWidth: w + "px",
                    width: w + "px",
                    height: h + "px",
                    marginTop: "-80px"
                }
            });
            panel.appendChild(node);
            container.appendChild(panel);
            $(node).jQCloud(words, {
                shape: 'rectangular'
            });
            var win = this.win = WindowManager.addWindow({
                node: panel,
                draggable: {
                    node: container
                }
            });
            return win;
        }
    }

    return Component;

}));
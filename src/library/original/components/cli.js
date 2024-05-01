(function (factory) {
    define("components/cli", ["knockout", "parts/window-manager", "app/helpers", "pubsub"], factory);
}(function (ko, _WindowManager, Helper, pubsub) {

    const WindowManager = _WindowManager.getWindowManager();
    const { div } = Helper;

    class CLI {
        constructor(cons) {
            this.editor = cons.editor;
            this.caret = this.editor.getCaret();
            const r1 = this.caret.right.getBoundingClientRect();
            const r2 = this.editor.container.getBoundingClientRect();
            const x = r2.x + 40;
            this.x = x;
            this.y = r1.y + r1.height + 10;
            this.w = 675;
            this.h = 150;
            this.z = cons.z;
            this.command = ko.observable();
            this.commands = ko.observableArray([]);
            this.node = this.createNode();
            this.setupEventHandlers();
            this.attachTo(document.body);
        }
        setupEventHandlers() {
            const self = this;
            const ESCAPE = 27;
            const TAB = 9;
            this.node.addEventListener("keydown", (e) => {
                if (e.keyCode == ESCAPE) {
                    self.close();
                }
            });
        }
        handleEscape() {
            this.close();
        }
        closeClicked() {
            this.close();
        }
        close() {
            this.node.remove();
            this.editor.container.focus();
            this.editor.setCarotByNode(this.caret.right, 0);
        }
        attachTo(node) {
            node.appendChild(this.node);
            const input = this.node.querySelector("input");
            input.focus();
        }
        commandSubmitted() {
            const client = this.editor.client;
            const command = this.command();
            if (!command) {
                return;
            }
            this.commands.push(command);
            this.command(null);
            const text = command.toLowerCase();
            if (text == "ner") {
                client.namedEntitiesClicked();
            }
            if (text == "tg") {
                // client.loadTextGraph({ guid: client.model.Guid });
                pubsub.publish("text-client/load-text-graph", { guid: client.model.Guid });
            }
            if (text == "undo") {
                this.editor.undo();
            }
            if (text == "save" || text == "s") {
                pubsub.publish("text-client/" + client.index + "/save-text");
                // client.save();
            }
            if (text == "exit" || text == "x") {
                this.close();
                pubsub.publish("text-client/" + client.index + "/close");
                // client.closeClicked();
            }
        }
        createNode() {
            const x = this.x || 123;
            const y = this.y || 123;
            const w = this.w || 123;
            const h = this.h || 123;
            const z = this.z || WindowManager.getNextIndex();
            const container = div({
                style: {
                    position: "absolute",
                    top: y + "px",
                    left: x + "px",
                    width: w + "px",
                    height: h + "px",
                    zIndex: z
                },
                template: {
                    view: `
<div style="background-color: #333; color: #fff; padding: 10px;">
    <form data-bind="submit: commandSubmitted">
        <input type="text" data-bind="value: command" style="width: 100%; background-color: #333; font-family: Monospace;  height: 20px; color: #fff; font-size: 14px;" />
    </form>
</div>
`,
                    model: this
                }
            });
            return container;
        }
    }

    return CLI;

}));
(function (factory) {
    define("components/clipboard", ["pubsub", "app/helpers"], factory);
}(function (pubsub, Helper) {

    class Clipboard {
        constructor() {
            this.items = [];
        }
        push(item) {
            this.items.push(item);
        }
        pop() {
            return this.items.pop();
        }
        peek() {
            return this.items[this.items.length - 1];
        }
    }
    
    Clipboard.getInstance = function () {
        if (!window.Codex) {
            window.Codex = {};
        }
        if (!window.Codex.Clipboard) {
            window.Codex.Clipboard = new Clipboard();
        }
        return window.Codex.Clipboard;
    };

    return Clipboard;

}));
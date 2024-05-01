(function (factory) {
    define("components/arrow-selector", ["jquery", "knockout", "app/helpers", "parts/window-manager"], factory);
}(function ($, ko, Helper, _WindowManager) {

    const { div, newElement } = Helper;
    const WindowManager = _WindowManager.getWindowManager();

    class ArrowSelector {
        constructor(cons) {
            cons = cons || {};
            cons.handler = cons.handler || {};
            this.editor = cons.editor;
            this.selection = {
                start: null,
                end: null,
                startArrow: null,
                endArrow: null
            };
            this.originalEvent = {};
            this.originalEvent["!CAPSLOCK"] = this.editor.event.keyboard["!CAPSLOCK"];
            this.originalEvent["!ESCAPE"] = this.editor.event.keyboard["!ESCAPE"];
            this.handler = cons.handler;
            this.setup();
        }
        addHandler(name, handler) {
            this.handler[name] = handler;
        }
        setup() {
            this.attachHandlers();
        }
        attachHandlers() {
            const _this = this;
            this.editor.event.keyboard["!CAPSLOCK"] = (args) => { _this.handleCapslock(args) };
            this.editor.event.keyboard["!ESCAPE"] = (args) => { _this.clear() };
        }
        detachHandlers() {
            this.editor.event.keyboard["!CAPSLOCK"] = this.originalEvent["!CAPSLOCK"];
            this.editor.event.keyboard["!ESCAPE"] = this.originalEvent["!ESCAPE"];
        }
        getMiddle(left, right, offset) {
            if (!left && !right) {
                return null;
            }
            if (!right) {
                return left.speedy.offset.x + left.speedy.offset.w - offset;
            }
            return right.speedy.offset.x - offset;
        }
        createArrow(caret) {
            const { right, left } = caret;
            const x = this.getMiddle(left, right, 3),
                y = right.speedy.offset.cy + 5; // + right.speedy.offset.h + 8;
            var arrow = newElement("DIV", {
                style: {
                    position: "absolute",
                    color: "red",
                    top: y + "px",
                    left: x + "px",
                    zIndex: 900
                },
                innerHTML: `<i style="width: 10px;" class="fas fa-caret-up"></i>`,
            });
            arrow.speedy = {
                role: 0,
                stream: 1
            };
            return arrow;
        }
        clear() {
            if (!this.selection.end || !this.selection.start) {
                return;
            }
            this.selection.start = null;
            this.selection.end = null;
            this.selection.startArrow.remove()
            this.selection.startArrow = null;
            this.selection.endArrow.remove();
            this.selection.endArrow = null;

        }
        handleCapslock(args) {
            const { caret } = args;
            const arrow = this.createArrow(caret);
            if (this.selection.start && this.selection.end) {
                this.editor.clearSelection();
                this.clear();
            }
            if (!this.selection.start) {
                this.selection.start = caret.right;
                this.selection.startArrow = arrow;
            } else {
                if (caret.right.speedy.index > this.selection.start.speedy.index) {
                    this.selection.end = caret.left;
                    this.selection.endArrow = arrow;
                }
                else {
                    this.selection.end = this.selection.start;
                    this.selection.start = caret.right;
                    this.selection.endArrow = arrow;
                }
            }
            this.editor.container.appendChild(arrow);
            if (this.selection.start && this.selection.end) {
                const start = this.selection.start;
                const end = this.selection.end;
                this.createSelection(start, end);
                this.clear();
            }
        }
        removeHandler(key) {
            if (this.handler[key]) {
                this.handler[key] = null;
            }
        }
        createSelection(start, end) {
            this.editor.createSelection(start, end);
            if (this.handler.onSelection) {
                this.handler.onSelection({ start, end, editor: this.editor });
            }
        }
        getRangeCells() {
            var current = this.selection.start.speedy.next;
            var cells = [];
            var loop = true;
            while (loop) {
                cells.push(current);
                if (current.speedy.next == this.selection.end) {
                    loop = false;
                    continue;
                }
            }
            return cells;
        }
    }

    return ArrowSelector;

}));
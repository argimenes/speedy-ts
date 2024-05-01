define("bindings/text-window", ["jquery", "knockout", "app/helpers", "pubsub", "parts/window-manager"], function ($, ko, Helper, pubsub, _WindowManager) {

    const { applyBindings, div, groupBy, newElement, updateElement, distinct, openModal } = Helper;
    const WindowManager = _WindowManager.getWindowManager();
    const Bindings = {};

    Bindings["control-LEFT-ARROW"] = (args) => {
        const { editor, caret } = args;
        const { container } = caret;
        const ci = container.speedy.startNode.speedy.index;
        const ri = caret.right.speedy.index;
        const i = ri - ci;
        const { cells, text } = editor.getTextBlockData(container);
        const leftText = text.substr(0, i);
        const wordRanges = editor.getWordsFromText(leftText);
        const len = wordRanges.length;
        if (len == 0) {
            return;
        }
        const ei = len - 1;
        const word = wordRanges[ei];
        const wordStartNode = cells.find(c => c.speedy.index == word.startIndex + ci);
        editor.setCarotByNode(wordStartNode, 0);
    };

    Bindings["control-Z"] = (data) => {
        const { editor } = data;
        editor.undo();
    };

    Bindings["control-Y"] = (data) => {
        const { editor } = data;
        const caret = editor.getCaret();
        const anchorNode = caret.right || caret.left;
        const textBlock = editor.getCurrentContainer(anchorNode);
        editor.removeTextBlock(textBlock);
    };

    Bindings["click"] = (data) => {
        const { editor, e } = data;
        const { client } = editor;
        if (client.contextMenu && client.contextMenu.active) {
            client.contextMenu.close();
        }
        if (editor.monitors.length) {
            const monitorBar = editor.monitors[0];
            if (monitorBar) {
                if (monitorBar.active) {
                    const monitor = monitorBar.monitor;
                    monitorBar.active = false;
                    updateElement(monitor, {
                        style: {
                            display: "none"
                        }
                    });
                    monitorBar.caretUp.remove();
                }
            }
        }
    };

    Bindings["shift-DELETE"] = (args) => {
        const { editor } = args;
        const caret = editor.getCaret();
        const mostRecent = editor.getMostRecentEnclosingProperty(caret.right);
        if (!mostRecent) {
            return;
        }
        mostRecent.remove();
    };

    Bindings["control-["] = (data, client) => {
        client.interceptor.handleControlSquareBracket();
    };

    Bindings["control-9"] = (data, client) => {
        client.interceptor.handleControlRoundBracket();
    };

    Bindings["control-RIGHT-ARROW"] = (args) => {
        console.log("control-RIGHT-ARROW", { args });
        const { editor, caret } = args;
        const { container } = caret;
        const ci = container.speedy.startNode.speedy.index;
        const ri = caret.right.speedy.index;
        const i = ri - ci;
        const { cells, text } = editor.getTextBlockData(container);
        const rightText = text.substring(i);
        const wordRanges = editor.getWordsFromText(rightText);
        const len = wordRanges.length;
        if (len <= 1) {
            return;
        }
        const word = wordRanges[1];
        const wordStartNode = cells.find(c => c.speedy.index == word.startIndex + ri);
        editor.setCarotByNode(wordStartNode, 0);
    };

    Bindings["control-UP-ARROW"] = (args) => {
        const { editor, caret } = args;
        const { container } = caret;
        const current = caret.left || caret.right;
        const currentOffsetY = current.speedy.offset.y;
        if (caret.blockPosition != "START") {
            let startNode = container.speedy.startNode;
            let deltaY = startNode.speedy.offset.y - currentOffsetY;
            editor.setCarotAndScroll(startNode, 0, false, deltaY);
        } else {
            const previousTextBlock = container.speedy.previousTextBlock;
            if (previousTextBlock) {
                let startNode = previousTextBlock.speedy.startNode;
                let deltaY = startNode.speedy.offset.y - currentOffsetY;
                editor.setCarotAndScroll(startNode, 0, false, deltaY);
            }
        }
    };

    Bindings["control-DOWN-ARROW"] = (args) => {
        const { editor, caret } = args;
        const { container } = caret;
        const current = caret.left || caret.right;
        const currentOffsetY = current.speedy.offset.y;
        const nextTextBlock = container.speedy.nextTextBlock;
        if (nextTextBlock) {
            let startNode = nextTextBlock.speedy.startNode;
            let deltaY = startNode.speedy.offset.y - currentOffsetY;
            editor.setCarotAndScroll(startNode, 0, true, deltaY);
        } else {
            ;
            let endNode = container.speedy.endNode;
            let deltaY = endNode.speedy.offset.y - currentOffsetY;
            editor.setCarotAndScroll(endNode, 1, true, deltaY);
        }
    };

    Bindings["control-shift-P"] = (args) => {
        require(["components/syntax-visualiser"], function (SyntaxVisualiser) {
            const { editor } = args;
            const model = new SyntaxVisualiser({ editor });
        });
    };

    Bindings["control-F"] = (data) => {
        require(["parts/minimap"], (Minimap) => {
            const { editor } = data;
            class TextSearchItem {
                constructor(cons) {
                    this.text = ko.observable(cons.text);
                    this.count = ko.observable(cons.count);
                    this.selected = ko.observable();
                    this.highlighted = ko.observable();
                    this.initial = ko.observable();
                    this.colour = ko.observable();
                }
            }
            class TextSearch {
                constructor(cons) {
                    this.editor = cons.editor;
                    this.cell = cons.cell;
                    this.node = this.createNode();
                    this.model = {
                        search: ko.observable()
                    };
                    this.arrow = ko.observable("text");
                    this.showOnlySelectedRows = ko.observable(false);
                    this.headingColour = ko.observable("text");
                    this.items = ko.observableArray([]);
                    this.originalEvent["!ESCAPE"] = this.editor.event.keyboard["!ESCAPE"];
                    this.concertina = false;
                    this.minimap = new Minimap({
                        editor: this.editor,
                        container: this.editor.container
                    });
                    if (cons.container) {
                        cons.container.appendChild(this.node);
                    }
                }
                toggleSurroundingBlocks(item) {

                }
                sortTotalClicked() {

                }
                sortTextClicked() {

                }
                closeClicked() {
                    this.close();
                }
                minimizeClicked() {

                }
                highlightClicked(item, e) {

                }
                itemLeave(item) {
                    if (this.concertina) {
                        return;
                    }
                    item.highlighted(false);
                    const mentions = editor.data.properties.filter(x => x.value == item.entity.Guid);
                    mentions.forEach(p => p.unhighlightWithClass("text-highlight"));
                    const highlight = false || item.selected();
                    const guid = item.entity.Guid;
                    this.toggleMarkers(highlight, guid, false);
                }
                itemEnter(item) {
                    if (this.concertina) {
                        return;
                    }
                    item.highlighted(true);
                    const mentions = this.editor.data.properties.filter(x => x.value == item.entity.Guid);
                    mentions.forEach(p => p.highlightWithClass("text-highlight"));
                    const highlight = true;
                    const guid = item.entity.Guid;
                    this.toggleMarkers(highlight, guid, item.selected());
                }
                toggleMarkers(highlight, entityGuid, glow) {
                    if (highlight) {
                        this.minimap.showMarkers(entityGuid, glow)
                    } else {
                        this.minimap.hideMarkers(entityGuid);
                    }
                }
                clearClicked() {

                }
                toggleGlassModeClicked() {
                    this.glass = !this.glass;
                    if (this.glass) {
                        this.editor.container.classList.add("glass-window");

                    } else {
                        this.editor.container.classList.remove("glass-window");
                    }
                }
                addToContainer(container) {
                    container.appendChild(this.node);
                }
                createNode() {
                    const anchor = this.cell;
                    const h = 50, margin = 10;
                    const x = anchor.speedy.offset.x;
                    const y = anchor.speedy.offset.cy - h - margin;
                    const node = div({
                        classList: ["text-window"],
                        style: {
                            position: "absolute",
                            top: y + "px",
                            padding: 10,
                            backgroundColor: "#fff",
                            "box-shadow": "0 6px 6px -2px gray",
                            left: x,
                            zIndex: WindowManager.getNextIndex()
                        },
                    });
                    return node;
                }
                close() {
                    this.resetEventHandlers();
                }
                setEventHandlers() {
                    const _this = this;
                    this.editor.event.keyboard["!ESCAPE"] = () => _this.handleEscape();
                }
                handleEscape() {
                    this.close();
                }
                resetEventHandlers() {
                    this.editor.event.keyboard["!ESCAPE"] = this.originalEvent["!ESCAPE"];
                }
                removeItemClicked(item) {
                    this.items.remove(item);
                    return true;
                }
                searchClicked() {
                    this.search();
                }
                addToHistory(item) {
                    this.items.push(item);
                }
                toggleShowOnlySelectedRows() {
                    const show = this.showOnlySelectedRows();
                    this.showOnlySelectedRows(!show);
                }
                search() {
                    const search = this.model.search();
                    const data = editor.unbind();
                    const matches = getMatches({ text: data.text, search: this.search() });
                    this.addToHistory({ search, count: matches.length });
                }
            }
            const caret = editor.getCaret();
            const model = new TextSearch({
                editor: editor,
                cell: caret.right,
                container: editor.container
            });
        });
    };

    return Bindings;

});
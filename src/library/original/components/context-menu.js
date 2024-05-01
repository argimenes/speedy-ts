(function (factory) {
    define("components/context-menu", ["jquery", "parts/window-manager", "app/helpers"], factory);
}(function ($, _WindowManager, Helper) {

    const WindowManager = _WindowManager.getWindowManager();
    const { div, updateElement, applyBindings } = Helper;

    class ContextMenu {
        constructor(cons) {
            this.editor = cons.editor;
            this.event = cons.event;
            this.node = this.createNode();
            this.layer = cons.layer || document.body;
            this.layer.appendChild(this.node);
            this.active = true;
        }
        close() {
            this.editor.clearSelection();
            this.active = false;
            this.node.style.display = "none";
        }
        open(args) {
            this.active = true;
            this.node.style.display = "block";
            updateElement(this.node, {
                style: {
                    display: "block",
                    left: args.x + "px",
                    top: args.y + "px",
                    zIndex: WindowManager.getNextIndex() + 1
                }
            });
        }
        createNode() {
            const _this = this;
            const { editor } = this;
            const node = div({
                style: {
                    position: "absolute",
                    display: "none",
                    padding: "10px 10px",
                    backgroundColor: "rgb(128, 128, 128, 0.5)",
                    backdropFilter: "blur(4px)",
                    borderRadius: "3px"
                }
            });
            node.speedy = {
                role: 1,
                stream: 1
            };
            $(node).draggable();
            $.get("/Static/Templates/Text/context-menu.html?v=10", function (html) {
                var content = applyBindings(html,
                    {
                        entityClicked: () => {
                            editor.createProperty("agent");
                            // editor.createProperty("agent", null, e.target.parentNode.parentNode.range);
                        },
                        traitClicked: () => {
                            editor.createProperty("trait");
                        },
                        eventClicked: () => {
                            editor.createProperty("claim");
                        },
                        relationClicked: () => {
                            editor.createProperty("metaRelation");
                        },
                        boldClicked: () => {
                            editor.createProperty("bold");
                        },
                        colourSelected: () => {

                        },
                        rainbowClicked: () => {
                            editor.createProperty("rainbow");
                        },
                        italicsClicked: () => {
                            // editor.createProperty("italics", null, e.target.parentNode.parentNode.range);
                            editor.createProperty("italics");
                        },
                        strikeClicked: () => {
                            editor.createProperty("strike-through");
                        },
                        fontClicked: () => {
                            editor.client.fontClicked();
                        },
                        h1Clicked: () => {
                            editor.createProperty("h1");
                        },
                        h2Clicked: () => {
                            editor.createProperty("h2");
                        },
                        h3Clicked: () => {
                            editor.createProperty("h3");
                        },
                        intralinearClicked: () => {
                            const p = editor.createZeroPointProperty("intralinear");
                            const type = editor.propertyType.intralinear;
                            type.animation.init(p);
                        },
                        listItemClicked: () => {
                            const item = editor.createBlockProperty2({ type: "list/item" });
                            const list = editor.createParentBlockProperty("list", item);
                            item.parent = list;
                        },
                        rightClicked: () => {
                            editor.createBlockProperty("alignment/right");
                        },
                        justifyClicked: () => {
                            editor.createBlockProperty("alignment/justify");
                        },
                        leftClicked: () => {
                            editor.createBlockProperty("alignment/left");
                        },
                        centerClicked: () => {
                            editor.createBlockProperty("alignment/center");
                        },
                        winkClicked: () => {
                            const p = editor.createZeroPointProperty("wink");
                            const wink = editor.propertyType.wink;
                            wink.animation.init(p);
                            wink.animation.start(p);
                        },
                        rectangleClicked: () => {
                            editor.createProperty("rectangle");
                        },
                        transclusionClicked: () => {
                            editor.createProperty("source_of_intertext");
                        },
                        close: function () {
                            _this.close();
                        },
                        searchTextBlocks: function () {
                            const selection = editor.getSelectionNodes();
                            const text = editor.getRangeText(selection);
                            this.close();
                            require(["parts/search-text-blocks"], function (SearchTextBlocks) {
                                (async () => {
                                    const search = new SearchTextBlocks({
                                        filter: {
                                            text: text
                                        }
                                    });
                                    await search.load();
                                    if (text) {
                                        search.search();
                                    }
                                })();
                            });
                        }
                    });
                node.appendChild(content);
            });
            return node;
        }
    }

    return ContextMenu;

}));
(function (factory) {
    define("components/outliner", ["jquery", "app/helpers", "knockout", "modals/search-texts", "components/outliner-text-block", "pubsub", "parts/window-manager"], factory);
}(function ($, Helper, ko, TextModal, TextBlock, pubsub, _WindowManager) {

    const { div } = Helper;
    const WindowManager = _WindowManager.getWindowManager();
    let _index = 0;
    const nextIndex = () => {
        return _index++;
    };
    const last = (arr) => {
        if (!arr || arr.length == 0) {
            return null;
        }
        const len = arr.length;
        return arr[len - 1];
    };
    const BlockType = {
        "Text": "Text",
        "Image": "Image",
        "Video": "Video"
    };

    class Block {
        constructor(args) {
            const _this = this;
            args = args || {};
            this.index = nextIndex();
            this.type = args.type || BlockType.Text;
            this.outliner = args.outliner;
            this.textGuid = args.textGuid;
            this.blockGuid = args.blockGuid;
            this.indent = args.indent || 0;
            this.parent = args.parent;
            this.children = args.children || [];
            this.previous = args.previous;
            this.next = args.next;
            this.isFocus = ko.observable(false);
            this.collapsed = ko.observable(false);
            this.isDeleted = false;
            this.container = args.container || document.body;
            // data-bind="style: { 'border': $data.isFocus() ? '1px solid red' : 'none' }"
            this.node = div({
                classList: ["block-item"],
                template: {
                    view: `
<div>
    <div>
        <div class="text-block" contenteditable spellcheck="false" data-role="editor"></div>
    </div>
    <!-- <div style="display: inline-block;">
        <button type="button" data-bind="click: $data.saveClicked"><img src="/Images/icons/diskette.svg" style="width: 15px; height: 15px;" /></button>
        <button type="button" data-bind="click: $data.indentClicked"><i class="fas fa-indent"></i></button>
        <button type="button" data-bind="click: $data.outdentClicked"><i class="fas fa-outdent"></i></button>
        <button type="button" data-bind="click: $data.toggleCollapse"><i data-bind="css: $data.collapsed() ? 'far fa-caret-square-up' : 'far fa-caret-square-down'"></i></button>
        <button type="button" data-bind="click: $data.removeClicked"><i class="far fa-trash-alt"></i></button>
    </div> -->
</div>
`,
                    model: this
                }
            });
            this.editorClient = this.createEditorClient(this.node);
            this.setup();
        }
        setup() {
            this.setupEventHandlers();
        }
        setupEventHandlers() {
            const _this = this;
            pubsub.subscribe("outliner/clear-focus", (__, block) => {
                if (_this == block) {
                    return;
                }
                _this.blur();
            });
        }
        toggleCollapse() {
            this.collapsed(!this.collapsed());
            if (this.collapsed()) {
                this.collapse()
            } else {
                this.expand();
            }
        }
        collapse() {
            this.children.forEach(c => c.node.style.display = "none");
        }
        expand() {
            this.children.forEach(c => c.node.style.display = "block");
        }
        blur() {
            this.editorClient.editor.container.blur();
            this.isFocus(false);
            this.node.classList.remove("block-focus");
        }
        createEditorClient(wrapper) {
            const _this = this;
            const node = wrapper.querySelector("[data-role='editor']");
            node.style.padding = "0 !important";
            node.style.margin = 0;
            //node.style.borderBottom = "1px solid #ccc";
            node.style.width = "100%";
            var client = new TextBlock({
                container: node,
                outlinerBlock: this,
                model: {
                    Type: "OutlinerBlockItem"
                },
                chromeless: true,
                handler: {
                    onEnterPressed: (args) => {
                        args.outlinerBlock.onEnterPressed(args);
                    },
                    onShiftEnterPressed: (args) => {
                        args.outlinerBlock.onShiftEnterPressed(args);
                    },
                    onClick: (args) => {
                        const { caret } = args;
                        args.outlinerBlock.focusOnCell(caret.right);
                    },
                    onAfterMarkedInterval: (args) => {
                        args.outlinerBlock.onAfterMarkedInterval(args);
                    },
                    onTabPressed: (args) => {
                        args.outlinerBlock.indentBlock();
                    },
                    onShiftTabPressed: (args) => {
                        args.outlinerBlock.outdentBlock();
                    },
                    onBackspaceAtBlockStartPressed: (args) => {
                        args.outlinerBlock.onBackspaceAtBlockStartPressed();
                    },
                    onDeleteAtBlockEndPressed: (args) => {
                        args.outlinerBlock.onDeleteAtBlockEndPressed();
                    },
                    onShiftDeletePressed: (args) => {
                        args.outlinerBlock.remove();
                    },
                    onLeftArrowPressed: (args) => {
                        args.outlinerBlock.onLeftArrowPressed(args);
                    },
                    onRightArrowPressed: (args) => {
                        args.outlinerBlock.onRightArrowPressed(args);
                    },
                    onUpArrowPressed: (args) => {
                        args.outlinerBlock.onUpArrowPressed(args);
                    },
                    onDownArrowPressed: (args) => {
                        args.outlinerBlock.onDownArrowPressed(args);
                    }
                }
            });
            client.setupEditor({
                container: node
            });
            client.editor.bind({
                text: "", properties: []
            });
            return client;
        }
        onAfterMarkedInterval() {
            this.editorClient.save((textGuid) => {
                // TBC
            });
        }
        focusOnCell(caretRight) {
            if (!caretRight.speedy) {
                this.focus({ offsetX: caretRight.offsetLeft });
                return;
            }
            this.editorClient.editor.setCarotByNode(caretRight, 0);
        }
        focus(args) {
            args = args || {};
            const { offsetX, verticalPosition, atStart, atEnd } = args;
            pubsub.publish("outliner/clear-focus", this);
            this.isFocus(true);
            if (atStart || atEnd) {
                if (atStart) {
                    this.editorClient.editor.setCarotToDocumentStart();
                }
                if (atEnd) {
                    this.editorClient.editor.setCarotToDocumentEnd();
                }
            } else {
                this.editorClient.editor.setCarotByOffsetX({ x: offsetX || 0, verticalPosition: verticalPosition || "TOP" });
            }
            this.node.classList.add("block-focus");
            this.setCurrentBlock();
        }
        setEditor(data) {
            this.editorClient.editor.bind(data);
        }
        onEnterPressed() {
            if (this.next) {
                const editor = this.next.editorClient.editor;
                const data = editor.unbind();
                if (data.text.length == 0) {
                    this.next.focusAtStart();
                    return;
                }
            }
            this.addSibling();
        }
        focusAtStart() {
            this.focus({ atStart: true });
        }
        focusAtEnd() {
            this.focus({ atEnd: true });
        }
        getNextBlockFromSequence(block) {
            return this.outliner.getNextBlockFromSequence(block || this);
        }
        getPreviousBlockFromSequence(block) {
            return this.outliner.getPreviousBlockFromSequence(block || this);
        }
        onLeftArrowPressed(args) {
            const previousOnScreen = this.getPreviousBlockFromSequence();
            if (!previousOnScreen) {
                return;
            }
            previousOnScreen.focusAtEnd();
        }
        onRightArrowPressed(args) {
            const nextOnScreen = this.getNextBlockFromSequence();
            if (!nextOnScreen) {
                return;
            }
            nextOnScreen.focusAtStart();
        }
        onDownArrowPressed(args) {
            const { caret } = args;
            const nextOnScreen = this.getNextBlockFromSequence();
            if (!nextOnScreen) {
                return;
            }
            const offsetX = caret.right.speedy.offset.x;
            nextOnScreen.focus({ offsetX, verticalPosition: "TOP" });
        }
        onUpArrowPressed(args) {
            const { caret } = args;
            const previousOnScreen = this.getPreviousBlockFromSequence();
            if (!previousOnScreen) {
                return;
            }
            const offsetX = caret.right.speedy.offset.x;
            previousOnScreen.focus({ offsetX, verticalPosition: "BOTTOM" });
        }
        onShiftEnterPressed() {
            this.addChild();
        }
        addSiblingClicked() {
            this.addSibling();
        }
        createBlock(args) {
            var block = new Block({ ...args, outliner: this.outliner });
            return block;
        }
        addToParentChildrenArray(newBlock, previousBlock) {
            if (!this.parent) {
                return;
            }
            const len = this.parent.children;
            const isFirst = (len == 0);
            const pbi = this.parent.children.indexOf(previousBlock);
            const isLast = (pbi == (len - 1));
            if (isFirst || isLast) {
                this.parent.children.add(newBlock);
            } else {
                this.parent.children.splice(pbi + 1, 0, newBlock);
            }
        }
        addSibling() {
            var next = this.createBlock({
                container: this.container,
                indent: this.indent,
                parent: this.parent,
                previous: this,
                next: this.next
            });
            if (this.next) {
                this.next.previous = next;
            }
            this.addToParentChildrenArray(next, this);
            if (this.node.nextElementSibling) {
                this.container.insertBefore(next.node, this.node.nextElementSibling);
            } else {
                this.container.appendChild(next.node);
            }
            this.addBlockToSequence(next);
            this.next = next;
            this.next.focusAtStart();
        }
        addBlockToSequence(newBlock) {
            this.outliner.addBlockToSequence(this, newBlock);
        }
        addChild() {
            const child = this.createBlock({
                container: this.node,
                indent: this.indent + 1,
                parent: this
            });
            this.addBlockToSequence(child);
            const hasChildren = this.children.length;
            if (hasChildren) {
                const firstChild = this.children[0].node;
                this.node.insertBefore(child.node, firstChild);
            } else {
                this.node.appendChild(child.node);
            }
            this.children.push(child);
            child.focusAtStart();
        }
        addChildClicked() {
            this.addChild();
        }
        getCurrentBlock() {
            return this.outliner.currentBlock;
        }
        setCurrentBlock() {
            this.outliner.setCurrentBlock(this);
        }
        saveClicked() {
            this.save();
        }
        save(callback) {
            // talk to the API ...
            const _this = this;
            const data = this.editorClient.editor.unbind();
            const properties = JSON.stringify(data.properties);
            const params = {
                textGuid: this.editorClient.model.Guid(),
                value: data.text,
                properties: properties
            };
            $.push("/Admin/Text/SaveEditorJson", params, response => {
                console.log("/Admin/Text/SaveEditorJson", { response });
                if (!response.Success) {
                    return;
                }
                const textGuid = _this.textGuid = response.Data;
                if (callback) {
                    callback();
                }
            });
        }
        indentClicked() {
            this.indentBlock();
        }
        indentBlock() {
            /*
             * Makes a sibling into the child of the previous sibling.
             */
            if (!this.previous) {
                return;
            }
            if (this.previous.children.length) {
                return;
            }
            this.parent = this.previous;
            this.previous.next = this.next;
            this.previous.node.appendChild(this.node);
            this.previous.children.push(this);
            this.container = this.previous.node;
            this.previous = null;
            this.next = null;
            this.focusAtStart();
        }
        outdentClicked() {
            this.outdentBlock();
        }
        outdentBlock() {
            /*
             * Makes a child into the sibling of its parent.
             */
            if (!this.parent) {
                return;
            }
            if (this.previous) {
                return;
            }
            this.previous = this.parent;
            if (this.previous.next) {
                this.previous.container.insertBefore(this.node, this.previous.next.node);
            } else {
                this.previous.container.appendChild(this.node);
            }
            this.parent = this.previous.parent;
        }
        updateBranch(setter) {
            console.log("updateBranch: " + this.index);
            setter(this);
            this.children.forEach(c => c.updateBranch(setter));
            if (this.next) {
                this.next.updateBranch(setter);
            }
        }
        moveUp() {
            //const previousOnScreen = this.outliner.getPreviousBlockFromSequence(this);
            //if (!previousOnScreen) {
            //    return;
            //}
            //previousOnScreen.container.insertBefore(this.node, previousOnScreen.node);
            //this.container = previousOnScreen.container;
            //this.previous = previousOnScreen;
            //this.next = previousOnScreen.next;
        }
        moveDown() {
            // first check boundaries
            this.previous = this.next;
            this.next = this.next.next;
            // update DOM position of this.node
        }
        onBackspaceAtBlockStartPressed() {
            if (this.editorClient.editor.isDocumentEmpty()) {
                const next = this.next;
                this.remove();
                if (this.isActive(next)) {
                    this.setCurrentBlock(next);
                    next.focusAtStart();
                }
                const previous = this.previous;
                if (this.isActive(previous)) {
                    this.setCurrentBlock(previous);
                    previous.focusAtEnd();
                }
                return;
            }
            if (this.isActive(this.previous)) {
                if (this.previous.editorClient.editor.isDocumentEmpty()) {
                    this.previous.remove();
                    return;
                } else {
                    this.mergeBlocks(this, this.previous);
                }
                return;
            }
            if (this.isActive(this.parent)) {
                if (this.parent.editorClient.editor.isDocumentEmpty()) {
                    // move the child up to the parent level
                }
            }
            //const target = this.previous || this.parent;
            //if (!target) {
            //    return;
            //}
            //const source = this;
            //this.mergeBlocks(source, target);
        }
        isActive(block) {
            return block && !block.isDeleted;
        }
        onDeleteAtBlockEndPressed() {
            const target = this.next;
            if (!target) {
                return;
            }
            const source = this;
            this.mergeBlocks(target, source);
        }
        mergeBlocks(source, target) {
            const sourceData = source.editorClient.editor.unbind();
            const targetEditor = target.editorClient.editor;
            const targetData = targetEditor.unbind();
            const targetLen = targetData.text.length;
            const targetProperties = sourceData.properties.map(p => { return { ...p, startIndex: p.startIndex + targetLen, endIndex: p.endIndex + targetLen }; });
            const mergedData = {
                text: targetData.text + sourceData.text,
                properties: targetProperties
            };
            targetEditor.bind(mergedData);
            source.remove();
            this.setCurrentBlock(target);
            target.focusAtStart();
        }
        removeClicked() {
            this.remove();
        }
        remove() {
            // talk to the API ...
            this.isDeleted = true;
            this.node.style.display = "none";
            if (this.next) {
                this.next.focusAtStart(true);
            }
        }
    }

    class Outliner {
        constructor(args) {
            const _this = this;
            this.container = args.container || document.body;
            const dockHeight = 50;
            const height = window.innerHeight - dockHeight;
            this.node = div({
                classList: ["text-window"],
                style: {
                    position: "absolute",
                    top: 0,
                    left: 0,
                    backgroundColor: "#fff",
                    padding: "100px 300px",
                    width: "1370px",
                    height: height + "px",
                    zIndex: WindowManager.getNextIndex()
                },

            });
            const header = div({
                template: {
                    view: `
<div class="safari_buttons" data-role="handle" style="margin-bottom: 20px;">
    <div data-bind="click: $data.closeClicked" class="safari_close"></div>
    <div data-bind="click: $data.minimizeClicked" class="safari_minimize"></div>
    <div data-bind="click: $data.zoomClicked" class="safari_zoom"></div>
    <div data-bind="click: $data.focusClicked" class="safari_focus"></div>
    <div data-bind="click: $data.toggleGlassModeClicked" class="safari_glass"></div>
</div>`,
                    model: {
                        focusClicked: function () {
                            this.focus = !this.focus;
                            if (this.focus) {
                                _this.win.focus();
                            } else {
                                _this.win.unfocus();
                            }
                        },
                        toggleGlassModeClicked: function () {
                            this.glass = !this.glass;
                            if (this.glass) {
                                _this.node.classList.add("glass-window");
                                _this.node.style.backdropFilter = "blur(1px)";

                            } else {
                                _this.node.classList.remove("glass-window");
                            }
                        },
                        closeClicked: function () {
                            _this.win.close();
                        },
                        minimizeClicked: function () {
                            _this.win.minimize();
                        },
                        zoomClicked: function () {
                            // to do
                        }
                    }
                }
            });
            const blockNode = div({});
            this.root = new Block({
                outliner: this,
                container: blockNode
            });
            blockNode.appendChild(this.root.node);
            this.sequence = [this.root];
            this.currentBlock = this.root;
            this.node.appendChild(header);
            this.node.appendChild(blockNode);
            this.container.appendChild(this.node);
            const handle = this.node.querySelector("[data-role='handle']");
            this.win = WindowManager.addWindow({
                type: "outliner",
                node: this.node,
                draggable: {
                    node: handle
                }
            });
            this.win.addNodeToLayer(this.node);
            this.currentBlock.focusAtStart();
        }
        setup() {

        }
        getActiveItemsFromSequence() {
            const items = this.sequence.filter(b => !b.isDeleted && !b.collapsed());
            return items;
        }
        getNextBlockFromSequence(block) {
            const items = this.getActiveItemsFromSequence();
            if (items.length == 0) {
                return null;
            }
            const bi = items.indexOf(block);
            if (bi >= items.length - 1) {
                return null;
            }
            return items[bi + 1];
        }
        getPreviousBlockFromSequence(block) {
            const items = this.getActiveItemsFromSequence();
            if (items.length == 0) {
                return null;
            }
            const bi = items.indexOf(block);
            if (bi <= 0) {
                return null;
            }
            return items[bi - 1];
        }
        addBlockToSequence(previousBlock, newBlock) {
            const startBlock = this.getLastChildOrSelf(previousBlock);
            const len = this.sequence.length;
            const isFirstItem = (len == 0);
            if (isFirstItem) {
                this.sequence.push(newBlock);
                return;
            }
            const sbi = this.sequence.indexOf(startBlock);
            const notFound = sbi < 0;
            if (notFound) {
                return;
            }
            const isLastItem = (sbi == len - 1);
            if (isLastItem) {
                this.sequence.push(newBlock);
                return;
            }
            this.sequence.splice(sbi + 1, 0, newBlock);
        }
        recalculateSequence() {

        }
        getLastChildOrSelf(block) {
            if (block.children.length == 0) {
                return block;
            }
            return this.getLastChildOrSelf(
                last(block.children));
        }
        updateTree(setter) {
            this.root.updateBranch(setter);
        }
        setCurrentBlock(block) {
            this.currentBlock = block;
            this.sequence.forEach(b => b.node.classList.remove("current-outliner-text-block"));
            this.currentBlock.node.classList.add("current-outliner-text-block");
        }
        setupEventHandlers() {

        }
    }

    return Outliner;

}));
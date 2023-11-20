    var selections: any[] = [];

    const debugNextPrevious = false;
    const debugChainBreaks = true;
    const debugChainBreakInterval = 300;
    var chainBreakListenerPaused = false;
    const EOL = debugNextPrevious ? "¶" : String.fromCharCode(13); //String.fromCharCode(13); // "¶";
    const EOF = String.fromCharCode(13);
    const ZWJ = String.fromCharCode(8203);
    const NBSP = "&nbsp;"; // String.fromCharCode(160);
    const debugLayout = false;
    const CARET = {
        RIGHT: 1,
        LEFT: 0
    };
    const TEXT_STREAM = {
        IN: 0,
        OUT: 1
    };
    const ELEMENT_ROLE = {
        CELL: 0,
        INNER_STYLE_BLOCK: 1,
        ROOT: 2,
        CELL_STYLE: 3,
        TEXT_BLOCK: 4,
        OUTER_STYLE_BLOCK: 5
    };
    const BLOCK_POSITION = {
        "INSIDE": "INSIDE",
        "START": "START",
        "END": "END",
        "EMPTY_LINE": "EMPTY_LINE"
    };
    const SELECTION_DIRECTION = {
        LEFT: 0,
        RIGHT: 1
    };
    const DIRECTION = {
        "LEFT": "LEFT",
        "RIGHT": "RIGHT"
    };

    const not = (arr: any[]) => false == arr.some(x => x);
    const BACKSPACE = 8,
        CAPSLOCK = 20, PAGE_UP = 33, PAGE_DOWN = 34,
        DELETE = 46, HOME = 36, END = 35, INSERT = 45, PRINT_SCREEN = 44, PAUSE = 19, SELECT_KEY = 93, NUM_LOCK = 144,
        LEFT_ARROW = 37, RIGHT_ARROW = 39, UP_ARROW = 38, DOWN_ARROW = 40, SPACE = 32, ESCAPE = 27,
        SHIFT = 16, CTRL = 17, ALT = 18, ENTER = 13, LINE_FEED = 10, TAB = 9, LEFT_WINDOW_KEY = 91, CONTEXT_MENU = 93, SCROLL_LOCK = 145,
        RIGHT_WINDOW_KEY = 92, F1 = 112;

    const PASSTHROUGH_CHARS = [PRINT_SCREEN, PAUSE, SELECT_KEY, NUM_LOCK, SCROLL_LOCK, LEFT_WINDOW_KEY, RIGHT_WINDOW_KEY, SHIFT, CTRL, ALT, CONTEXT_MENU];

    function groupBy(list: any[], keyGetter: (item: any) => any) {
        const map = new Map();
        list.forEach((item) => {
            const key = keyGetter(item);
            const collection = map.get(key);
            if (!collection) {
                map.set(key, [item]);
            } else {
                collection.push(item);
            }
        });
        return map;
    }

    function log() {
        //console.log.apply(null, arguments);
    }

    function warn() {
        console.warn.apply(null, arguments);
    }

    function indexOf(arr: any[], comparer: (item: any) => boolean) {
        for (var i = 0; i < arr.length; i++) {
            if (comparer(arr[i])) {
                return i;
            }
        }
        return -1;
    }


    type Range = {
        start: SpeedyElement;
        end: SpeedyElement;
    }
    function first(nodelist: HTMLCollection, comparer: (node: Element) => boolean) {
        for (var i = 0; i < nodelist.length; i++) {
            var n = nodelist[i];
            if (comparer(n)) {
                return n;
            }
        }
        return null;
    }

    function remove(arr: any[], item: any) {
        var i = indexOf(arr, function (x) { return x == item; });
        if (i > -1) {
            arr.splice(i, 1);
        }
    }

    function unsetSpanRange(span: HTMLSpanElement, className: string) {
        var nodelist = span.children;
        var div = first(nodelist, function (x) { return x.classList.contains(className); });
        if (div) {
            span.removeChild(div);
        }
    }

    var propCounter = 0;

    class Property {
        constructor(cons) {
            cons = cons || {};
            this.editor = cons.editor;
            this.guid = cons.guid;
            this.index = cons.index;
            this.className = cons.className;
            this.type = cons.type;
            this.value = cons.value;
            this.text = cons.text;
            this.schema = cons.schema || {};
            this.startNode = cons.startNode;
            this.endNode = cons.endNode;
            this.blockNode = cons.blockNode;
            this.bracket = {
                left: null,
                right: null
            };
            this.attributes = cons.attributes || {};
            this.isZeroPoint = cons.isZeroPoint || false;
            this.isDeleted = cons.isDeleted;
        }
        addLeftBracket(node) {
            this.bracket.left = node;
        }
        addRightBracket(node) {
            this.bracket.right = node;
        }
        hideZeroWidth() {
            this.startNode.style.display = "none";
        }
        showZeroWidth() {
            this.startNode.style.display = "inline";
        }
        showBrackets() {
            if (this.bracket.left) {
                this.bracket.left.style.display = "inline";
            }
            if (this.bracket.right) {
                this.bracket.right.style.display = "inline";
            }
        }
        hideBrackets() {
            if (this.bracket.left) {
                this.bracket.left.style.display = "none";
            }
            if (this.bracket.right) {
                this.bracket.right.style.display = "none";
            }
        }
        bracketsVisible() {
            return false;
        }
        getSpanRange() {
            var spans = [];
            var node = this.startNode;
            var looping = true;
            if (this.startNode == this.endNode) {
                spans.push(this.startNode);
                return spans;
            }
            while (looping && !!node) {
                spans.push(node);
                let next = node.speedy.next;
                if (!next) {
                    looping = false;
                }
                if (next == this.endNode) {
                    spans.push(next);
                    looping = false;
                }
                node = next;
            }
            return spans;
        }
        overRange(func) {
            const spans = this.getSpanRange();
            spans.forEach(s => func(s));
        }
        scrollTo() {
            this.startNode.scrollIntoView();
        }
        highlightWithClass(className) {
            if (this.isZeroPoint) {
                return;
            }
            if (this.isDeleted) {
                return;
            }
            if (this.blockNode) {
                this.blockNode.classList.add(className);
                return;
            }
            this.overRange(s => s.classList.add(className));
        }
        highlight(style) {
            if (this.isZeroPoint) {
                return;
            }
            if (this.isDeleted) {
                return;
            }
            if (style) {
                if (this.blockNode) {
                    this.blockNode.style.backgroundColor = style;
                    return;
                }
                this.overRange(s => s.style.backgroundColor = style);
                return;
            }
            var css = this.editor.css.highlight || "text-highlight";
            if (this.blockNode) {
                this.blockNode.classList.add(css);
                return;
            }
            this.overRange(s => s.classList.add(css));
        }
        unhighlightWithClass(className) {
            if (this.isZeroPoint) {
                return;
            }
            if (this.isDeleted) {
                return;
            }
            if (this.blockNode) {
                this.blockNode.classList.remove(className);
                return;
            }
            this.overRange(s => s.classList.remove(className));
        }
        unhighlight(style) {
            if (this.isZeroPoint) {
                return;
            }
            if (this.isDeleted) {
                return;
            }
            if (style) {
                if (this.blockNode) {
                    this.blockNode.style.backgroundColor = style;
                    return;
                }
                this.overRange(s => s.style.backgroundColor = style);
                return;
            }
            var css = this.editor.css.highlight || "text-highlight";
            if (this.blockNode) {
                this.blockNode.classList.remove(css);
                return;
            }
            this.overRange(s => s.classList.remove(css));
        }
        getBlock() {
            var block = this.editor.getCurrentBlock(this.startNode);
            return block;
        }
        getContainer() {
            var container = this.editor.getCurrentContainer(this.startNode);
            return container;
        }
        nodeIndex(cell) {
            return cell.speedy.index;
        }
        startIndex() {
            if (this.isDeleted) {
                return null;
            }
            var startNode = this.startNode;
            if (!startNode && this.blockNode) {
                // startNode = getFirstChildOfContainer(this.blockNode);
                startNode = this.blockNode.speedy.startNode;
            }
            if (!startNode) {
                return null;
            }
            if (typeof startNode.speedy.index != "undefined") {
                return startNode.speedy.index;
            }
            return this.nodeIndex(startNode);
        }
        endIndex() {
            if (this.isDeleted) {
                return null;
            }
            var endNode = this.endNode;
            if (!endNode && this.blockNode) {
                endNode = this.blockNode.speedy.endNode;
            }
            if (!endNode) {
                return null;
            }
            if (typeof endNode.speedy.index != "undefined") {
                return endNode.speedy.index;
            }
            if (endNode.speedy.stream == TEXT_STREAM.OUT) {
                return null;
            }
            return this.nodeIndex(endNode);
        }

        convertToZeroPoint() {
            var zero = this.clone();
            var nextElement = this.endNode.nextElementSibling;
            var range = { start: this.startNode, end: this.endNode };
            var text = this.getRangeText(range);
            this.editor.deleteRange(range);
            var span = this.editor.newSpan(text);
            span.speedy.stream = TEXT_STREAM.OUT;
            zero.isZeroPoint = true;
            zero.text = text;
            zero.startNode = span;
            zero.endNode = span;
            const parentNode = nextElement.parentNode;
            parentNode.insertBefore(span, nextElement);
            zero.startNode.startProperties.push(zero);
            zero.setSpanRange();
            remove(this.editor.data.properties, this);
            this.editor.data.properties.push(zero);
            this.editor.setMonitor();
        }
        setZeroPointLabel(text) {
            this.startNode.textContent = text;
            this.text = text;
        }
        hideSpanRange() {
            const _this = this;
            const type = this.getPropertyType();
            const cells = this.getSpanRange();
            cells.forEach(s => {
                var className = _this.className || type.className;
                if (type.format == "decorate") {
                    s.classList.remove(className);
                } else if (type.format == "overlay") {
                    // remove overlay DIV
                }
            });
        }
        shiftStartProperties(from, to) {
            remove(from.startProperties, this);
            to.startProperties.push(this);
        }
        shiftEndProperties(from, to) {
            remove(from.endProperties, this);
            to.endProperties.push(this);
        }
        shiftNodeLeft(node) {
            if (!node) {
                return;
            }
            var previous = node.speedy.previous;
            if (!previous) {
                return;
            }
            node.parentElement.insertBefore(node, previous);
        }
        shiftNodeRight(node) {
            if (!node) {
                return;
            }
            var nextOneOver = node.speedy.next.speedy.next; // getNextChar({ startNode: node, limit: 2 })
            if (!nextOneOver) {
                return;
            }
            node.parentElement.insertBefore(node, nextOneOver);
        }
        shiftBracketsLeft() {
            this.shiftNodeLeft(this.bracket.left);
            this.shiftNodeLeft(this.bracket.right);
        }
        shiftBracketsRight() {
            this.shiftNodeRight(this.bracket.left);
            this.shiftNodeRight(this.bracket.right);
        }
        getPreviousCharNode(node) {
            return node.speedy.previous;
        }
        getNextCharNode(node) {
            return node.speedy.next;
        }
        getText() {
            const cells = this.getSpanRange();
            const text = cells.map(x => x.textContent).join("");
            return text;
        }
        shiftLeft(suppressFlash) {
            var previousStartNode = this.getPreviousCharNode(this.startNode);
            var previousEndNode = this.getPreviousCharNode(this.endNode);
            if (!previousStartNode || !previousEndNode) {
                return;
            }
            this.unsetSpanRange();
            this.startNode = previousStartNode;
            this.endNode = previousEndNode;
            this.shiftBracketsLeft();
            this.setSpanRange();
            if (!suppressFlash) {
                this.flashHighlight();
            }
        }
        flashHighlight() {
            var _this = this;
            this.highlight();
            setTimeout(() => _this.unhighlight(), 125);
        }
        switchTo(start, end) {
            this.unsetSpanRange();
            this.startNode = start;
            this.endNode = end;
            this.setSpanRange();
        }
        shiftRight(suppressFlash) {
            var nextStartNode = this.startNode.speedy.next;
            var nextEndNode = this.endNode.speedy.next;
            if (!nextStartNode || !nextEndNode) {
                return;
            }
            this.unsetSpanRange();
            this.startNode = nextStartNode;
            this.endNode = nextEndNode;
            this.shiftBracketsRight();
            this.setSpanRange();
            if (!suppressFlash) {
                this.flashHighlight();
            }
        }
        expand() {
            this.unsetSpanRange();
            var nextEndNode = this.getNextCharNode(this.endNode);
            this.endNode = nextEndNode;
            this.shiftNodeRight(this.bracket.right);
            this.setSpanRange();
            this.flashHighlight();
        }
        contract() {
            this.unsetSpanRange();
            var previousEndNode = this.getPreviousCharNode(this.endNode);
            this.endNode = previousEndNode;
            this.shiftNodeLeft(this.bracket.right);
            this.setSpanRange();
            this.flashHighlight();
        }
        getPropertyType() {
            var _ = this;
            return find(this.editor.propertyType, function (item, key) {
                return key == _.type;
            });
        }
        allInStreamNodes() {
            const cells = this.getSpanRange();
            return cells.filter(c => c.speedy.stream == TEXT_STREAM.IN);
        }
        unsetSpanRange() {
            var _this = this;
            const propertyType = this.getPropertyType();
            const cells = this.getSpanRange();
            if (propertyType.format == "block") {
                // const parent = this.startNode.parentElement;
                const styleBlock = this.blockNode;
                const textBlock = styleBlock.parentElement;
                const insertionPoint = styleBlock.nextElementSibling ? styleBlock.nextElementSibling : styleBlock.previousElementSibling;
                cells.forEach(cell => textBlock.insertBefore(cell, insertionPoint));
                textBlock.removeChild(styleBlock);
            } else {
                cells.forEach(s => {
                    const className = _this.className || propertyType.className || (propertyType.zeroPoint && propertyType.zeroPoint.className);
                    if (!className) {
                        return;
                    }
                    if (propertyType.format == "decorate") {
                        s.classList.remove(className);
                    } else if (propertyType.format == "overlay") {
                        unsetSpanRange(s, className);
                    }
                });
            }
            if (propertyType.unstyleRenderer) {
                const cells = this.getSpanRange();
                propertyType.unstyleRenderer(cells, this);
            }
            if (propertyType.render) {
                if (propertyType.render.destroy) {
                    propertyType.render.destroy(this);
                }
            }
            this.editor.updateOffsets();
        }
        showSpanRange() {
            var _this = this;
            var propertyType = this.getPropertyType();
            const spans = this.getSpanRange();
            log({ property: this, spans });
            spans.forEach(s => {
                var className = _this.className || propertyType.className;
                if (propertyType.format == "decorate") {
                    s.classList.add(className);
                } else if (propertyType.format == "overlay") {
                    // show overlay DIV
                }
            });
        }
        setStyle(style) {
            const spans = this.getSpanRange(); // getSpansBetween({ startNode: this.startNode, endNode: this.endNode || this.startNode });
            spans.forEach(s => {
                for (var key in style) {
                    s.style[key] = style[key];
                }
            });
        };
        setSpanRange() {
            var _this = this;
            if (this.isDeleted) {
                return;
            }
            if (!this.startNode || !this.endNode) {
                return;
            }
            var propertyType = this.getPropertyType();
            if (!propertyType) {
                return;
            }
            var format = propertyType.format;
            const spans = this.getSpanRange(); // getSpansBetween({ startNode: this.startNode, endNode: this.endNode || this.startNode });
            log({ prop: this, spans });
            spans.forEach(s => {
                var className = _this.className || (_this.isZeroPoint ? propertyType.zeroPoint.className : propertyType.className);
                if (format == "decorate" || _this.isZeroPoint) {
                    if (className) {
                        s.classList.add(className);
                    }
                } else if (format == "overlay" && !_this.isZeroPoint) {
                    if (s.classList.contains("line-break")) {
                        return;
                    }
                    var inner = document.createElement("SPAN");
                    inner.speedy = {
                        role: ELEMENT_ROLE.CELL_STYLE,
                        stream: TEXT_STREAM.OUT
                    };
                    inner.classList.add("overlaid");
                    if (className) {
                        inner.classList.add(className);
                    }
                    s.appendChild(inner);
                }
            });
            if (propertyType.styleRenderer) {
                propertyType.styleRenderer(spans, this);
            }
            if (this.schema) {
                if (this.schema.onRequestAnimationFrame) {
                    this.schema.onRequestAnimationFrame(this);
                }
                if (this.startNode.speedy.offset && this.endNode.speedy.offset) {
                    if (this.schema.render) {
                        if (this.schema.render.init) {
                            this.schema.render.init(this);
                        }
                        if (this.schema.render.batchUpdate) {
                            this.schema.render.batchUpdate({ editor: this.editor, properties: [this] });
                        }
                    }
                }
            }
        }
        hasOffsetChanged() {
            if (!this.startNode || !this.endNode) {
                return false;
            }
            if (this.startNode.isDeleted || this.endNode.isDeleted) {
                return true;
            }
            let spoff = this.startNode.speedy.previousOffset;
            let soff = this.startNode.speedy.offset;
            if (!soff || !spoff) {
                return true;
            }
            let startSame = spoff.x == soff.x && spoff.y == soff.y;
            if (!startSame) {
                return true;
            }
            let epoff = this.endNode.speedy.previousOffset;
            let eoff = this.endNode.speedy.offset;
            if (!epoff || !eoff) {
                return true;
            }
            let endSame = epoff.x == eoff.x && epoff.y == eoff.y;
            if (!endSame) {
                return true;
            }
            return false;
        }
        getTextRange() {
            return this.getText(); // getRangeText({ start: this.startNode, end: this.endNode });
        }
        select() {
            this.editor.createSelection(this.startNode, this.endNode);
        }
        remove() {
            this.isDeleted = true;
            this.unsetSpanRange();
            this.editor.updateCurrentRanges(this.endNode);
            this.editor.clearMonitors();
            this.editor.setMarked();
            if (this.editor.onPropertyDeleted) {
                this.editor.onPropertyDeleted(this);
            }
            if (this.isZeroPoint) {
                this.startNode.remove();
            }
            this.hideBrackets();
            if (!this.guid) {
                remove(this.editor.data.properties, this);
            }
            if (this.schema.animation) {
                if (this.schema.animation.delete) {
                    this.schema.animation.delete(this);
                }
            }
        }
        clone() {
            var clone = new Property(this);
            clone.text = this.text;
            clone.startNode = this.startNode;
            clone.endNode = this.endNode;
            clone.className = this.className;
            clone.guid = this.guid;
            clone.type = this.type;
            clone.value = this.value;
            clone.isDeleted = this.isDeleted;
            clone.index = this.index;
            clone.isZeroPoint = this.isZeroPoint;
            clone.attributes = this.attributes;
            if (this.editor.onPropertyCloned) {
                this.editor.onPropertyCloned(clone, this);
            }
            return clone;
        }
        toNode() {
            var __ = this;
            var text = null;
            var si = this.startIndex();
            var ei = this.endIndex();
            if (this.isZeroPoint) {
                var zp = this.schema.zeroPoint;
                if (typeof zp.exportText == "undefined" || !!zp.exportText) {
                    text = this.startNode.textContent;
                }
            }
            else {
                if (typeof this.schema.exportText == "undefined" || !!this.schema.exportText) {
                    var len = ei - si + 1;
                    if (len > 0) {
                        len = this.editor.unbinding.maxTextLength || len;
                        var statementText = this.editor.temp.text || this.editor.unbindText();
                        text = statementText.substr(si, len);
                    }
                }
            }
            var data = {
                index: this.index,
                guid: this.guid || null,
                className: this.className,
                type: this.type,
                text: text,
                value: this.value,
                startIndex: si,
                endIndex: ei,
                attributes: this.attributes,
                isZeroPoint: !!this.isZeroPoint,
                isDeleted: this.isDeleted || false
            };
            if (this.editor.onPropertyUnbound) {
                this.editor.onPropertyUnbound(data, this);
            }
            return data;
        }
    }

    type Speedy = {
        isLineBreak: boolean;
        index: number|null;
        role: number;
        previous?: SpeedyElement;
        next?: SpeedyElement;
        startNode: SpeedyElement|null;
        endNode: SpeedyElement|null;
    }
    type SpeedyElement = HTMLElement & {
        speedy: Speedy;
        
    }
    type SpeedyEvent = {
        keyboard: () => void;
        mouse: () => void;
        input: () => void;
    };
    type EditorContructor = {
        event?: SpeedyEvent;
        direction: string;
        container: SpeedyElement|string;
        blockClass: string;
        client: any;
        onFocus: () => void;
        keypressInterval: number;
    }

    export class Editor {
        container: SpeedyElement;
        monitors: any[];
        selectors: any[];
        temp: {
            text: string|null;
        }
        blockClass: string;
        client: any;
        onFocus: () => void;
        ignoreAfterMarkedInterval: boolean;
        lastKeyPress: Date;
        keypressInterval: number;
        constructor(cons: EditorContructor) {
            var event = (cons.event || {}) as SpeedyEvent;
            this.container = (cons.container instanceof HTMLElement) ? cons.container : document.getElementById(cons.container) as SpeedyElement;
            this.container.speedy = {
                role: ELEMENT_ROLE.ROOT
            };
            if (cons.direction == "RTL") {
                this.container.style.direction = "RTL";
            }
            this.monitors = [];
            this.selectors = [];
            this.temp = {
                text: null
            };
            this.blockClass = cons.blockClass;
            this.client = cons.client;
            this.onFocus = cons.onFocus;
            this.onBlockCreated = cons.onBlockCreated;
            this.onBlockAdded = cons.onBlockAdded;
            this.onTextChanged = cons.onTextChanged;
            this.onCharacterAdded = cons.onCharacterAdded;
            this.onCharacterDeleted = cons.onCharacterDeleted;
            this.onPropertyCreated = cons.onPropertyCreated;
            this.onPropertyChanged = cons.onPropertyChanged;
            this.onPropertyDeleted = cons.onPropertyDeleted;
            this.onPropertyUnbound = cons.onPropertyUnbound;
            this.onPropertyCloned = cons.onPropertyCloned;
            this.onMonitorUpdated = cons.onMonitorUpdated;
            this.event = {
                keyboard: event.keyboard,
                mouse: event.mouse,
                input: event.input,
                contextMenuActivated: event.contextMenuActivated,
                contextMenuDeactivated: event.contextMenuDeactivated,
                keypressIntervalExceeded: event.keypressIntervalExceeded,
                blockMouseOver: event.blockMouseOver,
                blockMouseOut: event.blockMouseOut,
                afterMarkedInterval: event.afterMarkedInterval
            };
            this.ignoreAfterMarkedInterval = false;
            this.verticalArrowNavigation = {
                lastX: null
            };
            this.timer = {
                afterMarkedInterval: null
            };
            this.lastKeyPress = new Date();
            this.keypressInterval = cons.keypressInterval;
            this.unbinding = cons.unbinding || {};
            this.lockText = cons.lockText || false;
            this.lockProperties = cons.lockProperties || false;
            this.css = cons.css || {};
            this.marked = false;
            this.lastMarked = new Date();
            this.characterCount = 0;
            this.data = {
                text: null,
                properties: [],
                spans: [],
                characterCount: null,
                wordCount: null
            };
            this.publisher = {

            };
            this.subscriber = null;
            this.history = {
                cursor: [],
                data: []
            };
            this.mode = {
                selection: {
                    direction: null,
                    start: null,
                    end: null
                },
                contextMenu: {
                    active: false
                },
                extendProperties: false
            };
            this.currentBlock = null;
            this.propertyType = cons.propertyType;
            this.setupEventHandlers();
        }
        clearMonitors() {
            this.monitors.forEach(x => x.clear());
        }
        nodeIndex(cell: SpeedyElement) {
            return cell.speedy.index;
        }
        shiftPropertiesLeftFromNode(node: SpeedyElement) {
            var i = this.nodeIndex(node);
            var properties = this.data.properties
                .filter(x => x.startIndex() > i);
            properties.forEach(x => x.shiftLeft());
        }
        shiftPropertiesRightFromNode(node: SpeedyElement) {
            var i = this.nodeIndex(node);
            var properties = this.data.properties
                .filter(x => x.startIndex() > i);
            properties.forEach(x => x.shiftRight());
        }
        shiftPropertiesLeftFromCaret(node: SpeedyElement) {
            var node = this.getCurrent();
            this.shiftPropertiesLeftFromNode(node);
        }
        shiftPropertiesRightFromCaret(node: SpeedyElement) {
            var node = this.getCurrent();
            this.shiftPropertiesRightFromNode(node);
        }
        setupEventHandlers() {
            var _this = this;
            this.container.addEventListener("dblclick", this.handleDoubleClickEvent.bind(this));
            this.container.addEventListener("keydown", this.handleKeyDownEvent.bind(this));
            document.body.addEventListener("keydown", function (e) {
                if (e.target != document.body) {
                    return;
                }
                var caret = _this.getCaret();
                _this.processControlOrMeta({ event: e, caret: caret })
            });
            this.container.addEventListener("mouseup", this.handleMouseUpEvent.bind(this));
            this.container.addEventListener("paste", this.handleOnPasteEvent.bind(this));
            this.container.addEventListener("focus", function (e) {
                if (_this.onFocus) {
                    _this.onFocus({ editor: _this, e });
                }
            });
            this.container.addEventListener("contextmenu", e => {
                e.preventDefault();
                if (_this.event.contextMenuActivated) {
                    var range = this.getSelectionNodes();
                    _this.event.contextMenuActivated({ editor: _this, e, range });
                }
                return false;
            });
            this.container.addEventListener("click", e => {
                const caret = _this.getCaret();
                if (_this.event.mouse) {
                    const args = { editor: _this, e, caret };
                    if (_this.event.mouse["control-click"]) {
                        if (e.ctrlKey && false == e.shiftKey && false == e.altKey && false == e.metaKey) {
                            _this.event.mouse["control-click"](args);
                        }
                    }
                    if (_this.event.mouse["shift-click"]) {
                        if (e.shiftKey && false == e.ctrlKey && false == e.altKey && false == e.metaKey) {
                            _this.event.mouse["shift-click"]({ ...args, client: _this.client });
                        }
                    }
                    //if (_this.event.mouse["alt-click"]) {
                    //    if (e.altKey && false == e.ctrlKey && false == e.metaKey) {
                    //        _this.event.mouse["alt-click"](args);
                    //    }
                    //}
                    if (_this.event.mouse["click"]) {
                        _this.clearSelectionMode();
                        if (false == e.ctrlKey && false == e.altKey && false == e.metaKey) {
                            var selection = _this.getSelectionNodes();
                            if (!selection) {
                                _this.event.mouse["click"](args);
                            }
                        }
                    }
                }
                var props = _this.getCurrentRanges(_this.getCurrent());
                props.filter(x => !!x.schema.event && !!x.schema.event.annotation)
                    .forEach(x => {
                        const annotation = x.schema.event.annotation;
                        for (var key in annotation) {
                            if (key.indexOf("click") < 0) {
                                continue;
                            }
                            if (key == "control-shift-click") {
                                if ((false == e.ctrlKey || false == e.shiftKey)) {
                                    continue;
                                }
                                if (e.altKey || e.metaKey) {
                                    continue;
                                }
                            }
                            if (key == "alt-click") {
                                if (false == e.altKey) {
                                    continue;
                                }
                                if (e.ctrlKey || e.metaKey || e.shiftKey) {
                                    continue;
                                }
                            }
                            if (key == "meta-click") {
                                if (false == e.metaKey) {
                                    continue;
                                }
                                if (e.altKey || e.ctrlKey || e.shiftKey) {
                                    continue;
                                }
                            }
                            if (key == "control-click") {
                                if (false == e.ctrlKey) {
                                    continue;
                                }
                                if (e.altKey || e.metaKey || e.shiftKey) {
                                    continue;
                                }
                            }
                            if (key == "shift-click") {
                                if (false == e.shiftKey) {
                                    continue;
                                }
                                if (e.ctrlKey || e.altKey || e.metaKey) {
                                    continue;
                                }
                            }
                            if (key == "control-alt-click") {
                                if (false == e.ctrlKey || false == e.altKey) {
                                    continue;
                                }
                                if (e.metaKey || e.shiftKey) {
                                    continue;
                                }
                            }
                            annotation[key](x);
                        }
                    });
            });
        }
        setAnimationFrame() {
            var _this = this;
            window.requestAnimationFrame(function () {
                var properties = _this.data.properties.filter(p => !!_this.propertyType[p.type] && !!_this.propertyType[p.type].onRequestAnimationFrame);
                if (!properties.length) {
                    return;
                }
                log({ method: "requestAnimationFrame", properties })
                properties.forEach(p => _this.propertyType[p.type].onRequestAnimationFrame(p, _this.propertyType[p.type], _this));
            });
        }
        isWithin(startNode, endNode, cell) {
            return startNode.speedy.index <= cell.speedy.index && cell.speedy.index <= endNode.speedy.index;
        }
        getPropertyAtCursor() {
            var _this = this;
            var node = this.getCurrent();
            var enclosing = this.data.properties.filter(function (prop) {
                return _this.isWithin(prop.startNode, prop.endNode, node);
            });
            if (!enclosing.length) {
                return null;
            }
            var i = this.nodeIndex(node);
            var ordered = enclosing.sort(function (a, b) {
                var da = i - a.startIndex();
                var db = i - b.startIndex();
                return da > db ? 1 : da == db ? 0 : -1;
            });
            var nearest = ordered[0];
            return nearest;
        }
        nodeAtIndex(index) {
            return this.indexNode(index);
        }
        handleDoubleClickEvent(e) {
            const _this = this;
            this.clearSelection();
            const target = this.getParentSpan(e.target);
            const props = this.data.properties.filter(function (p) {
                let schema = p.schema;
                return schema && schema.event && schema.event.annotation && schema.event.annotation["dblclick"] && _this.isWithin(p.startNode, p.endNode, target);
            });
            if (!props.length) {
                return;
            }
            const i = target.speedy.index;
            const nearest = props.sort(function (a, b) {
                var da = i - a.startIndex();
                var db = i - b.startIndex();
                return da > db ? 1 : da == db ? 0 : -1;
            })[0];
            if (!nearest) {
                return;
            }
            var schema = this.propertyType[nearest.type];
            schema.event.annotation["dblclick"](nearest);
        }
        getNearestProperty(cell) {
            const enclosing = this.getEnclosingProperties(cell);
            if (!enclosing.length) {
                return null;
            }
            const i = cell.speedy.index;
            const nearest = enclosing.sort((a, b) => {
                const da = i - a.startIndex();
                const db = i - b.startIndex();
                return da > db ? 1 : da == db ? 0 : -1;
            })[0];
            return nearest;
        }
        getEnclosingProperties(cell) {
            const _this = this;
            const ranges = this.data.properties.filter(p => !p.isDeleted && !!p.startNode && !!p.endNode);
            const enclosing = ranges.filter(p => _this.isWithin(p.startNode, p.endNode, cell));
            return enclosing;
        }
        getMostRecentEnclosingProperty(cell) {
            const enclosing = this.getEnclosingProperties(cell);
            if (!enclosing.length) {
                return null;
            }
            const mostRecent = enclosing.sort((a, b) => a.index < b.index ? 1 : a.index > b.index ? -1 : 0)[0];
            return mostRecent;
        }
        addMonitor(monitor) {
            this.monitors.push(monitor);
        }
        addSelector(selector) {
            this.selectors.push(selector);
        }
        getCurrentRanges(cell) {
            if (!cell || !cell.speedy) {
                return [];
            }
            var i = cell.speedy.index;
            if (typeof i == "undefined") {
                i = this.nodeIndex(cell);
            }
            var props = this.data.properties.filter(function (prop) {
                if (prop.isDeleted) {
                    return false;
                }
                if (!prop.blockNode) {
                    if (!prop.startNode || !prop.endNode) {
                        return false;
                    }
                }
                const si = prop.startIndex();
                const ei = prop.endIndex();
                return si <= i && i <= ei;
            });
            return props;
        }
        getPropertiesWithin(start, end) {
            if (!start || !start.speedy || !end || !end.speedy) {
                return [];
            }
            var props = this.data.properties
                .filter(p => !p.blockNode)
                .filter(function (prop) {
                    if (prop.isDeleted || !prop.startNode || !prop.endNode) {
                        return false;
                    }
                    const s = prop.startIndex();
                    const e = prop.endIndex();
                    const a = start.speedy.index;
                    const b = end.speedy.index;
                    //return s <= a && b <= e;
                    return s <= b && a <= e;
                });
            return props;
        }
        updateCurrentRanges(span) {
            var _this = this;
            window.requestAnimationFrame(function () {
                if (!span) {
                    span = _this.getCurrent();
                }
                var props = _this.getPropertiesAroundSpan(span);
                _this.setMonitor(props || []);
            });
        }
        getPropertiesAroundSpan(span) {
            if (!this.marked) {
                this.mark();
                //this.data.properties
                //    .filter(p => !p.blockNode)
                //    .sort((a, b) => a.startIndex() > b.endIndex() ? 1 : a.startIndex() == b.startIndex() ? -1 : 0);
            }
            var props = this.getCurrentRanges(span);
            props.sort((a, b) => {
                const asi = a.startIndex();
                const bsi = b.startIndex();
                if (asi > bsi) return -1;
                if (asi < bsi) return 1;
                const aei = a.endIndex();
                const bei = b.endIndex();
                if (aei > bei) return 1;
                if (aei < bei) return -1;
                if (a.schema.format == "overlay") return -1;
                return 0;
            });
            return props;
        }
        deleteAnnotation(type) {
            var _this = this;
            var current = this.getCurrent();
            var enclosing = this.data.properties.filter(function (prop) {
                return !prop.isDeleted && prop.type == type && _this.isWithin(prop.startNode, prop.endNode, current);
            });
            if (enclosing.length != 1) {
                return;
            }
            enclosing[0].remove();
        }
        setMonitor(props) {
            var _this = this;
            window.setTimeout(function () {
                _this.monitors.forEach(x => x.update({ properties: props, characterCount: _this.characterCount, editor: _this }));
            }, 1);
        }
        handleMouseClickEvent(evt) {
            this.updateCurrentRanges();
        }
        updateSelectors(e) {
            var selection = this.getSelectionNodes();
            if (selection) {
                this.mode.selection.start = selection.start;
                this.mode.selection.end = selection.end;
                var properties = this.getPropertiesWithin(selection.start, selection.end);
                log({ e, selection, properties });
                if (this.selectors) {
                    this.selectors.forEach(s => s({ editor: this, properties, selection, e }));
                }
            } else {
                this.mode.selection.start = null;
                this.mode.selection.end = null;
            }
        }
        handleMouseUpEvent(e) {
            if (!e.target.speedy || e.target.speedy.role != ELEMENT_ROLE.CELL) {
                return;
            }
            this.updateCurrentRanges(e.target);
            var selection = this.getSelectionNodes();
            if (selection) {
                selection.text = this.getRangeText(selection);
                this.mode.selection.start = selection.start;
                this.mode.selection.end = selection.end;
                if (this.event.mouse) {
                    if (this.event.mouse.selection) {
                        e.preventDefault();
                        this.event.mouse.selection({ editor: this, e, selection });
                    }
                }
            } else {
                this.mode.selection.start = null;
                this.mode.selection.end = null;
            }
            const caret = this.getCaret();
            this.handleCaretMoveEvent(e, caret);
            var props = this.getCurrentRanges(e.target);
            if (props) {
                props.forEach(p => {
                    try {
                        if (p.schema.event && p.schema.event.property) {
                            var property = p.schema.event.property;
                            if (property.mouseUp) {
                                property.mouseUp(p);
                            }
                        }
                    } catch (ex) {
                        log({ ex, p });
                    }
                });
            }
            this.addCursorToHistory(e.target);
        }
        addCursorToHistory(span) {
            this.history.cursor.push(span);
            if (this.history.cursor.length >= 10) {
                this.history.cursor.shift();
            }
            this.history.cursorIndex = this.history.cursor.length;
        }
        backCursor() {
            this.history.cursorIndex--;
            if (this.history.cursorIndex <= 0) {
                return;
            }
            this.moveCursorTo(this.history.cursor[this.history.cursorIndex]);
            log(this.history.cursor[this.history.cursorIndex]);
        }
        forwardCursor() {
            this.history.cursorIndex++;
            if (this.history.cursorIndex > this.history.cursor.length) {
                return;
            }
            this.moveCursorTo(this.history.cursor[this.history.cursorIndex]);
            log(this.history.cursor[this.history.cursorIndex]);
        }
        moveCursorTo(span) {
            span.scrollIntoView();
            this.setCarotByNode(span);
        }
        pasteIntoContainer(args) {
            const { container, cells, right } = args;
            const content = document.createDocumentFragment();
            cells.forEach(cell => content.appendChild(cell));
            container.insertBefore(content, right);
            const len = cells.length;
            const first = cells[0];
            const last = cells[len - 1];
            const previous = right.speedy.previous;
            if (previous) {
                previous.speedy.next = first;
            }
            first.speedy.previous = previous;
            last.speedy.next = right;
            right.speedy.previous = last;
        }
        handleOnPasteEvent(e: ClipboardEvent) {
            // https://stackoverflow.com/questions/2176861/javascript-get-clipboard-data-on-paste-event-cross-browser
            e.stopPropagation();
            e.preventDefault();
            const caret = this.getCaret();
            var cell = caret.right;
            const clipboardData = e.clipboardData || window.clipboardData;
            const text = clipboardData.getData('text');
            const currentTextBlock = this.getCurrentContainer(cell);
            const { fragment } = this.textToDocumentFragmentWithTextBlocks(text);
            const blocks = Array.from(fragment.childNodes);
            const len = blocks.length;
            //
            // Easiest solution: dump the pasted text into new text blocks.
            // Later think about splitting the current block, dumping the new blocks in, and then merging the first new block
            // into the split block.
            const firstPasteBlock = blocks[0] as SpeedyElement;
            const lastPasteBlock = blocks[len - 1] as SpeedyElement;
            const nextTextBlock = currentTextBlock.speedy.nextTextBlock;
            if (nextTextBlock) {
                this.container.insertBefore(fragment, nextTextBlock);
            }
            else {
                this.container.appendChild(fragment);
            }
            // wire up the cells
            currentTextBlock.speedy.endNode.speedy.next = firstPasteBlock.speedy.startNode;
            firstPasteBlock.speedy.startNode.speedy.previous = currentTextBlock.speedy.endNode;
            if (nextTextBlock) {
                lastPasteBlock.speedy.endNode.speedy.next = nextTextBlock.speedy.startNode;
                nextTextBlock.speedy.startNode.speedy.previous = lastPasteBlock.speedy.endNode;
            }
            // wire up the blocks
            currentTextBlock.speedy.nextTextBlock = firstPasteBlock;
            firstPasteBlock.speedy.previousTextBlock = currentTextBlock;
            if (nextTextBlock) {
                lastPasteBlock.speedy.nextTextBlock = nextTextBlock;
            }
            this.mark();
            this.updateOffsets();
        }
        insertCharacterAtCarot(c) {
            var isFirst = !this.container.children.length;
            var current = this.getCurrent();
            var span = this.newSpan();
            span.textContent = c;
            if (isFirst) {
                this.container.appendChild(span);
                this.setCarotByNode(span);
            }
            else {
                var atFirst = !current;
                var next = atFirst ? this.container.firstChild : this.getNextCharacterNode(current);
                this.container.insertBefore(span, next);
                this.paint(span);
                this.setCarotByNode(atFirst ? current : span);
            }
            this.marked = false;
            this.updateCurrentRanges();
        }
        erase() {
            const _this = this;
            const range = this.getSelectionNodes();
            if (range == null) {
                return;
            }
            const sn = range.start;
            const en = range.end;
            const si = sn.speedy.index;
            const ei = en.speedy.index;
            // NB: assume the simple case of erasing INSIDE property ranges; other cases to follow later.
            const properties = this.data.properties.filter(p => p.startIndex() <= si && ei <= p.endIndex());
            properties.forEach(function (p) {
                var p1 = p.clone();
                var p2 = p.clone();
                p1.guid = null; // a split property is really two new properties
                p1.endNode = sn.speedy.previous;
                p2.guid = null; // a split property is really two new properties
                p2.startNode = en.speedy.next;
                p.remove();
                _this.data.properties.push(p1);
                _this.data.properties.push(p2);
                const firstCells = p1.getSpanRange();
                const secondCells = p2.getSpanRange();
                firstCells.forEach(cell => _this.paint(cell));
                secondCells.forEach(cell => _this.paint(cell));
            });
            this.marked = false;
        }
        moveCells(args) {
            const { cells, before } = args;
            const len = cells.length;
            const first = cells[0];
            const last = cells[len - 1];
            const previous = first.speedy.previous;
            const next = last.speedy.next;
            previous.speedy.next = next;
            next.speedy.previous = previous;
            cells.forEach(c => before.parentNode.insertBefore(c, before));
            const left = before.speedy.previous;
            left.speedy.next = first;
            first.speedy.previous = left;
            last.speedy.next = before;
            before.speedy.previous = last;
        }
        splitTextBlockBefore(cell) {
            //const caret = {
            //    left: cell.speedy.previous,
            //    right: cell
            //};
            //this.processEnter({
            //    e: {
            //        shiftKey: false
            //    },
            //    caret
            //});
            //return;
            this.pauseChainBreakListener();
            const previous = cell.speedy.previous;
            const textBlock = this.getCurrentContainer(cell);
            const nextTextBlock = textBlock.speedy.nextTextBlock;
            const newTextBlock = this.newTextBlock();
            var node = cell;
            newTextBlock.speedy.startNode = node;
            while (node) {
                newTextBlock.appendChild(node);
                node = node.nextElementSibling;
            }
            newTextBlock.speedy.endNode = node;
            if (nextTextBlock) {
                this.container.insertBefore(newTextBlock, nextTextBlock);
            }
            else {
                this.container.appendChild(newTextBlock);
            }
            const cr = this.newCarriageReturn();
            textBlock.appendChild(cr);
            textBlock.speedy.endNode = cr;
            previous.speedy.next = cr;
            cr.speedy.previous = previous;
            cr.speedy.next = newTextBlock.speedy.startNode;
            newTextBlock.speedy.startNode.speedy.previous = cr;
            if (nextTextBlock) {
                newTextBlock.speedy.endNode.speedy.next = nextTextBlock.speedy.startNode;
                nextTextBlock.speedy.startNode.speedy.previous = newTextBlock.speedy.endNode;
            }
            this.mark();
            this.updateOffsets();
            this.unpauseChainBreakListener();
        }
        pauseChainBreakListener() {
            chainBreakListenerPaused = true;
        }
        unpauseChainBreakListener() {
            chainBreakListenerPaused = false;
        }
        removeTextBlock(current) {
            this.pauseChainBreakListener();
            this.addToHistory();
            const previous = current.speedy.previousTextBlock;
            const next = current.speedy.nextTextBlock;
            const properties = this.getPropertiesWithin(current.speedy.startNode, current.speedy.endNode);
            if (previous) {
                previous.speedy.endNode.speedy.next = next?.speedy?.startNode;
                previous.speedy.nextTextBlock = next;
            }
            if (next) {
                next.speedy.startNode.speedy.previous = previous?.speedy?.endNode;
                next.speedy.previousTextBlock = previous;
            }
            // naive case: only remove properties within the range of textBlock: not accounting for ones which overlap textBlock.
            properties.forEach(p => p.remove());
            current.remove();
            if (next) {
                this.setCarotByNode(next.speedy.startNode, 0);
            } else {
                if (previous) {
                    this.setCarotByNode(previous.speedy.endNode, 0);
                }
            }
            this.mark();
            this.updateOffsets();
            this.unpauseChainBreakListener();
        }
        removeContainer(container) {
            if (!container) {
                return;
            }
            var block = this.data.properties.find(p => p.blockNode == container);
            if (block) {
                block.isDeleted = true;
            }
            container.parentNode.removeChild(container);
            //container.remove();
        }
        isDocumentEmpty() {
            const containers = this.getContainers();
            if (containers.length > 1) {
                return false;
            }
            return this.isContainerEmpty(containers[0]);
        }
        isContainerEmpty(container) {
            return container.speedy.startNode == container.speedy.endNode;
        }
        getFirstContainer() {
            const containers = this.getContainers();
            return containers[0];
        }
        overrideBackspaceKey(cell) {
            var overriden = false;
            if (this.isAtDocumentStart({ left: cell })) {
                if (this.event.keyboard["BACKSPACE:start-of-document"]) {
                    this.event.keyboard["BACKSPACE:start-of-document"]({ editor: this });
                    overriden = true;
                }
            }
            return overriden;
        }
        overrideDeleteKey(cell) {
            var overriden = false;
            if (this.isAtDocumentEnd({ right: cell })) {
                if (this.event.keyboard["DELETE:end-of-document"]) {
                    this.event.keyboard["DELETE:end-of-document"]({ editor: this });
                    overriden = true;
                }
            }
            return overriden;
        }
        deleteCell(args) {
            const { cell } = args;
            const updateCaret = typeof (args.updateCaret) != "undefined" ? args.updateCaret : true;
            const previousCell = cell.speedy.previous;
            const nextCell = cell.speedy.next;
            const currentTextBlock = this.getCurrentContainer(cell);
            if (cell.speedy.isLineBreak) {
                const nextTextBlock = currentTextBlock.speedy.nextTextBlock;
                if (!nextTextBlock) {
                    // No following text block to merge to the current one, so leave the CR alone.
                    return;
                }
                // Append all cells from nextTextBlock to currentTextBlock.
                const content = document.createDocumentFragment();
                const cells = Array.from(nextTextBlock.childNodes);
                const first = cells[0], last = cells[cells.length - 1];
                cells.forEach(c => content.appendChild(c));
                currentTextBlock.appendChild(content);
                // Reknit the cells.
                if (previousCell) {
                    previousCell.speedy.next = first;
                }
                first.speedy.previous = previousCell;
                // Reknit the text blocks
                if (currentTextBlock.speedy.startNode == cell) {
                    currentTextBlock.speedy.startNode = first;
                }
                currentTextBlock.speedy.endNode = last;
                currentTextBlock.speedy.nextTextBlock = nextTextBlock.speedy.nextTextBlock;
                if (nextTextBlock.speedy.nextTextBlock) {
                    nextTextBlock.speedy.previousTextBlock = currentTextBlock;
                }
                nextTextBlock.remove();
            } else {
                // Just reknit the cells.
                if (previousCell) {
                    previousCell.speedy.next = nextCell;
                }
                if (nextCell) {
                    nextCell.speedy.previous = previousCell;
                }
            }
            this.shiftPropertyBoundaries(cell);
            cell.remove();
            if (updateCaret) {
                if (nextCell) {
                    this.setCarotByNode(nextCell, CARET.LEFT);
                }
                this.mark();
                this.updateOffsets();
                if (this.onTextChanged) {
                    const caret = {
                        left: previousCell, right: nextCell, container: currentTextBlock
                    };
                    const { text, cells } = this.getTextBlockData(currentTextBlock);
                    this.onTextChanged({
                        action: "deleted", editor: this, caret, text, cells
                    });
                }
            }
        }
        shiftPropertyBoundaries(cell) {
            this.shiftPropertyStartNodesRight(cell);
            this.shiftPropertyEndNodesLeft(cell);
        }
        shiftPropertyEndNodesLeft(cell) {
            const previousChar = cell.speedy.previous;
            const properties = this.data.properties.filter(p => !p.isDeleted);
            const singles = properties.filter(p => p.startNode == p.endNode && p.startNode == cell);
            if (singles) {
                singles.forEach(p => p.isDeleted = true);
            }
            const endProperties = properties.filter(p => p.endNode == cell && p.startNode != cell);
            if (endProperties.length) {
                if (!previousChar) {
                    endProperties.forEach(p => p.isDeleted = true);
                } else {
                    endProperties.forEach(p => p.endNode = previousChar);
                }
            }
        }
        shiftPropertyStartNodesRight(cell) {
            const nextChar = cell.speedy.next;
            const properties = this.data.properties.filter(p => !p.isDeleted);
            const singles = properties.filter(p => p.startNode == p.endNode && p.startNode == cell);
            if (singles.length) {
                singles.forEach(p => p.isDeleted = true);
            }
            const startProperties = properties.filter(p => p.startNode == cell && p.endNode != cell);
            if (startProperties.length) {
                if (!nextChar) {
                    startProperties.forEach(p => p.isDeleted = true);
                } else {
                    startProperties.forEach(p => p.startNode = nextChar);
                }
            }
        }
        getCellRange() {

        }
        getNextContainer(container) {
            var next = container.nextElementSibling;
            if (next && next.speedy && next.speedy.role == ELEMENT_ROLE.TEXT_BLOCK) {
                return next;
            }
            return null;
        }
        deleteRow(anchorNode) {
            const offsetY = anchorNode.speedy.offset.y;
            const right = anchorNode.speedy.next;
            const left = anchorNode.speedy.previous;
            const rowSpans = this.data.spans.filter(x => x.speedy.offset.y == offsetY);
            const start = rowSpans[0];
            const last = rowSpans[rowSpans.length - 1];
            const end = last.speedy.isLineBreak ? last.speedy.previous : last;
            this.deleteRange({ start, end });
            if (right) {
                const nextRow = this.data.spans.filter(x => x.speedy.offset.y > offsetY)[0];
                this.setCarotByNode(nextRow[0], CARET.LEFT);
            } else {
                const previousRows = this.data.spans.filter(x => x.speedy.offset.y < offsetY);
                const lastRow = previousRows[previousRows.length - 1];
                this.setCarotByNode(lastRow[0], CARET.LEFT);
            }
            this.updateOffsets();
        }
        createCaretWithNodeAsLeft(cell) {
            let cellBlock = this.getCurrentContainer(cell);
            if (cell.speedy.isLineBreak) {
                // check if it is on an empty line
                if (this.isContainerEmpty(cellBlock)) {
                    return {
                        left: null, right: cell, container: cellBlock, blockPosition: BLOCK_POSITION.START
                    };
                }
                const left = this.getPreviousCellInBlock(cell);
                return {
                    left: left, right: cell, container: cellBlock, blockPosition: BLOCK_POSITION.END
                };
            }
            let left = cell;
            let right = left.speedy.next;
            let blockPosition = this.getBlockPosition(cellBlock, right);
            const caret = {
                container: cellBlock, left, right, blockPosition
            };
            return caret;
        }
        innerJoin(inner, outer) {
            var joined = [];
            inner.forEach(i => {
                if (outer.some(o => o == i)) {
                    joined.push(i);
                }
            });
            return joined;
        }
        getCurrent() {
            var sel = window.getSelection();
            var current = sel!.anchorNode!.parentElement as HTMLElement;
            if (sel!.anchorOffset == 0) {
                current = current!.previousElementSibling as HTMLElement;
            }
            return current as SpeedyElement;
        }
        getCaret() {
            var sel = window.getSelection() as Selection; 
            const anchorNode = sel.anchorNode as SpeedyElement;
            var anchor = this.getParentSpan(sel.anchorNode);
            if (!anchor) {
                if (anchorNode) {
                    if (anchorNode.speedy) {
                        if (anchorNode.speedy.role == ELEMENT_ROLE.TEXT_BLOCK) {
                            return { container: anchorNode, left: null, right: anchorNode.speedy.startNode, blockPosition: BLOCK_POSITION.END };
                        }
                        if (anchorNode.speedy.role == ELEMENT_ROLE.ROOT) {
                            // Assume at the end of the document. What else CAN we assume?
                            const cells = this.getCells();
                            const len = cells.length;
                            const right = cells[len - 1];
                            const container = this.getCurrentContainer(right);
                            const previous = right.speedy.previous;
                            if (previous) {
                                const previousContainer = this.getCurrentContainer(previous);
                                if (previousContainer == container) {
                                    return { container, left: previous, right, blockPosition: BLOCK_POSITION.END };
                                }
                            }
                            return { container, left: null, right, blockPosition: BLOCK_POSITION.END };
                        }
                    }
                }
                return { left: null, right: null };
            }
            if (!anchor) {
                return { left: null, right: null };
            }
            const container = this.getCurrentContainer(anchor);
            const pair = this.getCaretPair(sel, anchor);
            // const atStart = container.speedy.startNode == pair.right; // && pair.left == null;
            const atStart = pair.left == null;
            const atEnd = pair.right.speedy.isLineBreak;
            if (atStart && atEnd) {
                if (!pair.right.speedy.isLineBreak) {
                    console.log("Error 0002: expected anchor to be EOL", { sel, anchor, anchorNode, container, atStart, atEnd });
                }
                // blank line: define this as the end of the line
                return {
                    left: pair.left, right: pair.right, container, blockPosition: BLOCK_POSITION.END
                };
            }
            if (atStart) {
                if (anchor.speedy.isLineBreak) {
                    return {
                        left: null, right: anchor, container, blockPosition: BLOCK_POSITION.END
                    };
                }
                else {
                    return {
                        left: pair.left, right: pair.right, container, blockPosition: BLOCK_POSITION.START
                    };
                }
            }
            if (atEnd) {
                if (!pair.right.speedy.isLineBreak) {
                    console.log("Error 0001: expected anchor to be EOL", { sel, anchor, anchorNode, container, atStart, atEnd });
                }
                return {
                    left: pair.left, right: pair.right, container, blockPosition: BLOCK_POSITION.END
                };
            }
            const caret = {
                left: pair.left, right: pair.right, container, blockPosition: BLOCK_POSITION.INSIDE
            };
            return caret;
            //var offset = sel.anchorOffset;
            //if (offset == CARET.LEFT) {
            //    const left = !atStart ? anchor.speedy.previous : null;
            //    const right = anchor;
            //    return { left, right, container, blockPosition: BLOCK_POSITION.INSIDE };
            //}
            //else {
            //    const left = anchor;
            //    const right = !atEnd ? anchor.speedy.next : null;
            //    return { left, right, container, blockPosition: BLOCK_POSITION.INSIDE };
            //}
        }
        getCaretPair(selection: Selection, anchor: SpeedyElement) {
            //if (anchor.speedy.isLineBreak) {
            //    return {
            //        left: null,
            //        right: anchor
            //    };
            //}
            var offset = selection.anchorOffset;
            const anchorContainer = this.getCurrentContainer(anchor);
            if (offset == 0) {
                const right = anchor;
                var left = anchor.speedy.previous;
                if (!left) {
                    return {
                        left: null, right
                    };
                }
                const leftContainer = this.getCurrentContainer(left);
                if (anchorContainer != leftContainer) {
                    return {
                        left: null, right
                    };
                }
                return { left, right };
            }
            else {
                if (anchor.speedy.isLineBreak) {
                    const previousToAnchor = anchor.speedy.previous;
                    const previousContainer = this.getCurrentContainer(previousToAnchor);
                    if (previousContainer == anchorContainer) {
                        return {
                            left: previousToAnchor,
                            right: anchor
                        };
                    }
                    else {
                        return {
                            left: null,
                            right: anchor
                        };
                    }
                }
                const left = anchor;
                var right = anchor.speedy.next;
                if (!right) {
                    return {
                        left, right: null
                    };
                }
                const rightContainer = this.getCurrentContainer(right);
                if (anchorContainer != rightContainer) {
                    return {
                        left, right: null
                    };
                }
                return { left, right };
            }
        }
        getBlockPosition(container: SpeedyElement, cell: SpeedyElement) {
            if (container.speedy.startNode == cell) {
                return BLOCK_POSITION.START;
            }
            if (container.speedy.endNode == cell) {
                return BLOCK_POSITION.END;
            }
            return BLOCK_POSITION.INSIDE;
        }
        getPreviousCellInBlock(cell: SpeedyElement) {
            const previous = cell.speedy.previous;
            if (!previous) {
                return null;
            }
            const blockOfCell = this.getCurrentContainer(cell);
            const blockOfPrevious = this.getCurrentContainer(previous);
            if (blockOfCell == blockOfPrevious) {
                return previous;
            }
            return null;
        }
        deleteRange(range: Range) {
            var cell = range.end;
            if (cell != range.start) {
                while (cell != range.start) {
                    const previous = cell.speedy.previous;
                    this.deleteCell({ updateCaret: false, cell });
                    cell = previous as SpeedyElement;
                }
            }
            this.deleteCell({ cell });
        }
        getSelection() {
            var range = this.getSelectionNodes();
            if (!range) {
                return null;
            }
            var text = this.getRangeText(range);
            return {
                text: text,
                startIndex: this.nodeIndex(range.start),
                endIndex: this.nodeIndex(range.end)
            };
        }
        canDelete(node: SpeedyElement) {
            return true;
        };
        clearSelectionMode() {
            this.mode.selection.start = null;
            this.mode.selection.end = null;
            this.mode.selection.direction = null;
        }
        rightSelection(evt, current) {
            console.log("rightSelection() {");
            if (this.mode.selection.direction == null) {
                console.log("... set direction to right");
                this.mode.selection.direction = SELECTION_DIRECTION.RIGHT;
            }
            if (this.mode.selection.direction == SELECTION_DIRECTION.RIGHT) {
                console.log("... heading right");
                if (!this.mode.selection.start) {
                    console.log("... set selection.start to current");
                    this.mode.selection.start = current;
                }
                if (!this.mode.selection.end) {
                    console.log("... set selection.end to next");
                    var next = this.getNextCharacterNode(current);
                    this.mode.selection.end = next;
                }
                else {
                    console.log("... set selection.end to one character beyond selection.end");
                    var next = this.getNextCharacterNode(this.mode.selection.end);
                    this.mode.selection.end = next;
                }
            } else if (this.mode.selection.direction == SELECTION_DIRECTION.LEFT) {
                console.log("... heading left");
                console.log("... get node from selection.start");
                var node = this.mode.selection.start;
                var next = this.getNextCharacterNode(node);
                if (next == this.mode.selection.end) {
                    console.log("... set selection.start to one beyond the next");
                    console.log("... set selection.end to the next");
                    console.log("... set selection.direction to right");
                    this.mode.selection.start = this.getNextCharacterNode(next);
                    this.mode.selection.end = next;
                    this.mode.selection.direction = SELECTION_DIRECTION.RIGHT;
                }
                if (this.nodeIndex(next) > this.nodeIndex(this.mode.selection.end)) {
                    console.log("... next character is beyond selection.end")
                    console.log("... set selection.end to next");
                    console.log("... set selection.start to prior selection.end");
                    var end = this.mode.selection.end;
                    this.mode.selection.end = next;
                    this.mode.selection.start = end;
                } else {
                    console.log("... set selection.start to next");
                    this.mode.selection.start = next;
                }
            }
            selections.push({ start: this.mode.selection.start, end: this.mode.selection.end });
            this.createSelection(this.mode.selection.start, this.mode.selection.end);
            // this.updateSelectors();
            console.log("}")
            console.log({ selections });
        }
        leftSelection(evt, current) {
            console.log("leftSelection() { ")
            if (this.mode.selection.direction == null) {
                console.log("... set direction to left")
                this.mode.selection.direction = SELECTION_DIRECTION.LEFT;
            }
            if (this.mode.selection.direction == SELECTION_DIRECTION.LEFT) {
                console.log("... heading left");
                if (!this.mode.selection.end) {
                    console.log("... set selection.end to current");
                    this.mode.selection.end = current;
                }
                if (!this.mode.selection.start) {
                    console.log("... set selection.start to previous of current");
                    var previous = this.getPreviousCharacterNode(current);
                    this.mode.selection.start = previous;
                }
                else {
                    console.log("... set selection.start to previous of selection.start");
                    var previous = this.getPreviousCharacterNode(this.mode.selection.start);
                    this.mode.selection.start = previous;
                }
            }
            else if (this.mode.selection.direction == SELECTION_DIRECTION.RIGHT) {
                console.log("... heading right");
                var node = this.mode.selection.end;
                var previous = this.getPreviousCharacterNode(node);
                if (previous == this.mode.selection.start) {
                    console.log("... set selection.start to one before previous");
                    console.log("... set selection.end to previous");
                    console.log("... set direction to left");
                    this.mode.selection.start = this.getPreviousCharacterNode(previous);
                    this.mode.selection.end = previous;
                    this.mode.selection.direction = SELECTION_DIRECTION.LEFT;
                }
                if (this.nodeIndex(previous) < this.nodeIndex(this.mode.selection.start)) {
                    console.log("... previous is earlier than selection.start");
                    console.log("... set selection.start to previous");
                    console.log("... set selection.end to prior start");
                    var start = this.mode.selection.start;
                    this.mode.selection.start = previous;
                    this.mode.selection.end = start;
                } else {
                    console.log("... set selection.end to previous");
                    this.mode.selection.end = previous;
                }
            }
            this.createSelection(this.mode.selection.start, this.mode.selection.end);
            //this.updateSelectors();
            console.log("}");
        }
        processDelete(data) {
            const { caret, range, event } = data;
            const canEdit = !!!this.lockText;
            if (!canEdit) {
                return;
            }
            const shiftDelete = this.event.keyboard["shift-DELETE"];
            if (shiftDelete && event.shiftKey) {
                shiftDelete({ editor: this, e: event });
                return;
            }
            const hasSelection = !!range;
            if (hasSelection) {
                this.deleteRange(range);
                return;
            }
            if (data.key == BACKSPACE) {
                const cell = caret.right.speedy.previous;
                if (cell) {
                    if (this.overrideBackspaceKey(cell)) {
                        return;
                    }
                    this.deleteCell({ cell });
                }
            } else if (data.key == DELETE) {
                const cell = caret.right;
                if (cell) {
                    if (this.overrideDeleteKey(cell)) {
                        return;
                    }
                    this.deleteCell({ cell });
                }
            }
        }
        isAtDocumentStart(caret) {
            if (caret.left) {
                return false;
            }
            const current = this.getCurrentContainer(caret.right);
            const blocks = this.data.blocks;
            if (current == blocks[0]) {
                return true;
            }
            return false;
        }
        isAtDocumentEnd(caret) {
            if (!caret.right.speedy.isLineBreak) {
                return false;
            }
            const current = this.getCurrentContainer(caret.right);
            const blocks = this.data.blocks;
            if (current == blocks[blocks.length - 1]) {
                return true;
            }
            return false;
        }
        processRightArrow(data) {
            const { caret, event: e } = data;
            if (e.shiftKey) {
                if (caret.right) {
                    if (caret.right.speedy.next) {
                        this.rightSelection(e, caret.right);
                        return true;
                    }
                    return;
                }
            }
            if (this.event.keyboard["!RIGHT-ARROW"]) {
                this.event.keyboard["!RIGHT-ARROW"]({ editor: this, e: event, caret });
                return true;
            }
            if (this.isAtDocumentEnd(caret)) {
                if (this.event.keyboard["RIGHT-ARROW:end-of-document"]) {
                    this.event.keyboard["RIGHT-ARROW:end-of-document"]({ editor: this, e: event, caret });
                    return true;
                }
            }
            if (!caret.right) {
                if (!caret.left.speedy.next) {
                    return;
                }
                this.setCarotByNode(caret.left.speedy.next, CARET.LEFT);
                return;
            }
            if (caret.right.speedy.isLineBreak) {
                // skip over carriage return
                this.setCarotByNode(caret.right.speedy.next, CARET.LEFT);
                return;
            }
            this.clearSelectionMode();
            const next = caret.right;
            if (next) {
                this.setCarotByNode(next, CARET.RIGHT);
            } else {
                this.setCarotByNode(caret.left, CARET.RIGHT);
            }
            this.updateCurrentRanges();
        }
        processLeftArrow(data) {
            const { caret, event: e } = data;
            var current = caret.left || caret.right;
            if (e.shiftKey) {
                if (caret.left) {
                    this.leftSelection(e, caret.left);
                }
                return;
            }
            if (this.event.keyboard["!LEFT-ARROW"]) {
                this.event.keyboard["!LEFT-ARROW"]({ editor: this, e: event, caret });
                return true;
            }
            if (this.isAtDocumentStart(caret)) {
                if (this.event.keyboard["LEFT-ARROW:start-of-document"]) {
                    this.event.keyboard["LEFT-ARROW:start-of-document"]({ editor: this, e: event, caret });
                    return true;
                }
            }
            if (!caret.left) {
                if (!caret.right.speedy.previous) {
                    return;
                }
                const previous = caret.right.speedy.previous;
                if (previous.speedy.isLineBreak) {
                    const previousBlock = this.getCurrentContainer(previous);
                    if (previousBlock.speedy.startNode == previous) {
                        // only character in block is a line break
                        this.setCarotByNode(previous, CARET.LEFT);
                    } else {
                        this.setCarotByNode(previous.speedy.previous, CARET.RIGHT);
                    }
                }
                else {
                    this.setCarotByNode(previous, CARET.LEFT);
                }
                return;
            }
            if (caret.left.speedy.isLineBreak) {
                this.setCarotByNode(caret.left, CARET.LEFT);
                return;
            }
            this.clearSelectionMode();
            this.setCarotByNode(caret.left, CARET.LEFT);
            this.updateCurrentRanges();
        }
        processHomeAndEndKeys(data) {
            const { caret, key } = data;
            if (key == HOME) {
                if (this.event.keyboard["!HOME"]) {
                    this.event.keyboard["!HOME"]({ editor: this, caret });
                    return true;
                }
            }
            if (key == END) {
                if (this.event.keyboard["!END"]) {
                    this.event.keyboard["!END"]({ editor: this, caret });
                    return true;
                }
            }
            const cursor = caret.right || caret.left;
            const { offset } = cursor.speedy;
            const { x } = offset, { cy } = offset;
            const deltaY = 0;
            const cells = this.getClosestRowOfCellsByOffset({ x, y: cy, verticalOffset: deltaY });
            if (cells.length == 0) {
                return false;
            }
            if (key == HOME) {
                this.setCarotByNode(cells[0], CARET.LEFT);
                return true;
            }
            if (key == END) {
                const len = cells.length;
                const last = cells[len - 1];
                const isLineBreakOrSpace = last.speedy.isLineBreak || last.speedy.isSpace;
                const caretPos = isLineBreakOrSpace ? CARET.LEFT : CARET.RIGHT;
                //this.setCarotByNode(last, caretPos);
                this.setCarotByNode(cells[len - 2], CARET.RIGHT);
                return true;
            }
            return false;
        }
        processPageKeys(data) {
            const { caret, key } = data;
            const cursor = caret.right || caret.left;
            const { offset } = cursor.speedy;
            const { x } = offset, { cy } = offset;
            const rect = this.container.getBoundingClientRect();
            const buffer = 20;
            const ch = rect.height - 20;
            const deltaY = key == PAGE_UP ? (-1 * ch) : ch;
            this.container.scrollBy(0, deltaY);
            const cells = this.getClosestRowOfCellsByOffset({ x, y: cy, verticalOffset: deltaY });
            if (cells.length == 0) {
                return true;
            }
            const leftMatches = cells.filter(c => c.speedy.offset.x < x);
            if (leftMatches.length) {
                this.setCarotByNode(leftMatches[leftMatches.length - 1], CARET.LEFT);
                return true;
            }
            const rightMatches = cells.filter(c => c.speedy.offset.x >= x);
            if (rightMatches.length) {
                this.setCarotByNode(rightMatches[0], CARET.LEFT);
                return true;
            }
            return false;
        }
        processControlHomeAndEndKeys(args) {
            const { caret, key } = args;
            const offset = caret.right.speedy.offset;
            if (key == HOME) {
                let first = this.getFirstContainer();
                let node = first.speedy.startNode;
                let deltaY = node.speedy.offset.cy - offset.cy - 20;
                this.setCarotByNode(node, CARET.LEFT, deltaY);
                this.container.scrollBy(0, deltaY);
                return true;
            }
            if (key == END) {
                let containers = this.getContainers();
                let last = containers[containers.length - 1];
                let node = last.speedy.endNode;
                let deltaY = node.speedy.offset.cy - offset.cy + 30;
                this.setCarotByNode(node, CARET.LEFT, deltaY);
                this.container.scrollBy(0, deltaY);
                return true;
            }
            return false;
        }
        processAltArrows(data) {
            const { caret, key, event } = data;
            if (event.ctrlKey && event.shiftKey) {
                if (key == LEFT_ARROW) {
                    if (this.event.keyboard["control-shift-alt-LEFT-ARROW"]) {
                        this.event.keyboard["control-shift-alt-LEFT-ARROW"]({ editor: this, e: event, caret });
                        return true;
                    }
                }
                if (key == RIGHT_ARROW) {
                    if (this.event.keyboard["control-shift-alt-RIGHT-ARROW"]) {
                        this.event.keyboard["control-shift-alt-RIGHT-ARROW"]({ editor: this, e: event, caret });
                        return true;
                    }
                }
            }
            if (event.ctrlKey) {
                if (key == LEFT_ARROW) {
                    if (this.event.keyboard["control-alt-LEFT-ARROW"]) {
                        this.event.keyboard["control-alt-LEFT-ARROW"]({ editor: this, e: event, caret });
                        return true;
                    }
                }
                if (key == RIGHT_ARROW) {
                    if (this.event.keyboard["control-alt-RIGHT-ARROW"]) {
                        this.event.keyboard["control-alt-RIGHT-ARROW"]({ editor: this, e: event, caret });
                        return true;
                    }
                }
            }
            if (key == LEFT_ARROW) {
                if (this.event.keyboard["alt-LEFT-ARROW"]) {
                    this.event.keyboard["alt-LEFT-ARROW"]({ editor: this, e: event, caret });
                    return true;
                }
            }
            if (key == RIGHT_ARROW) {
                if (this.event.keyboard["alt-RIGHT-ARROW"]) {
                    this.event.keyboard["alt-RIGHT-ARROW"]({ editor: this, e: event, caret });
                    return true;
                }
            }
            if (key == UP_ARROW) {
                if (this.event.keyboard["alt-UP-ARROW"]) {
                    this.event.keyboard["alt-UP-ARROW"]({ editor: this, e: event, caret });
                    return true;
                }
            }
            if (key == DOWN_ARROW) {
                if (this.event.keyboard["alt-DOWN-ARROW"]) {
                    this.event.keyboard["alt-DOWN-ARROW"]({ editor: this, e: event, caret });
                    return true;
                }
            }
            return false;
        }
        processControlArrows(data) {
            const { caret, key, event } = data;
            const cursor = caret.right || caret.left;
            if (cursor.speedy.role != ELEMENT_ROLE.CELL) {
                return false;
            }
            const container = this.getCurrentContainer(cursor);
            this.verticalArrowNavigation.lastX = null;
            if (event.shiftKey) {
                if (event.altKey) {
                    if (key == LEFT_ARROW) {
                        if (this.event.keyboard["control-shift-alt-LEFT-ARROW"]) {
                            this.event.keyboard["control-shift-alt-LEFT-ARROW"]({ editor: this, e: event, caret });
                            return true;
                        }
                    }
                    if (key == RIGHT_ARROW) {
                        if (this.event.keyboard["control-shift-alt-RIGHT-ARROW"]) {
                            this.event.keyboard["control-shift-alt-RIGHT-ARROW"]({ editor: this, e: event, caret });
                            return true;
                        }
                    }
                }
                if (key == LEFT_ARROW) {
                    if (this.event.keyboard["control-shift-LEFT-ARROW"]) {
                        this.event.keyboard["control-shift-LEFT-ARROW"]({ editor: this, e: event, caret });
                        return true;
                    }
                }
                if (key == RIGHT_ARROW) {
                    if (this.event.keyboard["control-shift-RIGHT-ARROW"]) {
                        this.event.keyboard["control-shift-RIGHT-ARROW"]({ editor: this, e: event, caret });
                        return true;
                    }
                }
                if (key == UP_ARROW) {
                    if (this.event.keyboard["control-shift-UP-ARROW"]) {
                        this.event.keyboard["control-shift-UP-ARROW"]({ editor: this, e: event, caret });
                        return true;
                    }
                }
                if (key == DOWN_ARROW) {
                    if (this.event.keyboard["control-shift-DOWN-ARROW"]) {
                        this.event.keyboard["control-shift-DOWN-ARROW"]({ editor: this, e: event, caret });
                        return true;
                    }
                }
            }
            else if (event.altKey) {
                
                if (key == LEFT_ARROW) {
                    if (this.event.keyboard["control-alt-LEFT-ARROW"]) {
                        this.event.keyboard["control-alt-LEFT-ARROW"]({ editor: this, e: event, caret });
                        return true;
                    }
                }
                if (key == RIGHT_ARROW) {
                    if (this.event.keyboard["control-alt-RIGHT-ARROW"]) {
                        this.event.keyboard["control-alt-RIGHT-ARROW"]({ editor: this, e: event, caret });
                        return true;
                    }
                }
            }
            else {
                if (key == LEFT_ARROW) {
                    if (this.event.keyboard["control-LEFT-ARROW"]) {
                        this.event.keyboard["control-LEFT-ARROW"]({ editor: this, e: event, caret });
                        return true;
                    }
                    let end = cursor.speedy.previous && cursor.speedy.previous.speedy.isSpace ? cursor.speedy.previous : cursor;
                    let start = this.getWordStart(end);
                    this.setCarotByNode(start, CARET.LEFT);
                    return true;
                }
                if (key == RIGHT_ARROW) {
                    if (this.event.keyboard["control-RIGHT-ARROW"]) {
                        this.event.keyboard["control-RIGHT-ARROW"]({ editor: this, e: event, caret });
                        return true;
                    }
                    let end = this.getWordEnd(cursor);
                    this.setCarotByNode(end, CARET.RIGHT);
                    return true;
                }
                if (key == UP_ARROW) {
                    if (caret.left) {
                        this.setCarotByNode(container.speedy.startNode, CARET.LEFT);
                        return true;
                    } else {
                        if (container.speedy.previousContainer) {
                            this.setCarotByNode(container.speedy.previousContainer.speedy.startNode, CARET.LEFT);
                            return true;
                        }
                    }
                }
                if (key == DOWN_ARROW) {
                    if (!caret.right.speedy.isLineBreak) {
                        this.setCarotByNode(container.speedy.endNode, CARET.LEFT);
                        return true;
                    } else {
                        if (container.speedy.getNextContainer) {
                            this.setCarotByNode(container.speedy.getNextContainer.speedy.endNode, CARET.LEFT);
                            return true;
                        }
                    }
                }
            }
            return false;
        }
        processArrows(data) {
            const { caret, event } = data;
            if (data.key == RIGHT_ARROW || data.key == LEFT_ARROW) {
                this.verticalArrowNavigation.lastX = null;
            };
            if (data.key == RIGHT_ARROW) {
                this.processRightArrow(data);
                return true;
            }
            if (data.key == LEFT_ARROW) {
                this.processLeftArrow(data);
                return true;
            }
            const cursor = caret.right || caret.left;
            const { offset } = cursor.speedy;
            const lineHeight = offset.h || 14; //24 ;; // this.getComputedPropertyPixels(cursor, "line-height");
            if (!offset) {
                console.log("offset undefined", { cursor });
                return;
            }
            if (data.key == UP_ARROW || data.key == DOWN_ARROW) {
                if (this.verticalArrowNavigation.lastX == null) {
                    this.verticalArrowNavigation.lastX = offset.x;
                }
            }
            if (data.key == DOWN_ARROW) {
                if (this.event.keyboard["!DOWN-ARROW"]) {
                    this.event.keyboard["!DOWN-ARROW"]({ editor: this, e: event, caret });
                    return true;
                }
            }
            if (data.key == UP_ARROW) {
                if (this.event.keyboard["!UP-ARROW"]) {
                    this.event.keyboard["!UP-ARROW"]({ editor: this, e: event, caret });
                    return true;
                }
            }
            const x = this.verticalArrowNavigation.lastX;
            const y = offset.cy;
            const verticalOffset = data.key == UP_ARROW ? -Math.abs(lineHeight) : lineHeight;
            const cells = this.getClosestRowOfCellsByOffset({ x, y, verticalOffset });
            if (cells.length == 0) {
                if (data.key == DOWN_ARROW) {
                    if (this.event.keyboard["DOWN-ARROW:end-of-document"]) {
                        this.event.keyboard["DOWN-ARROW:end-of-document"]({ editor: this, e: event, caret });
                        return true;
                    }
                }
                if (data.key == UP_ARROW) {
                    if (this.event.keyboard["UP-ARROW:end-of-document"]) {
                        this.event.keyboard["UP-ARROW:end-of-document"]({ editor: this, e: event, caret });
                        return true;
                    }
                }
                return true;
            }

            const leftMatches = cells.filter(c => c.speedy.offset.x < x);
            if (leftMatches.length) {
                if (leftMatches.length == 2) {
                    this.setCarotAndScroll(leftMatches[leftMatches.length - 2], CARET.RIGHT, verticalOffset > 0);
                } else {
                    this.setCarotAndScroll(leftMatches[leftMatches.length - 1], CARET.LEFT, verticalOffset > 0);
                }
                return true;
            }
            const rightMatches = cells.filter(c => c.speedy.offset.x >= x);
            if (rightMatches.length) {
                this.setCarotAndScroll(rightMatches[0], CARET.LEFT, verticalOffset > 0);
                return true;
            }
            return false;
        }
        setCarotAndScroll(node, caret, down, deltaY) {
            this.setCarotByNode(node, caret);
            deltaY = deltaY || node.speedy.offset.h + 15;
            const scrollTop = this.container.scrollTop;
            const posY = node.speedy.offset.cy - scrollTop;
            const bufferY = 10;
            const ch = this.container.offsetHeight;
            if (down) {
                if (posY >= ch - bufferY) {
                    this.container.scrollBy(0, deltaY);
                }
            } else {
                if (node.speedy.offset.cy <= scrollTop + bufferY) {
                    this.container.scrollBy(0, (-1 * deltaY));
                }
            }
        }
        getClosestRowOfCellsByOffset(args) {
            const { x, y, verticalOffset } = args;
            const nextRowOffsetY = y + verticalOffset;
            if (nextRowOffsetY < 0) {
                return [];
            }
            const nextCells = this.data.spans
                .filter(x => !!x.speedy.offset)
                .filter(x => verticalOffset > 0 ? x.speedy.offset.cy >= nextRowOffsetY : x.speedy.offset.cy <= nextRowOffsetY);
            if (nextCells.length == 0) {
                return [];
            }
            const rows = Array.from(groupBy(nextCells, x => x.speedy.offset.cy));
            const ordered = rows.sort((a, b) => a[0] > b[0] ? 1 : a[0] < b[0] ? -1 : 0);
            const group = verticalOffset > 0 ? ordered[0] : ordered[ordered.length - 1];
            return group[1];
        }
        getComputedProperty(node, propertyName) {
            return document.defaultView.getComputedStyle(node, null).getPropertyValue(propertyName);
        }
        getComputedPropertyPixels(node, propertyName) {
            return parseFloat(this.getComputedProperty(node, propertyName).replace("px", ""));
        }
        invokeKeyBindings(keybindingPrefix, properties, propsAtCaret, e) {
            var processed = false;
            let code = e.key.toUpperCase();
            if (e.keyCode == LEFT_ARROW) {
                code = "LEFT-ARROW";
            }
            if (e.keyCode == RIGHT_ARROW) {
                code = "RIGHT-ARROW";
            }
            if (e.keyCode == UP_ARROW) {
                code = "UP-ARROW";
            }
            if (e.keyCode == DOWN_ARROW) {
                code = "DOWN-ARROW";
            }
            properties.forEach(cp => {
                let keyboard = cp.schema.event.keyboard;
                let handlerName = keybindingPrefix + code;
                if (keyboard[handlerName]) {
                    keyboard[handlerName](cp, e);
                    processed = true;
                }
            });
            let keyboard = this.event.keyboard;
            if (keyboard) {
                let handlerName = keybindingPrefix + code;
                if (keyboard[handlerName]) {
                    keyboard[handlerName]({ properties: propsAtCaret, editor: this, e: e });
                    processed = true;
                }
            }
            return processed;
        }
        processControlOrMeta(data) {
            const _this = this;
            const { caret } = data;
            const { key, keyCode } = event;
            var canAnnotate = !!!this.lockProperties;
            var propsAtCaret = this.getCurrentRanges(caret.left || caret.right);
            var props = propsAtCaret.filter(x => x.schema.event && x.schema.event.keyboard);
            var control = data.event.ctrlKey && data.event.key != "Control",
                shift = data.event.shiftKey && data.event.key != "Shift",
                meta = data.event.metaKey && data.event.key != "Meta",
                alt = data.event.altKey && data.event.key != "Alt";
            const invokeKeyBindings = (keyBindingPrefix) => {
                return _this.invokeKeyBindings(keyBindingPrefix, props, propsAtCaret, data.event);
            };
            var processed = false;
            if (control) {
                if (not([shift, alt, meta])) {
                    processed = invokeKeyBindings("control-");
                }
                if (shift && not([alt, meta])) {
                    processed = invokeKeyBindings("control-shift-");
                }
                if (alt && not([shift, meta])) {
                    processed = invokeKeyBindings("control-alt-");
                }
            }
            if (alt) {
                if (not([control, shift, meta])) {
                    processed = invokeKeyBindings("alt-");
                }
            }
            if (meta) {
                if (this.event.keyboard["alt-RIGHT-ARROW"]) {
                    this.event.keyboard["alt-RIGHT-ARROW"]({ editor: this, e: event, caret });
                    return true;
                }
                if (not([control, shift, alt])) {
                    processed = invokeKeyBindings("meta-");
                }
            }
            if (canAnnotate) {
                if (data.event.key == "Control" || data.event.key == "Meta") {
                    return processed;
                }
                var propertyTypeName = this.getPropertyTypeNameFromShortcutKey(data.event.key);
                if (propertyTypeName) {
                    data.event.preventDefault();
                    this.createProperty(propertyTypeName);
                    processed = true;
                }
            }
            return processed;
        }
        processEscape(data) {
            const { caret, properties } = data;
            var processed = false;
            if (this.event.keyboard["!ESCAPE"]) {
                this.event.keyboard["!ESCAPE"]({ caret, editor: this });
                processed = true;
                return processed;
            }
            if (data.event.keyCode == ESCAPE) {
                if (properties) {
                    properties.forEach(cp => {
                        var keyboard = cp.schema.event.keyboard;
                        if (keyboard["esc"]) {
                            keyboard["esc"](cp);
                            processed = true;
                        }
                    });
                }
                if (debugChainBreaks) {
                    console.log("debugChainBreaks:ESCAPE", { caret });
                }
            }
            return processed;
        }
        processCapslock(data) {
            const { caret, event } = data;
            var processed = false;
            if (this.event.keyboard["!CAPSLOCK"]) {
                this.event.keyboard["!CAPSLOCK"]({ editor: this, caret, event });
                processed = true;
                return processed;
            }
            return processed;
        }
        getModifiers(e) {
            return {
                control: e.ctrlKey && e.key != "Control",
                shift: e.shiftKey && e.key != "Shift",
                meta: e.metaKey && e.key != "Meta",
                alt: e.altKey && e.key != "Alt",
            };
        }
        processTab(data) {
            const { caret, event } = data;
            var processed = false;
            if (this.event.keyboard["!TAB"]) {
                this.event.keyboard["!TAB"]({ editor: this, caret, event });
                processed = true;
                return processed;
            }
            const { control, shift, meta, alt } = this.getModifiers(event);
            if (data.event.keyCode == TAB) {
                if (shift) {
                    if (not([control, alt, meta])) {
                        if (this.event.keyboard["shift-TAB"]) {
                            this.event.keyboard["shift-TAB"]({ editor: this, e: event, caret });
                            processed = true;
                        }
                    }
                } else {
                    if (this.event.keyboard["TAB"]) {
                        this.event.keyboard["TAB"]({ editor: this, e: event, caret });
                        processed = true;
                    }
                }
            }
            return processed;
        }
        processSelectionOverwrite(data) {
            const { caret } = data;
            this.deleteRange(data.range);
            const right = caret.right.speedy.next;
            const newCaret = {
                left: caret.left,
                right: right,
                container: this.getCurrentContainer(right)
            };
            if (data.key == ENTER) {
                this.processEnter({ ...data, caret: newCaret });
            } else {
                this.insertCharacter({ ...data, caret: newCaret });
            }
        }
        insertText(text) {

        }
        handleCaretMoveEvent(e, caret) {
            if (this.event.input) {
                if (this.event.input.caretMoved) {
                    const cursor = caret.left || caret.right;
                    const properties = this.getCurrentRanges(cursor);
                    this.event.input.caretMoved({ editor: this, caret, e, properties });
                }
            }
        }
        processCharacterOverrides(args) {
            const { evt, caret } = args;
            if (this.event.keyboard["CHAR:" + evt.key]) {
                this.event.keyboard["CHAR:" + evt.key]({ editor: this, caret, event: evt });
                return true;
            }
            if (evt.ctrlKey || evt.altKey || evt.metaKey) {
                return false;
            }
            const propsAtCaret = this.getCurrentRanges(caret.left || caret.right);
            const props = propsAtCaret.filter(x => x.schema.event && x.schema.event.keyboard);
            const charEvents = props.filter(p => p.schema.event.keyboard["CHAR:" + evt.key]);
            if (charEvents.length) {
                charEvents.forEach(p => p.schema.event.keyboard["CHAR:" + evt.key]({ property: p, caret }));
                return true;
            }
            return false;
        }
        handleKeyDownEvent(evt) {
            var _ = this;
            var canEdit = !!!this.lockText;
            var caret = this.getCaret();
            var key = (evt.which || evt.keyCode);               // get the inputted key
            var range = this.getSelectionNodes();               // get the mouse selection range, if any
            var hasSelection = !!range;
            this.handleCaretMoveEvent(evt, caret);
            if (this.processCharacterOverrides({ caret, evt })) {
                evt.preventDefault();
                return;
            }
            if (PASSTHROUGH_CHARS.indexOf(key) >= 0) {
                return true;
            }
            if (!evt.ctrlKey && !evt.metaKey && !evt.altKey) {
                if (key == HOME || key == END) {
                    const prevent = this.processHomeAndEndKeys({ key, event: evt, caret });
                    if (prevent) {
                        evt.preventDefault();
                    }
                    return;
                }
                if (key == PAGE_UP || key == PAGE_DOWN) {
                    const prevent = this.processPageKeys({ key, event: evt, caret });
                    if (prevent) {
                        evt.preventDefault();
                    }
                    return;
                }
                if (key == RIGHT_ARROW || key == LEFT_ARROW || key == DOWN_ARROW || key == UP_ARROW) {
                    const prevent = this.processArrows({ key, event: evt, caret });
                    if (prevent) {
                        evt.preventDefault();
                    }
                    return;
                }
                if (key == CAPSLOCK) {
                    const prevent = this.processCapslock({ key, event: evt, caret });
                    if (prevent) {
                        evt.preventDefault();
                        return;
                    }
                    return true;
                }
                if (key == TAB) {
                    const prevent = this.processTab({ key, event: evt, caret });
                    if (prevent) {
                        evt.preventDefault();
                        return;
                    }
                }
                if (key == ESCAPE) {
                    const prevent = this.processEscape({ key, event: evt, caret });
                    if (prevent) {
                        evt.preventDefault();
                    }
                    return;
                }
                if (false == canEdit) {
                    return;
                }
                if (key == ENTER) {
                    evt.preventDefault();
                    if (hasSelection) {
                        this.processSelectionOverwrite({ event: evt, range, caret, key });
                        return;
                    }
                    this.processEnter({ key, event: evt, caret });
                    return;
                }
                if (key == BACKSPACE || key == DELETE) {
                    evt.preventDefault();
                    if (hasSelection) {
                        this.deleteRange(range);
                        return;
                    } else {
                        this.processDelete({ key, range, caret, event: evt });
                    }
                    return;
                }
                if (hasSelection) {
                    this.processSelectionOverwrite({ event: evt, range, key, caret, key });
                    evt.preventDefault();
                    return;
                }
                // Must be inserting a regular character
                evt.preventDefault();
                this.insertCharacter({ event: evt, key, caret });
                return;
            }
            if (evt.altKey) {
                if (key == RIGHT_ARROW || key == LEFT_ARROW || key == DOWN_ARROW || key == UP_ARROW) {
                    const prevent = this.processAltArrows({ key, event: evt, caret });
                    if (prevent) {
                        evt.preventDefault();
                    }
                    return;
                }
            }
            if (evt.ctrlKey || evt.metaKey || evt.shiftKey || evt.keyCode == ESCAPE || evt.keyCode == TAB) {
                if (evt.ctrlKey) {
                    if (key == BACKSPACE) {
                        this.processControlBackspace({ key, caret, event: evt });
                        evt.preventDefault();
                        return;
                    }
                    if (key == RIGHT_ARROW || key == LEFT_ARROW || key == DOWN_ARROW || key == UP_ARROW) {
                        const prevent = this.processControlArrows({ key, event: evt, caret });
                        if (prevent) {
                            evt.preventDefault();
                            return;
                        }
                    }
                    if (key == HOME || key == END) {
                        const prevent = this.processControlHomeAndEndKeys({ key, event: evt, caret });
                        if (prevent) {
                            evt.preventDefault();
                        }
                        return;
                    }
                }
                var processed = this.processControlOrMeta({ event: evt, caret });
                if (processed) {
                    evt.preventDefault();
                }
                return;
            }
        }
        processControlBackspace(args) {
            const { caret } = args;
            const end = caret.left || caret.right;
            const start = this.getWordStart(end);
            const range = { start, end };
            this.deleteRange(range);
        }
        getWordStart(cell) {
            var node = cell;
            if (cell.speedy.isSpace) {
                node = node.speedy.previous;
            }
            const container = this.getCurrentContainer(cell);
            var start = null;
            var loop = true;
            const separators = "[](),;.:".split('');
            while (loop) {
                let previous = node.speedy.previous;
                if (previous) {
                    if (previous.speedy.isSpace || separators.indexOf(this.getTextContent(previous)) >= 0) {
                        start = node;
                        loop = false;
                        continue;
                    }
                    node = previous;
                }
                else {
                    start = node;
                    loop = false;
                    continue;
                }
                if (container.speedy.startNode == node) {
                    start = node;
                    loop = false;
                    continue;
                }
            }
            return start;
        }
        getWordEnd(cell) {
            var node = cell;
            if (cell.speedy.isSpace) {
                node = node.speedy.next;
            }
            const container = this.getCurrentContainer(cell);
            var end = null;
            var loop = true;
            const separators = "[](),;.:".split('');
            while (loop) {
                let next = node.speedy.next;
                if (next) {
                    if (next.speedy.isSpace || separators.indexOf(this.getTextContent(next)) >= 0) {
                        end = node;
                        loop = false;
                        continue;
                    }
                    node = next;
                }
                else {
                    end = node;
                    loop = false;
                    continue;
                }
                if (container.speedy.endNode == node) {
                    end = node;
                    loop = false;
                    continue;
                }
            }
            return end;
        }
        processOverrideShiftEnter(args) {
            const { event: e, container } = args;
            const overrideShiftEnter = this.event.keyboard["!shift-ENTER"];
            if (overrideShiftEnter != "ENTER") {
                return false;
            }
            if (!e.shiftKey) {
                return false;
            }
            overrideShiftEnter({ currentBlock: container, editor: this });
            return true;
        }
        processOverrideEnter(args) {
            const { container, event: e } = args;
            if (e.shiftKey) {
                return false;
            }
            const overrideEnter = this.event.keyboard["!ENTER"];
            if (overrideEnter) {
                overrideEnter({ currentBlock: container, editor: this });
                return true;
            }
            return false;
        }
        getSiblingCellsToBlockEnd(node) {
            const currentBlock = this.getCurrentContainer(node);
            var siblings = [];
            let loop = true;
            while (loop && !!node) {
                siblings.push(node);
                const next = node.speedy.next;
                const nextCharContainer = this.getContainer(next);
                if (nextCharContainer != currentBlock) {
                    loop = false;
                    continue;
                }
                node = next;
            }

            return siblings;
        }
        processEnter(args) {
            const _this = this;
            const { caret } = args;
            const currentBlock = caret.container;
            if (this.processOverrideShiftEnter(args)) {
                return;
            }
            if (this.processOverrideEnter(args)) {
                return;
            }
            var newBlock = this.newTextBlock();
            if (this.onBlockCreated) {
                this.onBlockCreated({
                    blockNode: newBlock
                });
            }
            const previous = caret.right.speedy.previous;
            const originalNextBlock = currentBlock.speedy.nextTextBlock;
            const carriageReturn = this.newCarriageReturn();
            // Move rightward cells to the new block
            const siblings = this.getSiblingCellsToBlockEnd(caret.right);
            const first = siblings[0], last = siblings[siblings.length - 1];
            siblings.forEach(s => newBlock.appendChild(s));
            this.insertNewBlock(currentBlock, newBlock);
            currentBlock.appendChild(carriageReturn);
            if (!caret.left) {
                currentBlock.speedy.startNode = carriageReturn;
            }
            currentBlock.speedy.endNode = carriageReturn;
            if (previous) {
                previous.speedy.next = carriageReturn;
            }
            carriageReturn.speedy.previous = previous;
            carriageReturn.speedy.next = first;
            first.speedy.previous = carriageReturn;
            newBlock.speedy.startNode = first;
            newBlock.speedy.endNode = last;
            currentBlock.speedy.nextTextBlock = newBlock;
            newBlock.speedy.previousTextBlock = currentBlock;
            newBlock.speedy.nextTextBlock = originalNextBlock;
            if (originalNextBlock) {
                originalNextBlock.speedy.previousTextBlock = newBlock;
            }
            this.setCarotByNode(first, CARET.LEFT);
            if (this.onBlockAdded) {
                this.onBlockAdded({
                    blockNode: newBlock
                });
            }
            if (this.event.keyboard["ENTER"]) {
                this.event.keyboard["ENTER"]({ currentBlock: currentBlock, newBlock: newBlock });
            }
            const blockProperties = this.data.properties.filter(p => {
                return p.blockNode && currentBlock == _this.getCurrentContainer(p.blockNode);
            });
            if (blockProperties.length) {
                blockProperties.forEach(p => {
                    var schema = p.schema;
                    if (schema.event) {
                        if (schema.event.keyboard) {
                            if (schema.event.keyboard["ENTER"]) {
                                schema.event.keyboard["ENTER"]({ property: p, currentBlock: currentBlock, newBlock: newBlock });
                            }
                        }
                    }
                });
            }
            if (this.onTextChanged) {
                const onTextChangedArgs = this.createOnTextChangedData({
                    caret, action: "enter"
                });
                this.onTextChanged({ ...onTextChangedArgs, cell: carriageReturn });
            }
            this.setMarked();
            this.updateOffsets();
            return carriageReturn;
        }
        insertNewBlock(currentBlock, newBlock) {
            const hasNextBlock = currentBlock.nextElementSibling;
            if (hasNextBlock) {
                currentBlock.parentNode.insertBefore(newBlock, currentBlock.nextElementSibling);
            } else {
                currentBlock.parentNode.appendChild(newBlock);
            }
        }
        createSpan(data) {
            var span = this.newSpan();
            if (!data) {
                return span;
            }
            span.textContent = data.event.key;
            this.handleSpecialChars(span, data.key);
            //this.attachNextPreviousMouseoverEvents(span);
            return span;
        }
        addCellToChain(data) {
            const { cell, right } = data;
            const previous = right.speedy.previous;
            previous.speedy.next = cell;
            cell.speedy.previous = previous;
            cell.speedy.next = right;
            right.speedy.previous = cell;
        }
        debugHighlightTextBlock(block) {
            const sn = "debug-text-block-start-node";
            const en = "debug-text-block-end-node";
            block.classList.add("debug-text-block-current");
            if (block.speedy.startNode) {
                block.speedy.startNode.classList.add(sn);
            }
            if (block.speedy.endNode) {
                block.speedy.endNode.classList.add(en);
            }
            const previous = block.speedy.previousTextBlock;
            if (previous) {
                previous.classList.add("debug-text-block-previous");
                if (previous.speedy.startNode) {
                    previous.speedy.startNode.classList.add(sn);
                }
                if (previous.speedy.endNode) {
                    previous.speedy.endNode.classList.add(en);
                }
            }
            const next = block.speedy.nextTextBlock;
            if (next) {
                next.classList.add("debug-text-block-next");
                if (next.speedy.startNode) {
                    next.speedy.startNode.classList.add(sn);
                }
                if (next.speedy.endNode) {
                    next.speedy.endNode.classList.add(en);
                }
            }
        }
        debugUnhighlightTextBlock(block) {
            const sn = "debug-text-block-start-node";
            const en = "debug-text-block-end-node";
            block.classList.remove("debug-text-block-current");
            if (block.speedy.startNode) {
                block.speedy.startNode.classList.remove(sn);
            }
            if (block.speedy.endNode) {
                block.speedy.endNode.classList.remove(en);
            }
            const previous = block.speedy.previousTextBlock;
            if (previous) {
                previous.classList.remove("debug-text-block-previous");
                if (previous.speedy.startNode) {
                    previous.speedy.startNode.classList.remove(sn);
                }
                if (previous.speedy.endNode) {
                    previous.speedy.endNode.classList.remove(en);
                }
            }
            const next = block.speedy.nextTextBlock;
            if (next) {
                next.classList.remove("debug-text-block-next");
                if (next.speedy.startNode) {
                    next.speedy.startNode.classList.remove(sn);
                }
                if (next.speedy.endNode) {
                    next.speedy.endNode.classList.remove(en);
                }
            }
        }
        getCurrentContainer(current) {
            if (current) {
                if (current.speedy.role == ELEMENT_ROLE.ROOT) {
                    return this.container.firstChild;
                }
                return this.getContainer(current);
            }
            return this.container.firstChild;
        }
        getCurrentBlock(current) {
            if (current) {
                return this.getBlock(current);
            }
            return this.container.firstChild;
        }
        updateSpanLinks(span, caret) {
            if (!caret.left || !caret.right) {
                this.mark();
                if (!caret.left) {
                    var ri = this.data.spans.indexOf(caret.right);
                    caret.left = this.data.spans[ri - 1];
                }
                if (!caret.right) {
                    var li = this.data.spans.indexOf(caret.left);
                    caret.right = this.data.spans[li + 1];
                }
            }
            if (caret.left) {
                caret.left.speedy.next = span;
            }
            span.speedy.previous = caret.left;
            span.speedy.next = caret.right;
            if (caret.right) {
                caret.right.speedy.previous = span;
            }
        }
        getTextBlockData(textBlock) {
            const _this = this;
            const spansArray = [].slice.call(textBlock.getElementsByTagName("span"));
            const cells = spansArray.filter(x => !!x.speedy && x.speedy.role == ELEMENT_ROLE.CELL && x.speedy.stream == TEXT_STREAM.IN);
            const text = cells.map(cell => _this.getTextContent(cell)).join("");
            return {
                text, cells
            };
        }
        createOnTextChangedData(args) {
            const { caret, action, cell } = args;
            const { text, cells } = this.getTextBlockData(caret.container);
            return {
                caret, editor: this, cell, action, text, cells
            };
        }
        calculateCellOffsets() {
            const _this = this;
            const containers = this.getContainers();
            const cells = this.getCells();
            containers.forEach(container => {
                const offset = container.speedy.offset;
                if (offset) {
                    container.speedy.previousOffset = {
                        ...offset
                    };
                }
                container.speedy.offset = {
                    y: container.offsetTop,
                    x: container.offsetLeft,
                    w: container.offsetWidth,
                    h: container.offsetHeight
                };
            });
            cells.forEach(cell => {
                const offset = cell.speedy.offset;
                const container = _this.getCurrentContainer(cell);
                const cy = container.speedy.offset.y;
                if (offset) {
                    cell.speedy.previousOffset = {
                        ...offset
                    };
                }
                const top = cell.offsetTop;
                cell.speedy.offset = {
                    y: top,
                    cy: cy + top,
                    x: cell.offsetLeft,
                    w: cell.offsetWidth,
                    h: cell.offsetHeight
                };
            });
        }
        addCharacterCell(args) {
            const { container, caret, cell, key } = args;
            const previous = caret.right.speedy.previous;
            if (previous) {
                previous.speedy.next = cell;
            }
            cell.speedy.previous = previous;
            cell.speedy.next = caret.right;
            caret.right.speedy.previous = cell;
            if (!caret.left) {
                container.speedy.startNode = cell;
            }
            // container.insertBefore(cell, caret.right);
            caret.right.parentNode.insertBefore(cell, caret.right);
            if (this.mode.extendProperties) {
                this.extendProperties({ caret, cell });
            }
            this.setCarotByNode(cell);
            this.setMarked();
            this.updateOffsets();
            if (this.onCharacterAdded) {
                this.onCharacterAdded({ cell, editor: this, caret, key });
            }
            if (this.onTextChanged) {
                const textChangedArgs = this.createOnTextChangedData({ cell, caret, action: "added" });
                this.onTextChanged(textChangedArgs);
            }
        }
        insertAfterCell(cell, text) {
            const len = text.length;
            const chain = this.createTextChain(text);
            const first = chain[0];
            const last = chain[len - 1];
            const next = cell.speedy.next;
            cell.speedy.next = first;
            first.speedy.previous = cell;
            last.speedy.next = next;
            next.speedy.previous = last;
            const fragment = this.toDocumentFragmentFromArray(chain);
            cell.parentNode.insertBefore(fragment, next);
            return chain;
        }
        insertBeforeCell(cell, text) {
            const len = text.length;
            const container = this.getContainer(cell);
            const chain = this.createTextChain(text);
            const first = chain[0];
            const last = chain[len - 1];
            const previous = cell.speedy.previous;
            if (previous) {
                previous.speedy.next = first;
            }
            first.speedy.previous = previous;
            last.speedy.next = cell;
            cell.speedy.previous = last;
            const fragment = this.toDocumentFragmentFromArray(chain);
            cell.parentNode.insertBefore(fragment, cell);
            if (container.speedy.startNode == cell) {
                container.speedy.startNode = first;
            }
            return chain;
        }
        createTextChain(text) {
            const len = text.length;
            var cells = [];
            for (var i = 0; i < len; i++) {
                let c = text[i];
                let cell = this.newSpan(c);
                cells.push(cell);
                if (i > 0) {
                    let previous = cells[i - 1];
                    cell.speedy.previous = previous;
                    previous.speedy.next = cell;
                }
            }
            return cells;
        }
        toDocumentFragmentFromArray(list) {
            var fragment = new DocumentFragment();
            list.forEach(x => fragment.appendChild(x));            
            return fragment;
        }
        extendProperties(args) {
            this.extendPropertiesLeft(args);
            this.extendPropertiesRight(args);
        }
        extendPropertiesLeft(args) {
            const { caret, cell } = args;
            const right = caret.right;
            if (!right) {
                return;
            }
            const ri = right.speedy.index;
            const properties = this.data.properties.filter(p => !p.isDeleted && p.startIndex() == ri);
            if (!properties.length) {
                return;
            }
            properties.forEach(p => {
                p.startNode = cell;
                p.setSpanRange();
            });
        }
        extendPropertiesRight(args) {
            const { caret, cell } = args;
            const left = caret.left;
            if (!left) {
                return;
            }
            const li = left.speedy.index;
            const properties = this.data.properties.filter(p => !p.isDeleted && p.endIndex() == li);
            if (!properties.length) {
                return;
            }
            properties.forEach(p => {
                p.endNode = cell;
                p.setSpanRange();
            });
        }
        addToHistory() {
            var history = this.history.data;
            if (history.length > 10) {
                history.splice(0, 1);
            }
            const data = this.unbind();
            history.push(data);
        }
        undo() {
            const caret = this.getCaret();
            const leftIndex = caret.left ? caret.left.speedy.index : null;
            const rightIndex = caret.right.speedy.index;
            var history = this.history.data;
            const len = history.length;
            if (len <= 1) {
                return;
            }
            const secondLast = history[len - 2];
            history.splice(len - 1, 1);
            this.bind(secondLast);
            if (leftIndex) {
                this.setCarotByIndex(leftIndex, CARET.RIGHT);
            } else {
                this.setCarotByIndex(rightIndex, CARET.LEFT);
            }
        }
        setMarked() {
            this.marked = true;
            this.lastMarked = new Date();
            const _this = this;
            const timeout = 2000;
            const handler = () => {
                _this.event.afterMarkedInterval({ editor: _this });
                clearTimeout(_this.timer.afterMarkedInterval);
                _this.addToHistory();
                _this.timer.afterMarkedInterval = null;
            };
            if (!this.timer.afterMarkedInterval) {
                this.timer.afterMarkedInterval = setTimeout(() => {
                    if (_this.marked) {
                        if (!_this.ignoreAfterMarkedInterval) {
                            handler();
                        }
                    }
                }, timeout);
            };
        }
        updateOffsets() {
            const _this = this;
            requestAnimationFrame(function () {
                _this.calculateCellOffsets();
                _this.verticalArrowNavigation.lastX = null;
                _this.updateRenderers();
            });
        }
        getText() {
            const _this = this;
            const chars = this.data.spans.filter(x => x.speedy.stream == TEXT_STREAM.IN);
            const text = chars.map(span => _this.getTextContent(span)).join("");
            return text;
        }
        updateRenderers() {
            const _this = this;
            const properties = this.data.properties
                .filter(p => !p.isDeleted && p.schema.render)
                .filter(p => p.hasOffsetChanged())
                ;
            const groups = Array.from(groupBy(properties, p => p.type));
            groups.forEach(group => {
                const typeName = group[0];
                const props = group[1];
                const _props = props.filter(p => !p.isDeleted && p.startNode.speedy.offset);
                const type = _this.propertyType[typeName];
                if (type) {
                    if (type.render.batchUpdate) {
                        type.render.batchUpdate({ editor: _this, properties: _props });
                    } else {
                        if (type.render.update) {
                            _props.forEach(p => type.render.update(p));
                        }
                    }
                }
            });
            const _propsToDelete = this.data.properties.filter(p => p.isDeleted && p.schema.render && !!p.svg);
            if (_propsToDelete.length) {
                _propsToDelete.forEach(p => {
                    if (p.schema.render.destroy) {
                        p.schema.render.destroy(p)
                    }
                });
            }
        }
        updateLinks(cell, caret) {
            if (caret.left) {
                caret.left.speedy.next = cell;
            }
            cell.speedy.previous = caret.left;
            cell.speedy.next = caret.right;
            if (caret.right) {
                caret.right.speedy.previous = cell;
            }
        }
        insertCharacter(data) {
            const { caret } = data;
            var container = caret.container || this.getCurrentContainer(caret.left || caret.right);
            var span = this.createSpan(data);
            this.mark();
            var index = caret.right.speedy.index;
            if (index != null) {
                var _this = this;
                var properties = this.data.properties
                    .filter(p => !p.blockNode)
                    .filter(function (prop) { return !prop.isDeleted && (prop.startIndex() <= index && index < prop.endIndex()); })
                    .sort(function (a, b) { return a.index > b.index ? 1 : a.index == b.index ? 0 : -1; });
                properties.forEach(function (prop) {
                    _this.paintSpanWithProperty(span, prop);
                });
            }
            this.addCharacterCell({ container, caret, key: data.key, cell: span });
        }
        getContainer(node) {
            if (!node || !node.speedy || node.speedy.role == ELEMENT_ROLE.ROOT) {
                return null;
            }
            var isContainer = node.speedy.role == ELEMENT_ROLE.TEXT_BLOCK;
            if (false == isContainer) {
                node = node.parentElement;
                return this.getContainer(node);
            }
            return node;
        }
        getBlock(node) {
            if (!node || !node.speedy || node.speedy.role == ELEMENT_ROLE.ROOT) {
                return null;
            }
            var isBlock = node.speedy.role == ELEMENT_ROLE.INNER_STYLE_BLOCK;
            if (false == isBlock) {
                node = node.parentElement;
                return this.getBlock(node);
            }
            return node;
        }
        getPreviousCharacterNode(span) {
            return span.speedy.previous;
        }
        getNextCharacterNode(span) {
            return span.speedy.next;
        }
        getPropertyTypeNameFromShortcutKey(key) {
            for (var propertyTypeName in this.propertyType) {
                var propertyType = this.propertyType[propertyTypeName];
                if (!propertyType) {
                    continue;
                }
                if (propertyType.shortcut == key) {
                    return propertyTypeName;
                }
            }
            return null;
        }
        createBlankImage() {
            const img = document.createElement("IMG");
            img.setAttribute("src", "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7");
            img.style.width = "1px";
            img.style.height = "20px";
            return img;
        }
        handleSpecialChars(span, charCode) {
            if (charCode == ENTER) {
                span.textContent = EOL;
                span.speedy.isLineBreak = true;
            }
            if (charCode == TAB) {
                span.textContent = String.fromCharCode(TAB);
                span.classList.add("tab");
            }
            if (charCode == SPACE) {
                // span.textContent = ZWJ + " ";
                span.innerHTML = " ";
                span.speedy.isSpace = true;
                span.classList.add("space-cell");
            }
        }
        clearSelection() {
            // ref: https://stackoverflow.com/questions/3169786/clear-text-selection-with-javascript
            if (window.getSelection) {
                if (window.getSelection().empty) {  // Chrome
                    window.getSelection().empty();
                } else if (window.getSelection().removeAllRanges) {  // Firefox
                    window.getSelection().removeAllRanges();
                }
            } else if (document.selection) {  // IE?
                document.selection.empty();
            }
            this.clearSelectionMode();
        }
        createSelection(start, end) {
            var selection = document.getSelection();
            var range = document.createRange();
            range.setStart(this.getTextNode(start), 1);
            range.setEnd(this.getTextNode(end), 1)
            //console.log("createSelection", { range });
            if (selection.setBaseAndExtent) {
                var startOffset = 0;    // range.startOffset;
                var endOffset = 1;      // range.endOffset;
                selection.setBaseAndExtent(range.startContainer, startOffset, range.endContainer, endOffset);
            } else {
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }
        setCarotByIndex(index, offset) {
            const cells = this.getCells();
            const node = cells.find(c => c.speedy.index == index);
            if (!node) {
                return;
            }
            this.setCarotByNode(node, offset);
        }
        setCarotByNode(node, offset) {
            if (!node) {
                return;
            }
            var selection = document.getSelection();
            var range = document.createRange();
            offset = (offset != null) ? offset : 1;
            var textNode = this.getTextNode(node);
            range.setStart(textNode, 1);
            range.collapse(true);
            if (selection.setBaseAndExtent) {
                var startOffset = offset;    // range.startOffset;
                var endOffset = offset;      // range.endOffset;
                selection.setBaseAndExtent(range.startContainer, startOffset, range.endContainer, endOffset);
            } else {
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }
        getTextNode(element) {
            // Get the first TEXT NODE of the element
            var node = element.firstChild;
            if (!node) {
                return element;

            }
            while (node.nodeType != 3) {
                node = node.firstChild;
            }
            return node;
        }
        getParentSpan(node) {
            var current = node;
            while (current) {
                if (current.speedy) {
                    if (current.speedy.role == ELEMENT_ROLE.CELL) {
                        return current as SpeedyElement;
                    }
                }
                current = current.parentElement;
            }
            return null;
        }
        getSelectionNodes() {
            var _this = this;
            var range = window.getSelection().getRangeAt(0);
            log({
                method: "getSelectionNodes", range
            });
            if (range.collapsed) {
                return null;
            }
            var startContainer = (() => {
                if (range.startContainer.speedy && range.startContainer.speedy.role == ELEMENT_ROLE.CELL) {
                    return range.startContainer;
                }
                var node = _this.getParentSpan(range.startContainer);
                if (range.startOffset == CARET.LEFT) {
                    return node;
                } else {
                    return node.speedy.next;
                }
            })();
            var endContainer = (() => {
                var node = _this.getParentSpan(range.endContainer);
                if (range.endOffset == CARET.LEFT) {
                    return node.speedy.previous;
                } else {
                    return node;
                }
            })();
            log({ startContainer, endContainer });
            return {
                start: startContainer,
                end: endContainer
            } as Range;
        }
        getSelectedNode(args) {
            const { node, offset } = args;
            log({ node, offset });
            if (offset == 0) {
                return node;
            } else {
                return node.nextElementSibling;
            }
        }
        addProperties(props) {
            var _this = this;
            var list = [];
            const cells = this.getCells();
            this.ignoreAfterMarkedInterval = true;
            props.forEach(function (prop) {
                list.push(_this.addProperty(prop, { spans: cells }));
            });
            this.ignoreAfterMarkedInterval = false;
            return list;
        }
        spanAtIndex(i) {
            return this.indexNode(i);
        }
        getRangeText(range: Range) {
            var text = "";
            var cell = range.start;
            var loop = true;
            while (loop) {
                if (cell == range.end) {
                    loop = false;
                    if (cell.speedy.stream == TEXT_STREAM.IN) {
                        text += this.getTextContent(cell);
                    }
                    continue;
                }
                if (cell.speedy.stream == TEXT_STREAM.OUT) {
                    cell = cell.speedy.next;
                    continue;
                }
                text += this.getTextContent(cell);
                cell = cell.speedy.next;
            }
            return text;
        }
        addBlockProperties(properties) {
            var _this = this;
            properties.forEach(p => {
                var sn = _this.spanAtIndex(p.startIndex);
                var en = _this.spanAtIndex(p.endIndex);
                var prop = _this.createBlockProperty(p.type, { start: sn, end: en });
                prop.value = p.value;
                prop.attributes = p.attributes;
            });
        }
        addBlockNodeProperty(p) {
            var propertyType = this.propertyType[p.type];
            var property = new Property({
                editor: this,
                schema: propertyType,
                index: propCounter++,
                value: p.value,
                type: p.type,
                blockNode: p.blockNode,
                attributes: p.attributes
            });
            this.data.properties.push(property);
        }
        addProperty(p, args) {
            args = args || {};
            const spans = args.spans || this.mark().filter(x => x.speedy.role == ELEMENT_ROLE.CELL && x.speedy.stream == TEXT_STREAM.IN);
            var propertyType = this.propertyType[p.type];
            var sn = spans[p.startIndex];
            var en = spans[p.endIndex];
            var prop = new Property({
                editor: this,
                guid: null,
                schema: propertyType,
                index: propCounter++,
                value: p.value,
                type: p.type,
                startNode: sn,
                endNode: en,
                blockNode: p.blockNode,
                attributes: p.attributes
            });
            prop.text = p.text;
            if (sn) {
                sn.startProperties.push(prop);
            }
            else {
                console.log("Error: sn is null", { p });
            }
            if (en) {
                en.endProperties.push(prop);
            }
            if (propertyType) {
                if (propertyType.bracket) {
                    if (propertyType.bracket.left) {
                        var left = this.createBracketNode(prop, propertyType.bracket.left, sn.parentElement, sn);
                        prop.addLeftBracket(left);
                    }
                    if (propertyType.bracket.right) {
                        var right = this.createBracketNode(prop, propertyType.bracket.right, en.parentElement, en.nextElementSibling);
                        prop.addRightBracket(right);
                    }
                }
            }
            prop.setSpanRange();
            this.data.properties.push(prop);
            if (this.onPropertyCreated) {
                this.onPropertyCreated(prop);
            }
            return prop;
        }
        createZero(args) {
            const { type, content, cell, value } = args;
            var zero = this.newSpan(content);
            var schema = this.propertyType[type];
            zero.speedy.stream = TEXT_STREAM.OUT;
            var property = new Property({
                editor: this,
                guid: null,
                schema: schema,
                index: propCounter++,
                value: value,
                type: type,
                startNode: zero,
                endNode: zero,
                isZeroPoint: true
            });
            var parent = cell.parentElement;
            parent.insertBefore(zero, cell.nextElementSibling);
            const originalRight = cell.speedy.next;
            cell.speedy.next = zero;
            zero.speedy.previous = cell;
            zero.speedy.next = originalRight;
            originalRight.speedy.previous = zero;
            zero.startProperties.push(property);
            zero.endProperties.push(property);
            this.data.properties.push(property);
            property.setSpanRange();
            return property;
        }
        addZeroPoint(type, content, cell) {
            var zero = this.newSpan(content);
            var schema = this.propertyType[type];
            zero.speedy.stream = TEXT_STREAM.OUT;
            var property = new Property({
                editor: this,
                guid: null,
                schema: schema,
                index: propCounter++,
                type: type,
                startNode: zero,
                endNode: zero,
                isZeroPoint: true
            });
            var parent = cell.parentElement;
            parent.insertBefore(zero, cell.nextElementSibling);
            const originalRight = cell.speedy.next;
            cell.speedy.next = zero;
            zero.speedy.previous = cell;
            zero.speedy.next = originalRight;
            originalRight.speedy.previous = zero;
            if (schema.animation && schema.animation.init) {
                schema.animation.init(property);
            }
            zero.startProperties.push(property);
            zero.endProperties.push(property);
            this.data.properties.push(property);
            property.setSpanRange();
            return property;
        }
        createZeroPointProperty(propertyTypeName, content) {
            var type = find(this.propertyType, function (__, key) { return key == propertyTypeName; });
            if (!type) {
                // No annotation type found.
                return;
            }
            content = content || type.content;
            var prop = this.addZeroPoint(propertyTypeName, content, this.getCurrent());
            if (type.propertyValueSelector) {
                type.propertyValueSelector(prop, function (value, name) {
                    if (value) {
                        prop.value = value;
                        prop.name = name;
                    }
                });
            }
            return prop;
        }
        createParentBlockProperty(type, p) {
            var property = new Property({
                editor: this,
                schema: this.propertyType[type],
                index: propCounter++,
                type: type,
                blockNode: p.blockNode,
                startNode: p.startNode,
                endNode: p.endNode
            });
            var parent = p.blockNode.parentElement;
            var container = document.createElement("DIV");
            container.speedy = {
                role: ELEMENT_ROLE.INNER_STYLE_BLOCK,
                stream: TEXT_STREAM.OUT
            };
            parent.insertBefore(container, p.blockNode);
            container.appendChild(p.blockNode);
            this.data.properties.push(property);
            return property;
        }
        createBlockProperty2(args) {
            var selection = this.getSelectionNodes();
            var startNode = args.startNode || selection.start;
            var endNode = args.endNode || selection.end;
            var block = this.createBlock(startNode, endNode, args.type);
            var property = new Property({
                editor: this,
                schema: this.propertyType[args.type],
                index: propCounter++,
                type: args.type,
                blockNode: block,
                startNode: startNode,
                endNode: endNode,
                parent: args.parent
            });
            this.data.properties.push(property);
            return property;
        }
        createBlockProperty(propertyTypeName, propertyRange) {
            var range = propertyRange || this.getSelectionNodes();
            var block = this.createBlock(range.start, range.end, propertyTypeName);
            var property = new Property({
                editor: this,
                schema: this.propertyType[propertyTypeName],
                guid: null,
                index: propCounter++,
                type: propertyTypeName,
                blockNode: block,
                startNode: range.start,
                endNode: range.end
            });
            this.data.properties.push(property);
            return property;
        }
        createBlock(startNode, endNode, type) {
            if (!startNode || !endNode) {
                console.log("Error: startNode or endNode were null", { startNode, endNode, type });
                return;
            }
            var dummy = document.createElement("SPAN");
            const snp = startNode.parentNode;
            const enp = endNode.parentNode;
            if (snp == enp) {
                var parent = snp;
                parent.insertBefore(dummy, startNode);
                var block = document.createElement("DIV");
                block.speedy = {
                    role: ELEMENT_ROLE.INNER_STYLE_BLOCK,
                    stream: TEXT_STREAM.OUT
                };
                block.classList.add(this.propertyType[type].className);
                var container = document.createElement("DIV");
                container.speedy = {
                    role: ELEMENT_ROLE.INNER_STYLE_BLOCK,
                    stream: TEXT_STREAM.OUT,
                    startNode: startNode,
                    endNode: endNode
                };
                var nodes = this.getAllNodesBetween(startNode, endNode);
                nodes.forEach(node => container.appendChild(node));
                block.appendChild(container);
                parent.insertBefore(block, dummy);
                parent.removeChild(dummy);
                this.updateOffsets();
                return block;
            } else {
                var parent = snp.parentElement;
                parent.insertBefore(dummy, snp);
                var wrapper = document.createElement("DIV");
                wrapper.speedy = {
                    role: ELEMENT_ROLE.INNER_STYLE_BLOCK,
                    stream: TEXT_STREAM.OUT,
                    startNode: startNode,
                    endNode: endNode
                };
                wrapper.classList.add(this.propertyType[type].className);
                var blocks = this.getAllNodesBetween(snp, enp);
                blocks.forEach(b => wrapper.appendChild(b));
                parent.insertBefore(wrapper, dummy);
                parent.removeChild(dummy);
                this.updateOffsets();
                return wrapper;
            }
        }
        getAllNodesBetween(startNode, endNode) {
            var nodes = [];
            var current = startNode;
            while (!!current && current != endNode) {
                nodes.push(current);
                current = current.nextElementSibling;
            }
            nodes.push(endNode);
            return nodes;
        }
        createProperty(propertyTypeName, value, propertyRange) {
            var _this = this;
            if (propertyTypeName == "erase") {
                this.erase();
                return;
            }
            var type = find(this.propertyType, function (__, key) { return key == propertyTypeName; });
            if (!type) {
                // No annotation type found.
                return;
            }
            if (type.format == "zero-point") {
                if (!type.propertyValueSelector) {
                    this.addZeroPoint(propertyTypeName, type.content, this.getCurrent());
                    return;
                }
            }
            var range = propertyRange || this.getSelectionNodes();
            var prop = new Property({
                editor: this,
                guid: null,
                schema: type,
                index: propCounter++,
                type: propertyTypeName,
                startNode: range.start,
                endNode: range.end
            });
            if (type.bracket) {
                if (type.bracket.left) {
                    if (range.start.parentElement) {
                        var left = this.createBracketNode(prop, type.bracket.left, range.start.parentElement, range.start);
                        prop.addLeftBracket(left);
                    }

                }
                if (type.bracket.right) {
                    if (range.end.parentElement) {
                        var right = this.createBracketNode(prop, type.bracket.right, range.end.parentElement, range.end.nextElementSibling);
                        prop.addRightBracket(right);
                    }
                }
            }
            prop.text = this.getRangeText(range);
            if (value) {
                prop.value = value;
            }
            var process = function (p) {
                p.startNode.startProperties.push(p);
                p.endNode.endProperties.push(p);
                _this.data.properties.push(p);
                p.setSpanRange();
                if (_this.onPropertyCreated) {
                    _this.onPropertyCreated(p);
                }
                _this.updateOffsets();
                _this.setMarked();
            }
            if (!value && type.propertyValueSelector) {
                type.propertyValueSelector(prop, function (value, name) {
                    if (value) {
                        prop.value = value;
                        prop.name = name;
                        process(prop);
                    }
                });
            }
            else {
                process(prop);
            }
            return prop;
        }
        createMetadataProperty(args) {
            var type = this.propertyType[args.type];
            if (!type) {
                log({ args, message: "No matching annotation for args.type was found" })
                return;
            }
            var p = new Property({
                editor: this,
                guid: null,
                schema: type,
                index: propCounter++,
                type: args.type,
                startNode: null,
                endNode: null,
                value: args.value
            });
            if (args.attributes) {
                p.attributes = args.attributes;
            }
            this.data.properties.push(p);
            if (this.onPropertyCreated) {
                this.onPropertyCreated(p);
            }
            return p;
        }
        paint(s, i) {
            var _ = this;
            i = i || this.nodeIndex(s);
            var properties = this.data.properties
                .filter(function (prop) { return !prop.isDeleted && (prop.startIndex() <= i && i < prop.endIndex()); })
                .sort(function (a, b) { return a.index > b.index ? 1 : a.index == b.index ? 0 : -1; });
            properties.forEach(function (prop) {
                _.paintSpanWithProperty(s, prop);
            });
        }
        paintSpanWithProperty(s, prop) {
            var propertyType = prop.getPropertyType();
            if (!propertyType) {
                return;
            }
            if (propertyType.format == "decorate") {
                if (propertyType.className) {
                    s.classList.add(propertyType.className);
                }
            } else if (propertyType.format == "overlay") {
                if (s.classList.contains("line-break")) {
                    return;
                }
                var inner = document.createElement("SPAN");
                inner.speedy = {
                    role: ELEMENT_ROLE.CELL_STYLE,
                    stream: TEXT_STREAM.OUT
                };
                inner.classList.add("overlaid");
                if (propertyType.className) {
                    inner.classList.add(propertyType.className);
                }
                s.appendChild(inner);
            }
            if (propertyType.styleRenderer) {
                propertyType.styleRenderer([s], prop);
            }
        }
        getTextContent(cell) {
            if (cell.speedy.isSpace) {
                return " ";
            }
            if (cell.speedy.isLineBreak) {
                return String.fromCharCode(13);
            }
            return cell.textContent;
        }
        unbind() {
            const _this = this;
            var spans = this.mark().filter(x => x.speedy.stream == TEXT_STREAM.IN);
            var text = this.temp.text = spans.map(span => _this.getTextContent(span)).join("");
            log({
                method: "unbind", spans, text
            });
            var result = {
                text: text,
                properties: this.toPropertyNodes()
            };
            log({ unbind: result });
            return result;
        }
        unbindText() {
            const spans = this.mark().filter(x => x.speedy.role == ELEMENT_ROLE.CELL && x.speedy.stream == TEXT_STREAM.IN);
            const text = spans.map(x => x.textContent).join("");
            return text;
        }
        toPropertyNodes() {
            var list = [];
            var props = this.data.properties;
            for (var i = 0; i < props.length; i++) {
                let p = props[i];
                try {
                    list.push(p.toNode());
                } catch (ex) {
                    log({ ex, p });
                }
            }
            return list;
        }
        getContainerCells(container) {
            const spansArray = [].slice.call(container.getElementsByTagName("span"));
            const chars = this.data.spans = spansArray.filter(x => !!x.speedy && x.speedy.role == ELEMENT_ROLE.CELL);
            return chars;
        }
        getCells() {
            return this.getContainerCells(this.container) as SpeedyElement[];
            //const spansArray = [].slice.call(this.container.getElementsByTagName("span"));
            //const chars = this.data.spans = spansArray.filter(x => !!x.speedy && x.speedy.role == ELEMENT_ROLE.CELL);
            //return chars;
        }
        getContainers() {
            const blocksArray = [].slice.call(this.container.getElementsByTagName("div"));
            const blocks = this.data.blocks = blocksArray.filter(x => !!x.speedy && x.speedy.role == ELEMENT_ROLE.TEXT_BLOCK);
            return blocks;
        }
        mark() {
            const chars = this.getCells();
            const len = chars.length;
            var i = 0, c = 0;
            while (c < len) {
                let span = chars[c];
                span.speedy.index = i;
                if (span.speedy.stream == TEXT_STREAM.IN) {
                    let temp = this.getTextContent(span);
                    //i += temp.length;
                    i += [...temp].length;
                }
                c++;
            }
            this.marked = true;
            return chars;
        }
        bind(model) {
            var _this = this;
            model = model || {};
            model.text = model.text || "";
            model.properties = model.properties || [];
            if (typeof model == "string") {
                model = JSON.parse(model);
            }
            this.emptyContainer();
            this.data.properties = [];
            this.populateContainer(model.text);
            this.data.text = model.text;
            if (!model.properties) {
                return;
            }
            var len = this.data.text.length;
            log("Text length", len);
            var properties = model.properties.filter(item => !item.isZeroPoint)
                .sort((a, b) => a.index > b.index ? 1 : a.index < b.index ? -1 : 0);
            var propertiesLength = properties.length;
            var spans = this.container.querySelectorAll("span");
            var spansArray = Array.from(spans);
            for (var i = 0; i < propertiesLength; i++) {
                var p = properties[i];
                log("Property", p);
                var type = this.propertyType[p.type];
                if (!type) {
                    console.warn("Property type not found.", p);
                    //continue;
                }
                if (p.startIndex < 0) {
                    warn("StartIndex less than zero.", p);
                    continue;
                }
                if (p.endIndex > len - 1) {
                    warn("EndIndex out of bounds.", p);
                    continue;
                }
                var isMetadata = (p.startIndex == null && p.endIndex == null);
                var startNode = (isMetadata ? null : spansArray.find(s => s.speedy.index == p.startIndex));
                if (!isMetadata && startNode == null) {
                    warn("Start node not found.", p);
                    continue;
                }
                var endNode = (isMetadata ? null : spansArray.find(s => s.speedy.index == p.endIndex));
                if (!isMetadata && endNode == null) {
                    console.warn("End node not found.", p);
                    continue;
                }
                var prop = new Property({
                    editor: this,
                    schema: type,
                    guid: p.guid,
                    index: p.index,
                    type: p.type,
                    value: p.value,
                    text: p.text,
                    attributes: p.attributes,
                    startNode: startNode,
                    endNode: endNode,
                    isDeleted: p.isDeleted
                });
                if (this.onPropertyCreated) {
                    this.onPropertyCreated(prop, p);
                }
                if (startNode) {
                    startNode.startProperties.push(prop);
                }
                if (endNode) {
                    endNode.endProperties.push(prop);
                }
                if (type) {
                    if (type.bracket) {
                        if (type.bracket.left) {
                            if (startNode) {
                                if (startNode.parentElement) {
                                    var left = this.createBracketNode(prop, type.bracket.left, startNode.parentElement, startNode);
                                    prop.addLeftBracket(left);
                                }
                            }

                        }
                        if (type.bracket.right) {
                            if (endNode) {
                                if (endNode.parentElement) {
                                    var right = this.createBracketNode(prop, type.bracket.right, endNode.parentElement, endNode.nextElementSibling);
                                    prop.addRightBracket(right);
                                }
                            }


                        }
                    }
                }
                prop.setSpanRange();
                this.data.properties.push(prop);
                propCounter = this.data.properties.length;

            }
            var _this = this;
            this.handleZeroLengthAnnotations(model);
            this.handleBlocks(this.data.properties, spansArray);
            this.setAnimationFrame();
            const start = this.data.spans[0];
            //this.setCarotByNode(start, CARET.LEFT);
            this.updateOffsets();
            this.attachDebugMouseoverEventHandler();
            this.attachChainBreakListener();
        }
        attachChainBreakListener() {
            if (!debugChainBreaks) {
                return;
            }
            const _this = this;
            const listener = window.setInterval(() => {
                if (chainBreakListenerPaused) {
                    return;
                }
                const cells = _this.getCells();
                const len = cells.length, maxIndex = len - 1;
                var errors = [];
                cells.forEach((cell, i) => {
                    if (!cell.speedy.previous) {
                        if (i > 0) {
                            if (cell.speedy.stream == TEXT_STREAM.IN) {
                                cell.style.backgroundColor = "pink";
                                errors.push({ text: "... previous cell not found", cell, i });
                            }
                        }
                    }
                    if (!cell.speedy.next) {
                        if (i < maxIndex) {
                            if (cell.speedy.stream == TEXT_STREAM.IN) {
                                cell.style.backgroundColor = "pink"; // NOTE: add a footnote number above the cell that refers to the error message in the logs or side panel
                                errors.push({ text: "... next cell not found", cell, i });
                            }
                        }
                    }
                    if (cell.speedy.previous) {
                        if (cell.speedy.previous.speedy.next != cell) {
                            cell.style.backgroundColor = "pink";
                            cell.speedy.previous.speedy.next.style.backgroundColor = "pink";
                            errors.push({ text: "... cell's previous does not match the previous cell's next", cell, previous: cell.speedy.previous, previousNext: cell.speedy.previous.speedy.next, i });
                        }
                        // check to see if the previous cell is in the DOM
                        if (cell.speedy.previous.parentNode) {
                            if (!cell.speedy.previous.parentNode.parentNode) {
                                cell.style.backgroundColor = "pink";
                                errors.push({
                                    text: "... cell's parentNode not found in the DOM",
                                    cell: cell.speedy.previous,
                                    next: cell,
                                    parentNode: cell.speedy.previous.parentNode,
                                    i
                                });
                            }
                        } else {
                            cell.speedy.previous.style.backgroundColor = "pink";
                            errors.push({
                                text: "... cell not found in the DOM",
                                cell: cell.speedy.previous,
                                next: cell,
                                i
                            });
                        }
                    }
                    if (cell.speedy.next) {
                        if (cell != cell.speedy.next.speedy.previous) {
                            cell.style.backgroundColor = "pink";
                            cell.speedy.next.style.backgroundColor = "pink";
                            errors.push({ text: "... cell's next does not match the previous cell's next", cell, next: cell.speedy.next, nextPrevious: cell.speedy.next.speedy.previous, i });
                        }
                    }
                    if (cell.parentNode == null) {
                        cell.style.backgroundColor = "pink";
                        errors.push({ text: "... cell has no parentNode", cell, i });
                    }
                    if (!_this.container.contains(cell)) {
                        cell.style.backgroundColor = "pink";
                        errors.push({ text: "... cell not found in the container", cell, i });
                    }
                    if (cell.parentNode == _this.container) {
                        cell.style.backgroundColor = "pink";
                        errors.push({ text: "... cell is out of its TextBlock", cell, i });
                    }
                    if (cell.parentNode) {
                        if (cell.parentNode.parentNode == null) {
                            cell.style.backgroundColor = "pink";
                            errors.push({ text: "... the cell's TextBlock is not found in the container", cell, TextBlock: cell.parentNode, i });
                        }
                    }

                });
                if (errors.length) {
                    _this.logChainBreak({ errors, listener });
                }
            }, debugChainBreakInterval);
        }
        logChainBreak(args) {
            const { errors, listener } = args;
            console.log("logChainBreak", { errors });
            window.clearInterval(listener);
        }
        setCarotToDocumentStart() {
            if (!this.data.blocks) {
                // not ready yet
                this.setCarotByNode(this.data.spans[0], CARET.LEFT);
                return;
            }
            const first = this.data.blocks[0];
            this.setCarotByNode(first.speedy.startNode, CARET.LEFT);
        }
        setCarotToDocumentEnd() {
            const last = this.data.blocks[this.data.blocks.length - 1];
            this.setCarotByNode(last.speedy.endNode, CARET.LEFT);
        }
        setCarotByOffsetX(args) {
            const { x, verticalPosition } = args;
            const cells = this.getCells();
            const rows = Array.from(groupBy(cells, x => x.speedy.offset && x.speedy.offset.y));
            if (rows.length == 0) {
                const currentBlock = this.getCurrentContainer();
                this.setCarotByNode(currentBlock.speedy.startNode);
                return;
            }
            const ordered = rows.sort((a, b) => a[0] > b[0] ? 1 : a[0] < b[0] ? -1 : 0);
            const len = ordered.length;
            const rowCells = (verticalPosition == "TOP") ? ordered[0] : ordered[len - 1];
            const closestCell = this.getCellClosestByOffsetX({ x, cells: rowCells[1] });
            if (closestCell) {
                this.setCarotByNode(closestCell);
            }
        }
        getCellClosestByOffsetX(args) {
            const { x, cells } = args;
            const leftMatches = cells.filter(c => c.speedy.offset.x < x);
            const rightMatches = cells.filter(c => c.speedy.offset.x >= x);
            if (leftMatches.length) {
                return leftMatches[leftMatches.length - 1];
            }
            if (rightMatches.length) {
                return rightMatches[0];
            }
            return null;
        }
        focus() {
            const currentBlock = this.getCurrentContainer();
            const node = currentBlock.speedy.startNode;
            this.setCarotByNode(node, CARET.LEFT);
            node.focus();
        }
        createBracketNode(prop, bracket, parent, next) {
            var content = typeof bracket.content == "function" ? bracket.content(prop, this) : bracket.content;
            var bracketNode = this.newSpan(content);
            bracketNode.speedy.stream = TEXT_STREAM.OUT;
            if (bracket.className) {
                bracketNode.classList.add(bracket.className);
            }
            parent.insertBefore(bracketNode, next);
            return bracketNode;
        }
        handleBlocks(properties, spans) {
            var _this = this;
            var blocks = properties.filter(item => !item.isDeleted && _this.propertyType[item.type] && _this.propertyType[item.type].format == "block")
                .sort((a, b) => a.startIndex() > b.startIndex() ? -1 : a.startIndex() < b.startIndex() ? 1 : 0);
            if (blocks.length) {
                blocks.forEach(p => {
                    var sn = spans.find(s => s.speedy.index == p.startIndex());
                    var en = spans.find(s => s.speedy.index == p.endIndex());
                    var blockNode = _this.createBlock(sn, en, p.type);
                    p.blockNode = blockNode;
                });
            }
        }
        indexNode(index) {
            const cells = this.getCells();
            const cell = cells.find(p => p.speedy.index == index);
            return cell;
        }
        handleZeroLengthAnnotations(model) {
            var cells = this.mark().filter(x => x.speedy.stream == TEXT_STREAM.IN);
            var len = model.text.length;
            var zeroProperties = model.properties.filter(function (item) {
                return item.isZeroPoint;
            });
            // Work backwards through the list of zero properties so we don't fetch a SPAN that hasn't been offset from a previous insertion.
            zeroProperties = zeroProperties.sort((a, b) => a.startIndex > b.startIndex ? -1 : a.startIndex < b.startIndex ? 1 : 0);
            var zeroPropertiesLength = zeroProperties.length;
            log({ zeroProperties });
            for (var i = 0; i < zeroPropertiesLength; i++) {
                var p = zeroProperties[i];
                log("Zero-point property", p);
                var pt = this.propertyType[p.type];
                if (!pt) {
                    warn("Property type not found.", p);
                    continue;
                }
                if (p.startIndex < 0) {
                    warn("StartIndex less than zero.", p);
                    continue;
                }
                if (p.endIndex > len) {
                    warn("EndIndex out of bounds.", p);
                    continue;
                }
                var cell = cells[p.startIndex - 1];
                if (!cell) {
                    console.warn("ZPA node not found.", p);
                    continue;
                }
                var prop = this.addZeroPoint(p.type, p.text, cell);
                prop.guid = p.guid;
                prop.schema = pt;
                prop.attributes = p.attributes;
                prop.index = p.index;
                prop.value = p.value;
                prop.isDeleted = p.isDeleted;
                prop.setSpanRange();
                if (prop.isDeleted) {
                    prop.startNode.style.display = "none";
                }
                if (this.onPropertyCreated) {
                    this.onPropertyCreated(prop, p);
                }
            }
        }
        getWordsFromText(text) {
            var re = new RegExp(/\b[^\s]+\b/, "g");
            var results = [];
            var match;
            while ((match = re.exec(text)) != null) {
                var span = match[0];
                results.push({ startIndex: match.index, endIndex: match.index + span.length - 1, text: span });
            }
            return results;
        }
        getSentencesFromText(text) {
            var re = new RegExp(/[^.?!\r]+[.!?\r]+[\])'"`’”]*|.+/, "g");
            var results = [];
            var match;
            while ((match = re.exec(text)) != null) {
                var span = match[0];
                results.push({ startIndex: match.index, endIndex: match.index + span.length - 1, text: span });
            }
            return results;
        }
        getSentences() {
            var spans = this.mark().filter(x => x.speedy.role == ELEMENT_ROLE.CELL && x.speedy.stream == TEXT_STREAM.IN);
            var text = spans.map(x => x.textContent).join("");
            const sentences = this.getSentencesFromText(text);
            return sentences;
        }
        getTextFromRange(args) {
            const { start, end } = args;
            var text = "";
            var cell = start;
            var loop = true;
            while (loop) {
                text += this.getTextContent(cell);
                if (cell == end) {
                    loop = false;
                    continue;
                }
                cell = cell.speedy.next;
            }
            return text;
        }
        getTextBlocks() {
            var spans = this.mark().filter(x => x.speedy.role == ELEMENT_ROLE.CELL && x.speedy.stream == TEXT_STREAM.IN);
            var text = spans.map(x => x.textContent).join("");
            var re = new RegExp(/[\r]+[.\r]+[\])]*|.+/, "g");
            var results = [];
            var match;
            while ((match = re.exec(text)) != null) {
                var span = match[0], si = match.index, ei = match.index + span.length - 1, sn = spans[si], en = spans[ei];
                results.push({ startNode: sn, startIndex: si, endIndex: ei, endNode: en, blockNode: sn.parentElement, text: span });
            }
            return results;
        }
        emptyContainer() {
            this.container.textContent = "";
        }
        appendToContainer(spans) {
            var len = spans.length;
            for (var i = 0; i < len; i++) {
                this.container.appendChild(spans[i]);
            }
        }
        populateContainer(text) {
            const _this = this;
            const { fragment } = this.textToDocumentFragmentWithTextBlocks(text);
            this.container.appendChild(fragment);
            const divs = this.container.querySelectorAll("div");
            const arr = Array.from(divs);
            const containerNodes = arr.filter(x => x.speedy.role == ELEMENT_ROLE.TEXT_BLOCK);
            if (this.onBlockAdded) {
                containerNodes.forEach(cn => {
                    _this.onBlockAdded({ containerNode: cn });
                });
            }
        }
        textToDocumentFragmentWithTextBlocks(text) {
            // const len = text.length, skip = [LINE_FEED]
            const _text = Array.from(text);
            const len = _text.length;
            const skip = [LINE_FEED];
            var counter = len, i = 0;
            var isNewBlock = true;
            var spans = [];
            var blocks = [];
            var frag = document.createDocumentFragment();
            var block = this.newTextBlock();
            if (len == 0) {
                const carriageReturn = this.newCarriageReturn();
                block.speedy.startNode = carriageReturn;
                block.speedy.endNode = carriageReturn;
                block.appendChild(carriageReturn);
                frag.appendChild(block);
                return {
                    fragment: frag, cells: spans
                };
            }

            while (counter--) {
                let c = _text[i++];
                let code = c.charCodeAt();
                if (skip.indexOf(code) >= 0) {
                    continue;
                }
                let span = this.newSpan(c);
                spans.push(span);
                span.speedy.index = (i - 1);
                this.handleSpecialChars(span, code)
                if (isNewBlock) {
                    block.speedy.startNode = span;
                    isNewBlock = false;
                }
                if (counter == 0) {
                    block.speedy.endNode = spans[len - 1];
                    block.appendChild(span);
                    if (code != ENTER) {
                        const eof = this.newCarriageReturn();
                        block.appendChild(eof);
                        block.speedy.endNode = eof;
                        spans.push(eof);
                        eof.speedy.previous = span;
                        span.speedy.next = eof;
                    }
                    frag.appendChild(block);
                    continue;
                }
                if (code == ENTER) {
                    span.classList.add("carriage-return");
                    block.appendChild(span);
                    block.speedy.endNode = span;
                    frag.appendChild(block);
                    blocks.push(block);
                    const newBlock = this.newTextBlock();
                    block = newBlock;
                    isNewBlock = true;
                    var oldBlock = blocks[blocks.length - 1];
                    block.speedy.previousTextBlock = oldBlock;
                    oldBlock.speedy.nextTextBlock = block;
                    continue;
                }
                block.appendChild(span);
            }
            const newLen = spans.length;
            spans.forEach((s, i) => {
                s.speedy.previous = i > 0 ? spans[i - 1] : null;
                s.speedy.next = i <= (newLen - 2) ? spans[i + 1] : null;
            });
            return { fragment: frag, cells: spans };
        }
        removeProperties(properties) {
            const _this = this;
            this.ignoreAfterMarkedInterval = true;
            properties.forEach(p => _this.removeProperty(p));
            this.ignoreAfterMarkedInterval = false;
        }
        removeProperty(property) {
            const index = this.data.properties.indexOf(property);
            if (index < 0) {
                return;
            }
            if (property.startNode.startProperties.length) {
                const spi = property.startNode.startProperties.indexOf(property);
                if (spi >= 0) {
                    property.startNode.startProperties[spi].remove();
                }
            }
            if (property.endNode.endProperties.length) {
                const epi = property.endNode.endProperties.indexOf(property);
                if (epi >= 0) {
                    property.endNode.endProperties[epi].remove();
                }
            }
            if (this.data.properties[index]) {
                this.data.properties[index].remove();
            }
        }
        newTextBlock() {
            const _this = this;
            var wrapper = document.createElement("DIV");
            if (this.blockClass) {
                wrapper.classList.add(this.blockClass);
            }
            wrapper.speedy = {
                role: ELEMENT_ROLE.TEXT_BLOCK,
                stream: TEXT_STREAM.OUT,
                blockNode: wrapper
            };
            if (this.event.blockMouseOver) {
                wrapper.addEventListener("mousemove", function (e) {
                    const containerNode = _this.getContainer(e.currentTarget);
                });
            }
            if (this.event.blockMouseOut) {
                wrapper.addEventListener("mouseout", function (e) {
                    const containerNode = _this.getContainer(e.currentTarget);
                    _this.event.blockMouseOut({ editor: _this, containerNode, e });
                });
            }
            if (this.onBlockCreated) {
                this.onBlockCreated({
                    blockNode: wrapper
                });
            }
            return wrapper;
        }
        newCarriageReturn() {
            var s = document.createElement("SPAN");
            s.speedy = {
                role: ELEMENT_ROLE.CELL,
                stream: TEXT_STREAM.IN,
                isLineBreak: true
            };
            s.classList.add("carriage-return");
            s.style.position = "relative";
            s.textContent = EOL; // String.fromCharCode(ENTER);
            s.startProperties = [];
            s.endProperties = [];
            if (debugLayout) {
                s.classList.add("debug-line-break");
            }
            // this.attachNextPreviousMouseoverEvents(s);
            return s;
        }
        newSpan(text) {
            var s = document.createElement("SPAN");
            s.speedy = {
                role: ELEMENT_ROLE.CELL,
                stream: TEXT_STREAM.IN
            };
            s.style.position = "relative";
            if (text) {
                s.innerHTML = text;
            }
            s.classList.add("editor-cell");
            s.startProperties = [];
            s.endProperties = [];
            // this.attachNextPreviousMouseoverEvents(s);
            return s;
        }
        attachDebugMouseoverEventHandler() {
            const _this = this;
            if (debugNextPrevious) {
                const cp = "debug-cell-previous";
                const cn = "debug-cell-next";
                const cc = "debug-cell-current";
                this.container.addEventListener("mouseover", (e) => {
                    if (!e.target.speedy || e.target.speedy.role != ELEMENT_ROLE.CELL) {
                        return;
                    }
                    const _cell = e.target;
                    const currentTextBlock = _this.getCurrentContainer(_cell);
                    _this.debugHighlightTextBlock(currentTextBlock);
                    _cell.classList.add(cc);
                    if (_cell.speedy.previous) {
                        _cell.speedy.previous.classList.add(cp);
                    }
                    if (_cell.speedy.next) {
                        _cell.speedy.next.classList.add(cn);
                    }
                });
                this.container.addEventListener("mouseout", (e) => {
                    if (!e.target.speedy || e.target.speedy.role != ELEMENT_ROLE.CELL) {
                        return;
                    }
                    const _cell = e.target;
                    const currentTextBlock = _this.getCurrentContainer(_cell);
                    _this.debugUnhighlightTextBlock(currentTextBlock);
                    _cell.classList.remove(cc);
                    if (_cell.speedy.previous) {
                        _cell.speedy.previous.classList.remove(cp);
                    }
                    if (_cell.speedy.next) {
                        _cell.speedy.next.classList.remove(cn);
                    }
                });
            }
        }
        attachNextPreviousMouseoverEvents(span) {
            const _this = this;
            if (debugNextPrevious) {
                span.addEventListener("mouseover", (e) => {
                    const _cell = e.target;
                    const currentTextBlock = _this.getCurrentContainer(_cell);
                    _this.debugHighlightTextBlock(currentTextBlock);
                    _cell.classList.add("debug-highlight-current");
                    if (_cell.speedy.previous) {
                        _cell.speedy.previous.classList.add("debug-highlight-previous");
                    }
                    if (_cell.speedy.next) {
                        _cell.speedy.next.classList.add("debug-highlight-next");
                    }
                });
                span.addEventListener("mouseout", (e) => {
                    const _cell = e.target;
                    const currentTextBlock = _this.getCurrentContainer(_cell);
                    _this.debugUnhighlightTextBlock(currentTextBlock);
                    _cell.classList.remove("debug-highlight-current");
                    if (_cell.speedy.previous) {
                        _cell.speedy.previous.classList.remove("debug-highlight-previous");
                    }
                    if (_cell.speedy.next) {
                        _cell.speedy.next.classList.remove("debug-highlight-next");
                    }
                });
            }
        }
    }

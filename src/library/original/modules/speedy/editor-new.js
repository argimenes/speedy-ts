(function (factory) {
    define("speedy/editor", ["app/utils"], factory);
}(function (utils) {

    const find = utils.find;
    var maxWhile = 10000000;

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
        CHAR: 0,
        BLOCK: 1,
        ROOT: 2,
        OVERLAY: 3,
        CONTAINER: 4,
        CURSOR: 5
    };

    const SELECTION_DIRECTION = {
        LEFT: 0,
        RIGHT: 1
    };

    const BACKSPACE = 8,
        CAPSLOCK = 20, PAGE_UP = 33, PAGE_DOWN = 34,
        DELETE = 46, HOME = 36, END = 35, INSERT = 45, PRINT_SCREEN = 44, PAUSE = 19, SELECT_KEY = 93, NUM_LOCK = 144,
        LEFT_ARROW = 37, RIGHT_ARROW = 39, UP_ARROW = 38, DOWN_ARROW = 40, SPACE = 32, ESCAPE = 27,
        SHIFT = 16, CTRL = 17, ALT = 18, ENTER = 13, LINE_FEED = 10, TAB = 9, LEFT_WINDOW_KEY = 91, SCROLL_LOCK = 145,
        RIGHT_WINDOW_KEY = 92, F1 = 112;

    const PASSTHROUGH_CHARS = [CAPSLOCK, PAGE_UP, PAGE_DOWN, HOME, END, PRINT_SCREEN, PAUSE, SELECT_KEY, NUM_LOCK, SCROLL_LOCK, LEFT_WINDOW_KEY, RIGHT_WINDOW_KEY, SHIFT, ALT];

    function getRangeText(range) {
        if (!range) {
            return null;
        }
        var spans = getSpansBetween({ startNode: range.start, endNode: range.end });
        var text = spans.map(s => s.textContent).join("");
        return text;
    }

    var logs = [];

    function log() {
        //console.log.apply(null, arguments);
    }

    function warn() {
        console.warn.apply(null, arguments);
    }

    function getFirstChildOfContainer(blockNode) {
        var node = getNextChar({ startNode: blockNode, limit: 0 });
        return node;
    };

    function getLastChildOfContainer(container) {
        var node = getPreviousChar({ startNode: container.lastChild, limit: 0 });
        return node;
    };

    function getParent(startNode, func) {
        var s = startNode, loop = true;
        var c = 0;
        while (loop) {
            log({ c, s });
            if (func(s)) {
                return s;
            }
            if (s) {
                s = s.parentElement;
            } else {
                loop = false;
            }
            if (c++ > maxWhile) {
                log("Exceeded max iterations", { method: "editor.getParent", s });
                return s;
            }
        }
        return null;
    }

    function getNextChar(args) {
        var sn = args.startNode;
        if (!sn) {
            return null;
        }
        var cn = args.currentNode || sn;
        var counter = args.counter;
        if (typeof counter == "undefined" || counter == null) {
            counter = -1;
        }
        var limit = typeof (args.limit) != "undefined" ? args.limit : 1;
        var direction = args.direction || "right";
        if (cn.speedy.role == ELEMENT_ROLE.CHAR) {
            if (cn.speedy.stream == TEXT_STREAM.IN) {
                var advance = true;
                if (cn.speedy.isLineBreak) {
                    advance = !!args.includeLineBreak;
                }
                if (advance) {
                    counter++;
                }
                if (counter == limit) {
                    return cn;
                }
            }
            if (cn.nextElementSibling) {
                return getNextChar({ ...args, currentNode: cn.nextElementSibling, counter, direction: "right" });
            }
            else {
                return getNextChar({ ...args, currentNode: cn.parentElement, counter, direction: "up" });
            }
        }
        if (cn.speedy.role == ELEMENT_ROLE.BLOCK || cn.speedy.role == ELEMENT_ROLE.CONTAINER) {
            if (direction == "down") {
                if (cn.firstElementChild != null) {
                    return getNextChar({ ...args, currentNode: cn.firstElementChild, counter, direction: "down" });
                } else {
                    return getNextChar({ ...args, currentNode: cn.nextElementSibling, counter, direction: "right" });
                }
            }
            if (direction == "up") {
                if (cn.parentElement != null) {
                    return getNextChar({ ...args, currentNode: cn.parentElement, counter, direction: "right" });
                } else {
                    return null;
                }
            }
            if (direction == "right") {
                if (cn.firstElementChild != null) {
                    return getNextChar({ ...args, currentNode: cn.firstElementChild, counter, direction: "right" });
                }
                if (cn.nextElementSibling != null) {
                    return getNextChar({ ...args, currentNode: cn.nextElementSibling, counter, direction: "down" });
                } else {
                    return getNextChar({ ...args, currentNode: cn.parentElement, counter, direction: "up" });
                }
            }
        }
        if (cn.speedy.role == ELEMENT_ROLE.ROOT) {
            if (direction != "down") {
                return null; // reached the top: nowhere else to go
            }
            if (cn.firstElementChild != null) {
                return getNextChar({ ...args, currentNode: cn.firstElementChild, counter, direction: "down" });
            } else {
                return [];
            }
        }
        return null;
    };

    function getPreviousChar(args) {
        var sn = args.startNode;
        var cn = args.currentNode || sn;
        var counter = args.counter;
        var limit = typeof (args.limit) != "undefined" ? args.limit : 1;
        if (!sn) {
            return null;
        }
        if (typeof counter == "undefined" || counter == null) {
            counter = -1;
        }
        var direction = args.direction || "left";
        if (cn.speedy.role == ELEMENT_ROLE.CHAR) {
            if (cn.speedy.stream == TEXT_STREAM.IN) {
                counter++;
                if (counter == limit) {
                    return cn;
                }
            }
            if (cn.previousElementSibling) {
                return getPreviousChar({ startNode: sn, currentNode: cn.previousElementSibling, counter, limit, direction: "left" });
            }
            else {
                return getPreviousChar({ startNode: sn, currentNode: cn.parentElement, counter, limit, direction: "up" });
            }
        }
        if (cn.speedy.role == ELEMENT_ROLE.BLOCK || cn.speedy.role == ELEMENT_ROLE.CONTAINER) {
            if (direction == "down") {
                if (cn.lastElementChild != null) {
                    return getPreviousChar({ startNode: sn, currentNode: cn.lastElementChild, counter, limit, direction: "down" });
                } else {
                    return getPreviousChar({ startNode: sn, currentNode: cn.previousElementSibling, counter, limit, direction: "left" });
                }
            }
            if (direction == "up") {
                if (cn.previousElementSibling != null) {
                    return getPreviousChar({ startNode: sn, currentNode: cn.previousElementSibling, counter, limit, direction: "left" });
                } else {
                    return getPreviousChar({ startNode: sn, currentNode: cn.parentElement, counter, limit, direction: "up" });
                }
            }
            if (direction == "left") {
                if (cn.lastElementChild != null) {
                    return getPreviousChar({ startNode: sn, currentNode: cn.lastElementChild, counter, limit, direction: "left" });
                }
                if (cn.previousElementSibling != null) {
                    return getPreviousChar({ startNode: sn, currentNode: cn.previousElementSibling, counter, limit, direction: "left" });
                } else {
                    return getPreviousChar({ startNode: sn, currentNode: cn.parentElement, counter, limit, direction: "up" });
                }
            }
        }
        if (cn.speedy.role == ELEMENT_ROLE.ROOT) {
            return null;
        }
        return null;
    };

    function getSpansBetween(args) {
        var includeOutOfStream = args.includeOutOfStream;
        var sn = args.startNode;
        var en = args.endNode;
        var cn = args.currentNode || sn;
        var spans = args.spans || [];
        var direction = args.direction || "right";
        if (cn == en) {
            spans.push(cn);
            return spans;
        }
        if (cn.speedy.role == ELEMENT_ROLE.CHAR) {
            if (cn.speedy.stream == TEXT_STREAM.IN) {
                spans.push(cn);
            }
            if (includeOutOfStream && cn.speedy.stream == TEXT_STREAM.OUT) {
                spans.push(cn);
            }
            if (cn.nextElementSibling) {
                return getSpansBetween({ startNode: sn, endNode: en, currentNode: cn.nextElementSibling, spans, direction: "right" });
            }
            else {
                return getSpansBetween({ startNode: sn, endNode: en, currentNode: cn.parentElement, spans, direction: "up" });
            }
        }
        if (cn.speedy.role == ELEMENT_ROLE.BLOCK || cn.speedy.role == ELEMENT_ROLE.CONTAINER) {
            if (direction == "down") {
                if (cn.firstChild != null) {
                    return getSpansBetween({ startNode: sn, endNode: en, currentNode: cn.firstChild, spans, direction: "down" });
                } else {
                    return getSpansBetween({ startNode: sn, endNode: en, currentNode: cn.nextElementSibling, spans, direction: "right" });
                }
            }
            if (direction == "up") {
                if (cn.nextElementSibling != null) {
                    return getSpansBetween({ startNode: sn, endNode: en, currentNode: cn.nextElementSibling, spans, direction: "right" });
                } else {
                    return getSpansBetween({ startNode: sn, endNode: en, currentNode: cn.parentElement, spans, direction: "up" });
                }
            }
            if (direction == "right") {
                if (cn.firstChild != null) {
                    return getSpansBetween({ startNode: sn, endNode: en, currentNode: cn.firstChild, spans, direction: "right" });
                }
                if (cn.nextElementSibling != null) {
                    return getSpansBetween({ startNode: sn, endNode: en, currentNode: cn.nextElementSibling, spans, direction: "down" });
                } else {
                    return getSpansBetween({ startNode: sn, endNode: en, currentNode: cn.parentElement, spans, direction: "up" });
                }
            }
        }
        if (cn.speedy.role == ELEMENT_ROLE.ROOT) {
            if (direction == "up") {
                return spans;
            }
            if (cn.firstChild != null) {
                return getSpansBetween({ startNode: sn, endNode: en, currentNode: cn.firstChild, spans, direction: "down" });
            } else {
                return [];
            }
        }
        return spans;
    };

    function nodeIndex(args) {
        var sn = args.startNode;
        var tn = args.targetNode;
        var cn = args.currentNode || sn;
        var counter = args.counter;
        if (typeof counter == "undefined" || counter == null) {
            counter = -1;
        }
        var direction = args.direction || "right";
        if (cn == tn) {
            return counter;
        }
        if (cn.speedy.role == ELEMENT_ROLE.CHAR) {
            if (cn.speedy.stream == TEXT_STREAM.IN) {
                counter++;
            }
            if (cn.nextElementSibling) {
                return nodeIndex({ startNode: sn, currentNode: cn.nextElementSibling, targetNode: tn, counter, direction: "right" });
            }
            else {
                return nodeIndex({ startNode: sn, currentNode: cn.parentElement, targetNode: tn, counter, direction: "up" });
            }
        }
        if (cn.speedy.role == ELEMENT_ROLE.BLOCK) {
            if (direction == "down") {
                if (cn.firstChild != null) {
                    return nodeIndex({ startNode: sn, currentNode: cn.firstChild, targetNode: tn, counter, direction: "down" });
                } else {
                    return nodeIndex({ startNode: sn, currentNode: cn.nextElementSibling, targetNode: tn, counter, direction: "right" });
                }
            }
            if (direction == "up") {
                if (cn.nextElementSibling != null) {
                    return nodeIndex({ startNode: sn, currentNode: cn.nextElementSibling, targetNode: tn, counter, direction: "right" });
                } else {
                    return nodeIndex({ startNode: sn, currentNode: cn.parentElement, targetNode: tn, counter, direction: "up" });
                }
            }
            if (direction == "right") {
                if (cn.firstChild != null) {
                    return nodeIndex({ startNode: sn, currentNode: cn.firstChild, targetNode: tn, counter, direction: "right" });
                }
                if (cn.nextElementSibling != null) {
                    return nodeIndex({ startNode: sn, currentNode: cn.nextElementSibling, targetNode: tn, counter, direction: "down" });
                } else {
                    return nodeIndex({ startNode: sn, currentNode: cn.parentElement, targetNode: tn, counter, direction: "up" });
                }
            }
        }
        if (cn.speedy.role == ELEMENT_ROLE.ROOT) {
            if (direction == "up") {
                return null; // reached the top: nowhere else to go
            }
            if (cn.firstChild != null) {
                return nodeIndex({ startNode: sn, currentNode: cn.firstChild, targetNode: tn, counter, direction: "down" });
            } else {
                return null;
            }
        }
        return null;
    }

    function isWithin(startNode, start, end, node) {
        var si = nodeIndex({ startNode, targetNode: start }), ei = nodeIndex({ startNode, targetNode: end }), ni = nodeIndex({ startNode, targetNode: node });
        return si <= ni && ni <= ei;
    }

    function indexOf(arr, comparer) {
        for (var i = 0; i < arr.length; i++) {
            if (comparer(arr[i])) {
                return i;
            }
        }
        return -1;
    }

    function hasBlockParent(node) {
        return node && node.parentElement && isBlock(node.parentElement);
    }

    function getTextContent(node) {
        // This may need to be changed to account for zero-width joining characters.
        return node.textContent[0];
    }

    function isBlock(node) {
        return node && node.speedy && node.speedy.role == ELEMENT_ROLE.BLOCK;
    }

    function isRoot(node) {
        return node && node.speedy && node.speedy.role == ELEMENT_ROLE.ROOT;
    }

    function isChar(node) {
        return node && node.speedy && node.speedy.role == ELEMENT_ROLE.CHAR;
    }

    function isOutOfTextStream(node) {
        return node && node.speedy && node.speedy.stream == TEXT_STREAM.OUT;
    }

    function isInTextStream(node) {
        return node && node.speedy && node.speedy.stream == TEXT_STREAM.IN;
    }

    function firstPreviousCharOrLineBreak(start) {
        const char = getPreviousChar({ startNode: start });
        return char;
    }

    function firstNextCharOrLineBreak(start) {
        const char = getNextChar({ startNode: start });
        return char;
    }

    function getFirstCharacterNodeOfNextBlock(node) {
        return node.parentElement.nextElementSibling;
    }

    function indexNode(start, index) {
        var i = 0;
        var node = start;
        var c = 0;
        while (i != index || i == 0) {
            if (isInTextStream(node)) {
                i++;
            }
            if (isChar(node)) {
                var next = node.nextElementSibling;
                if (next == null) {
                    if (hasBlockParent(node)) {
                        if (isRoot(node.parentElement)) {
                            next = node;
                        } else {
                            next = getFirstCharacterNodeOfNextBlock(node);
                        }
                    }
                }
                node = next;
            }
            if (isBlock(node)) {
                node = node.firstChild;
            }
            if (isRoot(node)) {
                node = node.firstChild;
            }
            if (maxWhile && c++ > maxWhile) {
                log("Exceeded max iterations", {
                    method: "indexNode", i, node
                });
                // return node;
                return null;
            }
        };
        return node;
    }

    function first(nodelist, comparer) {
        for (var i = 0; i < nodelist.length; i++) {
            var n = nodelist[i];
            if (comparer(n)) {
                return n;
            }
        }
        return null;
    }

    function remove(arr, item) {
        var i = indexOf(arr, function (x) { return x == item; });
        if (i > -1) {
            arr.splice(i, 1);
        }
    }

    function unsetSpanRange(span, className) {
        var nodelist = span.children;
        var div = first(nodelist, function (x) { return x.classList.contains(className); });
        if (div) {
            span.removeChild(div);
        }
    }

    function setLayer(span, className, layer) {
        var nodelist = span.children;
        var div = first(nodelist, function (x) { return x.classList.contains(className); });
        if (div) {
            div.setAttribute("data-layer", layer);
        }
    }

    function hideLayer(span, layer) {
        var nodelist = span.children;
        var div = first(nodelist, function (x) { return x.getAttribute("data-layer") == layer; });
        if (div) {
            div.style.visibility = "hidden";
        }
    }

    function showLayer(span, layer) {
        var nodelist = span.children;
        var div = first(nodelist, function (x) { return x.getAttribute("data-layer") == layer; });
        if (div) {
            div.style.visibility = "visible";
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
            this.layer = cons.layer;
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
        overRange(func) {
            const spans = getSpansBetween({ startNode: this.startNode, endNode: this.endNode });
            spans.forEach(s => func(s));
        }
        scrollTo() {
            this.startNode.scrollIntoView();
        }
        highlight(style) {
            if (this.isZeroPoint) {
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
        unhighlight(style) {
            if (this.isZeroPoint) {
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
        nodeIndex(node) {
            return nodeIndex({ startNode: this.editor.container, targetNode: node });
        }
        startIndex() {
            if (this.isDeleted) {
                return null;
            }
            var startNode = this.startNode;
            if (this.blockNode) {
                startNode = getFirstChildOfContainer(this.blockNode);
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
            if (this.blockNode) {
                endNode = getLastChildOfContainer(this.blockNode);
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
            var text = getRangeText(range);
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
            var _this = this;
            var propertyType = this.getPropertyType();
            const spans = getSpansBetween({ startNode: this.startNode, endNode: this.endNode });
            spans.forEach(s => {
                var className = _this.className || propertyType.className;
                if (propertyType.format == "decorate") {
                    s.classList.remove(className);
                } else if (propertyType.format == "overlay") {
                    hideLayer(s, _this.layer);
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
            var previous = getPreviousChar({ startNode: node });
            if (!previous) {
                return;
            }
            node.parentElement.insertBefore(node, previous);
        }
        shiftNodeRight(node) {
            if (!node) {
                return;
            }
            var nextOneOver = getNextChar({ startNode: node, limit: 2 })
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
            return getPreviousChar({ startNode: node });
        }
        getNextCharNode(node) {
            return getNextChar({ startNode: node });
        }
        getText() {
            return getRangeText({ start: this.startNode, end: this.endNode });
        }
        shiftLeft(suppressFlash) {
            var previousStartNode = this.getPreviousCharNode(this.startNode);
            var previousEndNode = this.getPreviousCharNode(this.endNode);
            if (!previousStartNode || !previousEndNode) {
                return;
            }
            this.unsetSpanRange();
            this.shiftStartProperties(this.startNode, previousStartNode);
            this.shiftEndProperties(this.endNode, previousEndNode);
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
            var nextStartNode = getNextChar({ startNode: this.startNode });
            var nextEndNode = getNextChar({ startNode: this.endNode });
            if (!nextStartNode || !nextEndNode) {
                return;
            }
            this.unsetSpanRange();
            this.shiftStartProperties(this.startNode, nextStartNode);
            this.shiftEndProperties(this.endNode, nextEndNode);
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
            this.shiftEndProperties(this.endNode, nextEndNode);
            this.endNode = nextEndNode;
            this.shiftNodeRight(this.bracket.right);
            this.setSpanRange();
            this.flashHighlight();
        }
        contract() {
            this.unsetSpanRange();
            var previousEndNode = this.getPreviousCharNode(this.endNode);
            this.shiftEndProperties(this.endNode, previousEndNode);
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
            return getSpansBetween({ startNode: this.startNode, endNode: this.endNode });
        }
        unsetSpanRange() {
            var _this = this;
            var propertyType = this.getPropertyType();
            const spans = getSpansBetween({ startNode: this.startNode, endNode: this.endNode });
            log({ prop: this, spans });
            if (propertyType.format == "block") {
                var parent = this.startNode.parentElement;
                var container = parent.parentElement;
                var insertionPoint = parent.nextElementSibling ? parent.nextElementSibling : parent.previousElementSibling;
                spans.forEach(span => container.insertBefore(span, insertionPoint));
                container.removeChild(parent);
            } else {
                spans.forEach(s => {
                    var className = _this.className || propertyType.className || propertyType.zeroPoint.className;
                    if (propertyType.format == "decorate") {
                        s.classList.remove(className);
                    } else if (propertyType.format == "overlay") {
                        unsetSpanRange(s, className);
                    }
                });
            }
            if (propertyType.unstyleRenderer) {
                propertyType.unstyleRenderer(getSpansBetween({ startNode: this.startNode, endNode: this.endNode }), this);
            }
        }
        showSpanRange() {
            var _this = this;
            var propertyType = this.getPropertyType();
            const spans = getSpansBetween({ startNode: this.startNode, endNode: this.endNode });
            log({ prop: this, spans });
            spans.forEach(s => {
                var className = _this.className || propertyType.className;
                if (propertyType.format == "decorate") {
                    s.classList.add(className);
                } else if (propertyType.format == "overlay") {
                    showLayer(s, _this.layer);
                }
            });
        }
        setStyle(style) {
            const spans = getSpansBetween({ startNode: this.startNode, endNode: this.endNode || this.startNode });
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
            const spans = getSpansBetween({ startNode: this.startNode, endNode: this.endNode || this.startNode });
            log({ prop: this, spans });
            spans.forEach(s => {
                var className = _this.className || (_this.isZeroPoint ? propertyType.zeroPoint.className : propertyType.className);
                if (format == "decorate" || _this.isZeroPoint) {
                    s.classList.add(className);
                } else if (format == "overlay" && !_this.isZeroPoint) {
                    if (s.classList.contains("line-break")) {
                        return;
                    }
                    var inner = document.createElement("SPAN");
                    inner.speedy = {
                        role: ELEMENT_ROLE.OVERLAY,
                        stream: TEXT_STREAM.OUT
                    };
                    inner.setAttribute("data-layer", this.layer);
                    inner.classList.add("overlaid");
                    inner.classList.add(className);
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
            }
        }
        getTextRange() {
            return getRangeText({ start: this.startNode, end: this.endNode });
        }
        setLayer(layer) {
            var _this = this;
            this.layer = layer;
            const spans = getSpansBetween({ startNode: this.startNode, endNode: this.endNode });
            spans.forEach(s => setLayer(s, _this.type, _this.layer));
        }
        select() {
            this.editor.createSelection(this.startNode, this.endNode);
        }
        remove() {
            this.isDeleted = true;
            this.unsetSpanRange();
            this.editor.updateCurrentRanges(this.endNode);
            this.editor.clearMonitors();
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
            clone.layer = this.layer;
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
                layer: this.layer,
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

    class Editor {
        constructor(cons) {
            var event = cons.event || {};
            this.container = (cons.container instanceof HTMLElement) ? cons.container : document.getElementById(cons.container);
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
            this.onCharacterAdded = cons.onCharacterAdded;
            this.onCharacterDeleted = cons.onCharacterDeleted;
            this.onPropertyCreated = cons.onPropertyCreated;
            this.onPropertyChanged = cons.onPropertyChanged;
            this.onPropertyDeleted = cons.onPropertyDeleted;
            this.onPropertyUnbound = cons.onPropertyUnbound;
            this.onPropertyCloned = cons.onPropertyCloned;
            this.onMonitorUpdated = cons.onMonitorUpdated;
            this.event = {
                buffer: event.buffer,
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
                properties: []
            };
            this.buffer = {
                values: [],
                maxInterval: 3000,
                maxLength: 4,
                lastKeyTime: Date.now()
            };
            this.publisher = {
                layerAdded: []
            };
            this.subscriber = null;
            this.history = {
                cursor: []
            };
            this.mode = {
                selection: {
                    direction: null,
                    start: null,
                    end: null
                },
                contextMenu: {
                    active: false
                }
            };
            this.currentBlock = null;
            this.propertyType = cons.propertyType;
            this.commentManager = cons.commentManager;
            this.setupEventHandlers();
        }
        clearMonitors() {
            this.monitors.forEach(x => x.clear());
        }
        nodeIndex(node) {
            return nodeIndex({ startNode: this.container, targetNode: node });
        }
        shiftPropertiesLeftFromNode(node) {
            var i = this.nodeIndex(node);
            var properties = this.data.properties
                .filter(x => x.startIndex() > i);
            properties.forEach(x => x.shiftLeft());
        }
        shiftPropertiesRightFromNode(node) {
            var i = this.nodeIndex(node);
            var properties = this.data.properties
                .filter(x => x.startIndex() > i);
            properties.forEach(x => x.shiftRight());
        }
        shiftPropertiesLeftFromCaret(node) {
            var node = this.getCurrent();
            this.shiftPropertiesLeftFromNode(node);
        }
        shiftPropertiesRightFromCaret(node) {
            var node = this.getCurrent();
            this.shiftPropertiesRightFromNode(node);
        }
        setLayerVisibility(layer, show) {
            this.data.properties
                .filter(function (prop) { return prop.layer == layer; })
                .forEach(function (prop) {
                    if (show) {
                        prop.showSpanRange();
                    } else {
                        prop.hideSpanRange();
                    }
                });
        }
        onLayerAdded(handler) {
            this.publisher.layerAdded.push(handler);
        }
        layerAdded(e) {
            this.publisher.layerAdded.forEach(function (handler) {
                try {
                    handler(e);
                }
                catch (ex) {
                    log(ex);
                }
            });
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
            var mover = 0, mout = 0;

            this.container.addEventListener("click", e => {
                if (_this.event.mouse) {
                    const args = { editor: _this, e };
                    if (_this.event.mouse["control-click"]) {
                        if (e.ctrlKey && false == e.altKey && false == e.metaKey) {
                            _this.event.mouse["control-click"](args);
                        }
                    }
                    //if (_this.event.mouse["alt-click"]) {
                    //    if (e.altKey && false == e.ctrlKey && false == e.metaKey) {
                    //        _this.event.mouse["alt-click"](args);
                    //    }
                    //}
                    if (_this.event.mouse["click"]) {
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
        isWithin(startNode, endNode, node) {
            return isWithin(this.container, startNode, endNode, node);
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
            return indexNode(this.container.firstChild, index);
        }
        handleDoubleClickEvent(e) {
            var _this = this;
            this.clearSelection();
            var props = this.data.properties.filter(function (prop) {
                let schema = prop.schema;
                return schema && schema.event && schema.event.annotation && schema.event.annotation["dblclick"] && _this.isWithin(prop.startNode, prop.endNode, e.target);
            });
            if (!props.length) {
                return;
            }
            var i = this.nodeIndex(e.target);
            var nearest = props.sort(function (a, b) {
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
        addMonitor(monitor) {
            this.monitors.push(monitor);
        }
        addSelector(selector) {
            this.selectors.push(selector);
        }
        getCurrentRanges(span) {
            if (!span || !span.speedy) {
                return [];
            }
            var i = span.speedy.index;
            if (typeof i == "undefined") {
                i = this.nodeIndex(span);
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
                // _this.setMonitor([]);
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
            if (!e.target.speedy || e.target.speedy.role != ELEMENT_ROLE.CHAR) {
                return;
            }
            this.updateCurrentRanges(e.target);
            var selection = this.getSelectionNodes();
            if (selection) {
                selection.text = getRangeText(selection);
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
        handleOnPasteEvent(e) {
            // https://stackoverflow.com/questions/2176861/javascript-get-clipboard-data-on-paste-event-cross-browser
            var _this = this;
            e.stopPropagation();
            e.preventDefault();
            var clipboardData = e.clipboardData || window.clipboardData;
            var text = clipboardData.getData('text');
            var len = text.length;
            var container = this.getCurrentContainer(e.target);
            var frag = this.textToDocumentFragment(text);
            console.log({
                method: "handleOnPasteEvent", frag
            });
            var next = getNextChar({ startNode: e.target });
            var currentBlock = this.getCurrentBlock();
            if (container.children.length > 1) {
                currentBlock.insertBefore(frag, next);
            } else {
                currentBlock.appendChild(frag);
            }
            if (this.onCharacterAdded) {
                //var start = e.target;
                //var end = e.target;
                //while (len--) {
                //    end = this.getNextCharacterNode(end);
                //}
                //whileNext(start, end, (span) => {
                //    _this.onCharacterAdded(span, _this);
                //});
            }
            this.marked = false;
            this.setCarotByNode(e.target);
            this.updateCurrentRanges();
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
            var _this = this;
            var range = this.getSelectionNodes();
            if (range == null) {
                return;
            }
            var sn = range.start;
            var en = range.end;
            // NB: assume the simple case of erasing INSIDE property ranges; other cases to follow later.
            var properties = this.getPropertiesTraversingRange(sn, en);
            properties.forEach(function (p) {
                var p1 = p.clone();
                var p2 = p.clone();
                p1.guid = null; // a split property is really two new properties
                p1.endNode = sn.previousElementSibling;
                p1.endNode.endProperties = p1.endNode.endProperties || [];
                p1.endNode.endProperties.push(p1);
                p2.guid = null; // a split property is really two new properties
                p2.startNode = en.nextElementSibling;
                p2.startNode.startProperties = p2.startNode.startProperties || [];
                p2.startNode.startProperties.push(p2);
                p.remove();
                _this.data.properties.push(p1);
                _this.data.properties.push(p2);
                getSpansBetween({ startNode: p1.startNode, endNode: p1.endNode }).forEach(span => _this.paint(span));
                getSpansBetween({ startNode: p2.startNode, endNode: p2.endNode }).forEach(span => _this.paint(span));
            });
            this.marked = false;
        }
        getPropertiesTraversingRange(startNode, endNode) {
            var _this = this;
            var traversing = [];
            var nodes = getSpansBetween({ startNode: startNode, endNode: endNode });
            this.data.properties.forEach(function (prop) {
                nodes.forEach(function (node) {
                    if (_this.isWithin(prop.startNode, prop.endNode, node)) {
                        if (traversing.indexOf(prop) < 0) {
                            traversing.push(prop);
                        }
                    }
                });
            });
            return traversing;
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
        handleBackspace(caret, updateCarot) {
            log({ caret, updateCarot });
            var _this = this;
            const currentContainer = this.getCurrentContainer(caret.left || caret.right);
            const previousContainer = currentContainer.previousElementSibling;
            var atStartOfBlock = ((caret.left == null || caret.left.speedy.stream == TEXT_STREAM.OUT) || (caret.left.speedy && caret.left.speedy.isLineBreak));
            if (atStartOfBlock) {
                var previous = getPreviousChar({ startNode: caret.left });
                if (caret.left) {
                    if (caret.left.speedy.isLineBreak) {
                        caret.left.remove();
                    }
                }
                // We're at the start of the current block and backspace should therefore append the current block to the previous one,
                // e.g., deleting at the start of line 2 should append all of line 2 to line 1.
                if (this.event.keyboard["!BACKSPACE:start-of-block"]) {
                    this.event.keyboard["!BACKSPACE:start-of-block"]({ editor: this, caret, currentContainer, previousContainer });
                    return;
                }
                if (previousContainer) {
                    let siblings = [];
                    let node = caret.right;
                    while (node) {
                        siblings.push(node);
                        node = node.nextElementSibling;
                    }
                    siblings.forEach(x => previousContainer.appendChild(x));
                    this.removeContainer(currentContainer);
                    this.setCarotByNode(previous, 1);
                    // NB: a naive implementation which doesn't shift start/endProperties to the end of the newly appended block.
                    log("At start of current block, merge it (append it to) the previous block.")
                } else {
                    // no previousElementSibling found when the currentBlock is inside a container, e.g., when it is inside a right-aligned block
                    // which is inside a text-block. Previous here really means the previous container.
                    log("At start of document, nothing to backspace.");
                    if (caret.right) {
                        this.setCarotByNode(caret.right, 0);
                    }
                }
                return;
            }
            if (!caret.left.speedy) {
                log("Expected 'caret.left' to have a 'speedy' property.");
                return;
            }
            var target = caret.left;
            var previous = firstPreviousCharOrLineBreak(target);
            var next = firstNextCharOrLineBreak(target);
            var outOfStream = (target.speedy.stream == TEXT_STREAM.OUT);
            if (outOfStream) {
                target.startProperties[0].remove();
                target.style.display = "none";
                if (updateCarot && previous) {
                    this.setCarotByNode(previous);
                }
                return;
            }
            if (target.startProperties.length) {
                target.startProperties.forEach(function (prop) {
                    if (!next) {
                        return;
                    }
                    prop.startNode = next;
                    next.startProperties.push(prop);
                });
                target.startProperties.length = 0;
            }
            if (target.endProperties.length) {
                target.endProperties.forEach(function (prop) {
                    if (!previous) {
                        return;
                    }
                    prop.endNode = previous;
                    previous.endProperties.push(prop);
                });
                target.endProperties.length = 0;
            }
            if (previous) {
                if (previous.endProperties.length) {
                    previous.endProperties
                        .filter(function (ep) { return ep.startNode == next && ep.endNode == previous; })
                        .forEach(function (single) { remove(_this.data.properties, single); });
                }
            }
            target.remove();
            if (updateCarot) {
                this.setCarotByNode(caret.right, CARET.LEFT);
            }
            if (updateCarot) {
                this.setCarotByNode(previous, CARET.RIGHT);
            }
        }
        getNextContainer(container) {
            var next = container.nextElementSibling;
            if (next && next.speedy && next.speedy.role == ELEMENT_ROLE.CONTAINER) {
                return next;
            }
            return null;
        }
        handleDelete(caret) {
            log("handleDelete", { caret });
            var _this = this;
            const currentContainer = this.getCurrentContainer(caret.left || caret.right);
            const nextContainer = this.getNextContainer(currentContainer);
            const atEndOfBlock = (caret.right == null);
            const next = getNextChar({ startNode: caret.right || caret.left });
            if (atEndOfBlock) {
                // We're at the end of the current block and backspace should therefore append the next block to the current one,
                // e.g., deleting at the end of line 1 should append all of line 2 to line 1.
                if (nextContainer) {
                    let siblings = [];
                    let node = next;
                    while (node) {
                        siblings.push(node);
                        node = node.nextElementSibling;
                    }
                    siblings.forEach(x => currentContainer.appendChild(x));
                    this.removeContainer(nextContainer);
                    this.setCarotByNode(caret.left, CARET.RIGHT);
                    // NB: a naive implementation which doesn't shift start/endProperties to the end of the newly appended block.
                    log("At end of current block, merge the next (append it to) the current block.")
                } else {
                    // No nextElementSibling found when the currentBlock is inside a container, e.g., when it is inside a right-aligned block
                    // which is inside a text-block. Next here really means the next container.
                    log("At end of document, nothing to backspace.");
                }
                return;
            }
            const current = caret.right;
            const outOfStream = (current.speedy.stream == TEXT_STREAM.OUT);
            if (outOfStream) {
                next.startProperties[0].remove();
                next.style.display = "none";
                if (current) {
                    this.setCarotByNode(current);
                }
                return;
            }
            if (current.startProperties.length) {
                current.startProperties.forEach(function (prop) {
                    if (current == prop.endNode) {
                        prop.isDeleted = true;
                    } else {
                        prop.startNode = next;
                        next.startProperties.push(prop);
                    }
                });
                current.startProperties.length = 0;
            }
            if (current.endProperties.length) {
                var previous = caret.left;
                if (previous) {
                    current.endProperties.forEach(function (prop) {
                        if (prop.isDeleted) {
                            return;
                        }
                        prop.endNode = previous;
                        previous.endProperties.push(prop);
                    });
                }
                current.endProperties.length = 0;
            }
            //var singles = this.innerJoin(caret.right.startProperties, caret.right.endProperties);
            //singles.forEach(function (single) {
            //    single.isDeleted = true;
            //    // remove(_this.data.properties, single);
            //});
            caret.right.remove();
            if (next) {
                this.setCarotByNode(next, CARET.LEFT);
            } else {
                this.setCarotByNode(caret.left, CARET.RIGHT);
            }
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
            var current = sel.anchorNode.parentElement;
            if (sel.anchorOffset == 0) {
                current = current.previousElementSibling;
            }
            return current;
        }
        getCurrentTEST() {
            var sel = window.getSelection();
            var anchor = sel.anchorNode.parentElement;
            var current = sel.anchorNode.parentElement;
            //var current = this.getParentSpan(sel.anchorNode);
            if (!current.speedy) {
                return { first: true };
            }
            log({ sel });
            if (sel.anchorOffset == 0) {
                current = current.previousElementSibling || current;
            }
            return {
                first: current == null,
                anchor: anchor,
                node: current,
                offset: sel.anchorOffset
            };
        }
        getCaret() {
            var sel = window.getSelection();
            var anchor = this.getParentSpan(sel.anchorNode);
            if (!anchor) {
                anchor = getNextChar({ startNode: sel.anchorNode });
            }
            if (!anchor) {
                return { left: null, right: null };
            }
            if (anchor.speedy.isLineBreak) {
                return {
                    left: anchor,
                    right: anchor.nextElementSibling
                };
            }
            var offset = sel.anchorOffset;
            if (offset == 0) {
                const left = anchor.previousElementSibling;
                const right = anchor;
                return { left, right };
            }
            else {
                // offset == 1
                const left = anchor;
                const right = anchor.nextElementSibling;
                return { left, right };
            }
        }
        deleteRange(range) {
            var c = 0;
            var node = range.end;
            if (node != range.start) {
                while (node != range.start) {
                    var prev = this.getPreviousCharacterNode(node);
                    this.handleBackspace({ left: node });
                    node = prev;
                    if (c++ > maxWhile) {
                        log("Exceeded max iterations", {
                            method: "deleteRange", node, range
                        });
                        return;
                    }
                }
            }
            this.handleBackspace({ left: node }, true);
        }
        getSelection() {
            var range = this.getSelectionNodes();
            if (!range) {
                return null;
            }
            var text = getRangeText(range);
            return {
                text: text,
                startIndex: this.nodeIndex(range.start),
                endIndex: this.nodeIndex(range.end)
            };
        }
        canDelete(node) {
            return true;
        };
        clearSelectionMode() {
            this.mode.selection.start = null;
            this.mode.selection.end = null;
        }
        rightSelection(evt, current) {
            if (this.mode.selection.direction == null) {
                this.mode.selection.direction = SELECTION_DIRECTION.RIGHT;
            }
            if (this.mode.selection.direction == SELECTION_DIRECTION.RIGHT) {
                if (!this.mode.selection.start) {
                    this.mode.selection.start = current;
                }
                if (!this.mode.selection.end) {

                    var next = this.getNextCharacterNode(current);
                    this.mode.selection.end = next;
                }
                else {
                    var next = this.getNextCharacterNode(this.mode.selection.end);
                    this.mode.selection.end = next;
                }
            } else if (this.mode.selection.direction == SELECTION_DIRECTION.LEFT) {
                var node = this.mode.selection.start;
                var next = this.getNextCharacterNode(node);
                if (next == this.mode.selection.end) {
                    this.mode.selection.start = this.getNextCharacterNode(next);
                    this.mode.selection.end = next;
                    this.mode.selection.direction = SELECTION_DIRECTION.RIGHT;
                }
                if (this.nodeIndex(next) > this.nodeIndex(this.mode.selection.end)) {
                    var end = this.mode.selection.end;
                    this.mode.selection.end = next;
                    this.mode.selection.start = end;
                } else {
                    this.mode.selection.start = next;
                }
            }
            this.createSelection(this.mode.selection.start, this.mode.selection.end);
            this.updateSelectors();
        }
        leftSelection(evt, current) {
            if (this.mode.selection.direction == null) {
                this.mode.selection.direction = SELECTION_DIRECTION.LEFT;
            }
            if (this.mode.selection.direction == SELECTION_DIRECTION.LEFT) {
                if (!this.mode.selection.end) {
                    this.mode.selection.end = current;
                }
                if (!this.mode.selection.start) {
                    var previous = this.getPreviousCharacterNode(current);
                    this.mode.selection.start = previous;
                }
                else {
                    var previous = this.getPreviousCharacterNode(this.mode.selection.start);
                    this.mode.selection.start = previous;
                }
            }
            else if (this.mode.selection.direction == SELECTION_DIRECTION.RIGHT) {
                var node = this.mode.selection.end;
                var previous = this.getPreviousCharacterNode(node);
                if (previous == this.mode.selection.start) {
                    this.mode.selection.start = this.getPreviousCharacterNode(previous);
                    this.mode.selection.end = previous;
                    this.mode.selection.direction = SELECTION_DIRECTION.LEFT;
                }
                if (this.nodeIndex(previous) < this.nodeIndex(this.mode.selection.start)) {
                    var start = this.mode.selection.start;
                    this.mode.selection.start = previous;
                    this.mode.selection.end = start;
                } else {
                    this.mode.selection.end = previous;
                }
            }
            this.createSelection(this.mode.selection.start, this.mode.selection.end);
            this.updateSelectors();
        }
        processDelete(data) {
            const { caret, range, event } = data;
            var current = caret.left || caret.right;
            var canEdit = !!!this.lockText;
            var hasSelection = !!range;
            const shiftDelete = this.event.keyboard["shift-DELETE"];
            if (shiftDelete && event.shiftKey) {
                shiftDelete({ editor: this, e: event });
                return;
            }
            if (data.key == BACKSPACE) {
                if (!canEdit) {
                    return;
                }
                if (hasSelection) {
                    this.deleteRange(range);
                }
                else {
                    this.handleBackspace(caret, true);
                }
                this.marked = false;
                this.updateCurrentRanges();
            } else if (data.key == DELETE) {
                if (!canEdit) {
                    return;
                }
                if (hasSelection) {
                    this.deleteRange(range);
                }
                else {
                    this.handleDelete(caret);
                }
                this.marked = false;
                this.updateCurrentRanges();
                this.setAnimationFrame();
            }
        }
        processRightArrow(data) {
            var current = data.caret.left || data.caret.right;
            if (data.event.shiftKey) {
                this.rightSelection(data.event, current);
            }
            else {
                var node = this.mode.selection.end ? this.mode.selection.end : current;
                var next = this.getNextCharacterNode(node);
                this.clearSelectionMode();
                this.setCarotByNode(next);
                this.updateCurrentRanges();
            }
        }
        processLeftArrow(data) {
            var current = data.caret.left || data.caret.right;
            if (data.event.shiftKey) {
                this.leftSelection(data.event, current);
            }
            else {
                var node = this.mode.selection.start ? this.mode.selection.start : current;
                var previous = this.getPreviousCharacterNode(node);
                this.clearSelectionMode();
                this.setCarotByNode(previous);
                this.updateCurrentRanges();
            }
        }
        processArrows(data) {
            const { caret, event } = data;
            if (data.key == RIGHT_ARROW) {
                this.processRightArrow(data);
            }
            if (data.key == LEFT_ARROW) {
                this.processLeftArrow(data);
            }

            const cursor = caret.left || caret.right;
            const rect = cursor.getBoundingClientRect();
            const lineHeight = this.getComputedPropertyPixels(cursor, "line-height");
            if (data.key == UP_ARROW) {
                return false;
                const x = rect.left;
                const y = rect.top - (lineHeight);
                const nodes = document.elementsFromPoint(x, y);
                log({ cursor, nodes, x, y });
                if (nodes.length) {
                    this.setCarotByNode(nodes[0]);
                    this.updateCurrentRanges();
                }
                return true;
            }
            if (data.key == DOWN_ARROW) {
                return false;
                const x = rect.left;
                const y = rect.top + lineHeight;
                const nodes = document.elementsFromPoint(x, y);
                log({ cursor, nodes, x, y });
                if (nodes.length) {
                    this.setCarotByNode(nodes[0]);
                    this.updateCurrentRanges();
                }
                return true;
            }
            return true;
        }
        getComputedProperty(node, propertyName) {
            return document.defaultView.getComputedStyle(node, null).getPropertyValue(propertyName);
        }
        getComputedPropertyPixels(node, propertyName) {
            return parseFloat(this.getComputedProperty(node, propertyName).replace("px", ""));
        }
        invokeKeyBindings(keybindingPrefix, properties, propsAtCaret, e) {
            var processed = false;
            properties.forEach(cp => {
                let keyboard = cp.schema.event.keyboard;
                let handlerName = keybindingPrefix + e.key.toUpperCase();
                if (keyboard[handlerName]) {
                    keyboard[handlerName](cp);
                    processed = true;
                }
            });
            let keyboard = this.event.keyboard;
            if (keyboard) {
                let handlerName = keybindingPrefix + e.key.toUpperCase();
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
            const not = (arr) => false == arr.some(x => x);
            var processed = false;
            if (control) {
                if (keyCode == UP_ARROW) {
                    if (this.event.keyboard["control-UP-ARROW"]) {
                        this.event.keyboard["control-UP-ARROW"]({ editor: this, e: event, caret });
                    }
                    return;
                }
                if (keyCode == DOWN_ARROW) {
                    if (this.event.keyboard["control-DOWN-ARROW"]) {
                        this.event.keyboard["control-DOWN-ARROW"]({ editor: this, e: event, caret });
                    }
                    return;
                }
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
            if (data.event.keyCode == ESCAPE) {
                props.forEach(cp => {
                    var keyboard = cp.schema.event.keyboard;
                    if (keyboard["esc"]) {
                        keyboard["esc"](cp);
                        processed = true;
                    }
                });
            }
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
        processSelectionOverwrite(data) {
            this.marked = false;
            var start = data.range.start;
            if (start == data.range.end) {
                start.textContent = data.event.key;
                data.event.preventDefault();
                this.paint(start);
                return;
            }
            else {
                // Overwrite selected range by first deleting it.
                data.current = this.getPreviousCharacterNode(start);
                this.deleteRange(data.range);
            }
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
        handleKeyDownEvent(evt) {
            var _ = this;
            var canEdit = !!!this.lockText;
            var caret = this.getCaret();
            var key = (evt.which || evt.keyCode);               // get the inputted key
            var range = this.getSelectionNodes();               // get the mouse selection range, if any
            var hasSelection = !!range;
            this.handleCaretMoveEvent(evt, caret);
            if (PASSTHROUGH_CHARS.indexOf(key) >= 0) {
                this.updateCurrentRanges();
                return true;
            }
            if (evt.ctrlKey || evt.metaKey || evt.shiftKey || evt.keyCode == ESCAPE || evt.keyCode == TAB) {
                var processed = this.processControlOrMeta({ event: evt, caret });
                if (processed) {
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
            evt.preventDefault();
            if (false == canEdit) {
                return;
            }
            if (key == ENTER) {
                if (hasSelection) {
                    this.processSelectionOverwrite({ event: evt, range, caret });
                }
                this.processEnter({ key, event: evt, caret });
                return;
            }
            if (key == BACKSPACE || key == DELETE) {
                this.processDelete({ key, range, caret, event: evt });
                this.setAnimationFrame();
                evt.preventDefault();
                return;
            }
            if (hasSelection) {
                this.processSelectionOverwrite({ event: evt, range, caret });
            }
            this.insertCharacter({ event: evt, key, caret });
        }
        processEnter(args) {
            const caret = args.caret;
            const { event: e } = args;
            const currentBlock = this.getCurrentContainer(caret.left || caret.right);
            const overrideShiftEnter = this.event.keyboard["!shift-ENTER"];
            if (overrideShiftEnter) {
                if (e.shiftKey) {
                    overrideShiftEnter({ currentBlock: currentBlock, editor: this });
                    return;
                }
            }
            const overrideEnter = this.event.keyboard["!ENTER"];
            if (overrideEnter) {
                overrideEnter({ currentBlock: currentBlock, editor: this });
                return;
            }
            // var newBlock = document.createElement("DIV");
            var newBlock = this.newTextBlock();
            newBlock.speedy = {
                role: ELEMENT_ROLE.CONTAINER,
                stream: TEXT_STREAM.OUT
            };
            var carriageReturn = this.newCarriageReturn();
            newBlock.appendChild(carriageReturn);
            if (caret.right) {
                var siblings = [];
                let node = caret.right;
                while (node) {
                    siblings.push(node);
                    node = node.nextElementSibling;
                }
                siblings.forEach(s => newBlock.appendChild(s));
            }
            if (this.onBlockCreated) {
                this.onBlockCreated({
                    blockNode: newBlock
                });
            }
            this.insertNewBlock(currentBlock, newBlock);
            this.setCarotByNode(carriageReturn);
            if (this.onBlockAdded) {
                const containerNode = this.getCurrentContainer(currentBlock);
                this.onBlockAdded({
                    blockNode: newBlock.firstChild,
                    containerNode: newBlock
                });
            }
            var _this = this;
            if (this.event.keyboard["ENTER"]) {
                this.event.keyboard["ENTER"]({ currentBlock: currentBlock, newBlock: newBlock });
            }
            var blockProperties = this.data.properties.filter(p => {
                return p.blockNode && currentBlock == _this.getCurrentContainer(p.blockNode);
            });
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
            this.updateCurrentRanges();
            this.setAnimationFrame();
            if (debugLayout) {
                newBlock.classList.add("debug-block");
                carriageReturn.classList.add("debug-line-break");
            }
        }
        insertNewBlock(currentBlock, newBlock) {
            if (currentBlock.nextElementSibling) {
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
            if (data.key == SPACE) {
                span.textContent = String.fromCharCode(160);
            }
            return span;
        }
        getLastChildOfContainer(container) {
            var node = getPreviousChar({ startNode: container.lastChild, limit: 0 });
            return node;
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
        addCharSetCaret(args) {
            const { container, caret, span } = args;
            var isLastChild = caret.right == null;
            var isFirstChild = caret.left == null || (caret.left.speedy && caret.left.speedy.isLineBreak);
            log({ isFirstChild, isLastChild, span, caret });
            if (isLastChild) {
                container.appendChild(span);
                this.setCarotByNode(span);
                return;
            }
            if (isFirstChild) {
                container.insertBefore(span, caret.right);
                this.setCarotByNode(span);
                return;
            }
            var next = caret.right;
            log({ next, isLineBreak: next.speedy.isLineBreak });
            if (next.speedy.isLineBreak) {
                container.insertBefore(span, next.nextElementSibling);
                this.setCarotByNode(span);
                return;
            }
            container.insertBefore(span, next);
            this.setCarotByNode(span);
            if (this.onCharacterAdded) {
                this.onCharacterAdded(span, this);
            }
            this.updateCurrentRanges();
            this.setAnimationFrame();
        }
        insertCharacter(data) {
            var caret = data.caret;
            var container = this.getCurrentContainer(caret.left || caret.right);
            var isOnly = !container.children.length;
            var span = this.createSpan(data);
            var atFirst = caret.left == null;
            if (false == atFirst) {
                this.mark();
                var index = caret.left.speedy.index;
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
            }
            this.addCharSetCaret({ container, caret, span });
            //if (this.onCharacterAdded) {
            //    this.onCharacterAdded(span, this);
            //}
            //this.updateCurrentRanges();
            //this.setAnimationFrame();
            this.updateBuffer(data);
        }
        updateBuffer(data) {
            const currentTime = Date.now();
            if (currentTime - this.buffer.lastKeyTime > this.buffer.maxInterval) {
                this.buffer.values = [];
                this.buffer.lastKeyTime = currentTime;
            }
            this.buffer.values.push(data);
            if (this.buffer.values.length > this.buffer.maxLength) {
                this.buffer.values.splice(0, 1);
            }
            log({ buffer: this.buffer.values });
            if (this.buffer.values.length) {
                var values = this.buffer.values.map(x => x.event.key).join("");
                log({ values });
                let buffer = this.event.buffer;
                if (buffer) {
                    if (buffer[values]) {
                        buffer[values]({ buffer: this.buffer.values, editor: this });
                        // processed = true;
                    }
                }
            }
        }
        getContainer(node) {
            if (!node || !node.speedy || node.speedy.role == ELEMENT_ROLE.ROOT) {
                return null;
            }
            var isContainer = node.speedy.role == ELEMENT_ROLE.CONTAINER;
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
            var isBlock = node.speedy.role == ELEMENT_ROLE.BLOCK;
            if (false == isBlock) {
                node = node.parentElement;
                return this.getBlock(node);
            }
            return node;
        }
        getPreviousCharacterNode(span) {
            return getPreviousChar({ startNode: span });
        }
        getNextCharacterNode(span) {
            return getNextChar({ startNode: span });
        }
        getPropertyTypeNameFromShortcutKey(key) {
            for (var propertyTypeName in this.propertyType) {
                var propertyType = this.propertyType[propertyTypeName];
                if (propertyType.shortcut == key) {
                    return propertyTypeName;
                }
            }
            return null;
        }
        handleSpecialChars(span, charCode) {
            if (charCode == ENTER) {
                span.textContent = String.fromCharCode(13);
                span.speedy.isLineBreak = true;
            }
            if (charCode == TAB) {
                span.textContent = String.fromCharCode(TAB);
                span.classList.add("tab");
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
            if (selection.setBaseAndExtent) {
                var startOffset = 1;    // range.startOffset;
                var endOffset = 1;      // range.endOffset;
                selection.setBaseAndExtent(range.startContainer, startOffset, range.endContainer, endOffset);
            } else {
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }
        setCarotByNode(node, offset) {
            if (!node) {
                return;
            }
            var selection = document.getSelection();
            var range = document.createRange();
            var textNode = this.getTextNode(node);
            range.setStart(textNode, 1);
            range.collapse(true);
            if (selection.setBaseAndExtent) {
                offset = (offset != null) ? offset : 1;
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
                    if (current.speedy.role == ELEMENT_ROLE.CHAR) {
                        return current;
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
                if (range.startContainer.speedy && range.startContainer.speedy.role == ELEMENT_ROLE.CHAR) {
                    return range.startContainer;
                }
                var node = _this.getParentSpan(range.startContainer);
                if (range.startOffset == 0) {
                    return node;
                } else {
                    return node.nextElementSibling;
                }
            })();
            var endContainer = (() => {
                var node = _this.getParentSpan(range.endContainer);
                if (range.endOffset == 0) {
                    return node.previousElementSibling;
                } else {
                    return node;
                }
            })();
            log({ startContainer, endContainer });
            return {
                start: startContainer,
                end: endContainer
            };
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
            props.forEach(function (prop) {
                list.push(_this.addProperty(prop));
            });
            return list;
        }
        spanAtIndex(i) {
            return indexNode(this.container.firstChild, i);
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
        addProperty(p) {
            var spans = this.mark().filter(x => x.speedy.role == ELEMENT_ROLE.CHAR && x.speedy.stream == TEXT_STREAM.IN);
            var propertyType = this.propertyType[p.type];
            var sn = spans[p.startIndex];
            var en = spans[p.endIndex];
            var prop = new Property({
                editor: this,
                guid: null,
                schema: propertyType,
                layer: null,
                index: propCounter++,
                value: p.value,
                type: p.type,
                startNode: sn,
                endNode: en,
                blockNode: p.blockNode,
                attributes: p.attributes
            });
            prop.text = p.text;
            sn.startProperties.push(prop);
            en.endProperties.push(prop);
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
        addZeroPoint(type, content, position) {
            var span = this.newSpan(content);
            var schema = this.propertyType[type];
            span.speedy.stream = TEXT_STREAM.OUT;
            var property = new Property({
                editor: this,
                guid: null,
                layer: null,
                schema: schema,
                index: propCounter++,
                type: type,
                startNode: span,
                endNode: span,
                isZeroPoint: true
            });
            var parent = position.parentElement;
            parent.insertBefore(span, position.nextElementSibling);
            if (schema.animation && schema.animation.init) {
                schema.animation.init(property);
            }
            span.startProperties.push(property);
            span.endProperties.push(property);
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
                role: ELEMENT_ROLE.BLOCK,
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
                layer: null,
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
            var dummy = document.createElement("SPAN");
            const snp = startNode.parentNode;
            const enp = endNode.parentNode;
            if (snp == enp) {
                var parent = snp;
                parent.insertBefore(dummy, startNode);
                var block = document.createElement("DIV");
                block.speedy = {
                    role: ELEMENT_ROLE.BLOCK,
                    stream: TEXT_STREAM.OUT
                };
                block.classList.add(this.propertyType[type].className);
                var container = document.createElement("DIV");
                container.speedy = {
                    role: ELEMENT_ROLE.BLOCK,
                    stream: TEXT_STREAM.OUT
                };
                var nodes = this.getAllNodesBetween(startNode, endNode);
                nodes.forEach(node => container.appendChild(node));
                block.appendChild(container);
                parent.insertBefore(block, dummy);
                parent.removeChild(dummy);
                return block;
            } else {
                var parent = snp.parentElement;
                parent.insertBefore(dummy, snp);
                var wrapper = document.createElement("DIV");
                wrapper.speedy = {
                    role: ELEMENT_ROLE.BLOCK,
                    stream: TEXT_STREAM.OUT
                };
                wrapper.classList.add(this.propertyType[type].className);
                var blocks = this.getAllNodesBetween(snp, enp);
                blocks.forEach(b => wrapper.appendChild(b));
                parent.insertBefore(wrapper, dummy);
                parent.removeChild(dummy);
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
                layer: null,
                index: propCounter++,
                type: propertyTypeName,
                startNode: range.start,
                endNode: range.end
            });
            if (type.bracket) {
                if (type.bracket.left) {
                    var left = this.createBracketNode(prop, type.bracket.left, range.start.parentElement, range.start);
                    prop.addLeftBracket(left);
                }
                if (type.bracket.right) {
                    var right = this.createBracketNode(prop, type.bracket.right, range.end.parentElement, range.end.nextElementSibling);
                    prop.addRightBracket(right);
                }
            }
            prop.text = getRangeText(range);
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
                s.classList.add(propertyType.className);
            } else if (propertyType.format == "overlay") {
                if (s.classList.contains("line-break")) {
                    return;
                }
                var inner = document.createElement("SPAN");
                inner.speedy = {
                    role: ELEMENT_ROLE.OVERLAY,
                    stream: TEXT_STREAM.OUT
                };
                inner.setAttribute("data-layer", this.layer);
                inner.classList.add("overlaid");
                inner.classList.add(propertyType.className);
                s.appendChild(inner);
            }
            if (propertyType.styleRenderer) {
                propertyType.styleRenderer([s], prop);
            }
        }
        unbind() {
            var spans = this.mark().filter(x => x.speedy.stream == TEXT_STREAM.IN);
            var text = this.temp.text = spans.map(x => x.textContent).join("");
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
            const spans = this.mark().filter(x => x.speedy.role == ELEMENT_ROLE.CHAR && x.speedy.stream == TEXT_STREAM.IN);
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
        mark() {
            const spans = this.container.querySelectorAll("span");
            const spansArray = Array.from(spans);
            const chars = spansArray.filter(x => !!x.speedy && x.speedy.role == ELEMENT_ROLE.CHAR);
            const len = chars.length;
            var i = 0, c = 0;
            while (c < len) {
                let span = chars[c];
                span.speedy.index = i;
                if (span.speedy.stream == TEXT_STREAM.IN) {
                    i++;
                }
                c++;
            }
            this.marked = true;
            this.lastMarked = new Date();
            var _this = this;
            const timeout = 1000;
            const handler = function () {
                _this.event.afterMarkedInterval({ editor: _this });
                clearTimeout(_this.timer.afterMarkedInterval);
                _this.timer.afterMarkedInterval = null;
            };
            if (!this.timer.afterMarkedInterval) {
                this.timer.afterMarkedInterval = setTimeout(function () {
                    if (_this.marked) {
                        handler();
                    }
                }, timeout);
            };
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
                    layer: p.layer,
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
                            var left = this.createBracketNode(prop, type.bracket.left, startNode.parentElement, startNode);
                            prop.addLeftBracket(left);
                        }
                        if (type.bracket.right) {
                            var right = this.createBracketNode(prop, type.bracket.right, endNode.parentElement, endNode.nextElementSibling);
                            prop.addRightBracket(right);
                        }
                    }
                }
                prop.setSpanRange();
                this.data.properties.push(prop);
                propCounter = this.data.properties.length;

            }
            var _this = this;
            //window.requestAnimationFrame(function () {
            //    _this.data.properties.forEach(p => p.setSpanRange());
            //});
            this.handleZeroLengthAnnotations(model);
            this.handleBlocks(this.data.properties, spansArray);
            this.setAnimationFrame();
            if (len == 0) {
                this.focus();
                //var cursor = this.newSpan(" ");
                //cursor.speedy.role = ELEMENT_ROLE.CHAR;
                //cursor.speedy.stream = TEXT_STREAM.OUT;
                //this.container.firstChild.firstChild.appendChild(cursor);
                //this.focus();
            }
        }
        focus(force) {
            if (force || this.container.firstChild.children.length == 1) {
                const cursor = this.container.firstChild.firstChild;
                if (!cursor) {
                    return;
                }
                this.setCarotByNode(cursor);
                cursor.focus();
                return;
            }
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
            return indexNode(this.container, index);
        }
        handleZeroLengthAnnotations(model) {
            var spans = this.mark();
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
                // var node = this.indexNode(p.startIndex - 1);
                var node = spans[p.startIndex - 1];
                if (!node) {
                    console.warn("ZPA node not found.", p);
                    continue;
                }
                var prop = this.addZeroPoint(p.type, p.text, node);
                prop.guid = p.guid;
                prop.schema = pt;
                prop.layer = p.layer;
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
        getSentences() {
            var spans = this.mark().filter(x => x.speedy.role == ELEMENT_ROLE.CHAR && x.speedy.stream == TEXT_STREAM.IN);
            var text = spans.map(x => x.textContent).join("");
            var re = new RegExp(/[^.?!\r]+[.!?\r]+[\])'"`’”]*|.+/, "g");
            var results = [];
            var match;
            while ((match = re.exec(text)) != null) {
                var span = match[0];
                results.push({ startIndex: match.index, endIndex: match.index + span.length - 1, text: span });
            }
            return results;
        }
        getTextBlocks() {
            var spans = this.mark().filter(x => x.speedy.role == ELEMENT_ROLE.CHAR && x.speedy.stream == TEXT_STREAM.IN);
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
            var frag = this.textToDocumentFragmentWithTextBlocks(text);
            this.container.appendChild(frag);
            var firstBlock = this.container.firstChild;
            this.currentBlock = firstBlock;
            const divs = this.container.querySelectorAll("div");
            const arr = Array.from(divs);
            const containerNodes = arr.filter(x => x.speedy.role == ELEMENT_ROLE.CONTAINER);
            if (this.onBlockAdded) {
                containerNodes.forEach(cn => {
                    _this.onBlockAdded({ containerNode: cn });
                });
            }
        }
        textToDocumentFragment(text) {
            var len = text.length, i = 0;
            const skip = [LINE_FEED];
            var frag = document.createDocumentFragment();
            if (len == 0) {
                return frag;
            }
            while (len--) {
                let c = text[i++];
                let code = c.charCodeAt();
                if (skip.indexOf(code) >= 0) {
                    continue;
                }
                let span = this.newSpan(c);
                span.speedy.index = i - 1;
                this.handleSpecialChars(span, code)
                frag.appendChild(span);
            }
            return frag;
        }
        textToDocumentFragmentWithTextBlocks(text) {
            var len = text.length, i = 0;
            const skip = [LINE_FEED];
            var frag = document.createDocumentFragment();
            var block = this.newTextBlock();
            if (len == 0) {
                frag.appendChild(block);
                return frag;
            }
            while (len--) {
                let c = text[i++];
                let code = c.charCodeAt();
                if (skip.indexOf(code) >= 0) {
                    continue;
                }
                let span = this.newSpan(c);
                span.speedy.index = i - 1;
                this.handleSpecialChars(span, code)
                if (len == 0) {
                    block.appendChild(span);
                    frag.appendChild(block);
                    continue;
                }
                if (code == ENTER) {
                    frag.appendChild(block);
                    block = this.newTextBlock();
                    block.appendChild(span);
                    continue;
                }
                block.appendChild(span);
            }
            return frag;
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
            //var block = document.createElement("DIV");
            //block.classList.add("block");
            //block.innerHTML = "&zwj;";
            //block.speedy = {
            //    role: ELEMENT_ROLE.CHAR,
            //    stream: TEXT_STREAM.OUT
            //};
            //if (debugLayout) {
            //    block.classList.add("debug-block");
            //}

            var wrapper = document.createElement("DIV");
            if (this.blockClass) {
                wrapper.classList.add(this.blockClass);
            }
            wrapper.speedy = {
                role: ELEMENT_ROLE.CONTAINER,
                stream: TEXT_STREAM.OUT,
                // blockNode: block
                blockNode: wrapper
            };
            //wrapper.appendChild(block);
            if (this.event.blockMouseOver) {
                wrapper.addEventListener("mousemove", function (e) {
                    //console.log("mousemove", { e });
                    const containerNode = _this.getContainer(e.currentTarget);
                    //_this.event.blockMouseOver({ editor: _this, containerNode, e });
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
                role: ELEMENT_ROLE.CHAR,
                stream: TEXT_STREAM.IN,
                isLineBreak: true
            };
            s.style.position = "relative";
            s.textContent = String.fromCharCode(ENTER);
            s.startProperties = [];
            s.endProperties = [];
            if (debugLayout) {
                s.classList.add("debug-line-break");
            }
            return s;
        }
        newSpan(text) {
            var s = document.createElement("SPAN");
            s.speedy = {
                role: ELEMENT_ROLE.CHAR,
                stream: TEXT_STREAM.IN
            };
            s.style.position = "relative";
            if (text) {
                s.innerHTML = text;
            }
            s.startProperties = [];
            s.endProperties = [];
            return s;
        }
    }

    return Editor;
}));
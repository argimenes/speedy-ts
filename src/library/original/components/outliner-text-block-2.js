(function (factory) {
    define("components/outliner-text-block", ["speedy/editor", "bindings/text-window", "speedy/tags/style", "speedy/tags/semantic", "speedy/tags/syntax", "speedy/tags/lab", "speedy/monitor-bar", "knockout", "jquery", "pubsub", "app/helpers", "app/mapper", "parts/window-manager", "components/autocomplete", "components/arrow-selector", "functions/text-window", "plugins/spectrum", "jquery-ui", "jquery/nicescroll"], factory);
}(function (Editor, Bindings, Style, Semantic, Syntax, Lab, MonitorBar, ko, $, pubsub, Helper, Mapper, _WindowManager, Autocomplete, ArrowSelector, Functions) {

    var openModal = Helper.openModal;
    const div = Helper.div;
    const distinct = Helper.distinct;
    const newElement = Helper.newElement;
    const updateElement = Helper.updateElement;
    const applyBindings = Helper.applyBindings;
    const WindowManager = _WindowManager.getWindowManager();

    function closeModal(element) {
        $(element).modal("hide");
        ko.cleanNode(element);
        element.remove();
    }

    var index = 0;

    var QuickAdd = (function () {
        function QuickAdd(cons) {
            var _ = this;
            cons = cons || {};
            cons.model = cons.model || {};
            cons.editor = cons.editor || {};
            var model = JSON.parse(sessionStorage.getItem("text-add/model")) || {};
            this.popup = cons.popup;
            this.mode = cons.mode;
            this.index = index++;
            this.window = {
                text: null,
                entities: null
            };
            this.interceptor = null;
            this.arrowSelector = null;
            this.linkedReferencesManager = null;
            this.pinned = ko.observable(false);
            this.characterCount = ko.observable();
            this.wordCount = ko.observable();
            this.tabsVisible = ko.observable(cons.tabsVisible);
            this.monitorVisible = ko.observable(cons.monitorVisible);
            this.chromeless = cons.chromeless;
            this.youTubeApiReady = ko.observable(false);
            this.model = {
                Guid: cons.model.Guid,
                Name: ko.observable(cons.model.Name),
                Section: ko.observable(cons.model.Section),
                Type: ko.observable(cons.model.Type || "Document"),
                sections: ko.observableArray(cons.model.sections || []),
                generateSyntax: ko.observable(false),
                scrollToGuid: cons.model.scrollToGuid,
                scrollToIndex: cons.model.scrollToIndex,
                frame: ko.observable()
            };
            this.nameMode = ko.observable("View");
            this.state = {
                lastLineNumber: null,
                language: null,
                italicise: false,
                saveButton: {
                    disabled: ko.observable(false),
                    saving: ko.observable(false),
                    color: ko.observable("#6f7b8a")
                }
            };
            this.outlinerBlock = cons.outlinerBlock;
            this.userGuid = cons.userGuid || "test";
            this.handler = cons.handler;
            this.group = ko.observable("semantic");
            this.list = {
                Sections: ko.observableArray([]),
                Types: ko.observableArray([])
            };
            this.opacity = ko.observable("1");
            this.lineHeight = ko.observable("2rem");
            this.fontSize = ko.observable("1.5rem");
            this.fontFamily = ko.observable("monospace");
            this.textColour = ko.observable("#000");
            this.backgroundColour = ko.observable("#FFF");
            this.showAnnotationToggles = ko.observable(false);
            this.exportModel = ko.observable();
            this.viewer = ko.observable();
            $(this.popup).find("[data-role=colour-picker]").spectrum({
                beforeShow: function (colour) {
                    $(this).spectrum("set", "#000");
                },
                change: function (colour) {
                    var hex = colour.toHexString().toUpperCase();
                    _.colourSelected(hex);
                }
            });
            this.setLists(cons, model);
            if (cons.editor) {
                if (this.popup) {
                    this.setupEditor();
                    var spt = Mapper.toStandoffPropertyText(cons.editor);
                    this.editor.bind(spt);
                    if (this.model.scrollToGuid) {
                        this.scrollToGuid(this.model.scrollToGuid);
                    }
                    if (this.model.scrollToIndex) {
                        this.scrollToIndex(parseInt(this.model.scrollToIndex));
                    }
                    var animations = this.editor.data.properties.filter(p => !p.isDeleted && p.schema && p.schema.animation);
                    if (animations.length) {
                        animations.forEach(p => {
                            p.schema.animation.init(p, this.editor);
                            if (p.schema.animation.start) {
                                p.schema.animation.start(p, this.editor);
                            }
                        });
                    }
                }
            }
            this.setupEventHandlers();
        }
        QuickAdd.prototype.bind = function (model) {
            if (model) {
                if (model.guid) {
                    this.model.Guid = model.guid;
                }
                if (model.name) {
                    this.model.Name(model.name);
                }
                if (model.type) {
                    this.model.Type(model.type);
                }
                if (model.section) {
                    this.model.Section(model.section);
                }
            }
        };
        QuickAdd.prototype.setupEditor = function (settings) {
            var _ = _this = this;
            settings = settings || {};
            var container = settings.container || $(this.popup).find("[data-role=editor]")[0];
            var monitor = div({
                classList: ["context-monitor"],
                style: {
                    display: "none"
                }
            });
            $(monitor).draggable();
            document.body.appendChild(monitor);
            var configuration = {
                client: this,
                container: container,
                onPropertyCreated: function (prop, data) {
                    // Copy the custom fields across from the JSON data to the Property.
                    if (!data) {
                        return;
                    }
                    prop.userGuid = data.userGuid;
                    prop.deletedByUserGuid = data.deletedByUserGuid;
                    prop.modifiedByUserGuid = data.modifiedByUserGuid;
                },
                event: {
                    mouse: {
                        "selection": function (data) {
                            _this.contextMenuActivated(data);
                        },
                        "control-click": function (data) {
                            //_this.contextMenuActivated(data);
                        },
                        "click": Bindings["click"]
                    },
                    input: {
                        caretMoved: function (data) {
                            //const { editor, e, caret, properties } = data;
                            //const cursor = caret.left || caret.right;
                            //const sentiment = editor.propertyType["sentiment/sentence"];
                            //if (!!sentiment.minimap) {
                            //    sentiment.minimap.setArrowAt(cursor);
                            //}
                            //const sentence = properties.find(p => p.type == "text/sentence" && !p.isDeleted);
                            //if (sentence) {
                            //    _this.spotlightSentence(sentence);
                            //}
                        }
                    },
                    keyboard: {
                        "BACKSPACE:start-of-document": function (args) {
                            console.log("BACKSPACE:start-of-document", { args });
                            const { editor } = args;
                            const { client } = editor;
                            if (client.handler.onBackspaceAtBlockStartPressed) {
                                client.handler.onBackspaceAtBlockStartPressed({ ...args, outlinerBlock: client.outlinerBlock });
                            }
                        },
                        "DELETE:end-of-document": function (args) {
                            console.log("DELETE:end-of-document", { args });
                            const { editor } = args;
                            const { client } = editor;
                            if (client.handler.onDeleteAtBlockEndPressed) {
                                client.handler.onDeleteAtBlockEndPressed({ ...args, outlinerBlock: client.outlinerBlock });
                            }
                        },
                        "TAB": function (args) {
                            console.log("TAB", { args });
                            const { editor } = args;
                            const { client } = editor;
                            if (client.handler.onTabPressed) {
                                client.handler.onTabPressed({ ...args, outlinerBlock: client.outlinerBlock });
                            }
                        },
                        "shift-TAB": function (args) {
                            console.log("shift-TAB", { args });
                            const { editor } = args;
                            const { client } = editor;
                            if (client.handler.onShiftTabPressed) {
                                client.handler.onShiftTabPressed({ ...args, outlinerBlock: client.outlinerBlock });
                            }
                        },
                        "LEFT-ARROW:start-of-document": function (args) {
                            console.log("LEFT-ARROW:start-of-document", { args });
                            const { editor } = args;
                            const { client } = editor;
                            if (client.handler.onLeftArrowPressed) {
                                client.handler.onLeftArrowPressed({ ...args, outlinerBlock: client.outlinerBlock });
                            }
                        },
                        "RIGHT-ARROW:end-of-document": function (args) {
                            console.log("RIGHT-ARROW:end-of-document", { args });
                            const { editor } = args;
                            const { client } = editor;
                            if (client.handler.onRightArrowPressed) {
                                client.handler.onRightArrowPressed({ ...args, outlinerBlock: client.outlinerBlock });
                            }
                        },
                        "UP-ARROW:end-of-document": function (args) {
                            console.log("UP-ARROW:end-of-document", { args });
                            const { editor } = args;
                            const { client } = editor;
                            if (client.handler.onUpArrowPressed) {
                                client.handler.onUpArrowPressed({ ...args, outlinerBlock: client.outlinerBlock });
                            }
                        },
                        "DOWN-ARROW:end-of-document": function (args) {
                            console.log("DOWN-ARROW:end-of-document", { args });
                            const { editor } = args;
                            const { client } = editor;
                            if (client.handler.onDownArrowPressed) {
                                client.handler.onDownArrowPressed({ ...args, outlinerBlock: client.outlinerBlock });
                            }
                        },
                        "shift-DELETE": function (args) {
                            console.log("shift-DELETE", { args });
                            const { editor } = args;
                            const { client } = editor;
                            if (client.handler.onShiftDeletePressed) {
                                client.handler.onShiftDeletePressed({ ...args, outlinerBlock: client.outlinerBlock });
                            }
                        },
                        "!shift-ENTER": "ENTER",
                        "!ENTER": function (args) {
                            const { editor } = args;
                            const { client } = editor;
                            if (client.handler.onEnterPressed) {
                                client.handler.onEnterPressed({ ...args, outlinerBlock: client.outlinerBlock });
                            }
                        },
                        "control-LEFT-ARROW": Bindings["control-LEFT-ARROW"],
                        "control-LEFT-ARROW": Bindings["control-LEFT-ARROW"],
                        "control-RIGHT-ARROW": Bindings["control-RIGHT-ARROW"],
                        "control-UP-ARROW": Bindings["control-UP-ARROW"],
                        "control-DOWN-ARROW": Bindings["control-DOWN-ARROW"],
                        "control-Z": Bindings["control-Z"],
                        "control-[": (data) => {
                            Bindings["control-["](data, _this);
                        },
                        "control-9": (data) => {
                            Bindings["control-9"](data, _this);
                        },
                        "control-shift-E": function (data) {
                            _this.loadEntitiesPanel(data);
                        },
                        "alt- ": function (data) {
                            _this.loadMonitorPanel(data);
                        }
                    },
                    afterMarkedInterval: (args) => {
                        console.log("onAfterMarkedInterval", { now: new Date() });
                        const { editor } = args;
                        const { client } = editor;
                        if (client.handler.onAfterMarkedInterval) {
                            client.handler.onAfterMarkedInterval({ ...args, outlinerBlock: client.outlinerBlock });
                        }
                    },
                    blockMouseOver: (data) => {

                    },
                    blockMouseOut: (data) => {

                    },
                    contextMenuActivated: (data) => {
                        _this.loadMonitorPanel(data);
                    },
                    contextMenuDeactivated: (params) => {
                        const { editor } = params;
                        const { client } = editor;
                        const { contextMenu } = client;
                        if (!contextMenu) {
                            return;
                        }
                        contextMenu.close();
                    }
                },
                blockClass: this.chromeless ? "chromeless-editor-container" : "editor-container",
                onBlockCreated: function (args) {
                    const { blockNode } = args;
                    _this.editor.addBlockNodeProperty({
                        type: "text/block",
                        blockNode: blockNode
                    });
                },
                onBlockAdded: function (args) {

                },
                onPropertyChanged: function (prop) {
                    if (!_.userGuid) {
                        return;
                    }
                    prop.modifiedByUserGuid = _.userGuid;
                },
                onPropertyDeleted: function (prop) {
                    if (!_.userGuid) {
                        return;
                    }
                    prop.deletedByUserGuid = _.userGuid;
                },
                onPropertyUnbound: function (data, prop) {
                    // Copy the custom fields across from the Property to the JSON data.
                    data.userGuid = prop.userGuid;
                    data.deletedByUserGuid = prop.deletedByUserGuid;
                    data.modifiedByUserGuid = prop.modifiedByUserGuid;
                    if (prop.text && prop.text.length > 50) {
                        data.text = prop.text.substring(0, 49);
                        // console.log(data.text);
                    }
                },
                onTextChanged: function (args) {
                    args.editor.client.interceptor.handleTextChange(args);
                },
                onCharacterAdded: function (data) {

                },
                monitorOptions: {
                    highlightProperties: true
                },
                css: {
                    highlight: "text-highlight"
                },
                propertyType: {
                    "blur": Lab.blur,
                    "text/block": Style["text/block"],
                    "text/sentence": Style["text/sentence"],
                    "air-quotes": Style["air-quotes"],
                    "upside-down": Style["upside-down"],
                    "named-entity/agent": Syntax["named-entity/agent"],
                    "alignment/indent": Style["alignment/indent"],
                    "alignment/justify": Style["alignment/justify"],
                    "alignment/right": Style["alignment/right"],
                    "alignment/center": Style["alignment/center"],
                    "autocomplete/highlight": Style["autocomplete/highlight"],
                    rainbow: Lab.rainbow,
                    bold: Style.bold,
                    italics: Style.italics,
                    code: Style.code,
                    url: Style.url,
                    h1: Style.h1,
                    h2: Style.h2,
                    h3: Style.h3,
                    hyphen: Style.hyphen,
                    strike: Style.strike,
                    uppercase: Style.uppercase,
                    highlight: Style.highlight,
                    underline: Style.underline,
                    superscript: Style.superscript,
                    subscript: Style.subscript,
                    intralinear: Style.intralinear,
                    colour: Style.colour,
                    font: Style.font,
                    size: Style.size,
                    wink: Lab.wink,
                    flip: Lab.flip,
                    pulsate: Lab.pulsate,
                    peekaboo: Lab.peekaboo,
                    hr: Style.hr,
                    clock: Lab.clock,
                    spinner: Lab.spinner,
                    rectangle: Style.rectangle,
                    quotation: Style.quotation,
                    blockquote: Style.blockquote,
                    page: Style.page,
                    agent: Semantic.agent,
                    trait: Semantic.trait,
                    claim: Semantic.claim,
                    dataPoint: Semantic.dataPoint,
                    text: Semantic.text,
                    metaRelation: Semantic.metaRelation,
                    time: Semantic.time
                }
            };
            this.editor = new Editor(configuration);
            this.interceptor = new Autocomplete({
                editor: this.editor
            });
            this.arrowSelector = new ArrowSelector({ editor: this.editor });
            this.arrowSelector.addHandler("onSelection", (args) => {
                _this.interceptor.applyToSelection({ start: args.start, end: args.end });
            });
            var monitorBar = new MonitorBar({
                monitor: monitor,
                monitorOptions: {
                    highlightProperties: true
                },
                monitorButton: {
                    link: '<span data-toggle="tooltip" data-original-title="Edit" class="fa fa-link monitor-button"></span>',
                    load: '<span data-toggle="tooltip" data-original-title="Load" class="fa fa-download monitor-button"></span>',
                    remove: '<span data-toggle="tooltip" data-original-title="Delete" class="fa fa-trash monitor-button"></span>',
                    shiftLeft: '<span data-toggle="tooltip" data-original-title="Left" class="fa fa-arrow-circle-left monitor-button"></span>',
                    shiftRight: '<span data-toggle="tooltip" data-original-title="Right" class="fa fa-arrow-circle-right monitor-button"></span>',
                    redraw: '<span data-toggle="tooltip" data-original-title="Redraw" class="monitor-button"><i class="fas fa-pencil-alt"></i></span>',
                    expand: '<span data-toggle="tooltip" data-original-title="Expand" class="fa fa-plus-circle monitor-button"></span>',
                    contract: '<span data-toggle="tooltip" data-original-title="Contract" class="fa fa-minus-circle monitor-button"></span>',
                    toZeroPoint: '<span data-toggle="tooltip" data-original-title="Convert to zero point" class="monitor-button" style="font-weight: 600;">Z</span>',
                    zeroPointLabel: '<span data-toggle="tooltip" data-original-title="Label" class="fa fa-file-text-o monitor-button"></span>',
                    number: '<span data-toggle="tooltip" data-original-title="Number" class="monitor-button">123</span>',
                },
                propertyType: configuration.propertyType,
                css: {
                    highlight: "text-highlight"
                },
                updateCurrentRanges: this.editor.updateCurrentRanges.bind(this.editor)
            });
            this.editor.addMonitor(monitorBar);
        };
        QuickAdd.prototype.contextMenuActivated = function (params) {
            const { editor, e, selection } = params;
            const { client } = editor;
            const y = e.pageY - 165;
            const firstCharRect = selection.start.getBoundingClientRect();
            const x = e.pageX < firstCharRect.x ? e.pageX : firstCharRect.x;
            if (client.contextMenu) {
                client.contextMenu.open({ x, y });
                return;
            }
            require(["components/context-menu"], (ContextMenu) => {
                client.contextMenu = new ContextMenu({ editor, selection });
                client.contextMenu.open({ x, y });
            });
        };
        QuickAdd.prototype.setupEventHandlers = function () {
            const _this = this;
            pubsub.subscribe("client/" + this.index + "/load-linked-references-manager", (__, args) => {
                console.log("load-linked-references-manager invoked")
                _this.loadLinkedReferencesManager(args);
            });
            pubsub.subscribe("text-client/load-text-graph", (__, args) => {
                _this.loadTextGraph({ guid: args.guid });
            });
            pubsub.subscribe("load-entity", (__, args) => {
                _this.loadEntityClicked(args.guid, args.options);
            });
        };
        QuickAdd.prototype.loadEntitiesPanel = function (data) {
            const _this = this;
            require(["components/entity-highlighter"], (Highlighter) => {
                if (_this.highlighter) {
                    _this.highlighter.close();
                    _this.highlighter = null;
                    return;
                }
                _this.highlighter = new Highlighter({
                    editor: data.editor
                });
            });
        };
        QuickAdd.prototype.loadMonitorPanel = function (data) {
            const getMiddle = (left, right, offset) => {
                if (!left && !right) {
                    return null;
                }
                if (!right) {
                    return left.speedy.offset.x + left.speedy.offset.w - offset;
                }
                return right.speedy.offset.x - offset;
            };
            console.log("loadMonitorPanel", { data });
            const { editor, e } = data;
            if (!editor.monitors.length) {
                return;
            }
            const monitorBar = editor.monitors[0];
            if (!monitorBar) {
                return;
            }
            monitorBar.active = true;
            if (!!monitorBar.caretUp) {
                monitorBar.caretUp.remove();
            }
            const x = e.clientX,
                y = e.clientY,
                caret = editor.getCaret(),
                leftSpan = editor.getParentSpan(caret.left),
                rightSpan = editor.getParentSpan(caret.right),
                middle = getMiddle(leftSpan, rightSpan, 5),
                anchorNode = !!x && !!y ? editor.getParentSpan(document.elementFromPoint(x, y)) || leftSpan || rightSpan : leftSpan || rightSpan,
                target = anchorNode;
            const cu_x = middle,
                cu_y = target.speedy.offset.cy + target.speedy.offset.h - 8;
            var caretUp = newElement("DIV", {
                style: {
                    position: "absolute",
                    color: "red",
                    top: cu_y + "px",
                    left: cu_x + "px",
                    zIndex: 900
                },
                innerHTML: `<i style="width: 10px;" class="fas fa-caret-up"></i>`,
            });
            caretUp.speedy = {
                role: 0,
                stream: 1
            };
            editor.container.appendChild(caretUp);
            monitorBar.caretUp = caretUp;
            monitorBar.anchorNode = anchorNode;
            const monitor = monitorBar.monitor,
                containerRect = editor.container.getBoundingClientRect(),
                containerRange = containerRect.x + containerRect.width,
                atLeft = e.pageX ? (e.pageX - containerRect.x) < (containerRect.width / 2) : cu_x < (containerRect.width / 2),
                left = atLeft ? containerRect.x - 70 : containerRange - 50,
                top = e.pageY ? e.pageY + 20 : target.getBoundingClientRect().y;
            updateElement(monitor, {
                style: {
                    position: "absolute",
                    display: "block",
                    backgroundColor: "#ccc",
                    borderRadius: "10px",
                    left: left + "px",
                    top: top + "px",
                    zIndex: WindowManager.getNextIndex() + 2
                }
            });
        };
        QuickAdd.prototype.namedEntitiesClicked = function () {
            const editor = this.editor;
            Helper.generateNamedEntities(editor, (properties) => editor.addProperties(properties));
        };
        QuickAdd.prototype.loadUserBubbles = function (users, client) {
            Functions.loadUserBubbles(users, client);
        };
        QuickAdd.prototype.resetUserAnnotations = function () {
            var properties = this.editor.data.properties;
            properties.forEach(p => p.unsetSpanRange());
            properties.forEach(p => p.setSpanRange());
        };
        QuickAdd.prototype.showUserAnnotations = function (guid) {
            var properties = this.editor.data.properties;
            var userProps = properties.filter(p => p.userGuid == guid);
            properties.forEach(p => p.unsetSpanRange());
            userProps.forEach(p => p.setSpanRange());
        };
        QuickAdd.prototype.loadTextWindow = function (guid, node, options) {
            Helper.loadTextWindow(guid, node, options);
        };
        QuickAdd.prototype.generateLabels = function (list) {
            return Functions.generateLabels(list);
        };
        QuickAdd.prototype.decompress = function (data) {
            var _this = this;
            var result = Helper.decompress(data);
            result.Properties.forEach(p => {
                p.attributes = _this.deserializeAttributes(p.attributes);
            });
            return result;
        };
        QuickAdd.prototype.batchUpdate = function (data) {
            Functions.batchUpdate(data);
        };
        QuickAdd.prototype.setGroup = function (group) {
            this.group(group);
        };
        QuickAdd.prototype.indentClicked = function () {
            this.editor.createBlockProperty("alignment/indent");
        };
        QuickAdd.prototype.justifyClicked = function () {
            this.editor.createBlockProperty("alignment/justify");
        };
        QuickAdd.prototype.rectangleClicked = function () {
            this.editor.createProperty("rectangle");
        };
        QuickAdd.prototype.rightClicked = function () {
            this.editor.createBlockProperty("alignment/right");
        };
        QuickAdd.prototype.centerClicked = function () {
            this.editor.createBlockProperty("alignment/center");
        };
        QuickAdd.prototype.h1Clicked = function () {
            this.editor.createProperty("h1");
        };
        QuickAdd.prototype.h2Clicked = function () {
            this.editor.createProperty("h2");
        };
        QuickAdd.prototype.h3Clicked = function () {
            this.editor.createProperty("h3");
        };
        QuickAdd.prototype.toggleTabsVisible = function () {
            var state = this.tabsVisible();
            this.tabsVisible(!state);
        };
        QuickAdd.prototype.toggleMonitorVisible = function () {
            var state = this.monitorVisible();
            this.monitorVisible(!state);
        };
        QuickAdd.prototype.metaDataClicked = function () {
            var _this = this;
            var metadata = this.editor.data.properties.filter(x => x.startNode == null && x.endNode == null);
            require(["parts/metadata-manager"], function (Manager) {
                openModal("/Static/Templates/Text/metadata-manager.html", {
                    name: "Metadata Manager",
                    ajaxContentAdded: function (element) {
                        var modal = new Manager({
                            properties: metadata,
                            handler: {
                                onAccepted: function (properties) {
                                    // Don't readd unchanged ones? Write some method like 'addOrReplaceProperties'???
                                    closeModal(element);
                                    // As we're passing property instances (by ref) we only need to add new properties.
                                    // Existing ones will be changed by ref. Not ideal solution, but should work for now.
                                    // Assume a new Property doesn't have a value set for 'index' unlike those created in the Editor itself.
                                    var added = properties.filter(x => x.index == null);
                                    _this.editor.addProperties(added);
                                },
                                onCancel: function () {
                                    closeModal(element);
                                }
                            }
                        });
                        ko.applyBindings(modal, element);
                    }
                })
            });
        };
        QuickAdd.prototype.selectTextClicked = function () {
            var _this = this;
            var sel = this.editor.getSelection();
            require(["parts/text-selector"], function (TextSelector) {
                $.get("/Static/Templates/Text/text-selector.html?v=2", function (html) {
                    var container = div({
                        classList: ["text-window"],
                        style: {
                            position: "absolute",
                            top: "100px",
                            right: "300px",
                            width: "800px",
                            maxHeight: "600px",
                            zIndex: WindowManager.getNextIndex()
                        },
                        innerHTML: html
                    });
                    var selector = new TextSelector({
                        popup: container,
                        selection: sel,
                        text: _this.editor.unbindText(),
                        handler: {
                            onMergeProperties: function (properties) {
                                container.remove();
                                _this.editor.addProperties(properties);
                            },
                            onCancel: function () {
                                container.remove();
                            }
                        }
                    });
                    ko.applyBindings(selector, container);
                    document.body.appendChild(container);
                    $(container).draggable({ handle: container.querySelectorAll("[data-role='draggable-handle']")[0] });
                    var win = WindowManager.addWindow({
                        type: "text-selector",
                        loader: {
                            params: {

                            }
                        },
                        node: container
                    });
                });
            });
        };
        QuickAdd.prototype.selectAgent = function (prop, process) {
            var _this = this;
            require(["modals/search-agents", "jquery-ui"], function (AgentModal) {
                $.get("/Static/Templates/Agent/search-panel.html?v=52", function (html) {
                    var inline = _this.createInlineAgentSelector();
                    var agentGuids = inline ? inline().map(item => item.value) : [];
                    var rect = prop.startNode.getBoundingClientRect();
                    const ww = window.innerWidth;
                    const wh = window.innerHeight;
                    const w = 750;
                    const h = 500;
                    const dh = 51; // dock height
                    const x = (rect.x + w >= ww ? (ww - w - 25) : rect.x);
                    const y = (rect.y + h >= wh - dh ? (wh - dh - h - 25) : (rect.y + 25));
                    var container = div({
                        classList: ["text-window"],
                        style: {
                            position: "absolute",
                            top: y + "px",
                            left: x + "px",
                            width: w + "px",
                            maxHeight: h + "px"
                        }
                    });
                    var modal = new AgentModal({
                        popup: container,
                        tabs: ["search", "recentlyUsed", "quickAdd", "sourceAgents"],
                        currentTab: "search",
                        tab: {
                            search: {
                                filter: {
                                    Guid: prop.value,
                                    Name: !prop.value ? prop.text : null
                                }
                            },
                            quickAdd: {
                                model: {
                                    Entity: {
                                        Name: prop.text ? prop.text : null
                                    }
                                }
                            },
                            sourceAgents: {
                                filter: {
                                    Guids: agentGuids
                                }
                            }
                        },
                        handler: {
                            inlineAgentSelector: _this.createInlineAgentSelector(),
                            onSelected: function (guid, name, state) {
                                process(guid, name);
                                prop.text = name;
                                win.close();
                                let rect = _this.window.text.node.getBoundingClientRect();
                                var _y = rect.y;
                                var _x = rect.x + rect.width + 20;
                                if (state) {
                                    if (state.isNew) {
                                        //_this.loadTextWindow(null, null, {
                                        //    top: _y + "px",
                                        //    left: _x + "px",
                                        //    onSaved: function (args) {
                                        //        var client = args.client;
                                        //        var params = {
                                        //            entityGuid: guid,
                                        //            textGuid: client.model.Guid
                                        //        };
                                        //        $.get("/Admin/Agent/HasNote", params, function (response) {
                                        //            console.log({ response });
                                        //            client.window.text.close();
                                        //        });
                                        //    }
                                        //});
                                    }
                                }
                            },
                            closeClicked: function () {
                                win.close();
                            }
                        }
                    });
                    modal.start();
                    var node = applyBindings(html, modal);
                    container.appendChild(node);
                    document.body.appendChild(container);
                    $(container).draggable();
                    var win = WindowManager.addWindow({
                        type: "agent-search",
                        params: {
                            value: prop.value,
                            text: prop.text
                        },
                        node: container
                    });
                });
            });
        };
        QuickAdd.prototype.loadLinkedReferencesManager = function (args) {
            Functions.loadLinkedReferencesManager(args);
        };
        QuickAdd.prototype.createInlineAgentSelector = function () {
            return Functions.createInlineAgentSelector(this.editor);
        };
        QuickAdd.prototype.setLists2 = function (args) {
            const { list, model } = args;
            this.list.Sections(list.Sections);
            this.list.Types(list.Types);
            if (model) {
                this.model.Section(model.section);
                this.model.Type(model.type);
            }
        };
        QuickAdd.prototype.drawClippedRectangle = function (p, options) {
            return Helper.drawClippedRectangle(p, options);
        };
        QuickAdd.prototype.setLists = function (cons, model) {
            var _this = this;
            const json = localStorage.getItem("/Admin/Text/SearchModalLists");
            if (json) {
                var list = JSON.parse(json);
                this.setLists2({ list, model });
            } else {
                $.get("/Admin/Text/SearchModalLists", function (response) {
                    console.log("response", response);
                    if (!response.Success) {
                        return;
                    }
                    const list = response.Data;
                    localStorage.setItem("/Admin/Text/SearchModalLists", JSON.stringify(list));
                    _this.setLists2({ list, model });
                });
            }
        };
        QuickAdd.prototype.unbindClicked = function () {
            var data = this.editor.unbind();
            this.exportModel(data);
            this.viewer(JSON.stringify(data));
        };
        QuickAdd.prototype.bindClicked = function () {
            var data = JSON.parse(this.viewer() || '{}');
            this.editor.bind({
                text: data.text,
                properties: data.properties
            });
            this.showHideExpansions();
            var animations = this.editor.data.properties.filter(p => !p.isDeleted && p.schema && p.schema.animation);
            if (animations.length) {
                animations.forEach(p => {
                    p.schema.animation.init(p, this.editor);
                    if (p.schema.animation.start) {
                        p.schema.animation.start(p, this.editor);
                    }
                });
            }
        }
        QuickAdd.prototype.submitClicked = function () {
            this.saveClicked();
        };
        QuickAdd.prototype.subscriptClicked = function () {
            this.editor.createProperty("subscript");
        };
        QuickAdd.prototype.blockquoteClicked = function () {
            var p = this.editor.createBlockProperty("blockquote");
        };
        QuickAdd.prototype.highlightClicked = function () {
            this.editor.createProperty("highlight");
        };
        QuickAdd.prototype.scrollToGuid = function (guid) {
            Functions.scrollToGuid(this.editor, guid);
        };
        QuickAdd.prototype.scrollToIndex = function (index) {
            var node = this.editor.nodeAtIndex(index);
            if (node) {
                node.scrollIntoView();
            }
        };
        QuickAdd.prototype.highlightPartOfSpeech = function (pos, highlight, style) {
            this.editor.data.properties.filter(x => x.type == "syntax/part-of-speech" && x.attributes.tag == pos).forEach(p => highlight ? p.highlight(style) : p.unhighlight("inherit"));
        };
        QuickAdd.prototype.uppercaseClicked = function () {
            this.editor.createProperty("uppercase");
        };
        QuickAdd.prototype.boldClicked = function () {
            this.editor.createProperty("bold");
        };
        QuickAdd.prototype.italicsClicked = function () {
            this.editor.createProperty("italics");
        };
        QuickAdd.prototype.strikeClicked = function () {
            this.editor.createProperty("strike");
        };
        QuickAdd.prototype.superscriptClicked = function () {
            this.editor.createProperty("superscript");
        };
        QuickAdd.prototype.underlineClicked = function () {
            this.editor.createProperty("underline");
        };
        QuickAdd.prototype.hyphenClicked = function () {
            this.editor.createZeroPointProperty("hyphen");
        };
        QuickAdd.prototype.agentClicked = function () {
            this.editor.createProperty("agent");
        };
        QuickAdd.prototype.pauseClicked = function () {
            var props = this.editor.data.properties.filter(p => !!p.animation);
            props.forEach(p => {
                if (p.animation) {
                    p.animation.stop = !p.animation.stop;
                }
            });
        };
        QuickAdd.prototype.textClicked = function () {
            this.editor.createProperty("text");
        };
        QuickAdd.prototype.intertextClicked = function () {
            this.editor.createProperty("source_of_intertext");
        };
        QuickAdd.prototype.claimClicked = function () {
            this.editor.createProperty("claim");
        };
        QuickAdd.prototype.traitClicked = function () {
            this.editor.createProperty("trait");
        };
        QuickAdd.prototype.metaRelationClicked = function () {
            this.editor.createProperty("metaRelation");
        };
        QuickAdd.prototype.timeClicked = function () {
            this.editor.createProperty("time");
        };
        QuickAdd.prototype.intralinearClicked = function () {
            var p = this.editor.createZeroPointProperty("intralinear");
            var type = this.editor.propertyType.intralinear;
            type.animation.init(p);
        };
        QuickAdd.prototype.dataPointClicked = function () {
            this.editor.createProperty("dataPoint");
        };
        QuickAdd.prototype.pasteHtmlBlockClicked = function () {
            var p = this.editor.createZeroPointProperty("html");
            p.schema.animation.init(p);
            p.schema.animation.start(p);
        };
        QuickAdd.prototype.sectionClicked = function () {
            this.editor.createProperty("section");
        };
        QuickAdd.prototype.structureClicked = function () {
            this.editor.createProperty("structure");
        };
        QuickAdd.prototype.closeClicked = function () {
            if (this.handler.closeClicked) {
                this.handler.closeClicked();
            }
        };
        QuickAdd.prototype.minimizeClicked = function () {
            if (this.handler.minimizeClicked) {
                this.handler.minimizeClicked();
            }
        };
        QuickAdd.prototype.focusClicked = function () {
            if (this.handler.focusClicked) {
                this.handler.focusClicked();
            }
        };
        QuickAdd.prototype.togglePinClicked = function () {
            if (this.handler.togglePinClicked) {
                this.handler.togglePinClicked();
            }
        };
        QuickAdd.prototype.toggleGlassModeClicked = function () {
            if (this.handler.toggleGlassModeClicked) {
                this.handler.toggleGlassModeClicked();
            }
        };
        QuickAdd.prototype.pinClicked = function () {
            if (this.handler.pinClicked) {
                this.handler.pinClicked();
            }
        };
        QuickAdd.prototype.zoomClicked = function () {
            if (this.handler.zoomClicked) {
                this.handler.zoomClicked();
            }
        };
        QuickAdd.prototype.colourSelected = function (hex) {
            this.editor.createProperty("colour", hex);
        };
        QuickAdd.prototype.fontClicked = function () {
            var font = prompt("Font", "monospace");
            this.editor.createProperty("font", font);
        };
        QuickAdd.prototype.sizeClicked = function () {
            var size = prompt("Size", "1em");
            this.editor.createProperty("size", size);
        };
        QuickAdd.prototype.cloneClicked = function () {
            var property = this.editor.getPropertyAtCursor();
            if (!property) {
                return;
            }
            var matches = this.editor.data.properties.filter(function (item) {
                return item.type == property.type && item.getText() == property.getText();
            });
            matches.forEach(function (item) {
                item.value = property.value;
            });
            alert(matches.length + " properties replaced.")
        };
        QuickAdd.prototype.populate = function (guid) {
            if (!guid) {
                return;
            }
            var _ = this;
            var params = {
                id: guid
            };
            this.statementGuid = guid;
            $.get("/Admin/Text/LoadEditorJson", params, function (response) {
                _.editor.bind({
                    text: response.Data.Text,
                    properties: response.Data.Properties
                });
                _.model.Name(response.Data.Name);
            });
        };
        QuickAdd.prototype.cancelClicked = function () {
            if (this.mode == "modal") {
                this.handler.onCancelled();
            }
            if (!this.model.Guid) {
                return;
            }
            window.location.href = "/Admin/Text/Index/{guid}".fmt({ guid: this.model.Guid });
        };
        QuickAdd.prototype.getTextBlocksClicked = function () {
            var blocks = this.editor.getTextBlocks();
            console.log({ blocks });
            var properties = blocks.map((s, i) => {
                return { ...s, type: "text/block", value: i + 1 };
            });
            this.editor.addProperties(properties);
        };
        QuickAdd.prototype.getSentencesClicked = function () {
            this.generateSentenceProperties();
        };
        QuickAdd.prototype.generateSentenceProperties = function () {
            Functions.generateSentenceProperties(this.editor);
        };
        QuickAdd.prototype.saveClicked = function () {
            this.save(this.handler.onSelected);
        };
        QuickAdd.prototype.setSections = function (list) {
            var section = this.model.Section();
            this.list.Sections(list);
            this.model.Section(section);
        };
        QuickAdd.prototype.deserializeAttributes = function (arr) {
            var obj = {};
            if (!arr) {
                return obj;
            }
            arr.forEach(pair => {
                var parts = pair.split("|");
                obj[parts[0]] = parts[1];
            });
            return obj;
        };
        QuickAdd.prototype.loadTextGraph = function (args) {
            require(["components/text-graph-viewer"], (TextGraphViewer) => {
                const model = new TextGraphViewer({
                    guid: args.guid,
                    guids: args.guids
                });
            });
        };
        QuickAdd.prototype.loadAgentGraph = function (args) {
            Functions.loadAgentGraph(args);
        };
        QuickAdd.prototype.loadEntityReferences = function (p) {
            require(["parts/search-text-blocks"], function (SearchTextBlocks) {
                var search = new SearchTextBlocks({
                    filter: {
                        agentGuid: p.value
                    }
                });
                (async () => {
                    await search.load();
                    search.search();
                })();
            });
        };
        QuickAdd.prototype.loadEntityClicked = function (guid, options) {
            var _this = this;
            options = options || {};
            options.width = options.width || 650;
            options.height = options.height || 450;
            options.top = options.top || ((window.innerHeight / 2) - (options.height / 2));
            options.left = options.left || ((window.innerWidth / 2) - (options.width / 2));
            options.tab = options.tab || "overview";
            $.get("/Static/Templates/Agent/entity-panel.html?v=24", function (html) {
                $.get("/Admin/Agent/Overview", { id: guid }, function (response) {
                    if (!response.Success) {
                        return;
                    }
                    var overview = response.Data;
                    var container = div({
                        classList: ["text-window"],
                        style: {
                            position: "absolute",
                            top: options.top + "px",
                            left: options.left + "px",
                            width: options.width + "px",
                            height: options.height + "px",
                            backgroundColor: "#fff"
                        }
                    });
                    var model =
                    {
                        Entity: overview.Entity,
                        Overview: overview,
                        tab: ko.observable(options.tab),
                        closeClicked: function () {
                            win.close();
                        },
                        loadMedia: function () {
                            if (!!overview.ImageUrl) {
                                _this.loadImageWindow({
                                    entityGuid: overview.Entity.Guid,
                                    name: overview.Entity.Name,
                                    x: 50,
                                    y: 100,
                                    url: overview.ImageUrl
                                });
                            }
                            if (!!overview.PdfUrl) {
                                _this.loadPdfWindow({
                                    entityGuid: overview.Entity.Guid,
                                    url: overview.PdfUrl
                                });
                            }
                            if (!!overview.TweetEmbedCode) {
                                _this.loadTweetWindow({
                                    entityGuid: overview.Entity.Guid,
                                    value: overview.TweetEmbedCode
                                });
                            }
                            if (!!overview.VideoUrl) {
                                _this.loadVideoWindow({
                                    entityGuid: overview.Entity.Guid,
                                    x: 50,
                                    y: options.top,
                                    name: overview.Entity.Name,
                                    url: overview.VideoUrl
                                });
                            }
                            if (!!overview.SketchfabEmbedCode) {
                                _this.loadSketchfabWindow({
                                    entityGuid: overview.Entity.Guid,
                                    value: overview.SketchfabEmbedCode
                                });
                            }
                            if (!!overview.WebsiteUrl) {
                                _this.loadWebsiteWindow({
                                    entityGuid: overview.Entity.Guid,
                                    url: overview.WebsiteUrl
                                });
                            }
                        },
                        minimizeClicked: function () {
                            win.minimize({ name: "entity / " + overview.Entity.Name });
                        },
                        loadAgentSnapshotsClicked: function () {
                            const guid = overview.Entity.Guid;
                            pubsub.publish("load-agent-snapshots", guid);
                        },
                        focusClicked: function () {
                            this.focus = !this.focus;
                            if (focus) {
                                win.focus();
                            } else {
                                win.unfocus();
                            }
                        },
                        toggleGlassModeClicked: function () {
                            this.glass = !this.glass;
                            if (this.glass) {
                                container.classList.add("glass-window");

                            } else {
                                container.classList.remove("glass-window");
                            }
                        },
                        overviewClicked: function () {
                            this.tab("overview");
                            let preview = container.querySelectorAll('[data-role="preview"]')[0];
                            preview.innerHTML = "&nbsp;";
                            ko.cleanNode(preview);
                            var content = div({
                                template: {
                                    view: `
<button type="button" class="btn btn-primary" data-bind="click: $data.addNoteClicked">Add note</button>
<button type="button" class="btn btn-primary" data-bind="click: $data.addAliasClicked">Add alias</button>
<div data-bind="if: $data.aliases().length">
    <ul data-bind="foreach: $data.aliases">
        <li style="display: inline-block; margin-right: 10px;"><span data-bind="text: $data"></span></li>
    </ul>
</div>
`,
                                    model: {
                                        aliases: ko.observableArray(overview.Aliases || []),
                                        addAliasClicked: function () {
                                            const _model = this;
                                            const alias = prompt("alias");
                                            if (!alias) {
                                                return;
                                            }
                                            const params = {
                                                alias: alias,
                                                agentGuid: guid
                                            }
                                            $.get("/Admin/Agent/AddAlias", params, function (response) {
                                                console.log("/Admin/Agent/AddAlias", { response });
                                                _model.reloadPanel();
                                            });
                                        },
                                        reloadPanel: function () {
                                            win.close();
                                            _this.loadEntityClicked(guid, options);
                                        },
                                        addNoteClicked: function () {
                                            const _model = this;
                                            console.log("addNoteClicked");
                                            _this.loadTextWindow(null, null, {
                                                top: options.top + "px",
                                                left: options.left + "px",
                                                onSaved: function (args) {
                                                    var client = args.client;
                                                    var params = {
                                                        entityGuid: overview.Entity.Guid,
                                                        textGuid: client.model.Guid
                                                    };
                                                    $.get("/Admin/Agent/HasNote", params, function (response) {
                                                        console.log({ response });
                                                        client.window.text.close();
                                                        _model.reloadPanel();
                                                    });
                                                }
                                            });
                                        }
                                    }
                                }
                            });
                            preview.appendChild(content);
                            if (overview.NoteGuids) {
                                overview.NoteGuids.forEach(noteGuid => {
                                    let options = {
                                        guid: noteGuid
                                    };
                                    var noteContainer = div();
                                    preview.appendChild(noteContainer);
                                    $.get("/Admin/Text/LoadEditorJson", { id: options.guid }, function (response) {
                                        console.log({ response });
                                        var data = _this.decompress(response.Data);
                                        options.name = response.Data.Name;
                                        options.node = noteContainer;
                                        var users = distinct(data.Properties.filter(x => !!x.userGuid).map(x => x.userGuid));
                                        _this.loadTextEditorClient(options, function (client) {
                                            client.bind({
                                                guid: guid,
                                                name: options.name || data.Name
                                            });
                                            if (data.Sections) {
                                                client.model.sections(data.Sections.filter(x => !!x.Target).map(x => x.Target.Name));
                                            }
                                            client.editor.bind({
                                                text: data.Text,
                                                properties: data.Properties
                                            });
                                            var animations = client.editor.data.properties.filter(p => !p.isDeleted && p.schema && p.schema.animation);
                                            if (animations.length) {
                                                animations.forEach(p => {
                                                    if (p.schema.animation.init) {
                                                        p.schema.animation.init(p, client.editor);
                                                    }
                                                    if (p.schema.animation.start) {
                                                        p.schema.animation.start(p, client.editor);
                                                    }
                                                });
                                            }
                                            // _this.loadUserBubbles(users, client);
                                            if (options.onLoaded) {
                                                options.onLoaded(client);
                                            }
                                            var node = client.window.text.node;
                                            node.style.position = "relative";
                                            node.style.display = "block";
                                            preview.appendChild(node);
                                        });
                                    });
                                });
                            }
                        },
                        relationsClicked: function () {
                            this.tab("relations");
                            _this.loadAgentGraph({ guid: overview.Entity.Guid });
                        },
                        timelineClicked: function () {
                            this.tab("timeline");
                            require(["parts/search-timeline"], function (SearchTimeline) {
                                var search = new SearchTimeline({
                                    filter: {
                                        agentGuid: overview.Entity.Guid,
                                        agentName: overview.Entity.Name
                                    }
                                });
                                search.load();
                                search.search();
                            });
                        },
                        propertiesClicked: function () {
                            this.tab("properties");
                            let preview = container.querySelectorAll('[data-role="preview"]')[0];
                            preview.innerHTML = "&nbsp;";
                            ko.cleanNode(preview);
                            $.get("/Static/Templates/Agent/properties-panel.html?v=3", function (html) {
                                $.get("/Admin/Agent/Properties", { id: guid }, function (response) {
                                    console.log({ response });
                                    if (!response.Success) {
                                        return;
                                    }
                                    var content = applyBindings(html, {
                                        items: response.Data,
                                        agent: {
                                            guid: guid,
                                            name: overview.Entity.Name
                                        },
                                        closeClicked: function () {

                                        },
                                        diagram: function (item) {

                                        }
                                    });
                                    preview.appendChild(content);
                                });
                            });
                        },
                        referencesClicked: function () {
                            this.tab("references");
                            require(["parts/search-text-blocks"], function (SearchTextBlocks) {
                                var search = new SearchTextBlocks({
                                    filter: {
                                        agentGuid: guid
                                    }
                                });
                                (async () => {
                                    await search.load();
                                    search.search();
                                })();
                            });
                        }
                    };
                    var node = applyBindings(html, model);
                    model.loadMedia();
                    if (!options.hidePanel) {
                        var handle = node.querySelectorAll("[data-role='draggable'")[0];
                        container.appendChild(node);
                        document.body.appendChild(container);
                        var win = WindowManager.addWindow({
                            type: "entity-panel",
                            name: overview.Entity.Name,
                            node: container,
                            draggable: {
                                node: handle
                            }
                        });
                        $(container).draggable();
                        if (!!overview.NoteGuids) {
                            model.overviewClicked();
                        } else {
                            model.referencesClicked();
                        }
                    }
                    if (options.onReady) {
                        options.onReady(win);
                    }
                });
            });
        };
        QuickAdd.prototype.editNameClicked = function () {
            this.nameMode("Edit");
        };
        QuickAdd.prototype.cancelEditNameClicked = function () {
            this.nameMode("View");
        };
        QuickAdd.prototype.spotlightSentence = function (p) {
            Functions.spotlightSentence(p);
        };
        QuickAdd.prototype.save = function (callback) {
            var _this = this;
            var model = this.editor.unbind();
            model.name = this.model.Name();
            model.guid = this.model.Guid;
            model.value = model.text;
            model.generateSyntax = this.model.generateSyntax();
            model.type = this.model.Type();
            model.section = this.model.Section();
            model.properties.forEach(function (property) {
                var attributes = property.attributes;
                if (!attributes) {
                    property.attributes = [];
                    return;
                }
                var propertyAttributes = Object.getOwnPropertyNames(attributes);
                if (propertyAttributes && propertyAttributes.length) {
                    var pairs = [];
                    for (var key in attributes) {
                        var value = attributes[key] || "";
                        pairs.push(key + "|" + value);
                    }
                    property.attributes = pairs;
                } else {
                    property.attributes = [];
                }
            });
            model.properties = JSON.stringify(model.properties);
            if (this.state.saveButton.disabled()) {
                return;
            }
            this.state.saveButton.disabled(true);
            this.state.saveButton.saving(true);
            $.post("/Admin/Text/SaveEditorJson", model, function (response) {
                console.log({ response });
                if (!response.Success) {
                    alert("There was an error ...");
                    return;
                }
                sessionStorage.setItem("text-add/model", JSON.stringify(model));
                _this.state.saveButton.disabled(false);
                _this.state.saveButton.saving(false);
                _this.updateWithSavedPropertyGuids(response.Data.Properties);
                _this.model.Guid = response.Data.TextGuid;
                if (callback) {
                    callback(response.Data.TextGuid);
                }
            });
        };
        QuickAdd.prototype.updateWithSavedPropertyGuids = function (properties) {
            const newProperties = this.editor.data.properties.filter(x => !x.guid);
            newProperties.forEach(np => {
                const saved = properties.find(p => p.Index == np.index);
                if (saved) {
                    np.guid = saved.Guid;
                }
            });
        };
        return QuickAdd;
    })();

    return QuickAdd;
}));
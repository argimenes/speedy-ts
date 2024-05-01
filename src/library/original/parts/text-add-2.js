(function (factory) {
    define("parts/text-add", ["speedy/editor", "bindings/text-window", "speedy/tags/style", "speedy/tags/semantic", "speedy/tags/syntax", "speedy/tags/lab", "speedy/monitor-bar", "knockout", "jquery", "pubsub", "app/helpers", "app/mapper", "parts/window-manager", "components/autocomplete", "components/arrow-selector", "functions/text-window", "plugins/spectrum", "jquery-ui", "jquery/nicescroll"], factory);
}(function (Editor, Bindings, Style, Semantic, Syntax, Lab, MonitorBar, ko, $, pubsub, Helper, Mapper, _WindowManager, Autocomplete, ArrowSelector, Functions) {
    const { openModal, div, distinct, newElement, updateElement, applyBindings, changeCss } = Helper;
    const WindowManager = _WindowManager.getWindowManager();
    const closeModal = (element) => {
        $(element).modal("hide");
        ko.cleanNode(element);
        element.remove();
    };
    var index = 0;

    class TextWrapper {
        constructor(cons) {
            var _this = this;
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
                typewriter: {
                    active: ko.observable(false)
                },
                saveButton: {
                    disabled: ko.observable(false),
                    saving: ko.observable(false),
                    color: ko.observable("#6f7b8a")
                }
            };
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
                    _this.colourSelected(hex);
                }
            });
            this.setLists(cons, model);
            if (cons.editor) {
                if (this.popup) {
                    this.setupEditor();
                    var spt = Mapper.toStandoffPropertyText(cons.editor);
                    this.editor.bind(spt);
                    this.editor.addToHistory();
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
        setupEditor(settings) {
            const _this = this;
            settings = settings || {};
            const container = settings.container || $(this.popup).find("[data-role=editor]")[0];
            const monitor = div({
                classList: ["context-monitor"],
                style: {
                    display: "none"
                }
            });
            $(monitor).draggable();
            document.body.appendChild(monitor);
            const configuration = {
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
                            const client = data.editor.client;
                            pubsub.publish("text-client/" + client.index + "/context-menu-activated", data);
                        },
                        "control-click": function (data) {
                            //_this.contextMenuActivated(data);
                        },
                        "click": Bindings["click"]
                    },
                    input: {
                        caretMoved: function (data) {
                            const { editor, e, caret, properties } = data;
                            const cursor = caret.left || caret.right;
                            const sentiment = editor.propertyType["sentiment/sentence"];
                            if (!!sentiment.minimap) {
                                sentiment.minimap.setArrowAt(cursor);
                            }
                            const sentence = properties.find(p => p.type == "text/sentence" && !p.isDeleted);
                            if (sentence) {
                                _this.spotlightSentence(sentence);
                            }
                        }
                    },
                    keyboard: {
                        "control-shift-P": Bindings["control-shift-P"],
                        "ENTER": function (args) {
                            const { currentBlock, newBlock } = args;
                            if (newBlock) {

                            }
                        },
                        "control-4": (data) => {
                            const { editor, e, caret, properties } = data;
                            const range = editor.getSelectionNodes();
                            editor.client.joinBlocksInSelection(range);
                        },
                        "control-2": (data) => {
                            const { editor } = data;
                            const instances = editor.data.properties.filter(p => p.type == "agent" && !p.isDeleted);
                            const mentions = Array.from(Helper.groupBy(instances, x => x.value))
                                .map(x=> {
                                    const first  = x[1][0];
                                    const len = first.attributes.length;
                                    const name = first.attributes[len-1].split("|")[1];
                                    const instances = Helper.distinct(x[1].map(m => m.getText()));
                                    return {
                                        name: name,
                                        mentions: instances.join("; ")
                                    }
                                });
                            console.log({mentions});
                            const panel = div({
                                classList: ["text-window"],
                                style:  {
                                    position: "absolute",
                                    padding: "20px",
                                    top: "200px",
                                    left: "200px",
                                    width: "600px",
                                    maxHeight: "800px",
                                    overflowY: "auto",
                                    overflowX: "hidden",
                                    zIndex: WindowManager.getNextIndex()
                                },
                                template: {
                                    view: `
                                    <div>
                                        <div data-bind="click: $data.closeClicked" class="safari_close"></div>
                                    </div>
                                    <table class="table">
                                        <tbody>
                                            <!-- ko foreach: mentions -->
                                            <tr>
                                                <td><span data-bind="text: $data.name"></span></td>
                                                <td><span data-bind="text: $data.mentions"></span></td>
                                            </tr>
                                            <!-- /ko -->
                                        </tbody>
                                    </table>
                                    `,
                                    model: {
                                        mentions: ko.observableArray(mentions),
                                        closeClicked: () => {
                                            panel.remove();
                                        }
                                    }
                                }
                            });
                            document.body.appendChild(panel);
                        },
                        "control-1": (data) => {
                            const { editor } = data;
                            const { client } = editor;
                            const split = (client.toggleSplit = !client.toggleSplit);
                            const caret = editor.getCaret();
                            const selection = editor.getSelectionNodes();
                            const si = selection.start.speedy.index;
                            const ei = selection.end.speedy.index;
                            const textBlock = editor.getCurrentContainer(caret.right);
                            const { cells } = editor.getTextBlockData(textBlock);
                            const before = cells.filter(c => c.speedy.index < si);
                            const after = cells.filter(c => c.speedy.index > ei);
                            const yb = split ? -10 : 0;
                            const xb = split ? -10 : 0;
                            const ya = split ? 10 : 0;
                            const xa = split ? 10 : 0;
                            before.forEach(c => {
                                c.style.position = "relative";
                                c.style.top = (yb) + "px";
                                c.style.left = (xb) + "px";
                            });
                            after.forEach(c => {
                                c.style.position = "relative";
                                c.style.top = (ya) + "px";
                                c.style.left = (xa) + "px";
                            });
                            editor.updateOffsets();
                        },
                        "control-LEFT-ARROW": Bindings["control-LEFT-ARROW"],
                        "control-LEFT-ARROW": Bindings["control-LEFT-ARROW"],
                        "control-RIGHT-ARROW": Bindings["control-RIGHT-ARROW"],
                        "control-UP-ARROW": Bindings["control-UP-ARROW"],
                        "control-DOWN-ARROW": Bindings["control-DOWN-ARROW"],
                        "control-/": function (data) {
                            _this.showKeyBindings();
                        },
                        "control-Z": Bindings["control-Z"],
                        "control-shift-H": function (data) {
                            require(["components/toc"], (TOC) => {
                                new TOC({ editor: data.editor });
                            });
                        },
                        "control-shift-L": function (data) {
                            pubsub.publish("text-search");
                        },
                        "control-shift-G": function (data) {
                            _this.loadTextGraph({ guid: _this.model.Guid });
                        },
                        "control-J": function (data) {
                            const { editor } = data;
                            const sentence = editor.propertyType["sentiment/sentence"];
                            if (!sentence) {
                                return;
                            }
                            var highlight = !sentence.highlight;
                            Helper.highlightSentiments({ highlight, editor });
                            sentence.highlight = highlight;
                        },
                        "control-shift-C": function (data) {

                        },
                        "control--": function (data) {
                            console.log("reduce text size");
                            _this.decreaseFontSize();
                        },
                        "control-=": function (data) {
                            console.log("increase text size");
                            _this.increaseFontSize();
                        },
                        "control-[": (data) => {
                            Bindings["control-["](data, _this);
                        },
                        "control-9": (data) => {
                            Bindings["control-9"](data, _this);
                        },
                        "CHAR:F1": function (data) {
                            _this.loadEntitiesPanel(data);
                        },
                        "CHAR:F4": function (data) {
                            const { editor } = data;
                            editor.mode.extendProperties = !editor.mode.extendProperties;
                        },
                        "CHAR:F7": function (data) {
                            const { editor, caret } = data;
                            const properties = editor.getPropertiesWithin(caret.left, caret.right);
                            if (properties && properties.length) {
                                const agents = properties.filter(x => x.type == "agent");
                                if (agents.length) {
                                    _this.loadTimeline({
                                        guid: agents[0].value, name: agents[0].text
                                    });
                                }
                            }
                        },
                        "CHAR:F10": function (data) {
                            const { editor } = data;
                            require(["components/cli"], (CLI) => {
                                const cli = new CLI({ editor });
                            });
                        },
                        "CHAR:F12": function (data) {
                            _this.showSidePanelClicked();
                        },
                        "shift-DELETE": Bindings["shift-DELETE"],
                        "control-shift-E": function (data) {
                            _this.loadEntitiesPanel(data);
                        },
                        "control-F": Bindings["control-F"],
                        "control-Y": Bindings["control-Y"],
                        "control-shift-F": function (data) {
                            _this.selectTextClicked();
                        },
                        "control-shift-U": function (data) {
                            _this.pronounRecognitionClicked();
                        },
                        "control-shift-I": function (data) {
                            _this.intralinearClicked();
                        },
                        "control-S": function (data) {
                            const { editor } = data;
                            editor.client.save();
                        },
                        "alt- ": function (data) {
                            _this.loadMonitorPanel(data);
                        }
                    },
                    afterMarkedInterval: (data) => {
                        _this.saveClicked();
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
                    if (!_this.userGuid) {
                        return;
                    }
                    prop.modifiedByUserGuid = _this.userGuid;
                },
                onPropertyDeleted: function (prop) {
                    if (!_this.userGuid) {
                        return;
                    }
                    prop.deletedByUserGuid = _this.userGuid;
                },
                onPropertyUnbound: function (data, prop) {
                    // Copy the custom fields across from the Property to the JSON data.
                    data.userGuid = prop.userGuid;
                    data.deletedByUserGuid = prop.deletedByUserGuid;
                    data.modifiedByUserGuid = prop.modifiedByUserGuid;
                    if (prop.text && prop.text.length > 50) {
                        data.text = prop.text.substring(0, 49);
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
                    "tab": Style.tab,
                    "blur": Lab.blur,
                    "list": Style["list"],
                    "list/item": Style["list/item"],
                    "text/block": Style["text/block"],
                    "text/sentence": Style["text/sentence"],
                    "air-quotes": Style["air-quotes"],
                    "upside-down": Style["upside-down"],
                    "named-entity/agent": Syntax["named-entity/agent"],
                    "alignment/indent": Style["alignment/indent"],
                    "alignment/justify": Style["alignment/justify"],
                    "alignment/right": Style["alignment/right"],
                    "alignment/center": Style["alignment/center"],
                    "syntax/sentence": Syntax["syntax/sentence"],
                    "sentiment/sentence": Syntax["sentiment/sentence"],
                    "source_of_intertext": Semantic["source_of_intertext"],
                    "target_of_intertext": Semantic["target_of_intertext"],
                    "syntax/part-of-speech": Syntax["syntax/part-of-speech"],
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
                    drop: Lab.drop,
                    domain: Semantic.domain,
                    quotation: Style.quotation,
                    blockquote: Style.blockquote,
                    page: Style.page,
                    language: Style.language,
                    paragraph: Style.paragraph,
                    structure: Style.structure,
                    todo: Style.todo,
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
            const monitorBar = new MonitorBar({
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
        }
        bind(model) {
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
        }
        contextMenuActivated(params) {
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
        }
        setupEventHandlers() {
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
            pubsub.subscribe("text-client/" + this.index + "/save-text", () => {
                _this.save();
            });
            pubsub.subscribe("text-client/" + this.index + "/close", () => {
                _this.closeClicked();
            });
            pubsub.subscribe("text-client/" + this.index + "/context-menu-activated", (__, data) => {
                _this.contextMenuActivated(data);
            });
        }
        loadEntitiesPanel(data) {
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
        }
        loadTimeline(options) {
            require(["components/timeline-viewer"], (Timeline) => {
                new Timeline({
                    agent: {
                        guid: options.guid,
                        name: options.name || "?"
                    }
                });
            });
        }
        loadMonitorPanel(data) {
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
                //left = atLeft ? containerRect.x - 70 : containerRange - 50,
                left = target.speedy.offset.x - 15,
                top = target.speedy.offset.y + target.speedy.offset.h + 15
                // top = e.pageY ? e.pageY + 20 : target.getBoundingClientRect().y
                ;
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
        }
        namedEntitiesClicked() {
            const editor = this.editor;
            Helper.generateNamedEntities(editor, (properties) => editor.addProperties(properties));
        }
        toggleTypewriterClicked() {
            this.state.typewriter.active(!this.state.typewriter.active());
        }
        loadUserBubbles(users, client) {
            Functions.loadUserBubbles(users, client);
        }
        joinBlocksInSelection(range) {
            const editor = this.editor;
            const sc = editor.getCurrentContainer(range.start);
            const ec = editor.getCurrentContainer(range.end);
            var block = ec;
            while (block != sc) {
                var pb = block.speedy.previousTextBlock;
                var pcell = pb.speedy.endNode.speedy.previous;
                editor.deleteCell({ cell: pb.speedy.endNode, updateCaret: false });
                editor.insertAfterCell(pcell, " ");
                block = pb;
            }
            editor.mark();
            editor.updateOffsets();
        }
        resetUserAnnotations() {
            var properties = this.editor.data.properties;
            properties.forEach(p => p.unsetSpanRange());
            properties.forEach(p => p.setSpanRange());
        }
        showUserAnnotations(guid) {
            var properties = this.editor.data.properties;
            var userProps = properties.filter(p => p.userGuid == guid);
            properties.forEach(p => p.unsetSpanRange());
            userProps.forEach(p => p.setSpanRange());
        }
        showSidePanelClicked() {
            Functions.showSidePanel(this);
        }
        loadTextWindow(guid, node, options) {
            Helper.loadTextWindow(guid, node, options);
        }
        generateLabels(list) {
            return Functions.generateLabels(list);
        }
        textLoader() {
            pubsub.publish("load-text-search");
        }
        decompress(data) {
            const _this = this;
            const result = Helper.decompress(data);
            result.Properties.forEach(p => {
                p.attributes = _this.deserializeAttributes(p.attributes);
            });
            return result;
        }
        showKeyBindings() {
            Functions.showKeyBindings();
        }
        batchUpdate(data) {
            Functions.batchUpdate(data);
        }
        setGroup(group) {
            this.group(group);
        }
        toggleAnnotationVisibilityClicked() {
            this.showAnnotationToggles(!this.showAnnotationToggles());
        }
        toggle2(name, value, attr, trueValue, falseValue) {
            const css = this.editor.propertyType[name].className;
            changeCss("." + css, attr, value ? trueValue : falseValue);
            return true;
        }
        listItemClicked() {
            const item = this.editor.createBlockProperty2({ type: "list/item" });
            const list = this.editor.createParentBlockProperty("list", item);
            item.parent = list;
        }
        indentClicked() {
            this.editor.createBlockProperty("alignment/indent");
        }
        justifyClicked() {
            this.editor.createBlockProperty("alignment/justify");
        }
        rectangleClicked() {
            this.editor.createProperty("rectangle");
        }
        shiftAllLeftClicked() {
            this.editor.shiftPropertiesLeftFromCaret();
            return false;
        }
        shiftAllRightClicked() {
            this.editor.shiftPropertiesRightFromCaret();
            return false;
        }
        rightClicked() {
            this.editor.createBlockProperty("alignment/right");
        }
        centerClicked() {
            this.editor.createBlockProperty("alignment/center");
        }
        showHide(name) {
            return this.toggle(name, "display", "inline", "none");
        }
        h1Clicked() {
            this.editor.createProperty("h1");
        }
        h2Clicked() {
            this.editor.createProperty("h2");
        }
        h3Clicked() {
            this.editor.createProperty("h3");
        }
        toggleTabsVisible() {
            const state = this.tabsVisible();
            this.tabsVisible(!state);
        };
        toggleMonitorVisible() {
            const state = this.monitorVisible();
            this.monitorVisible(!state);
        }
        metaDataClicked() {
            const _this = this;
            const metadata = this.editor.data.properties.filter(x => x.startNode == null && x.endNode == null);
            require(["parts/metadata-manager"], function (Manager) {
                openModal("/Static/Templates/Text/metadata-manager.html", {
                    name: "Metadata Manager",
                    ajaxContentAdded: function (element) {
                        var modal = new Manager({
                            properties: metadata,
                            handler: {
                                onAccepted: (properties) => {
                                    // Don't readd unchanged ones? Write some method like 'addOrReplaceProperties'???
                                    closeModal(element);
                                    // As we're passing property instances (by ref) we only need to add new properties.
                                    // Existing ones will be changed by ref. Not ideal solution, but should work for now.
                                    // Assume a new Property doesn't have a value set for 'index' unlike those created in the Editor itself.
                                    const added = properties.filter(x => x.index == null);
                                    _this.editor.addProperties(added);
                                },
                                onCancel: () => {
                                    closeModal(element);
                                }
                            }
                        });
                        ko.applyBindings(modal, element);
                    }
                })
            });
        }
        syntaxClicked(lang) {
            Functions.syntaxClicked(this.editor, lang);
        }
        selectTextClicked() {
            const _this = this;
            const sel = this.editor.getSelection();
            require(["parts/text-selector"], function (TextSelector) {
                $.get("/Static/Templates/Text/text-selector.html?v=2", function (html) {
                    const container = div({
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
                    const selector = new TextSelector({
                        popup: container,
                        selection: sel,
                        text: _this.editor.unbindText(),
                        handler: {
                            onMergeProperties: (properties) => {
                                container.remove();
                                _this.editor.addProperties(properties);
                            },
                            onCancel: () => {
                                container.remove();
                            }
                        }
                    });
                    ko.applyBindings(selector, container);
                    document.body.appendChild(container);
                    $(container).draggable({ handle: container.querySelectorAll("[data-role='draggable-handle']")[0] });
                    const win = WindowManager.addWindow({
                        type: "text-selector",
                        loader: {
                            params: {

                            }
                        },
                        node: container
                    });
                });
            });
        }
        backCursor() {
            this.editor.backCursor();
        }
        forwardCursor() {
            this.editor.forwardCursor();
        }
        selectAgent(prop, process) {
            const _this = this;
            require(["modals/search-agents", "jquery-ui"], function (AgentModal) {
                $.get("/Static/Templates/Agent/search-panel.html?v=52", function (html) {
                    const inline = _this.createInlineAgentSelector();
                    const agentGuids = inline ? inline().map(item => item.value) : [];
                    const rect = prop.startNode.getBoundingClientRect();
                    const ww = window.innerWidth;
                    const wh = window.innerHeight;
                    const w = 750;
                    const h = 500;
                    const dh = 51; // dock height
                    const x = (rect.x + w >= ww ? (ww - w - 25) : rect.x);
                    const y = (rect.y + h >= wh - dh ? (wh - dh - h - 25) : (rect.y + 25));
                    const container = div({
                        classList: ["text-window"],
                        style: {
                            position: "absolute",
                            top: y + "px",
                            left: x + "px",
                            width: w + "px",
                            maxHeight: h + "px"
                        }
                    });
                    const modal = new AgentModal({
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
                            onSelected: (guid, name, state) => {
                                process(guid, name);
                                prop.text = name;
                                win.close();
                            },
                            closeClicked: () => {
                                win.close();
                            }
                        }
                    });
                    modal.start();
                    const node = applyBindings(html, modal);
                    container.appendChild(node);
                    document.body.appendChild(container);
                    $(container).draggable();
                    const win = WindowManager.addWindow({
                        type: "agent-search",
                        params: {
                            value: prop.value,
                            text: prop.text
                        },
                        node: container
                    });
                });
            });
        }
        pronounRecognitionClicked() {
            Functions.pronounRecognitionClicked(this.editor);
        }
        loadLinkedReferencesManager(args) {
            Functions.loadLinkedReferencesManager(args);
        }
        createInlineAgentSelector() {
            return Functions.createInlineAgentSelector(this.editor);
        }
        lemmatizeClicked() {
            Functions.lemmatize(this.editor);
        }
        setLists2(args) {
            const { list, model } = args;
            this.list.Sections(list.Sections);
            this.list.Types(list.Types);
            if (model) {
                this.model.Section(model.section);
                this.model.Type(model.type);
            }
        }
        drawClippedRectangle(p, options) {
            return Helper.drawClippedRectangle(p, options);
        }
        setLists(cons, model) {
            const _this = this;
            const json = localStorage.getItem("/Admin/Text/SearchModalLists");
            if (json) {
                const list = JSON.parse(json);
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
        }
        unbindClicked() {
            const data = this.editor.unbind();
            this.exportModel(data);
            this.viewer(JSON.stringify(data));
        };
        bindClicked() {
            const data = JSON.parse(this.viewer() || '{}');
            this.editor.bind({
                text: data.text,
                properties: data.properties
            });
            this.showHideExpansions();
            const animations = this.editor.data.properties.filter(p => !p.isDeleted && p.schema && p.schema.animation);
            if (animations.length) {
                animations.forEach(p => {
                    p.schema.animation.init(p, this.editor);
                    if (p.schema.animation.start) {
                        p.schema.animation.start(p, this.editor);
                    }
                });
            }
        }
        submitClicked() {
            this.saveClicked();
        };
        layerClicked(layer) {
            const selected = layer.selected();
            this.editor.setLayerVisibility(layer.name, selected);
            return true;
        }
        changeOpacityClicked() {
            const opacity = this.opacity();
            changeCss(".agent", "opacity", opacity);
            changeCss(".claim", "opacity", opacity);
            changeCss(".time", "opacity", opacity);
            changeCss(".metaRelation", "opacity", opacity);
            changeCss(".dataPoint", "opacity", opacity);
            changeCss(".structure", "opacity", opacity);
            changeCss(".text", "opacity", opacity);
        }
        loadPdfWindow(data) {
            Functions.loadPdfWindow(data);
        }
        loadWebsiteWindow(data) {
            Functions.loadWebsiteWindow(data);
        }
        createYouTubeContent(args) {
            return Functions.createYouTubeContent(args);
        }
        createVimeoContent(args) {
            return Functions.createVimeoContent(args);
        }
        loadVideoWindow(data) {
            const _this = this;
            const { url, name, zIndex, entityGuid } = data;
            const y = data.y || 200;
            const x = data.x || 600;
            const container = div({
                classList: ["text-window"],
                style: {
                    position: "absolute",
                    top: y + "px",
                    left: x + "px",
                    backgroundColor: "#000",
                    zIndex: zIndex || WindowManager.getNextIndex()
                }
            });
            const loader = div({
                classList: ["loader", "loader-center"]
            });
            container.appendChild(loader);
            const win = WindowManager.addWindow({
                type: "video",
                node: container,
                loader: {
                    params: {
                        entityGuid: entityGuid
                    }
                },
            });
            document.body.appendChild(container);
            if (data.fetchUrl) {
                $.get("/Admin/Agent/Overview", { id: entityGuid }, function (response) {
                    let url = response.Data.VideoUrl;
                    let name = response.Data.Name;
                    _this.createVideoContent({ container, url, entityGuid, name, zIndex, loader, win });
                });
            } else {
                this.createVideoContent({ container, url, entityGuid, name, zIndex, loader, win });
            }
        }
        createVideoContent(args) {
            const { url, container } = args;
            var content = null;
            if (url.toLowerCase().indexOf("youtube") >= 0) {
                content = this.createYouTubeContent(args);
            } else if (url.toLowerCase().indexOf("vimeo") >= 0) {
                content = this.createVimeoContent(args);
            } else {
                content = this.createVideoFileContent(args);
            }
            container.appendChild(content);
        }
        createVideoFileContent(args) {
            return Functions.createVideoFileContent(args);
        }
        loadImageWindow(data) {
            require(["components/image-viewer"], (ImageViewer) => {
                var url = data.url;
                var entityGuid = data.entityGuid;
                var y = data.y || 100;
                var x = data.x || 800;
                var width = data.width;
                var height = data.height + 40;
                const viewer = new ImageViewer({
                    entityGuid, x, y, width, height, url
                });
            });
        }
        loadTweetWindow(data) {
            Functions.loadTweetWindow(data);
        }
        loadSketchfabWindow(data) {
            Functions.loadSketchfabWindow(data);
        }
        changeLineHeightClicked() {
            changeCss(".editor", "line-height", this.lineHeight());
        }
        decreaseFontSize() {
            var fontSize = this.getFontSize();
            fontSize -= 1;
            this.fontSize(fontSize + "px");
            this.changeFontSizeClicked();

            var lineHeight = this.getLineHeight();
            lineHeight -= 1;
            this.lineHeight(lineHeight + "px");
            this.changeLineHeightClicked();
        }
        increaseFontSize() {
            var fontSize = this.getFontSize();
            fontSize += 1;
            this.fontSize(fontSize + "px");
            this.changeFontSizeClicked();

            var lineHeight = this.getLineHeight();
            lineHeight += 1;
            this.lineHeight(lineHeight + "px");
            this.changeLineHeightClicked();
        }
        getLineHeight() {
            var value = "16px";
            if (this.editor && this.editor.container) {
                value = window.getComputedStyle(this.editor.container).lineHeight;
            }
            var valueFloat = parseFloat(value.replace("px", ""));
            return valueFloat;
        }
        getFontSize() {
            var fontSize = "16px";
            if (this.editor && this.editor.container) {
                fontSize = window.getComputedStyle(this.editor.container).fontSize;
            }
            var fontSizeFloat = parseFloat(fontSize.replace("px", ""));
            return fontSizeFloat;
        }
        changeFontSizeClicked() {
            changeCss(".editor", "font-size", this.fontSize());
        }
        changeFontFamilyClicked() {
            changeCss(".editor", "font-family", this.fontFamily());
        }
        changeTextColourClicked() {
            changeCss(".editor", "color", this.textColour());
        }
        changeBackgroundColourClicked() {
            changeCss(".editor", "background-color", this.backgroundColour());
        }
        subscriptClicked() {
            this.editor.createProperty("subscript");
        }
        blockquoteClicked() {
            var p = this.editor.createBlockProperty("blockquote");
        }
        pageClicked() {
            this.editor.createProperty("page");
        }
        domainClicked() {
            this.editor.createProperty("domain");
        }
        languageClicked() {
            this.editor.createProperty("language");
        }
        highlightClicked() {
            this.editor.createProperty("highlight");
        }
        scrollToGuid(guid) {
            Functions.scrollToGuid(this.editor, guid);
        }
        scrollToIndex(index) {
            const node = this.editor.nodeAtIndex(index);
            if (node) {
                node.scrollIntoView();
            }
        }
        highlightPartOfSpeech(pos, highlight, style) {
            this.editor.data.properties
                .filter(x => x.type == "syntax/part-of-speech" && x.attributes.tag == pos)
                .forEach(p => highlight ? p.highlight(style) : p.unhighlight("inherit"));
        }
        uppercaseClicked() {
            this.editor.createProperty("uppercase");
        }
        boldClicked() {
            this.editor.createProperty("bold");
        }
        italicsClicked() {
            this.editor.createProperty("italics");
        }
        strikeClicked() {
            this.editor.createProperty("strike");
        }
        superscriptClicked() {
            this.editor.createProperty("superscript");
        }
        underlineClicked() {
            this.editor.createProperty("underline");
        }
        lineClicked() {
            this.editor.createProperty("line");
        }
        expansionClicked() {
            this.editor.createProperty("expansion");
        }
        hyphenClicked() {
            this.editor.createZeroPointProperty("hyphen");
        }
        paragraphClicked() {
            this.editor.createProperty("paragraph");
        }
        agentClicked() {
            this.editor.createProperty("agent");
        }
        footnoteClicked() {
            const content = prompt("Footnote text");
            this.editor.createZeroPointProperty("text", content);
        }
        pauseClicked() {
            const props = this.editor.data.properties.filter(p => !!p.animation);
            props.forEach(p => {
                if (p.animation) {
                    p.animation.stop = !p.animation.stop;
                }
            });
        }
        tabClicked() {
            this.editor.createZeroPointProperty("tab", "&nbsp;");
        }
        textClicked() {
            this.editor.createProperty("text");
        }
        intertextClicked() {
            this.editor.createProperty("source_of_intertext");
        }
        claimClicked() {
            this.editor.createProperty("claim");
        }
        traitClicked() {
            this.editor.createProperty("trait");
        }
        metaRelationClicked() {
            this.editor.createProperty("metaRelation");
        }
        timeClicked() {
            this.editor.createProperty("time");
        }
        intralinearClicked() {
            const p = this.editor.createZeroPointProperty("intralinear");
            const type = this.editor.propertyType.intralinear;
            type.animation.init(p);
        }
        dataPointClicked() {
            this.editor.createProperty("dataPoint");
        }
        pasteHtmlBlockClicked() {
            const p = this.editor.createZeroPointProperty("html");
            p.schema.animation.init(p);
            p.schema.animation.start(p);
        }
        sectionClicked() {
            this.editor.createProperty("section");
        }
        structureClicked() {
            this.editor.createProperty("structure");
        }
        closeClicked() {
            if (this.handler.closeClicked) {
                this.handler.closeClicked();
            }
        }
        minimizeClicked() {
            if (this.handler.minimizeClicked) {
                this.handler.minimizeClicked();
            }
        }
        focusClicked() {
            if (this.handler.focusClicked) {
                this.handler.focusClicked();
            }
        }
        togglePinClicked() {
            if (this.handler.togglePinClicked) {
                this.handler.togglePinClicked();
            }
        }
        toggleGlassModeClicked() {
            if (this.handler.toggleGlassModeClicked) {
                this.handler.toggleGlassModeClicked();
            }
        }
        pinClicked() {
            if (this.handler.pinClicked) {
                this.handler.pinClicked();
            }
        }
        zoomClicked() {
            if (this.handler.zoomClicked) {
                this.handler.zoomClicked();
            }
        }
        colourSelected(hex) {
            this.editor.createProperty("colour", hex);
        }
        fontClicked() {
            const font = prompt("Font", "monospace");
            this.editor.createProperty("font", font);
        }
        sizeClicked() {
            const size = prompt("Size", "1em");
            this.editor.createProperty("size", size);
        }
        cloneClicked() {
            const property = this.editor.getPropertyAtCursor();
            if (!property) {
                return;
            }
            const matches = this.editor.data.properties.filter((item) => {
                return item.type == property.type && item.getText() == property.getText();
            });
            matches.forEach((item) => {
                item.value = property.value;
            });
            alert(matches.length + " properties replaced.")
        }
        populate(guid) {
            if (!guid) {
                return;
            }
            const _this = this;
            var params = {
                id: guid
            };
            this.statementGuid = guid;
            $.get("/Admin/Text/LoadEditorJson", params, (response) => {
                _this.editor.bind({
                    text: response.Data.Text,
                    properties: response.Data.Properties
                });
                _this.model.Name(response.Data.Name);
            });
        }
        cancelClicked() {
            if (this.mode == "modal") {
                this.handler.onCancelled();
            }
            if (!this.model.Guid) {
                return;
            }
            window.location.href = "/Admin/Text/Index/{guid}".fmt({ guid: this.model.Guid });
        }
        getTextBlocksClicked() {
            const blocks = this.editor.getTextBlocks();
            const properties = blocks.map((s, i) => {
                return { ...s, type: "text/block", value: i + 1 };
            });
            this.editor.addProperties(properties);
        }
        getSentencesClicked() {
            this.generateSentenceProperties();
        }
        generateSentenceProperties() {
            Functions.generateSentenceProperties(this.editor);
        }
        saveClicked() {
            this.save(this.handler.onSelected);
        }
        setSections(list) {
            const section = this.model.Section();
            this.list.Sections(list);
            this.model.Section(section);
        }
        deserializeAttributes(arr) {
            var obj = {};
            if (!arr) {
                return obj;
            }
            arr.forEach(pair => {
                var parts = pair.split("|");
                obj[parts[0]] = parts[1];
            });
            return obj;
        }
        loadTextGraph(args) {
            require(["components/text-graph-viewer"], (TextGraphViewer) => {
                const model = new TextGraphViewer({
                    guid: args.guid,
                    guids: args.guids
                });
            });
        }
        loadAgentGraph(args) {
            Functions.loadAgentGraph(args);
        }
        loadEntityReferences(p) {
            require(["parts/search-text-blocks"], function (SearchTextBlocks) {
                const search = new SearchTextBlocks({
                    filter: {
                        agentGuid: p.value
                    }
                });
                (async () => {
                    await search.load();
                    search.search();
                })();
            });
        }
        loadEntityClicked(guid, options) {
            const _this = this;
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
        }
        editNameClicked() {
            this.nameMode("Edit");
        }
        cancelEditNameClicked() {
            this.nameMode("View");
        };
        spotlightSentence(p) {
            Functions.spotlightSentence(p);
        }
        save(callback) {
            const _this = this;
            const model = this.editor.unbind();
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
            const properties = model.properties.filter(x => x.type != "autocomplete/highlight");
            model.properties = JSON.stringify(properties);
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
        }
        updateWithSavedPropertyGuids(properties) {
            const newProperties = this.editor.data.properties.filter(x => !x.guid);
            newProperties.forEach(np => {
                const saved = properties.find(p => p.Index == np.index);
                if (saved) {
                    np.guid = saved.Guid;
                }
            });
        }
    }

    return TextWrapper;
}));
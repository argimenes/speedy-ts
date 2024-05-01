(function (factory) {
    define("components/outliner-text-block", ["speedy/editor", "speedy/arabic-shaping", "speedy/monitor-bar", "knockout", "jquery", "pubsub", "app/helpers", "app/mapper", "app/utils", "parts/window-manager", "components/autocomplete", "components/arrow-selector", "plugins/spectrum", "jquery-ui", "jquery/nicescroll"], factory);
}(function (Editor, ArabicShaping, MonitorBar, ko, $, pubsub, Helper, Mapper, Utils, _WindowManager, Autocomplete, ArrowSelector) {

    var openModal = Helper.openModal;
    var setList = Helper.setList;
    var select = Utils.select;
    var distinct = Helper.distinct;
    var changeCss = Helper.changeCss;
    const WindowManager = _WindowManager.getWindowManager();

    function closeModal(element) {
        $(element).modal("hide");
        ko.cleanNode(element);
        element.remove();
    }

    class OffsetManager {
        constructor() {
            this.lines = []; // { x1; y1; x2; y2; offsetY; }
        }
        addLineAndGetOffset(line) {
            const sameRow = this.lines.filter(l => l.y1 == line.y1);
            const overlaps = sameRow.filter(l => Math.max(l.x1, line.x1) < Math.min(l.x2, line.x2));
            if (overlaps.length) {
                var highestOffset = overlaps.length - 1;
                const _line = { ...line, offsetY: highestOffset + 2 };
                this.lines.push(_line);
                return _line;
            }
            else {
                const _line = { ...line, offsetY: 0 };
                this.lines.push(_line);
                return _line;
            }
        }
        clearLines(properties) {
            this.lines = this.lines.filter(l => properties.indexOf(l.p) >= 0);
        }
    }
    var offsetManager = new OffsetManager();

    var cache = {};

    var z = 10;

    function onlyUnique(value, index, self) {
        return self.indexOf(value) === index;
    }

    const div = (config) => {
        return newElement("DIV", config);
    }

    const img = (config) => {
        return newElement("IMG", config);
    }

    const span = (config) => {
        return newElement("SPAN", config);
    }

    const el = (config) => {
        var _el = document.createElement(config.type);
        return updateElement(_el, config);
    };

    const newElement = (type, config) => {
        var el = document.createElement(type);
        return updateElement(el, config);
    };

    const applyBindings = (html, model) => {
        var node = newElement("DIV", { innerHTML: html });
        ko.applyBindings(model, node);
        return node;
    }

    const updateElement = (el, config) => {
        config = config || {};
        if (config.property) {
            el.property = config.property;
        }
        if (config.innerHTML) {
            el.innerHTML = config.innerHTML;
        }
        if (config.style) {
            for (var key in config.style) {
                var value = config.style[key];
                if (typeof value === 'object' && value !== null) {
                    if (value.condition) {
                        el.style[key] = value.value;
                        continue;
                    }
                }
                el.style[key] = value;
            }
        }
        if (config.handler) {
            for (var key in config.handler) {
                el.addEventListener(key, config.handler[key]);
            }
        }
        if (config.attribute) {
            for (var key in config.attribute) {
                el.setAttribute(key, config.attribute[key]);
            }
        }
        if (config.dataset) {
            for (var key in config.dataset) {
                el.dataset[key] = config.dataset[key];
            }
        }
        if (config.classList) {
            config.classList.forEach(x => el.classList.add(x));
        }
        if (config.template) {
            var temp = applyBindings(config.template.view, config.template.model);
            el.appendChild(temp);
        }
        if (config.children) {
            config.children.forEach(x => el.appendChild(x));
        }
        return el;
    };

    const extendElement = (source, config) => {
        var el = source.cloneNode(true);
        return updateElement(el, config);
    };

    var getPrevious = (span) => span.previousElementSibling;
    var getNext = (span) => span.nextElementSibling;

    var addZwj = ArabicShaping.addZwj;
    var isArabicChar = ArabicShaping.isArabicChar;

    var TextBlock = (function () {
        function TextBlock(cons) {
            var _ = this;
            cons = cons || {};
            cons.model = cons.model || {};
            cons.editor = cons.editor || {};
            // var model = JSON.parse(sessionStorage.getItem("text-add/model")) || {};
            this.popup = cons.popup;
            this.mode = cons.mode;
            this.window = {
                text: null,
                entities: null
            };
            this.autocomplete = null;
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
                Type: ko.observable(cons.model.Type),
                TEI: ko.observable(),
                sections: ko.observableArray(cons.model.sections || []),
                richards: ko.observable(),
                generateSyntax: ko.observable(false),
                prosody: ko.observable(),
                attitude: ko.observable(),
                figurative: ko.observable(),
                Dexter: ko.observable(),
                specialCharacter: ko.observable(),
                scrollToGuid: cons.model.scrollToGuid,
                scrollToIndex: cons.model.scrollToIndex,
                videoBackground: ko.observable(),
                imageBackground: ko.observable(),
                frame: ko.observable()
            };
            this.nameMode = ko.observable("View");
            this.state = {
                lastLineNumber: null,
                language: null,
                italicise: false,
                saveButton: {
                    disabled: ko.observable(false),
                    saving: ko.observable(false)
                }
            };
            this.outlinerBlock = cons.outlinerBlock;
            this.userGuid = cons.userGuid || "test";
            this.handler = cons.handler;
            this.group = ko.observable("semantic");
            this.list = {
                Sections: ko.observableArray([]),
                Types: ko.observableArray([]),
                videoBackgrounds: ko.observableArray([
                    { Text: null, Value: null },
                    { Text: "rain", Value: "/content/video/rain.mp4" },
                    { Text: "water", Value: "/content/video/water.mp4" },
                    { Text: "peak", Value: "/content/video/peak.mp4" },
                    { Text: "lights", Value: "/content/video/lights.mp4" },
                    { Text: "stars", Value: "/content/video/constellations.mp4" }
                ]),
                frames: ko.observableArray([
                    { Text: null, Value: null },
                    { Text: "Breviary", Value: "/images/frames/breviary.png" },
                    { Text: "Coran", Value: "/images/frames/coran.png" }
                ]),
                imageBackgrounds: ko.observableArray([
                    { Text: null, Value: null },
                    { Text: "space", Value: "https://cdn.pixabay.com/photo/2016/01/27/15/25/space-1164579_960_720.png" },
                    { Text: "stars", Value: "//images.pexels.com/photos/733475/pexels-photo-733475.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260" },
                    { Text: "mountains", Value: "//images.pexels.com/photos/1054289/pexels-photo-1054289.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260" },
                    { Text: "light house", Value: "//images.pexels.com/photos/1532771/pexels-photo-1532771.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260" },
                    { Text: "vellum", Value: "https://live.staticflickr.com/2522/5701591414_77e6e0aeec_b.jpg" },
                    { Text: "paper", Value: "https://www.publicdomainpictures.net/pictures/250000/velka/paper-creased-background.jpg" },
                ]),
                textType: ko.observableArray([
                    "text-type/descriptive",
                    "text-type/narrative",
                    "text-type/expository",
                ]),
                leiden: ko.observableArray([
                    "leiden/"
                ]),
                empson: ko.observableArray([
                    "empson/A/i",
                    "empson/A(B)",
                    "empson/-A",
                    "empson/A-",
                    "empson/A+",
                    "empson/A$1",
                ]),
                textology: ko.observableArray([
                    "textology/cohesion",
                    "textology/coherence/causality",
                    "textology/coherence/enablement",
                    "textology/coherence/reason",
                    "textology/coherence/purpose",
                    "textology/coherence/time",
                ]),
                richards: ko.observableArray([
                    "richards/said-with",
                    "richards/word",
                    "richards/query",
                    "richards/occurrence",
                    "richards/technical-term",
                    "richards/astonishment",
                    "richards/refer-to",
                ]),
                prosody: ko.observableArray([
                    "prosody/tone-group",
                    "prosody/rising-nuclear-tone",
                    "prosody/falling-nuclear-tone",
                    "prosody/rise-fall-nuclear-tone",
                    "prosody/level-nuclear-tone",
                    "prosody/partial",
                    "prosody/normal-stress",
                    "prosody/booster-higher-pitch",
                    "prosody/booster-continuance",
                    "prosody/unclear",
                    "prosody/simultaneous-speech",
                    "prosody/pause-of-one-stress-unit",
                ]),
                attitude: ko.observableArray([
                    "attitude/admonition",
                    "attitude/advice",
                    "attitude/belief",
                    "attitude/consolation",
                    "attitude/cynicism",
                    "attitude/derogatory",
                    "attitude/distrust",
                    "attitude/explanation",
                    "attitude/grief",
                    "attitude/happiness",
                    "attitude/irony",
                    "attitude/justification",
                    "attitude/paranoia",
                    "attitude/praise",
                    "attitude/request",
                    "attitude/sarcasm",
                    "attitude/thanks",
                ]),
                figurative: ko.observableArray([
                    "figurative/analogy",
                    "figurative/argument",
                    "figurative/hyperbole",
                    "figurative/idiom",
                    "figurative/imagery",
                    "figurative/metaphor",
                    "figurative/personification",
                    "figurative/simile",
                    "figurative/symbolism",
                ]),
                specialCharacters: [
                    "—",
                    "À", "à", "Á", "á", "Â", "â", "Ã", "ã", "Ä", "ä", "Å", "å", "Ā", "ā", "Ă", "ă", "Ą", "ą",
                    "Æ", "æ",
                    "Ç", "ç", "Ć", "ć", "Ĉ", "ĉ", "Ċ", "ċ", "Č", "č",
                    "È", "è", "É", "é", "Ê", "ê", "Ë", "ë",
                    "Ì", "ì", "Í", "í", "Î", "î", "Ï", "ï", "ð",
                    "Ñ", "ñ",
                    "ò", "ó", "ô", "õ", "ö",
                    "ù", "ú", "û", "ü", "ý", "þ", "ÿ",
                ],
                TEI: ko.observableArray([
                    "tei/core/date",
                    "tei/core/item",
                    "tei/core/label",
                    "tei/core/list",
                    "tei/core/name",
                    "tei/core/measure",
                    "tei/core/num",
                    "tei/core/quote",
                    "tei/core/said",
                    "tei/core/time",
                    "tei/core/unclear",
                    "tei/core/unit",
                    "tei/namesdates/birth",
                    "tei/namesdates/forename",
                    "tei/namesdates/surname",
                    "tei/textstructure/argument",
                    "tei/textstructure/closer",
                    "tei/textstructure/dateline",
                    "tei/textstructure/opener",
                    "tei/textstructure/postscript",
                    "tei/textstructure/salute",
                    "tei/textstructure/signed",
                    "tei/verse/caesura",
                    "tei/verse/metDecl",
                    "tei/verse/metSym",
                    "tei/verse/rhyme",
                ])
            };
            this.opacity = ko.observable("1");
            this.lineHeight = ko.observable("2rem");
            this.fontSize = ko.observable("1.5rem");
            this.fontFamily = ko.observable("monospace");
            this.textColour = ko.observable("#000");
            this.backgroundColour = ko.observable("#FFF");
            this.showAnnotationToggles = ko.observable(false);
            this.viewer = ko.observable();
            this.terminalMode = ko.observable();
            this.checkbox = {
                expansions: ko.observable(false),
                zeroWidths: ko.observable(true),

                styles: ko.observable(true),
                entities: ko.observable(true),
                layout: ko.observable(false),

                bold: ko.observable(true),
                uppercase: ko.observable(true),
                italics: ko.observable(true),
                strike: ko.observable(true),
                underline: ko.observable(true),
                subscript: ko.observable(true),
                superscript: ko.observable(true),
                hyphen: ko.observable(true),
                size: ko.observable(true),
                colour: ko.observable(true),
                highlight: ko.observable(true),

                line: ko.observable(false),
                paragraph: ko.observable(false),
                page: ko.observable(false),

                agent: ko.observable(true),
                claim: ko.observable(true),
                text: ko.observable(true),
                concept: ko.observable(true),
                dataPoint: ko.observable(true),
                metaRelation: ko.observable(true),
                time: ko.observable(true),
                structure: ko.observable(true),
                subject: ko.observable(true),
                lexeme: ko.observable(true),
            };
            $(this.popup).find("[data-role=colour-picker]").spectrum({
                beforeShow: function (colour) {
                    $(this).spectrum("set", "#000");
                },
                change: function (colour) {
                    var hex = colour.toHexString().toUpperCase();
                    _.colourSelected(hex);
                }
            });

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
        TextBlock.prototype.addTextFrameClicked = function () {
            // var path = this.model.frame();
            var frame = 1;
            var path = this.list.frames()[frame].Value;
            var attributes = {};
            if (frame == 1) {
                attributes = {
                    imgHeight: 800,
                    offsetLeft: 61,
                    offsetTop: 86,
                    width: 393,
                    height: 519,
                    editorHeight: 425,
                    backgroundColor: "#d1c6ae"
                };
            } else if (frame == 2) {
                attributes = {
                    imgHeight: 800,
                    offsetLeft: 0,
                    offsetTop: 83,
                    width: 549,
                    height: 645,
                    editorHeight: 545,
                    backgroundColor: "#e6dfc4"
                };
            }
            var p = this.editor.createMetadataProperty({
                type: "text-frame",
                value: path,
                attributes: attributes
            });
            p.schema.animation.init(p);
        };
        TextBlock.prototype.bind = function (model) {
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
        TextBlock.prototype.setupEditor = function (settings) {
            var _ = _this = this;
            settings = settings || {};
            var container = settings.container || $(this.popup).find("[data-role=editor]")[0];
            // var monitor = settings.monitor || $(this.popup).find("[data-role=monitor]")[0];
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
                    buffer: {
                        "[[": function (data) {
                            const { editor, buffer } = data;
                            console.log("event.buffer", { data });
                            alert("buffer");
                            //var nodes = data.buffer.map(x => x.caret.left || x.caret.right);
                            //var start = nodes[0].nextElementSibling;
                            //var end = nodes[1].previousElementSibling;
                            //var range = { start, end };
                            //nodes.forEach(n => n.remove());
                            //data.editor.createProperty("agent", null, range);
                        }
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
                        "control-shift-P": (args) => {
                            require(["libs/randomColor", "parts/word-cloud"], function (randomColor, WordCloud) {
                                const { editor } = args;
                                const rect = editor.container.getBoundingClientRect();
                                const y = rect.y;
                                const x = rect.x + rect.width + 20;
                                const props = editor.data.properties.filter(x => x.type == "syntax/part-of-speech");
                                const tags = distinct(props.map(x => x.attributes.tag));
                                const colours = randomColor({
                                    count: tags.length,
                                    seed: "orange",
                                    luminosity: 'bright',
                                    format: 'rgb',
                                    hue: 'random'
                                });
                                class PosModel {
                                    constructor(cons) {
                                        const items = cons.tags.map((t, i) => {
                                            return {
                                                highlighted: ko.observable(false),
                                                tag: t,
                                                text: t.replace("|", ": "),
                                                colour: colours[i]
                                            };
                                        });
                                        this.cloudWindow = null;
                                        this.items = ko.observableArray(items);
                                    }
                                    itemClicked(item) {
                                        item.highlighted(!item.highlighted());
                                        this.highlightPartOfSpeech(item.tag, item.highlighted(), item.colour);
                                        this.drawWordCloud();
                                    }
                                    highlightPartOfSpeech(tag, highlight, colour) {
                                        editor.data.properties
                                            .filter(x => x.type == "syntax/part-of-speech" && x.attributes.tag == tag)
                                            .forEach(p => highlight ? p.highlight(colour) : p.unhighlight("inherit"));
                                    }
                                    drawWordCloud() {
                                        if (this.cloudWindow) {
                                            this.cloudWindow.close();
                                        }
                                        const highlights = this.items().filter(x => x.highlighted());
                                        var words = [];
                                        highlights.forEach(h => {
                                            const props = editor.data.properties.filter(x => x.type == "syntax/part-of-speech" && x.attributes.tag == h.tag);
                                            const propWords = props.map(x => x.text.toLowerCase());
                                            words = words.concat(propWords);
                                        });
                                        const wordCounts = this.toWordCount(words);
                                        const data = {
                                            words: wordCounts,
                                            name: "Syntax",
                                            settings: {
                                                x: x,
                                                y: y + 225,
                                                width: 550,
                                                height: 400
                                            }
                                        };
                                        const cloud = new WordCloud();
                                        this.cloudWindow = cloud.load(data);
                                    }
                                    toWordCount(words) {
                                        var cloud = [];
                                        words.forEach(w => {
                                            let item = cloud.find(c => c.text == w);
                                            if (item) {
                                                item.weight++;
                                            } else {
                                                cloud.push({
                                                    text: w,
                                                    weight: 1
                                                });
                                            }
                                        });
                                        return cloud;
                                    }
                                }
                                const model = new PosModel({
                                    tags: tags,
                                    colours: colours
                                });
                                const ul = div({
                                    template: {
                                        view: `
<ul data-bind="foreach: $data.items">
    <li style="display: inline-block; padding: 5px 5px;">
        <span data-bind="style: { backgroundColor: $data.colour }, click: $parent.itemClicked.bind($parent)" style="padding: 6px;">
            <input type="checkbox" data-bind="checked: $data.highlighted" style="margin-right: 5px;" />
            <span data-bind="text: $data.text"></span>
        </span>
    </li>
</ul>
`,
                                        model: model
                                    }
                                });

                                const container = div({
                                    classList: ["text-window"],
                                    style: {
                                        position: "absolute",
                                        top: y + "px",
                                        left: x + "px",
                                        width: "400px",
                                        height: "200px"
                                    },
                                    template: {
                                        view: `
<div class="safari_buttons" data-role="handle">
    <div data-bind="click: $data.closeClicked" class="safari_close"></div><div data-bind="click: $data.toggleGlassModeClicked" class="safari_glass"></div>
</div>`,
                                        model: {
                                            closeClicked: () => {
                                                win.close();
                                            },
                                            toggleGlassModeClicked: function () {
                                                this.glass = !this.glass;
                                                if (this.glass) {
                                                    container.classList.add("glass-window");

                                                } else {
                                                    container.classList.remove("glass-window");
                                                }
                                            }
                                        }
                                    }
                                });
                                container.appendChild(ul);
                                const win = WindowManager.addWindow({
                                    node: container,
                                    draggable: {
                                        node: container.querySelector('[data-role="handle"]')
                                    }
                                });
                                win.addNodeToLayer(container);
                            });
                        },
                        "ENTER": function (args) {
                            const { currentBlock, newBlock } = args;
                            if (newBlock) {

                            }
                        },
                        "control-LEFT-ARROW": function (args) {
                            console.log("control-LEFT-ARROW", { args });
                            const { editor, caret } = args;
                            const { container } = caret;
                            const current = caret.left || caret.right;
                            const currentOffsetY = current.speedy.offset.y;
                            let startNode = container.speedy.startNode;
                            let deltaY = startNode.speedy.offset.y - currentOffsetY;
                            editor.setCarotAndScroll(startNode, 0, deltaY > 0, deltaY);
                        },
                        "control-RIGHT-ARROW": function (args) {
                            console.log("control-RIGHT-ARROW", { args });
                            const { editor, caret } = args;
                            const { container } = caret;
                            const current = caret.left || caret.right;
                            const currentOffsetY = current.speedy.offset.y;
                            let endNode = container.speedy.endNode;
                            let deltaY = endNode.speedy.offset.y - currentOffsetY;
                            editor.setCarotAndScroll(endNode, 1, deltaY > 0, deltaY);
                        },
                        "control-UP-ARROW": function (args) {
                            console.log("control-UP-ARROW", { args });
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
                        },
                        "control-DOWN-ARROW": function (args) {
                            console.log("control-DOWN-ARROW", { args });
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
                        },
                        "control-Z": (data) => {
                            const { editor } = data;
                            editor.undo();
                        },
                        "control-/": function (data) {
                            _this.showKeyBindings();
                        },
                        "control-shift-H": function (data) {
                            const { editor } = data;
                            const sections = editor.data.properties.filter(x => x.type == "section" && !x.isDeleted);
                            const rect = editor.container.getBoundingClientRect();
                            const x = (rect.x + rect.width + 20);
                            const y = rect.y - 20;
                            const container = div({
                                classList: ["text-window"],
                                style: {
                                    position: "absolute",
                                    left: x + "px",
                                    top: y + "px",
                                    width: "300px",
                                    backgroundColor: "#fff"
                                },
                                template: {
                                    view: `
<div class="safari_buttons">
    <div data-bind="click: $data.closeClicked" class="safari_close"></div><div data-bind="click: $data.toggleGlassModeClicked" class="safari_glass"></div>
</div>
<ul data-bind="foreach: $data.sections"><li style="margin-bottom: 10px;"><span data-bind="text: $data.text, click: $parent.itemClicked"></span></li></ul>
`,
                                    model: {
                                        sections: ko.observableArray(sections),
                                        toggleGlassModeClicked: function () {
                                            this.glass = !this.glass;
                                            if (this.glass) {
                                                container.classList.add("glass-window");

                                            } else {
                                                container.classList.remove("glass-window");
                                            }
                                        },
                                        itemClicked: (item) => {
                                            item.scrollTo();
                                        },
                                        closeClicked: () => {
                                            win.close();
                                        }
                                    }
                                }
                            });
                            document.body.appendChild(container);
                            var win = WindowManager.addWindow({
                                node: container,
                                draggable: {
                                    node: container
                                }
                            });
                            console.log({ sections });
                        },
                        "control-shift-L": function (data) {
                            _this.textLoader();
                        },
                        "control-shift-Z": function (data) {
                            _this.loadTextWindow();
                        },
                        "control-shift-G": function (data) {
                            _this.loadTextGraph({ guid: _this.model.Guid });
                        },
                        "control-9": function (data) {
                            const { editor } = data;
                            const caret = editor.getCaret();
                            const cursor = caret.left || caret.right;
                            const { offset } = cursor.speedy;
                            const row = editor.getClosestRowOfCellsByOffset({ x: offset.x, y: offset.y, verticalOffset: 0 });
                            const first = row[0], last = row[row.length - 1];
                            Helper.drawRectangleAroundNodes({
                                startNode: first, endNode: last, editor: editor
                            });
                        },
                        "control-K": function (data) {
                            _this.clockClicked();
                        },
                        "control-J": function (data) {
                            var highlight = !data.editor.propertyType["sentiment/sentence"].highlight;
                            _this.highlightSentiments(highlight);
                            data.editor.propertyType["sentiment/sentence"].highlight = highlight;
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
                        "control-shift-E": function (data) {
                            _this.loadEntitiesPanel(data);
                        },
                        "control-Y": (data) => {
                            const { editor } = data;
                            const caret = editor.getCaret();
                            const anchorNode = caret.right || caret.left;
                            editor.deleteRow(anchorNode);
                        },
                        "control-shift-F": function (data) {
                            _this.selectTextClicked();
                        },
                        "control-shift-U": function (data) {
                            _this.pronounRecognitionClicked();
                        },
                        "control-shift-Y": function (data) {
                            _this.checkbox.entities(!_this.checkbox.entities());
                        },
                        "control-shift-I": function (data) {
                            _this.intralinearClicked();
                        },
                        "control-S": function (data) {
                            _this.save();
                        },
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
                            console.log("!ENTER", { args });
                            const { editor } = args;
                            const { client } = editor;
                            if (client.handler.onEnterPressed) {
                                client.handler.onEnterPressed({ ...args, outlinerBlock: client.outlinerBlock });
                            }
                        }
                    },
                    mouse: {
                        "selection": function (data) {
                            _this.contextMenuActivated(data);
                        },
                        "control-click": function (data) {
                            //_this.contextMenuActivated(data);
                        },
                        "click": function (args) {
                            const { editor } = args;
                            const { client } = editor;
                            if (client.handler.onClick) {
                                client.handler.onClick({ ...args, outlinerBlock: client.outlinerBlock });
                            }
                            if (editor.mode.contextMenu.active) {
                                if (editor.event.contextMenuDeactivated) {
                                    editor.event.contextMenuDeactivated(args);
                                }
                            }
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
                        //const { editor, containerNode, e } = data;
                        //const { blockNode } = containerNode.speedy;
                        //const menu = blockNode.menu;
                        //if (!menu) {
                        //    return;
                        //}
                        //menu.style.top = blockNode.offsetTop + "px";
                        //menu.style.display = "block";
                    },
                    blockMouseOut: (data) => {
                        //const { editor, containerNode } = data;
                        //const { blockNode } = containerNode.speedy;
                        //const menu = blockNode.menu;
                        //if (!menu) {
                        //    return;
                        //}
                        //menu.style.display = "none";
                    },
                    contextMenuActivated: (data) => {
                        _this.loadMonitorPanel(data);
                    },
                    contextMenuDeactivated: (params) => {
                        console.log("onContextMenuDeactivated", params);
                        params.editor.mode.contextMenu.active = false;
                        var menu = params.editor.contextMenu;
                        if (!menu) {
                            return;
                        }
                        menu.style.display = "none";
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
                    //const { containerNode } = args;
                    //const { blockNode } = args;
                    //var menu = div({
                    //    classList: ["block-menu-button"],
                    //    style: {
                    //        position: "absolute",
                    //        top: 0,
                    //        left: "20px",
                    //        display: "none"
                    //    }
                    //});
                    //menu.speedy = {
                    //    stream: 1,
                    //    role: 0
                    //};
                    //const button = div({
                    //    template: {
                    //        view: `<button class="btn btn-default" data-bind="click: $data.loadMenuClicked" type="button">...</button>`,
                    //        model: {
                    //            loadMenuClicked: function () {
                    //                alert("menu button clicked");
                    //            }
                    //        }
                    //    }
                    //});
                    //menu.appendChild(button);
                    //blockNode.appendChild(menu);
                    //blockNode.menu = menu;
                    //menu.blockNode = blockNode;
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
                    _this.autocomplete.handleTextChange(args);
                },
                onCharacterAdded: function (data) {
                    const { cell, editor, caret } = data;
                    
                },
                commentManager: function (prop) {
                    require(["modals/search-comments"], function (CommentModal) {
                        openModal("/Static/Templates/Comment/SearchModal.html", {
                            name: "Comments",
                            ajaxContentAdded: function (element) {
                                var modal = new CommentModal({
                                    popup: element,
                                    currentTab: "quickAdd",
                                    tab: {
                                        search: {
                                            filter: {
                                                StandoffPropertyGuid: prop.guid
                                            }
                                        }
                                    },
                                    handler: {
                                        onSelected: function (commentGuid) {
                                            var params = {
                                                StandoffPropertyGuid: prop.guid,
                                                CommentGuid: commentGuid
                                            };
                                            $.get("/Admin/Comment/HasComment", params, function (response) {
                                                console.log("response", response);
                                                closeModal(element);
                                            });
                                        }
                                    }
                                });
                                ko.applyBindings(modal, element);
                                modal.start();
                            }
                        });
                    });
                },
                monitorOptions: {
                    highlightProperties: true
                },
                css: {
                    highlight: "text-highlight"
                },
                propertyType: {
                    "tab": {
                        format: "decorate",
                        zeroPoint: {
                            className: "tab"
                        },
                        labelRenderer: function () {
                            return "tab";
                        }
                    },
                    "sentiment/sentence": {
                        format: "decorate",
                        labelRenderer: function () {
                            return "sentiment";
                        },
                        highlight: false,
                        exportText: false,
                        data: {
                            labels: []
                        },
                        event: {
                            monitor: {
                                mouseover: (p) => {
                                    _this.drawClippedRectangle(p, { fill: "yellow" });
                                },
                                mouseout: (p) => {
                                    if (p.svg) {
                                        p.svg.remove();
                                    }
                                }
                            }
                        },
                        attributes: {
                            score: {
                                renderer: function (prop) {
                                    return "score [" + (prop.attributes.score || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                                },
                                selector: function (prop, process) {
                                    var score = prompt("Score", prop.attributes.score);
                                    process(score);
                                }
                            },
                            magnitude: {
                                renderer: function (prop) {
                                    return "magnitude [" + (prop.attributes.magnitude || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                                },
                                selector: function (prop, process) {
                                    var magnitude = prompt("Magnitude", prop.attributes.magnitude);
                                    process(scomagnitudere);
                                }
                            }
                        }
                    },
                    "blur": {
                        format: "decorate",
                        className: "blurry-text",
                        labelRenderer: function () {
                            return "blur";
                        }
                    },
                    "list": {
                        format: "block",
                        className: "list",
                        monitor: {
                            allowedActions: ["delete"]
                        },
                        labelRenderer: function () {
                            return "list";
                        }
                    },
                    "list/item": {
                        format: "block",
                        className: "list-item",
                        monitor: {
                            allowedActions: ["delete"]
                        },
                        labelRenderer: function () {
                            return "list item";
                        },
                        event: {
                            keyboard: {
                                "ENTER": function (args) {
                                    const { currentBlock, newBlock, property } = args;
                                    if (!property) {
                                        return;
                                    }
                                    var list = property.parent;
                                    var item = _this.editor.createBlockProperty2({ type: "list/item", parent: list, startNode: newBlock.firstChild, endNode: newBlock.lastChild });
                                }
                            }
                        }
                    },
                    "alignment/indent": {
                        format: "block",
                        className: "block-indent",
                        labelRenderer: function () {
                            return "indent";
                        }
                    },
                    "alignment/justify": {
                        format: "block",
                        className: "block-justify",
                        labelRenderer: function () {
                            return "justified";
                        }
                    },
                    "alignment/right": {
                        format: "block",
                        className: "block-right",
                        monitor: {
                            allowedActions: ["delete"],
                            label: () => {
                                return "right";
                            }
                        },
                        labelRenderer: function () {
                            return "right";
                        }
                    },
                    "alignment/center": {
                        format: "block",
                        className: "block-center",
                        labelRenderer: function () {
                            return "centred";
                        }
                    },
                    rainbow: {
                        format: "decorate",
                        className: "",
                        labelRenderer: function () {
                            return "rainbow 🌈";
                        },
                        render: {
                            init: (p) => {
                                const svg = Helper.drawUnderlineRainbow(p);
                                p.editor.container.appendChild(svg);
                            },
                            update: (p) => {
                                const svg = Helper.drawUnderlineRainbow(p);
                                p.editor.container.appendChild(svg);
                            },
                            destroy: (p) => {
                                if (p.svg) {
                                    p.svg.remove();
                                }
                            }
                        }
                    },
                    bold: {
                        format: "decorate",
                        shortcut: "b",
                        className: "bold",
                        labelRenderer: function () {
                            return "<b>bold</b>";
                        }
                    },
                    gild: {
                        format: "decorate",
                        shortcut: "g",
                        className: "gold-pressed",
                        labelRenderer: function () {
                            return "gild";
                        }
                    },
                    "leiden/expansion": {
                        format: "decorate",
                        className: "leiden__expansion",
                        labelRenderer: function () {
                            return "<span style='expansion'>leiden/expansion</span>";
                        }
                    },
                    "leiden/emphasis": {
                        format: "decorate",
                        className: "leiden__emphasis",
                        labelRenderer: function () {
                            return "<span style='leiden__emphasis'>leiden/emphasis</span>";
                        }
                    },
                    "leiden/sic": {
                        format: "overlay",
                        className: "leiden__sic",
                        labelRenderer: function () {
                            return "<span style='leiden__sic'>leiden/sic</span>";
                        }
                    },
                    "leiden/repetition": {
                        format: "overlay",
                        className: "leiden__repetition",
                        labelRenderer: function () {
                            return "<span style='leiden__repetition'>leiden/repetition</span>";
                        }
                    },
                    "leiden/rewritten": {
                        format: "overlay",
                        className: "leiden__rewritten",
                        labelRenderer: function () {
                            return "<span style='leiden__rewritten'>leiden/rewritten</span>";
                        }
                    },
                    "leiden/supra-lineam": {
                        format: "decorate",
                        className: "leiden__supra_lineam",
                        labelRenderer: function () {
                            return "<span style='leiden__supra_lineam'>leiden/supra-lineam</span>";
                        }
                    },
                    "leiden/marginalia": {
                        format: "decorate",
                        className: "leiden__marginalia",
                        labelRenderer: function () {
                            return "<span style='leiden__marginalia'>leiden/marginalia</span>";
                        }
                    },
                    "leiden/correction": {
                        format: "overlay",
                        className: "leiden__correction",
                        labelRenderer: function () {
                            return "<span style='leiden__correction'>leiden/correction</span>";
                        }
                    },
                    "leiden/striked-out": {
                        format: "decorate",
                        className: "leiden__striked_out",
                        labelRenderer: function () {
                            return "<span style='leiden__striked_out'>leiden/striked-out</span>";
                        }
                    },
                    "leiden/striked-out": {
                        format: "decorate",
                        className: "leiden__striked_out",
                        labelRenderer: function () {
                            return "<span style='leiden__striked_out'>leiden/striked-out</span>";
                        }
                    },
                    "leiden/commentary": {
                        format: "decorate",
                        className: "leiden__commentary",
                        labelRenderer: function () {
                            return "<span style='leiden__commentary'>leiden/commentary</span>";
                        }
                    },
                    "leiden/line": {
                        format: "decorate",
                        bracket: {
                            right: {
                                className: "expansion-bracket",
                                content: "/"
                            }
                        },
                        labelRenderer: function (prop) {
                            return "line " + prop.value;
                        },
                        propertyValueSelector: function (prop, process) {
                            var defaultValue = prop.value || !!_.lastLineNumber ? _.lastLineNumber + 1 : 1;
                            var num = prompt("Line number?", defaultValue);
                            if (!!num) {
                                num = _.lastLineNumber = parseInt(num);
                            }
                            process(num);
                        }
                    },
                    expansion: {
                        format: "decorate",
                        shortcut: "e",
                        className: "expansion",
                        bracket: {
                            left: {
                                className: "expansion-bracket",
                                content: "("
                            },
                            right: {
                                className: "expansion-bracket",
                                content: ")"
                            }
                        },
                        labelRenderer: function () {
                            return "<span style='expansion'>expansion</span>";
                        }
                    },
                    "richards/said-with": {
                        format: "decorate",
                        className: "richards-said-with",
                        bracket: {
                            left: {
                                className: "richards-said-with-bracket",
                                content: "sw"
                            },
                            right: {
                                className: "richards-said-with-bracket",
                                content: "sw"
                            }
                        },
                        labelRenderer: function () {
                            return "<span style='richards-said-with'>said with (sw)</span>";
                        }
                    },
                    "richards/word": {
                        format: "decorate",
                        className: "richards-word",
                        bracket: {
                            left: {
                                className: "richards-word-bracket",
                                content: "(w)"
                            },
                            right: {
                                className: "richards-word-bracket",
                                content: "(w)"
                            }
                        },
                        labelRenderer: function () {
                            return "<span style='said-with'>word (w)</span>";
                        }
                    },
                    "richards/occurrence": {
                        format: "decorate",
                        className: "richards-occurrence",
                        bracket: {
                            left: {
                                className: "richards-occurrence-bracket",
                                content: "oc"
                            },
                            right: {
                                className: "richards-occurrence-bracket",
                                content: "oc"
                            }
                        },
                        labelRenderer: function () {
                            return "<span style='richards-occurrence'>occurrence (oc)</span>";
                        }
                    },
                    "richards/refer-to": {
                        format: "decorate",
                        className: "richards-refer-to",
                        bracket: {
                            left: {
                                className: "richards-refer-to-bracket",
                                content: "r"
                            },
                            right: {
                                className: "richards-refer-to-bracket",
                                content: "r"
                            }
                        },
                        labelRenderer: function () {
                            return "<span style='richards-refer-to'>refer to (r)</span>";
                        }
                    },
                    "richards/technical-term": {
                        format: "decorate",
                        className: "richards-technical-term",
                        bracket: {
                            left: {
                                className: "richards-technical-term-bracket",
                                content: "t"
                            },
                            right: {
                                className: "richards-technical-term-bracket",
                                content: "t"
                            }
                        },
                        labelRenderer: function () {
                            return "<span style='richards-technical-term'>technical term (t)</span>";
                        }
                    },
                    "richards/query": {
                        format: "decorate",
                        className: "richards-query",
                        bracket: {
                            left: {
                                className: "richards-query-bracket",
                                content: "?"
                            },
                            right: {
                                className: "richards-query-bracket",
                                content: "?"
                            }
                        },
                        labelRenderer: function () {
                            return "<span style='richards-query'>query (?)</span>";
                        }
                    },
                    "richards/astonishment": {
                        format: "decorate",
                        className: "richards-astonishment",
                        bracket: {
                            left: {
                                className: "richards-astonishment-bracket",
                                content: "!"
                            },
                            right: {
                                className: "richards-astonishment-bracket",
                                content: "!"
                            }
                        },
                        labelRenderer: function () {
                            return "<span style='richards-astonishment'>astonishment (!)</span>";
                        }
                    },
                    italics: {
                        format: "decorate",
                        shortcut: "i",
                        className: "italic",
                        labelRenderer: function () {
                            return "<em>italics</em>";
                        }
                    },
                    h1: {
                        format: "decorate",
                        className: "heading-1",
                        labelRenderer: function () {
                            return "<em>h1</em>";
                        }
                    },
                    h2: {
                        format: "decorate",
                        className: "heading-2",
                        labelRenderer: function () {
                            return "<em>h2</em>";
                        }
                    },
                    h3: {
                        format: "decorate",
                        className: "heading-3",
                        labelRenderer: function () {
                            return "<em>h3</em>";
                        }
                    },
                    hyphen: {
                        format: "decorate",
                        zeroPoint: {
                            className: "hyphen"
                        },
                        className: "hyphen",
                        content: "-"
                    },
                    strike: {
                        format: "decorate",
                        className: "line-through"
                    },
                    uppercase: {
                        format: "decorate",
                        className: "uppercase"
                    },
                    highlight: {
                        format: "decorate",
                        className: "highlight",
                        animation: {
                            init: (p) => {
                                if (!p.value) {
                                    return
                                }
                                p.highlight(p.value);
                            }
                        }
                    },
                    underline: {
                        format: "decorate",
                        shortcut: "u",
                        className: "underline"
                    },
                    superscript: {
                        format: "decorate",
                        className: "superscript"
                    },
                    subscript: {
                        format: "decorate",
                        className: "subscript"
                    },
                    salutation: {
                        format: "decorate",
                        className: "salutation"
                    },
                    valediction: {
                        format: "decorate",
                        className: "valediction"
                    },
                    "prosody/tone-group": {
                        format: "decorate",
                        className: "prosody-tone-group"
                    },
                    "prosody/rising-nuclear-tone": {
                        format: "zero-point",
                        zeroPoint: {
                            className: "prosody-rising-nuclear-tone-zero"
                        },
                        className: "prosody-rising-nuclear-tone",
                        content: "/"
                    },
                    "prosody/falling-nuclear-tone": {
                        format: "zero-point",
                        zeroPoint: {
                            className: "prosody-falling-nuclear-tone-zero"
                        },
                        className: "prosody-falling-nuclear-tone",
                        content: "\\"
                    },
                    "prosody/rise-fall-nuclear-tone": {
                        format: "zero-point",
                        zeroPoint: {
                            className: "prosody-rise-fall-nuclear-tone-zero"
                        },
                        className: "prosody-rise-fall-nuclear-tone",
                        content: "/\\"
                    },
                    "prosody/level-nuclear-tone": {
                        format: "zero-point",
                        zeroPoint: {
                            className: "prosody-level-nuclear-tone-zero"
                        },
                        className: "prosody-level-nuclear-tone",
                        content: "_"
                    },
                    "prosody/normal-stress": {
                        format: "zero-point",
                        zeroPoint: {
                            className: "prosody-normal-stress-zero"
                        },
                        className: "prosody-normal-stress",
                        content: "."
                    },
                    "prosody/booster-higher-pitch": {
                        format: "zero-point",
                        zeroPoint: {
                            className: "prosody-booster-higher-pitch-zero"
                        },
                        className: "prosody-booster-higher-pitch",
                        content: "!"
                    },
                    "prosody/booster-continuance": {
                        format: "zero-point",
                        zeroPoint: {
                            className: "prosody-booster-continuance-zero"
                        },
                        className: "prosody-booster-continuance",
                        content: "="
                    },
                    "prosody/unclear": {
                        format: "decorate",
                        className: "prosody-unclear"
                    },
                    "prosody/pause-of-one-stress-unit": {
                        format: "zero-point",
                        className: "prosody-pause-of-one-stress-unit",
                        zeroPoint: {
                            className: "prosody-pause-of-one-stress-unit-zero"
                        },
                        content: " - "
                    },
                    "prosody/simultaneous-speech": {
                        format: "decorate",
                        className: "prosody-simultaneous-speech"
                    },
                    "prosody/partial": {
                        format: "decorate",
                        className: "prosody-partial"
                    },
                    "attitude/admonition": {
                        format: "decorate",
                        className: "attitude-admonition"
                    },
                    "attitude/advice": {
                        format: "decorate",
                        className: "attitude-advice"
                    },
                    "attitude/belief": {
                        format: "decorate",
                        className: "attitude-belief"
                    },
                    "attitude/consolation": {
                        format: "decorate",
                        className: "attitude-consolation"
                    },
                    "attitude/cynicism": {
                        format: "decorate",
                        className: "attitude-cynicism"
                    },
                    "attitude/derogatory": {
                        format: "decorate",
                        className: "attitude-derogatory"
                    },
                    "attitude/explanation": {
                        format: "decorate",
                        className: "attitude-explanation"
                    },
                    "attitude/distrust": {
                        format: "decorate",
                        className: "attitude-distrust"
                    },
                    "attitude/grief": {
                        format: "decorate",
                        className: "attitude-grief"
                    },
                    "attitude/happiness": {
                        format: "decorate",
                        className: "attitude-happiness"
                    },
                    "attitude/irony": {
                        format: "decorate",
                        className: "attitude-irony"
                    },
                    "attitude/justification": {
                        format: "decorate",
                        className: "attitude-justification"
                    },
                    "attitude/paranoia": {
                        format: "decorate",
                        className: "attitude-paranoia"
                    },
                    "attitude/praise": {
                        format: "decorate",
                        className: "attitude-praise"
                    },
                    "attitude/request": {
                        format: "decorate",
                        className: "attitude-request"
                    },
                    "attitude/sarcasm": {
                        format: "decorate",
                        className: "attitude-sarcasm"
                    },
                    "attitude/thanks": {
                        format: "decorate",
                        className: "attitude-thanks"
                    },
                    "figurative/analogy": {
                        format: "decorate",
                        className: "figurative-analogy"
                    },
                    "figurative/argument": {
                        format: "decorate",
                        className: "figurative-argument"
                    },
                    "figurative/hyperbole": {
                        format: "decorate",
                        className: "figurative-hyperbole"
                    },
                    "figurative/idiom": {
                        format: "decorate",
                        className: "figurative-idiom"
                    },
                    "figurative/imagery": {
                        format: "decorate",
                        className: "figurative-imagery"
                    },
                    "figurative/metaphor": {
                        format: "decorate",
                        className: "figurative-metaphor"
                    },
                    "figurative/personification": {
                        format: "decorate",
                        className: "figurative-personification"
                    },
                    "figurative/simile": {
                        format: "decorate",
                        className: "figurative-simile"
                    },
                    "figurative/symbolism": {
                        format: "decorate",
                        className: "figurative-symbolism"
                    },
                    "dexter/defining": {
                        format: "decorate",
                        className: "dexter-defining"
                    },
                    "dexter/directive": {
                        format: "decorate",
                        className: "dexter-directive"
                    },
                    "dexter/evaluation": {
                        format: "decorate",
                        className: "dexter-evaluation"
                    },
                    "dexter/intentions": {
                        format: "decorate",
                        className: "dexter-intentions"
                    },
                    "dexter/question": {
                        format: "decorate",
                        className: "dexter-question"
                    },
                    "dexter/rhetorical": {
                        format: "decorate",
                        className: "dexter-rhetorical"
                    },
                    "dexter/WH-question": {
                        format: "decorate",
                        className: "dexter-WH-question"
                    },
                    "dexter/yes-no": {
                        format: "decorate",
                        className: "dexter-yes-no"
                    },
                    "empson/A(B)": {
                        format: "decorate",
                        className: "empson-"
                    },
                    "empson/A/i": {
                        format: "decorate",
                        className: "empson-"
                    },
                    "empson/-A": {
                        format: "decorate",
                        className: "empson-"
                    },
                    "empson/A-": {
                        format: "decorate",
                        className: "empson-"
                    },
                    "empson/A+": {
                        format: "decorate",
                        className: "empson-"
                    },
                    "empson/A$1": {
                        format: "decorate",
                        className: "empson-"
                    },
                    "tei/core/label": {
                        format: "decorate",
                        className: "tei-core-label",
                        labelRenderer: (p) => {
                            return "label";
                        },
                        attributes: {
                            place: {
                                renderer: function (prop) {
                                    return "place [" + (prop.attributes.place || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                                },
                                selector: function (prop, process) {
                                    var place = prompt("Place?", prop.attributes.place);
                                    process(place);
                                }
                            }
                        }
                    },
                    "tei/core/name": {
                        format: "decorate",
                        className: "tei-core-name",
                        labelRenderer: (p) => {
                            return "name";
                        },
                        attributes: {
                            type: {
                                renderer: function (prop) {
                                    return "type [" + (prop.attributes.type || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                                },
                                selector: function (prop, process) {
                                    var type = prompt("Type?", prop.attributes.type);
                                    process(type);
                                }
                            }
                        }
                    },
                    "tei/core/date": {
                        format: "decorate",
                        className: "tei-core-date",
                        labelRenderer: (p) => {
                            return "date";
                        },
                        attributes: {
                            when: {
                                renderer: function (prop) {
                                    return "when [" + (prop.attributes.when || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                                },
                                selector: function (prop, process) {
                                    var when = prompt("When?", prop.attributes.when);
                                    process(when);
                                }
                            }
                        }
                    },
                    "tei/core/item": {
                        format: "decorate",
                        className: "tei-core-item",
                        attributes: {
                            n: {
                                renderer: function (prop) {
                                    return "n [" + (prop.attributes.n || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                                },
                                selector: function (prop, process) {
                                    var n = prompt("When?", prop.attributes.n);
                                    process(n);
                                }
                            }
                        }
                    },
                    "tei/core/list": {
                        format: "decorate",
                        className: "tei-core-list",
                        attributes: {
                            rend: {
                                renderer: function (prop) {
                                    return "rend [" + (prop.attributes.rend || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                                },
                                selector: function (prop, process) {
                                    var rend = prompt("rend?", prop.attributes.rend);
                                    process(rend);
                                }
                            }
                        }
                    },
                    "tei/core/measure": {
                        format: "decorate",
                        className: "tei-core-measure",
                        labelRenderer: (p) => {
                            return "measure";
                        },
                        attributes: {
                            type: {
                                renderer: function (prop) {
                                    return "type [" + (prop.attributes.type || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                                },
                                selector: function (prop, process) {
                                    var type = prompt("Type?", prop.attributes.type);
                                    process(type);
                                }
                            },
                            quantity: {
                                renderer: function (prop) {
                                    return "quantity [" + (prop.attributes.quantity || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                                },
                                selector: function (prop, process) {
                                    var quantity = prompt("Quantity?", prop.attributes.quantity);
                                    process(quantity);
                                }
                            },
                            unit: {
                                renderer: function (prop) {
                                    return "unit [" + (prop.attributes.unit || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                                },
                                selector: function (prop, process) {
                                    var unit = prompt("Unit?", prop.attributes.unit);
                                    process(unit);
                                }
                            }
                        }
                    },
                    "tei/core/num": {
                        format: "decorate",
                        className: "tei-core-num",
                        labelRenderer: (p) => {
                            return "num";
                        },
                        attributes: {
                            type: {
                                renderer: function (prop) {
                                    return "type [" + (prop.attributes.type || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                                },
                                selector: function (prop, process) {
                                    var type = prompt("type?", prop.attributes.type);
                                    process(type);
                                }
                            }
                        }
                    },
                    "tei/core/quote": {
                        format: "decorate",
                        className: "tei-core-quote",
                        labelRenderer: (p) => {
                            return "quote";
                        },
                        attributes: {
                            lang: {
                                renderer: function (prop) {
                                    return "lang [" + (prop.attributes.lang || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                                },
                                selector: function (prop, process) {
                                    var lang = prompt("Lang?", prop.attributes.lang);
                                    process(lang);
                                }
                            }
                        }
                    },
                    "tei/core/said": {
                        format: "decorate",
                        className: "tei-core-said"
                    },
                    "tei/core/time": {
                        format: "decorate",
                        className: "tei-core-time",
                        labelRenderer: (p) => {
                            return "time";
                        },
                        attributes: {
                            when: {
                                renderer: function (prop) {
                                    return "when [" + (prop.attributes.when || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                                },
                                selector: function (prop, process) {
                                    var when = prompt("When?", prop.attributes.when);
                                    process(when);
                                }
                            }
                        }
                    },
                    "tei/core/unclear": {
                        format: "decorate",
                        className: "tei-core-unclear",
                        labelRenderer: (p) => {
                            return "unclear";
                        },
                        attributes: {
                            reason: {
                                renderer: function (prop) {
                                    return "reason [" + (prop.attributes.reason || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                                },
                                selector: function (prop, process) {
                                    var reason = prompt("Reason?", prop.attributes.reason);
                                    process(reason);
                                }
                            }
                        }
                    },
                    "tei/core/unit": {
                        format: "decorate",
                        className: "tei-core-unit",
                        labelRenderer: (p) => {
                            return "unit";
                        },
                        attributes: {
                            type: {
                                renderer: function (prop) {
                                    return "type [" + (prop.attributes.type || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                                },
                                selector: function (prop, process) {
                                    var type = prompt("Type?", prop.attributes.type);
                                    process(type);
                                }
                            },
                            unit: {
                                renderer: function (prop) {
                                    return "unit [" + (prop.attributes.unit || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                                },
                                selector: function (prop, process) {
                                    var unit = prompt("Unit?", prop.attributes.unit);
                                    process(unit);
                                }
                            }
                        }
                    },
                    "tei/namesdates/birth": {
                        format: "decorate",
                        className: "tei-namesdates-birth",
                        labelRenderer: (p) => {
                            return "DOB";
                        }
                    },
                    "tei/namesdates/forename": {
                        format: "decorate",
                        className: "tei-namesdates-forename",
                        labelRenderer: (p) => {
                            return "forename";
                        }
                    },
                    "tei/namesdates/surname": {
                        format: "decorate",
                        className: "tei-namesdates-surname",
                        labelRenderer: (p) => {
                            return "surname";
                        }
                    },
                    "tei/textstructure/argument": {
                        format: "decorate",
                        className: "tei-textstructure-argument",
                        labelRenderer: (p) => {
                            return "argument";
                        }
                    },
                    "tei/textstructure/closer": {
                        format: "decorate",
                        className: "tei-textstructure-closer",
                        labelRenderer: (p) => {
                            return "closer";
                        }
                    },
                    "tei/textstructure/dateline": {
                        format: "decorate",
                        className: "tei-textstructure-dateline",
                        labelRenderer: (p) => {
                            return "dateline";
                        }
                    },
                    "tei/textstructure/postscript": {
                        format: "decorate",
                        className: "tei-textstructure-postscript",
                        labelRenderer: (p) => {
                            return "postscript";
                        }
                    },
                    "tei/textstructure/opener": {
                        format: "decorate",
                        className: "tei-textstructure-opener",
                        labelRenderer: (p) => {
                            return "opener";
                        }
                    },
                    "tei/textstructure/salute": {
                        format: "decorate",
                        className: "tei-textstructure-salute"
                    },
                    "tei/textstructure/signed": {
                        format: "decorate",
                        className: "tei-textstructure-signed",
                        labelRenderer: (p) => {
                            return "signed";
                        }
                    },
                    "tei/verse/caesura": {
                        format: "decorate",
                        zeroPoint: {
                            className: "tei-verse-caesura"
                        },
                        className: "caesura",
                        content: "|"
                    },
                    "tei/verse/metDecl": {
                        format: "decorate",
                        className: "tei-verse-metDecl",
                        attributes: {
                            type: {
                                renderer: function (prop) {
                                    return "type [" + (prop.attributes.type || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                                },
                                selector: function (prop, process) {
                                    var type = prompt("Type?", prop.attributes.type);
                                    process(type);
                                }
                            }
                        }
                    },
                    "tei/verse/metSym": {
                        format: "decorate",
                        className: "tei-verse-metSym"
                    },
                    "tei/verse/rhyme": {
                        format: "decorate",
                        className: "tei-verse-rhyme",
                        attributes: {
                            label: {
                                renderer: function (prop) {
                                    return "label [" + (prop.attributes.label || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                                },
                                selector: function (prop, process) {
                                    var label = prompt("Label?", prop.attributes.label);
                                    process(label);
                                }
                            }
                        }
                    },
                    line: {
                        format: "decorate",
                        className: "speedy__line",
                        bracket: {
                            right: {
                                className: "expansion-bracket",
                                content: "/"
                            }
                        },
                        labelRenderer: function (prop) {
                            return "line " + prop.value;
                        },
                        propertyValueSelector: function (prop, process) {
                            var defaultValue = prop.value || !!_.lastLineNumber ? _.lastLineNumber + 1 : 1;
                            var num = prompt("Line number?", defaultValue);
                            if (!!num) {
                                num = _.lastLineNumber = parseInt(num);
                            }
                            process(num);
                        }
                    },
                    "text-frame": {
                        format: "decorate",
                        attributes: {
                            offsetTop: {
                                renderer: function (prop) {
                                    return "offsetTop [" + (prop.attributes.offsetTop || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><i class='fas fa-pen'></i></button>";
                                },
                                selector: function (prop, process) {
                                    var value = prompt("offsetTop", prop.attributes.offsetTop);
                                    process(value);
                                }
                            },
                            offsetLeft: {
                                renderer: function (prop) {
                                    return "offsetLeft [" + (prop.attributes.offsetLeft || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><i class='fas fa-pen'></i></button>";
                                },
                                selector: function (prop, process) {
                                    var value = prompt("offsetLeft", prop.attributes.offsetLeft);
                                    process(value);
                                }
                            },
                            width: {
                                renderer: function (prop) {
                                    return "width [" + (prop.attributes.width || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><i class='fas fa-pen'></i></button>";
                                },
                                selector: function (prop, process) {
                                    var value = prompt("width", prop.attributes.width);
                                    process(value);
                                }
                            },
                            height: {
                                renderer: function (prop) {
                                    return "height [" + (prop.attributes.height || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><i class='fas fa-pen'></i></button>";
                                },
                                selector: function (prop, process) {
                                    var value = prompt("height", prop.attributes.height);
                                    process(value);
                                }
                            },
                            backgroundColor: {
                                renderer: function (prop) {
                                    return "backgroundColor [" + (prop.attributes.backgroundColor || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><i class='fas fa-pen'></i></button>";
                                },
                                selector: function (prop, process) {
                                    var value = prompt("backgroundColor", prop.attributes.backgroundColor);
                                    process(value);
                                }
                            },
                            imgHeight: {
                                renderer: function (prop) {
                                    return "imgHeight [" + (prop.attributes.imgHeight || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><i class='fas fa-pen'></i></button>";
                                },
                                selector: function (prop, process) {
                                    var value = prompt("imgHeight", prop.attributes.imgHeight);
                                    process(value);
                                }
                            }
                        },
                        animation: {
                            init: (p) => {
                                var win = this.window.text;
                                var imgHeight = p.attributes.imgHeight;
                                var rect = win.node.getBoundingClientRect();
                                var x = rect.x;
                                var y = rect.y;
                                var img = el({
                                    type: "IMG",
                                    style: {
                                        height: imgHeight + "px" // "800px"
                                    },
                                    attribute: {
                                        src: p.value
                                    },
                                    handler: {
                                        load: function (node) {
                                            _this.tabsVisible(false);
                                            var _rect = this.getBoundingClientRect();
                                            var offsetLeft = p.attributes.offsetLeft;
                                            var offsetTop = p.attributes.offsetTop;
                                            var width = p.attributes.width;
                                            var height = p.attributes.height;
                                            var editorHeight = p.attributes.editorHeight;
                                            var backgroundColor = p.attributes.backgroundColor;
                                            var header = win.node.querySelectorAll(".card-header")[0];
                                            var footer = win.node.querySelectorAll(".card-footer")[0];
                                            var editor = win.node.querySelectorAll("[data-role='editor']")[0];
                                            container.style.width = _rect.width + "px";
                                            container.style.height = _rect.height + "px";
                                            win.node.classList.remove("text-window");
                                            win.handler = win.handler || {};
                                            updateElement(win.node, {
                                                style: {
                                                    right: "unset",
                                                    left: offsetLeft + "px",
                                                    top: offsetTop + "px",
                                                    width: width + "px",
                                                    height: height + "px",
                                                    backgroundColor: backgroundColor,
                                                }
                                            });
                                            updateElement(editor, {
                                                style: {
                                                    height: editorHeight + "px",
                                                    backgroundColor: backgroundColor
                                                }
                                            });
                                            header.style.backgroundColor = backgroundColor;
                                            footer.style.visible = backgroundColor;
                                            win.handler.close = function () {
                                                img.remove();
                                                updateElement(win.node, {
                                                    classList: ["text-window"],
                                                    style: {
                                                        position: "absolute",
                                                        left: offsetLeft + "px",
                                                        top: offsetTop + "px",
                                                        zIndex: win.node.style.zIndex
                                                    }
                                                });
                                                header.style.backgroundColor = "#fff";
                                                footer.style.backgroundColor = "#fff";
                                                document.body.appendChild(win.node);
                                                container.remove();
                                            };
                                        }
                                    }
                                });
                                require(["jquery-ui"], function () {
                                    $(container).draggable({ handle: img });
                                });
                                var container = div({
                                    style: {
                                        position: "absolute",
                                        left: x + "px",
                                        top: y + "px",
                                        zIndex: win.node.style.zIndex
                                    },
                                    children: [img]
                                });
                                container.appendChild(win.node);
                                document.body.appendChild(container);
                            }
                        }
                    },
                    intralinear: {
                        format: "decorate",
                        zeroPoint: {
                            className: "intralinear"
                        },
                        propertyValueSelector: function (prop, process) {
                            var label = prompt("Intralinear text:", prop.value);
                            process(label);
                        },
                        animation: {
                            init: (p) => {
                                var text = newElement("DIV", {
                                    style: {
                                        position: "absolute",
                                        display: "inline",
                                        top: "-13px",
                                        fontStyle: "italic",
                                        left: 0,
                                        fontSize: "0.75em",
                                        whiteSpace: "nowrap"
                                    },
                                    innerHTML: p.value
                                });
                                text.speedy = {
                                    role: 3,
                                    stream: 1
                                };
                                p.startNode.appendChild(text);
                            },
                            start: (p) => { },
                            delete: (p) => {

                            }
                        }
                    },
                    colour: {
                        format: "decorate",
                        className: "colour",
                        labelRenderer: function (prop) {
                            return "colour (" + prop.value + ")";
                        },
                        styleRenderer: function (spans, prop) {
                            spans.forEach(function (span) {
                                span.style.color = prop.value;
                            });
                        },
                        unstyleRenderer: function (spans, prop) {
                            spans.forEach(function (span) {
                                span.style.color = "unset";
                            });
                        }
                    },
                    font: {
                        format: "decorate",
                        className: "font",
                        labelRenderer: function (prop) {
                            return "font (" + prop.value + ")";
                        },
                        styleRenderer: function (spans, prop) {
                            spans.forEach(function (span) {
                                span.style.fontFamily = prop.value;
                            });
                        },
                        unstyleRenderer: function (spans, prop) {
                            spans.forEach(function (span) {
                                span.style.fontFamily = "unset";
                            });
                        }
                    },
                    size: {
                        format: "decorate",
                        className: "size",
                        labelRenderer: function (prop) {
                            return "size (" + prop.value + ")";
                        },
                        styleRenderer: function (spans, prop) {
                            spans.forEach(function (span) {
                                span.style.fontSize = prop.value;
                            });
                        },
                        unstyleRenderer: function (spans, prop) {
                            spans.forEach(function (span) {
                                span.style.fontSize = "unset";
                            });
                        }
                    },
                    audio: {
                        format: "decorate",
                        labelRenderer: function (prop) {
                            return "audio: " + prop.value;
                        },
                        propertyValueSelector: function (prop, process) {
                            var defaultValue = prop.value;
                            var src = prompt("URL", defaultValue);
                            process(src);
                        },
                        attributes: {
                            "start": {
                                renderer: function (prop) {
                                    return "start (" + (prop.attributes.start || "none") + ")";
                                },
                                selector: function (prop, process) {
                                    var value = prompt("start", prop.attributes["start"]);
                                    process(value);
                                }
                            },
                            "end": {
                                renderer: function (prop) {
                                    return "end (" + (prop.attributes.end || "none") + ")";
                                },
                                selector: function (prop, process) {
                                    var value = prompt("end", prop.attributes["end"]);
                                    process(value);
                                }
                            }
                        },
                        play: (p) => {
                            var iframe = document.createElement("IFRAME");
                            iframe.setAttribute("src", p.value);
                            iframe.setAttribute("autoplay", "autoplay");
                            if (p.attributes.start) {
                                iframe.setAttribute("start", p.attributes.start);
                            }
                            if (p.attributes.end) {
                                iframe.setAttribute("end", p.attributes.end);
                            }
                            iframe.speedy = {
                                stream: 1
                            };
                            iframe.setAttribute("src", p.value + '?autoplay=1');
                            iframe.style.display = "none";
                            p.iframe = iframe;
                            p.startNode.appendChild(iframe);
                        },
                        stop: (p) => {

                        },
                        animation: {
                            init: (p) => {

                            },
                            delete: (p) => {

                            }
                        },
                        event: {
                            property: {
                                enter: (p) => {
                                    p.schema.play(p);
                                },
                                leave: (p) => {
                                    p.schema.stop(p);
                                },
                                mouseUp: (p) => {
                                    p.schema.play(p);
                                },
                                keyDown: (p) => {
                                    p.schema.stop(p);
                                },
                                delete: (p) => {
                                    console.log(p);

                                }
                            }
                        }
                    },
                    iframe: {
                        format: "decorate",
                        labelRenderer: function (prop) {
                            return "iframe: " + prop.value;
                        },
                        zeroPoint: {
                            className: "iframe"
                        },
                        propertyValueSelector: function (prop, process) {
                            var defaultValue = prop.value;
                            var src = prompt("URL", defaultValue);
                            process(src);
                        },
                        attributes: {
                            "width": {
                                renderer: function (prop) {
                                    return "width (" + (prop.attributes.width || "none") + ")";
                                },
                                selector: function (prop, process) {
                                    var value = prompt("width", prop.attributes["width"]);
                                    process(value);
                                }
                            },
                            "height": {
                                renderer: function (prop) {
                                    return "height (" + (prop.attributes.width || "none") + ")";
                                },
                                selector: function (prop, process) {
                                    var value = prompt("height", prop.attributes["height"]);
                                    process(value);
                                }
                            }
                        },
                        animation: {
                            init: (p) => {

                            },
                            start: (p) => {
                                var iframe = document.createElement("IFRAME");
                                iframe.setAttribute("width", "600");
                                iframe.setAttribute("height", "600");
                                iframe.setAttribute("src", p.value);
                                iframe.setAttribute("frameborder", "0");
                                //iframe.style["-webkit-transform"] = "scale(0.75)";
                                //iframe.style["-webkit-transform-origin"] = "0 0";
                                iframe.speedy = {
                                    stream: 1
                                };
                                p.startNode.style.float = "left";
                                p.startNode.style.marginRight = "20px";
                                p.startNode.appendChild(iframe);
                            },
                            delete: (p) => {
                                p.startNode.remove();
                            }
                        }
                    },
                    video: {
                        format: "decorate",
                        labelRenderer: function (prop) {
                            return "video: " + prop.value;
                        },
                        zeroPoint: {
                            className: "video"
                        },
                        propertyValueSelector: function (prop, process) {
                            var defaultValue = prop.value;
                            var src = prompt("URL", defaultValue);
                            process(src);
                        },
                        attributes: {
                            "width": {
                                renderer: function (prop) {
                                    return "width (" + (prop.attributes.width || "none") + ")";
                                },
                                selector: function (prop, process) {
                                    var value = prompt("width", prop.attributes["width"]);
                                    process(value);
                                }
                            },
                            "height": {
                                renderer: function (prop) {
                                    return "height (" + (prop.attributes.width || "none") + ")";
                                },
                                selector: function (prop, process) {
                                    var value = prompt("height", prop.attributes["height"]);
                                    process(value);
                                }
                            },
                            "start": {
                                renderer: function (prop) {
                                    return "start (" + (prop.attributes.start || "none") + ")";
                                },
                                selector: function (prop, process) {
                                    var value = prompt("start", prop.attributes["start"]);
                                    process(value);
                                }
                            },
                            "end": {
                                renderer: function (prop) {
                                    return "end (" + (prop.attributes.end || "none") + ")";
                                },
                                selector: function (prop, process) {
                                    var value = prompt("end", prop.attributes["end"]);
                                    process(value);
                                }
                            }
                        },
                        animation: {
                            init: (p) => {

                            },
                            start: (p) => {
                                var iframe = document.createElement("IFRAME");
                                iframe.setAttribute("width", "560");
                                iframe.setAttribute("height", "315");
                                iframe.setAttribute("src", p.value);
                                iframe.setAttribute("frameborder", "0");
                                iframe.speedy = {
                                    stream: 1
                                };
                                iframe.setAttribute("src", p.value);
                                p.startNode.style.float = "left";
                                p.startNode.style.marginRight = "20px";
                                p.startNode.appendChild(iframe);
                            },
                            delete: (p) => {
                                p.startNode.remove();
                            }
                        }
                    },
                    drag: {
                        format: "block",
                        labelRenderer: (p) => {
                            return "dragged";
                        },
                        className: "dragged",
                        animation: {
                            init: (p) => {
                                var block = p.startNode.parentNode;

                                block.style.display = "inline-block";
                                p.select();
                                var moveAt = (pageX, pageY) => {
                                    block.style.left = pageX - block.offsetWidth / 2 + 'px';
                                    block.style.top = pageY - block.offsetHeight / 2 + 'px'
                                };
                                var onMouseMove = (e) => {
                                    moveAt(e.pageX, e.pageY);
                                };
                                block.onmousedown = (e) => {
                                    console.log(e);
                                    block.style.position = "absolute";
                                    block.style.zIndex = z++;
                                    document.body.append(block);
                                    moveAt(e.pageX, e.pageY);
                                    document.addEventListener("mousemove", onMouseMove, false);
                                    block.classList.add("editor-text");
                                    block.ondragstart = () => {
                                        return false;
                                    };
                                    block.onmouseup = () => {
                                        document.removeEventListener("mousemove", onMouseMove, false);
                                        p.editor.updateCurrentRanges();

                                        block.onmouseup = null;
                                    };
                                    return true;
                                };
                            },
                            start: (p) => {

                            },
                            delete: (p) => {
                                console.log(p);
                                var block = p.startNode.parentNode;
                                if (!block) {
                                    return;
                                }
                                block.style.top = 0;
                                block.style.left = 0;
                                block.style.position = "relative";
                            }
                        }
                    },
                    capital: {
                        format: "decorate",
                        labelRenderer: function (prop) {
                            return "capital: " + prop.value;
                        },
                        className: "capital",
                        propertyValueSelector: function (prop, process) {
                            process(prop.text);
                        },
                        animation: {
                            init: (p) => {
                                p.attributes.alignment = "left";
                                p.attributes["right-margin"] = "10px";
                            },
                            start: (p) => {
                                var img = document.createElement("IMG");
                                img.speedy = {
                                    stream: 1
                                };
                                p.startNode.innerText = null;
                                var char = document.createElement("SPAN");
                                char.speedy = {
                                    role: 0,
                                    stream: 0
                                };
                                char.innerText = p.value;
                                char.style.display = "none";
                                var letter = p.value.toLowerCase().trim();
                                var src = "/Images/hypnerotomachie/" + letter + ".jpg";
                                img.setAttribute("src", src);
                                img.style.top = 0;
                                img.style.left = 0;
                                img.style.float = p.attributes.alignment;
                                img.style.marginRight = p.attributes["right-margin"];
                                p.startNode.appendChild(char);
                                p.startNode.appendChild(img);
                            },
                            delete: (p) => {
                                p.startNode.childNodes[0].remove();
                            }
                        }
                    },
                    mood: {
                        format: "decorate",
                        className: "mood",
                        labelRenderer: function (prop) {
                            return "mood: " + prop.value;
                        },
                        propertyValueSelector: function (prop, process) {
                            var defaultValue = prop.value;
                            var src = prompt("URL", defaultValue);
                            process(src);
                        },
                        draw: (p) => {
                            var panel = p.editor.container;
                            panel.style["background-size"] = "cover";
                            panel.style.background = "url(" + p.value + ") no-repeat center center fixed";
                        },
                        undraw: (p) => {
                            var panel = p.editor.container;
                            panel["background-size"] = "inherit";
                            panel.background = "inherit";
                        },
                        animation: {
                            init: (p) => {
                                var oldValue = window.getComputedStyle(p.editor.container, null).getPropertyValue("background");
                                p.data = {
                                    background: oldValue
                                };
                            },
                            delete: (p) => {
                                var panel = p.editor.container;
                                panel.style["background-size"] = "unset";
                                panel.style.background = p.data.background;
                            }
                        },
                        event: {
                            property: {
                                enter: (p) => {
                                    p.schema.draw(p);
                                },
                                leave: (p) => {
                                    p.schema.undraw(p);
                                },
                                mouseUp: (p) => {
                                    p.schema.draw(p);
                                },
                                keyDown: (p) => {
                                    p.schema.draw(p);
                                },
                                delete: (p) => {

                                }
                            }
                        }
                    },
                    icon: {
                        format: "decorate",
                        labelRenderer: function (prop) {
                            return "icon: <span class='" + prop.value + "'></span>";
                        },
                        zeroPoint: {
                            className: "icon"
                        },
                        //propertyValueSelector: function (prop, process) {
                        //    var defaultValue = prop.value;
                        //    var src = prompt("Icon CSS", defaultValue);
                        //    process(src);
                        //},
                        animation: {
                            init: (p) => {

                            },
                            start: (p) => {
                                var button = document.createElement("BUTTON");
                                button.classList.add("btn", "btn-default");
                                var span = document.createElement("SPAN");
                                span.speedy = {
                                    stream: 1
                                };
                                var parts = p.value.split(" ");
                                parts.forEach(css => span.classList.add(css));
                                //button.appendChild(span);
                                p.startNode.appendChild(span);
                            },
                            delete: (p) => {
                                p.startNode.remove();
                            }
                        }
                    },
                    html: {
                        format: "decorate",
                        zeroPoint: {
                            className: "html",
                            exportText: false
                        },
                        labelRenderer: function (prop) {
                            return "html (ZWA)";
                        },
                        propertyValueSelector: function (prop, process) {
                            var html = prompt("Html?", prop.value || "");
                            process(html);
                        },
                        animation: {
                            init: (p) => {
                                p.node = document.createElement("DIV");
                                p.node.speedy = {
                                    stream: 1,
                                    role: 1
                                };
                                p.startNode.appendChild(p.node);
                            },
                            start: (p) => {
                                p.node.innerHTML = p.value;
                                function nodeScriptReplace(node) {
                                    if (nodeScriptIs(node) === true) {
                                        node.parentNode.replaceChild(nodeScriptClone(node), node);
                                    }
                                    else {
                                        var i = 0;
                                        var children = node.childNodes;
                                        while (i < children.length) {
                                            nodeScriptReplace(children[i++]);
                                        }
                                    }

                                    return node;
                                }
                                function nodeScriptIs(node) {
                                    return node.tagName === 'SCRIPT';
                                }
                                function nodeScriptClone(node) {
                                    var script = document.createElement("script");
                                    script.text = node.innerHTML;
                                    for (var i = node.attributes.length - 1; i >= 0; i--) {
                                        script.setAttribute(node.attributes[i].name, node.attributes[i].value);
                                    }
                                    return script;
                                }
                                nodeScriptReplace(p.node);
                            },
                            delete: (p) => {
                                p.node.remove();
                            }
                        },
                    },
                    "image-container": {
                        format: "decorate",
                        labelRenderer: function (prop) {
                            return "image container: " + prop.value;
                        },
                        propertyValueSelector: function (prop, process) {
                            var defaultValue = prop.value;
                            var src = prompt("URL", defaultValue);
                            process(src);
                        },
                        animation: {
                            init: (prop) => {
                                var y = prop.attributes.y || 200;
                                var x = prop.attributes.x || 1000;
                                var container = div({
                                    classList: ["text-window"],
                                    style: {
                                        position: "absolute",
                                        top: y + "px",
                                        left: x + "px",
                                        width: "560px",
                                        height: "315px",
                                        zIndex: WindowManager.getNextIndex()
                                    }
                                });
                                var iframe = newElement("IFRAME", {
                                    attribute: {
                                        width: 560,
                                        height: 315,
                                        src: prop.value,
                                        frameborder: 0
                                    }
                                });
                                var handle = div({ innerHTML: "&nbsp;", style: { height: "20px" } });
                                container.appendChild(handle);
                                container.appendChild(iframe);
                                document.body.appendChild(container);
                                $(container).draggable({ handle: handle });
                                var win = WindowManager.addWindow({
                                    type: "video",
                                    loader: {
                                        params: {
                                            url: prop.value
                                        }
                                    },
                                    node: container
                                });
                            }
                        }
                    },
                    "adjacent-pdf": {
                        format: "decorate",
                        labelRenderer: function (prop) {
                            return "adjacent PDF: " + prop.value;
                        },
                        propertyValueSelector: function (prop, process) {
                            var defaultValue = prop.value;
                            var src = prompt("URL", defaultValue);
                            process(src);
                        },
                        animation: {
                            init: (prop) => {
                                var y = prop.attributes.y || 200;
                                var x = prop.attributes.x || 1000;
                                var container = div({
                                    classList: ["text-window"],
                                    style: {
                                        position: "absolute",
                                        padding: 0,
                                        margin: 0,
                                        top: y + "px",
                                        left: x + "px",
                                        width: "auto",
                                        backgroundColor: "#525659",
                                        zIndex: WindowManager.getNextIndex()
                                    }
                                });
                                var embed = el({
                                    type: "EMBED",
                                    attribute: {
                                        width: "630px",
                                        height: "800px",
                                        src: prop.value,
                                        type: "application/pdf"
                                    }
                                });
                                var handle = div({
                                    template: {
                                        view: `
<div class="safari_buttons">
    <div data-bind="click: $data.closeClicked" class="safari_close"></div><div data-bind="click: $data.minimizeClicked" class="safari_minimize"></div><div class="safari_zoom"></div><div data-bind="click: $data.focusClicked" class="safari_focus"></div>
</div>`,
                                        model: {
                                            closeClicked: () => win.close(),
                                            minimizeClicked: () => win.minimize(),
                                            focusClicked: () => {
                                                focus = !focus;
                                                if (focus) {
                                                    win.focus();
                                                } else {
                                                    win.unfocus();
                                                }
                                            }
                                        }
                                    }
                                });
                                container.appendChild(handle);
                                container.appendChild(embed);
                                document.body.appendChild(container);
                                var win = WindowManager.addWindow({
                                    type: "pdf",
                                    draggable: {
                                        node: handle,
                                        stop: function (e, ui) {
                                            var rect = container.getBoundingClientRect();
                                            prop.attributes = {
                                                x: rect.x,
                                                y: rect.y,
                                                width: rect.width,
                                                height: rect.height
                                            };
                                        }
                                    },
                                    loader: {
                                        params: {
                                            url: prop.value
                                        }
                                    },
                                    node: container
                                });
                            }
                        }
                    },
                    "adjacent-video": {
                        format: "decorate",
                        labelRenderer: function (prop) {
                            return "adjacent video: " + prop.value;
                        },
                        propertyValueSelector: function (prop, process) {
                            var defaultValue = prop.value;
                            var src = prompt("URL", defaultValue);
                            process(src);
                        },
                        animation: {
                            init: (prop) => {
                                var y = prop.attributes.y || 200;
                                var x = prop.attributes.x || 1000;
                                var container = div({
                                    classList: ["text-window"],
                                    style: {
                                        position: "absolute",
                                        top: y + "px",
                                        left: x + "px",
                                        width: "560px",
                                        backgroundColor: "#000",
                                        zIndex: WindowManager.getNextIndex()
                                    }
                                });
                                var iframe = newElement("IFRAME", {
                                    attribute: {
                                        width: 560,
                                        height: 315,
                                        src: prop.value,
                                        frameborder: 0
                                    }
                                });
                                var focus = false;
                                var handle = div({
                                    template: {
                                        view: `
<div class="safari_buttons">
    <div data-bind="click: $data.closeClicked" class="safari_close"></div><div data-bind="click: $data.minimizeClicked" class="safari_minimize"></div><div class="safari_zoom"></div><div data-bind="click: $data.focusClicked" class="safari_focus"></div>
</div>`,
                                        model: {
                                            closeClicked: () => win.close(),
                                            minimizeClicked: () => win.minimize(),
                                            zoomClicked: () => win.zoom(),
                                            focusClicked: () => {
                                                focus = !focus;
                                                if (focus) {
                                                    win.focus();
                                                } else {
                                                    win.unfocus();
                                                }
                                            }
                                        }
                                    }
                                });
                                container.appendChild(handle);
                                container.appendChild(iframe);
                                document.body.appendChild(container);
                                var win = WindowManager.addWindow({
                                    type: "video",
                                    draggable: {
                                        node: handle,
                                        stop: function (e, ui) {
                                            var rect = container.getBoundingClientRect();
                                            prop.attributes = {
                                                x: rect.x,
                                                y: rect.y,
                                                width: rect.width,
                                                height: rect.height
                                            };
                                        }
                                    },
                                    loader: {
                                        params: {
                                            url: prop.value
                                        }
                                    },
                                    node: container
                                });
                            }
                        }
                    },
                    "adjacent-image": {
                        format: "decorate",
                        labelRenderer: function (prop) {
                            return "adjacent image: " + prop.value;
                        },
                        propertyValueSelector: function (prop, process) {
                            var defaultValue = prop.value;
                            var src = prompt("URL", defaultValue);
                            process(src);
                        },
                        animation: {
                            init: (prop) => {
                                var y = prop.attributes.y || 200;
                                var x = prop.attributes.x || 1000;
                                var maxWidth = prop.attributes.maxWidth || 800;
                                var maxHeight = prop.attributes.maxHeight || 800;
                                var container = div({
                                    classList: ["text-window"],
                                    style: {
                                        position: "absolute",
                                        top: y + "px",
                                        left: x + "px",
                                        // backgroundColor: "#333",

                                        zIndex: WindowManager.getNextIndex()
                                    }
                                });
                                var img = newElement("IMG", {
                                    attribute: {
                                        src: prop.value
                                    },
                                    style: {
                                        maxWidth: maxWidth + "px",
                                        maxHeight: maxHeight + "px",
                                        height: "auto"
                                    },
                                    handler: {
                                        load: function (e) {
                                            var rect = img.getBoundingClientRect();
                                            var w = rect.width,
                                                h = rect.height;
                                            var viewWidth = prop.attributes.viewWidth || w,
                                                viewHeight = prop.attributes.viewHeight || h;
                                            prop.attributes = {
                                                x: rect.x,
                                                y: rect.y,
                                                width: w,
                                                height: h,
                                                viewWidth: viewWidth,
                                                viewHeight: viewHeight
                                            };
                                            img.style.width = viewWidth + "px";
                                            img.style.height = viewHeight + "px";
                                            container.style.width = viewWidth + "px";
                                            container.style.height = viewHeight + "px";
                                        }
                                    }
                                });
                                function changeSize(op, ratio) {
                                    var rect = img.getBoundingClientRect();
                                    var width = rect.width, height = rect.height;
                                    var w, h;
                                    if (op == "+") {
                                        w = width + (width * ratio);
                                        h = height + (height * ratio);
                                    } else {
                                        w = width - (width * ratio);
                                        h = height - (height * ratio);
                                    }
                                    img.style.width = w + "px";
                                    img.style.maxWidth = w + "px";
                                    img.style.height = h + "px";
                                    img.style.maxHeight = h + "px";
                                    prop.attributes.viewWidth = w;
                                    prop.attributes.viewHeight = h;
                                    container.style.width = w + "px";
                                    container.style.height = h + "px";
                                }
                                var handle = div({
                                    style: {
                                        backdropFilter: "blur(2em)",
                                    },
                                    template: {
                                        view: `
<div class="safari_buttons">
    <div data-bind="click: $data.closeClicked" class="safari_close"></div><div data-bind="click: $data.minimizeClicked" class="safari_minimize"></div><div class="safari_zoom"></div><div data-bind="click: $data.focusClicked" class="safari_focus"></div><span style="float: right; margin-right: 10px;" data-bind="click: $data.setImageUrlClicked"><i class="fas fa-cog"></i></span>
</div>`,
                                        model: {
                                            focusClicked: function () {
                                                this.focus = !this.focus;
                                                if (this.focus) {
                                                    win.focus();
                                                } else {
                                                    win.unfocus();
                                                }
                                            },
                                            setImageUrlClicked: () => {
                                                var url = prompt("url");
                                                if (!url) {
                                                    return;
                                                }
                                                prop.value = url;
                                                img.setAttribute("src", url);
                                            },
                                            closeClicked: () => win.close(),
                                            minimizeClicked: () => win.minimize()
                                        }
                                    }
                                });
                                container.appendChild(handle);
                                container.appendChild(img);
                                document.body.appendChild(container);
                                $(img).on("click", function (e) {
                                    if (e.ctrlKey) {
                                        changeSize("+", 0.1);
                                    } else {
                                        changeSize("-", 0.1);
                                    }
                                });
                                var win = WindowManager.addWindow({
                                    type: "image",
                                    draggable: {
                                        node: handle,
                                        stop: function (e, ui) {
                                            var rect = img.getBoundingClientRect();
                                            prop.attributes = {
                                                x: rect.x,
                                                y: rect.y,
                                                width: rect.width,
                                                height: rect.height
                                            };
                                        }
                                    },
                                    loader: {
                                        params: {
                                            url: prop.value
                                        }
                                    },
                                    node: container
                                });
                                _this.window.text.children.push(win);
                            }
                        }
                    },
                    image: {
                        format: "decorate",
                        labelRenderer: function (prop) {
                            return "image: " + prop.value;
                        },
                        zeroPoint: {
                            className: "image"
                        },
                        propertyValueSelector: function (prop, process) {
                            var defaultValue = prop.value;
                            var src = prompt("URL", defaultValue);
                            process(src);
                        },
                        attributes: {
                            "scale": {
                                renderer: function (prop) {
                                    return "scale (" + (prop.attributes.scale || "none") + ")";
                                },
                                selector: function (prop, process) {
                                    var value = prompt("scale", prop.attributes["scale"]);
                                    process(value);
                                }
                            },
                            "alignment": {
                                renderer: function (prop) {
                                    return "alignment (" + (prop.attributes.alignment || "none") + ")";
                                },
                                selector: function (prop, process) {
                                    var value = prompt("alignment", prop.attributes["alignment"]);
                                    process(value);
                                }
                            },
                            "right-margin": {
                                renderer: function (prop) {
                                    return "right margin (" + (prop.attributes["right-margin"] || "none") + ")";
                                },
                                selector: function (prop, process) {
                                    var value = prompt("right margin", prop.attributes["right-margin"]);
                                    process(value);
                                }
                            },
                            "width": {
                                renderer: function (prop) {
                                    return "width (" + (prop.attributes.width || "none") + ")";
                                },
                                selector: function (prop, process) {
                                    var value = prompt("width", prop.attributes["width"]);
                                    process(value);
                                }
                            },
                            "height": {
                                renderer: function (prop) {
                                    return "height (" + (prop.attributes.height || "none") + ")";
                                },
                                selector: function (prop, process) {
                                    var value = prompt("height", prop.attributes["height"]);
                                    process(value);
                                }
                            }
                        },
                        animation: {
                            init: (p) => {
                                p.attributes.alignment = "left";
                                p.attributes["right-margin"] = "20px";
                                // p.attributes.scale = 100;
                            },
                            start: (p) => {
                                var img = document.createElement("IMG");
                                img.speedy = {
                                    stream: 1
                                };
                                img.setAttribute("src", p.value);
                                img.style.float = p.attributes.alignment;
                                img.style.marginRight = p.attributes["right-margin"];
                                if (p.attributes["scale"]) {
                                    img.style.width = p.attributes["scale"] + "%";
                                    img.style.height = "auto";
                                }
                                p.startNode.appendChild(img);
                            },
                            delete: (p) => {
                                p.startNode.remove();
                            }
                        }
                    },
                    wink: {
                        format: "decorate",
                        labelRenderer: function (prop) {
                            return "wink";
                        },
                        zeroPoint: {
                            className: "wink"
                        },
                        animation: {
                            init: (p, editor) => {
                                if (!p.startNode) {
                                    return;
                                }
                                p.animation = {
                                    index: 0,
                                    stop: false,
                                    chars: ["😊", "😏", "😉"]
                                };
                            },
                            draw: function (p) {
                                var chars = p.animation.chars;
                                var index = Math.floor(Math.random() * (chars.length));
                                var c = chars[index];
                                p.startNode.style.fontFamily = "monospace";
                                p.startNode.innerHTML = c;
                            },
                            start: (p) => {
                                if (!p.startNode) {
                                    return;
                                }
                                const tick = function () {
                                    if (p.animation.stop) {
                                        // clearInterval(p.animation.timer);
                                        return;
                                    }
                                    p.schema.animation.draw(p);
                                };
                                tick();
                                p.animation.timer = setInterval(tick, 1000);
                            },
                            stop: (p, editor) => {
                                clearInterval(p.animation.timer);
                            },
                            delete: (p, editor) => {
                                clearInterval(p.animation.timer);
                            }
                        }
                    },
                    flip: {
                        format: "block",
                        className: "flip",
                        labelRenderer: (p) => {
                            return "flip";
                        }
                    },
                    "upside-down": {
                        format: "block",
                        className: "upside-down",
                        labelRenderer: (p) => {
                            return "upside down";
                        }
                    },
                    pulsate: {
                        format: "block",
                        labelRenderer: function (prop) {
                            return "pulsate";
                        },
                        className: "pulsate",
                        animation: {
                            init: (p, editor) => {
                                if (!p.startNode) {
                                    return;
                                }
                                p.animation = {
                                    zoom: 100,
                                    step: 10,
                                    stop: false
                                };
                            },
                            draw: function (p) {
                                var block = p.startNode.parentNode;
                                p.animation.zoom += p.animation.step;
                                if (p.animation.zoom >= 150) {
                                    p.animation.step = -5;
                                }
                                if (p.animation.zoom <= 50) {
                                    p.animation.step = 5;
                                }
                                block.style.zoom = p.animation.zoom + "%";
                            },
                            start: (p) => {
                                if (!p.startNode) {
                                    return;
                                }
                                p.animation.timer = setInterval(function () {
                                    if (p.animation.stop) {
                                        // clearInterval(p.animation.timer);
                                        return;
                                    }
                                    p.schema.animation.draw(p);
                                }, 125);
                            },
                            stop: (p, editor) => {
                                clearInterval(p.animation.timer);
                            },
                            delete: (p, editor) => {
                                clearInterval(p.animation.timer);
                            }
                        }
                    },
                    peekaboo: {
                        format: "block",
                        labelRenderer: function (prop) {
                            return "peekaboo";
                        },
                        className: "peekaboo",
                        animation: {
                            init: (p, editor) => {
                                if (!p.startNode) {
                                    return;
                                }
                                p.animation = {
                                    x: 0,
                                    step: 4,
                                    stop: false
                                };
                                p.startNode.parentNode.style.paddingTop = "11px";
                                p.startNode.parentNode.style.top = "16px";
                                p.startNode.parentNode.style.marginTop = "-10px";
                            },
                            draw: function (p) {
                                var nodes = p.allInStreamNodes();
                                var width = (p.endNode.offsetLeft - p.startNode.offsetLeft) + p.endNode.offsetWidth;
                                p.animation.x += p.animation.step;
                                if (p.animation.x >= width || p.animation.x <= (0 - width)) {
                                    p.animation.step = p.animation.step * -1;
                                }
                                nodes.forEach(n => {
                                    n.style.left = p.animation.x + "px";
                                });
                            },
                            start: (p) => {
                                if (!p.startNode) {
                                    return;
                                }
                                p.animation.timer = setInterval(function () {
                                    if (p.animation.stop) {
                                        // clearInterval(p.animation.timer);
                                        return;
                                    }
                                    p.schema.animation.draw(p);
                                }, 65);
                            },
                            stop: (p, editor) => {
                                clearInterval(p.animation.timer);
                            },
                            delete: (p, editor) => {
                                clearInterval(p.animation.timer);
                            }
                        }
                    },
                    counter: {
                        format: "block",
                        labelRenderer: function (prop) {
                            return "counter";
                        },
                        zeroPoint: {
                            className: "counter"
                        },
                        animation: {
                            init: (p, editor) => {
                                if (!p.startNode) {
                                    return;
                                }
                                p.animation = {
                                    count: 0,
                                    stop: false
                                };
                                p.schema.animation.draw(p);
                            },
                            draw: function (p) {
                                var input = document.createElement("INPUT");
                                input.speedy = {
                                    role: 1
                                };
                                input.classList.add("form-control");
                                input.style.width = "40px";
                                input.style.display = "inline-block";
                                input.value = p.animation.count++;
                                p.startNode.innerHTML = null;
                                p.startNode.appendChild(input);
                            },
                            start: (p) => {
                                if (!p.startNode) {
                                    return;
                                }
                                p.animation.timer = setInterval(function () {
                                    if (p.animation.stop) {
                                        // clearInterval(p.animation.timer);
                                        return;
                                    }
                                    p.schema.animation.draw(p);
                                }, 1000);
                            },
                            stop: (p, editor) => {
                                clearInterval(p.animation.timer);
                            },
                            delete: (p, editor) => {
                                clearInterval(p.animation.timer);
                            }
                        }
                    },
                    clock: {
                        format: "block",
                        labelRenderer: function (prop) {
                            return "clock";
                        },
                        className: "clock",
                        animation: {
                            init: (p, editor) => {
                                if (!p.startNode) {
                                    return;
                                }
                                p.animation = {
                                    degrees: 0,
                                    element: null,
                                    stop: false
                                };
                                var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                                var x = p.startNode.offsetLeft;
                                var y = p.startNode.offsetTop;
                                var w = (p.endNode.offsetLeft + p.endNode.offsetWidth) - p.startNode.offsetLeft;
                                var h = p.endNode.offsetHeight;
                                console.log({
                                    x, y, w, startNode: p.startNode, endNode: p.endNode
                                });
                                svg.speedy = {
                                    stream: 1
                                };
                                var cr = p.editor.container.getBoundingClientRect();
                                var sr = p.startNode.getBoundingClientRect();
                                var er = p.endNode.getBoundingClientRect();
                                var w = er.x + er.width - sr.x;
                                var x = sr.x - cr.x;
                                var y = sr.y - cr.y - (w / 4);
                                svg.style.position = "absolute";
                                svg.style.left = x + "px";
                                svg.style.top = y + "px";
                                svg.style.width = w + "px";
                                svg.style.height = w + "px";
                                var svgNS = svg.namespaceURI;
                                var circle = document.createElementNS(svgNS, 'circle');
                                circle.setAttributeNS(null, 'cx', w / 2);
                                circle.setAttributeNS(null, 'cy', w / 2);
                                circle.setAttributeNS(null, 'r', w / 2);
                                circle.setAttributeNS(null, 'fill', 'transparent');
                                svg.appendChild(circle);
                                //p.editor.container.insertBefore(svg, p.startNode.parentNode);
                                p.animation.element = svg;
                            },
                            draw: function (p) {
                                var block = p.startNode.parentNode;
                                p.animation.degrees += 2;
                                if (p.animation.degrees >= 360) {
                                    p.animation.degrees = 0;
                                }
                                block.style.transform = "rotate(" + p.animation.degrees + "deg)";
                            },
                            start: (p) => {
                                if (!p.startNode) {
                                    return;
                                }
                                p.animation.timer = setInterval(function () {
                                    if (p.animation.stop) {
                                        // clearInterval(p.animation.timer);
                                        return;
                                    }
                                    p.schema.animation.draw(p);
                                }, 125);
                            },
                            stop: (p, editor) => {
                                clearInterval(p.animation.timer);
                            },
                            delete: (p, editor) => {
                                clearInterval(p.animation.timer);
                            }
                        }
                    },
                    spinner: {
                        format: "decorate",
                        labelRenderer: function (prop) {
                            return "spinner";
                        },
                        zeroPoint: {
                            className: "speedy__line"
                        },
                        animation: {
                            init: (p, editor) => {
                                if (!p.startNode) {
                                    return;
                                }
                                p.animation = {
                                    index: 0,
                                    stop: false,
                                    chars: ["|", "/", "&mdash;", "\\"]
                                };
                            },
                            draw: function (p) {
                                var chars = p.animation.chars;
                                var c = chars[p.animation.index++];
                                if (p.animation.index >= chars.length) {
                                    p.animation.index = 0;
                                }
                                p.startNode.style.fontFamily = "monospace";
                                p.startNode.innerHTML = c;
                            },
                            start: (p) => {
                                if (!p.startNode) {
                                    return;
                                }
                                p.animation.timer = setInterval(function () {
                                    if (p.animation.stop) {
                                        // clearInterval(p.animation.timer);
                                        return;
                                    }
                                    p.schema.animation.draw(p);
                                }, 250);
                            },
                            stop: (p, editor) => {
                                clearInterval(p.animation.timer);
                            },
                            delete: (p, editor) => {
                                clearInterval(p.animation.timer);
                            }
                        }
                    },
                    scramble: {
                        format: "decorate",
                        labelRenderer: function (prop) {
                            return "scramble";
                        },
                        zeroPoint: {
                            className: "scramble"
                        },
                        animation: {
                            init: (p, editor) => {
                                if (!p.startNode) {
                                    return;
                                }
                                p.animation = {
                                    originalCells: [],
                                    cells: []
                                };
                            },
                            draw: function (p) {
                                var chars = p.animation.chars;
                                var c = chars[p.animation.index++];
                                if (p.animation.index >= chars.length) {
                                    p.animation.index = 0;
                                }
                                p.startNode.style.fontFamily = "monospace";
                                p.startNode.innerHTML = c;
                            },
                            start: (p) => {
                                if (!p.startNode) {
                                    return;
                                }
                                p.animation.timer = setInterval(function () {
                                    if (p.animation.stop) {
                                        // clearInterval(p.animation.timer);
                                        return;
                                    }
                                    p.schema.animation.draw(p);
                                }, 250);
                            },
                            stop: (p, editor) => {
                                clearInterval(p.animation.timer);
                            },
                            delete: (p, editor) => {
                                clearInterval(p.animation.timer);
                            }
                        }
                    },
                    rectangle: {
                        format: "decorate",
                        className: "rectangle",
                        labelRenderer: (p) => {
                            return "rectangle";
                        },
                        onRequestAnimationFrame: (p) => {
                            _this.drawClippedRectangle(p);
                        }
                    },
                    drop: {
                        format: "decorate",
                        className: "drop",
                        labelRenderer: function (prop) {
                            return "drop";
                        },
                        animation: {
                            init: (p, editor) => {
                                if (!p.startNode || !p.endNode) {
                                    return;
                                }
                                p.animation = {
                                    initialTop: p.startNode.offsetTop,
                                    top: p.startNode.offsetTop,
                                    stop: false
                                };
                            },
                            draw: function (p, nodes) {
                                var top = p.animation.top += 2;
                                nodes.forEach(n => {
                                    n.style.top = (top - n.offsetTop) + "px";
                                    n.style.position = "relative";
                                });
                            },
                            start: (p, editor) => {
                                p.animation.timer = setInterval(function () {
                                    if (p.startNode.offsetTop >= 2000) {
                                        clearInterval(timer); // finish the animation after 2 seconds
                                        return;
                                    }
                                    if (!p.animation.stop) {
                                        var nodes = p.allInStreamNodes();
                                        p.schema.animation.draw(p, nodes);
                                    }
                                }, 125);
                            },
                            stop: (p, editor) => {
                                p.animation.stop = true;
                            },
                            delete: (p, editor) => {
                                clearInterval(p.animation.timer);
                                var nodes = p.allInStreamNodes();
                                nodes.forEach(n => {
                                    n.style.top = 0;
                                });
                            }
                        }
                    },
                    "aligned-iframe": {
                        format: "decorate",
                        className: "aligned-iframe",
                        labelRenderer: function (prop) {
                            return "aligned iframe: " + prop.value;
                        },
                        propertyValueSelector: function (prop, process) {
                            var url = prompt("Url?", prop.value || "");
                            process(url);
                        },
                        animation: {
                            init: (p) => { },
                            start: (p) => { },
                            delete: (p) => {
                                p.node.remove();
                            }
                        },
                        onRequestAnimationFrame: (p) => {
                            console.log({ p });
                            if (!p.startNode || !p.endNode || p.isDeleted) {
                                return;
                            }
                            var exists = !!p.node;
                            var iframe = p.node || document.createElement("IFRAME");
                            if (!exists) {
                                iframe.style.position = "absolute";
                                iframe.style.top = p.startNode.offsetTop + "px";
                                iframe.style.right = 0;
                                iframe.setAttribute("width", "600");
                                iframe.setAttribute("height", "400");
                                iframe.setAttribute("src", p.value);
                                iframe.setAttribute("frameborder", "0");
                                iframe.speedy = {
                                    role: 3,
                                    stream: 1
                                };
                                //iframe.style["-webkit-transform"] = "scale(0.75)";
                                //iframe.style["-webkit-transform-origin"] = "0 0";
                                p.node = iframe;
                                p.editor.container.appendChild(iframe);
                            } else {
                                iframe.style.top = p.startNode.offsetTop + "px";
                            }
                        }
                    },
                    domain: {
                        format: "decorate",
                        className: "domain",
                        labelRenderer: function (prop) {
                            return prop.text ? "<span style='position: relative;'><span class='output-domain hover-item'>domain</span><span class='hover-item-hide'>" + prop.text + "</span></span>" : "<span class='output-domain'>domain<span>";
                        },
                        propertyValueSelector: function (prop, process) {
                            openModal("/Static/Templates/Agent/SearchModal.html", {
                                name: "Agents",
                                ajaxContentAdded: function (element) {
                                    require(["modals/search-agents"], function (AgentModal) {
                                        var inline = _.createInlineAgentSelector();
                                        var agentGuids = inline ? inline().map(item => item.value) : [];
                                        var modal = new AgentModal({
                                            popup: element,
                                            tabs: ["search", "recentlyUsed", "quickAdd", "sourceAgents"],
                                            currentTab: "search",
                                            tab: {
                                                sourceAgents: {
                                                    filter: {
                                                        Guids: agentGuids
                                                    }
                                                }
                                            },
                                            handler: {
                                                inlineAgentSelector: _.createInlineAgentSelector(),
                                                onSelected: function (guid, name) {
                                                    process(guid, name);
                                                    prop.text = name;
                                                    prop.schema.onRequestAnimationFrame(prop);
                                                    closeModal(element);
                                                }
                                            }
                                        });
                                        ko.applyBindings(modal, element);
                                        modal.start();
                                    });
                                }
                            });
                        },
                        animation: {
                            init: (p) => { },
                            start: (p) => { },
                            delete: (p) => {
                                p.node.remove();
                            }
                        },
                        onRequestAnimationFrame: (p) => {
                            console.log({ p });
                            if (!p.startNode || !p.endNode || p.isDeleted) {
                                return;
                            }
                            var margin = p.node || document.createElement("SPAN");
                            margin.speedy = {
                                role: 3,
                                stream: 1
                            };
                            margin.innerHTML = null;
                            margin.innerText = p.text.substr(0, 10) + "...";
                            var line = document.createElement("SPAN");
                            line.speedy = {
                                role: 3,
                                stream: 1
                            };
                            margin.style.fontSize = "1rem";
                            margin.style.position = "absolute";
                            margin.style.transform = "rotate(-90deg)";
                            margin.style.transformOrigin = "0 0";
                            var w = p.endNode.offsetTop - p.startNode.offsetTop + p.endNode.offsetHeight;
                            margin.title = p.text;
                            margin.style.top = p.endNode.offsetTop + p.endNode.offsetHeight + "px"; // have to halve width as the region is rotated 90 degrees
                            margin.style.left = "40px";
                            margin.style.width = w + "px";
                            line.style.position = "absolute";
                            line.style.top = "33px";
                            line.style.left = 0;
                            line.style.opacity = 0.5;
                            line.style.width = w + "px";
                            line.style.backgroundColor = "purple";
                            line.style.height = "4px";
                            margin.appendChild(line);
                            if (!p.nodeHooked) {
                                p.editor.container.appendChild(margin);
                                p.node = margin;
                                p.nodeHooked = true;
                            }
                        }
                    },
                    blockquote: {
                        format: "block",
                        className: "blockquote"
                    },
                    page: {
                        format: "decorate",
                        className: "speedy__page",
                        labelRenderer: function (prop) {
                            return "p. " + prop.value;
                        },
                        event: {
                            monitor: {
                                mouseover: (p) => {
                                    _this.drawClippedRectangle(p);
                                    //require(["parts/minimap"], function (Minimap) {
                                    //    var minimap = p.minimap = new Minimap({ editor: p.editor });
                                    //    minimap.createBar();
                                    //    minimap.addMarkers([p], { hide: false, colour: "yellow", opacity: 1, usePropertyHeight: true });
                                    //});
                                },
                                mouseout: (p) => {
                                    if (p.svg) {
                                        p.svg.remove();
                                    }
                                    //if (p.minimap) {
                                    //    p.minimap.remove();
                                    //}
                                }
                            }
                        },
                        render: {
                            batchUpdate: (data) => {
                                const { editor, properties } = data;
                                const fragment = document.createDocumentFragment();
                                properties.forEach(p => {
                                    if (!p.startNode) {
                                        return;
                                    }
                                    if (p.labelNode) {
                                        p.labelNode.remove();
                                    }
                                    const content = "p. " + (p.value || "?");
                                    const label = document.createElement("SPAN");
                                    label.innerHTML = content;
                                    label.style.position = "absolute";
                                    const top = p.startNode.speedy.offset.y;
                                    label.style.top = (top - 10) + "px";
                                    label.style.left = "20px";
                                    label.style.fontSize = "0.7rem";
                                    label.speedy = {
                                        stream: 1
                                    };
                                    p.labelNode = label;
                                    fragment.appendChild(label);
                                });
                                editor.container.appendChild(fragment);
                            },
                            destroy: (p) => {
                                if (p.labelNode) {
                                    p.labelNode.remove();
                                }
                            }
                        },
                        propertyValueSelector: function (prop, process) {
                            var num = prompt("Page number?", prop.value || "");
                            process(num);
                        }
                    },
                    language: {
                        format: "decorate",
                        className: "language",
                        labelRenderer: function (prop) {
                            return "language (" + prop.value + ")";
                        },
                        defaults: {
                            language: null,
                            italics: false
                        },
                        propertyValueSelector: function (prop, process) {
                            require(["parts/language-selector"], function (LanguageSelector) {
                                openModal("/Static/Templates/Text/language-selector.html", {
                                    name: "Language",
                                    ajaxContentAdded: function (element) {
                                        var modal = new LanguageSelector({
                                            popup: element,
                                            model: {
                                                language: prop.value || _.state.language,
                                                italicise: _.state.italicise,
                                            },
                                            handler: {
                                                onSelected: function (value, name, italicise) {
                                                    _.state.language = value;
                                                    _.state.italicise = italicise;
                                                    process(value, name);
                                                    if (italicise) {
                                                        _.editor.createProperty("italics", null, { start: prop.startNode, end: prop.endNode });
                                                    }
                                                    closeModal(element);
                                                },
                                                onCancel: function () {
                                                    closeModal(element);
                                                }
                                            }
                                        });
                                        ko.applyBindings(modal, element);
                                    }
                                });
                            });
                        }
                    },
                    paragraph: {
                        format: "decorate",
                        className: "speedy__paragraph"
                    },
                    structure: {
                        format: "decorate",
                        className: "structure",
                        labelRenderer: function (prop) {
                            return prop.name ? "structure (" + prop.name + ")" : "structure";
                        },
                        propertyValueSelector: function (prop, process) {
                            require(["modals/search-structures"], function (StructureModal) {
                                openModal("/Static/Templates/Structure/SearchModal.html", {
                                    name: "Structures",
                                    ajaxContentAdded: function (element) {
                                        var modal = new StructureModal({
                                            popup: element,
                                            tab: {
                                                search: {
                                                    filter: {
                                                        Guid: prop.value
                                                    }
                                                }
                                            },
                                            handler: {
                                                onSelected: function (guid, name) {
                                                    process(guid, name);
                                                    closeModal(element);
                                                }
                                            }
                                        });
                                        ko.applyBindings(modal, element);
                                        modal.start();
                                    }
                                });
                            });
                        },
                    },
                    agent: {
                        format: "decorate",
                        shortcut: "a",
                        className: "",
                        //format: "overlay",
                        //shortcut: "a",
                        //className: "agent",
                        labelRenderer: function (prop) {
                            return prop.text ? `<span style="position: relative;"><span class='output-agent hover-item'>entity</span><span class="hover-item-hide">` + prop.text + `</span></span>` : `<span class='output-agent'>entity<span>`;
                        },
                        showScrollBar: (editor, matches) => {
                            require(["parts/minimap"], function (Minimap) {
                                var minimap = new Minimap(editor);
                                minimap.addMarkers(matches);
                            });
                        },
                        hideScrollBar: (editor) => {
                            if (editor.bar) {
                                editor.bar.remove();
                            }
                        },
                        state: {
                            graphView: {
                                y: 100
                            }
                        },
                        data: {
                            labels: []
                        },
                        render: {
                            options: {
                                colour: "purple",
                                opacity: 0.5,
                                offsetY: 0
                            },
                            batchUpdate: (data) => {
                                const { editor, properties } = data;
                                const fragment = document.createDocumentFragment();
                                const { container } = editor;
                                const containerRect = container.getBoundingClientRect();
                                const containerWidth = containerRect.width;
                                offsetManager.clearLines(properties);
                                properties.forEach(p => {
                                    const { schema } = p;
                                    const { options } = schema.render;
                                    //const line = { p: p, x1: p.startNode.speedy.offset.x, y1: p.startNode.speedy.offset.y, x2: p.endNode.speedy.offset.x, y2: p.endNode.speedy.offset.y };
                                    //const _line = offsetManager.addLineAndGetOffset(line);
                                    const offsetY = options.offsetY;
                                    const svg = Helper.drawUnderline(p, { containerWidth, stroke: options.colour, strokeOpacity: options.opacity, offsetY: offsetY });
                                    fragment.appendChild(svg);
                                });
                                editor.container.appendChild(fragment);
                            },
                            destroy: (p) => {
                                if (p.svg) {
                                    p.svg.remove();
                                }
                            }
                        },
                        event: {
                            annotation: {
                                "alt-click": function (p) {
                                    _this.loadEntityClicked(p.value, { tab: "references" });
                                },
                                "control-click": (p) => {
                                    _this.loadEntityReferences(p);
                                }
                            },
                            monitor: {
                                mouseover: (p) => {
                                    p.highlight();
                                },
                                mouseout: (p) => {
                                    p.unhighlight();
                                }
                            },
                            keyboard: {
                                "control-8": (p) => {
                                    Helper.drawUnderline(p);
                                },
                                "control-shift-B": (p) => {
                                    _this.loadTimeline({ guid: p.value, name: p.text });
                                },
                                "control-G": (p) => {
                                    _this.loadAgentGraph({ guid: p.value });
                                },
                                "control- ": function (p) {
                                    _this.loadEntityReferences(p);
                                },
                                "control-L": (p) => {
                                    $.get("/Static/Templates/Agent/proximity-panel.html?v=4", function (html) {
                                        var Model = (function () {
                                            function Model(cons) {
                                                this.agentGuid = cons.agentGuid;
                                                this.sectionGuid = ko.observable();
                                                this.mode = ko.observable();
                                                this.range = ko.observable(20);
                                                this.minimumTotal = ko.observable(null);
                                                this.limit = ko.observable(10);
                                                this.data = [];
                                                this.results = ko.observableArray([]);
                                                this.list = {
                                                    modes: ko.observableArray([
                                                        { Text: "Syntactically linked", Value: "SyntacticallyLinked" },
                                                        { Text: "In the same sentence", Value: "SameSentence" },
                                                        { Text: "In the same text", Value: "SameText" }
                                                    ]),
                                                    sections: ko.observableArray([])
                                                }
                                                this.setup();
                                            }
                                            Model.prototype.setModalLists = function (data) {
                                                this.list.sections(data.Sections);
                                                this.load();
                                            };
                                            Model.prototype.setup = function () {
                                                var _this = this;
                                                const json = localStorage.getItem("/Admin/Agent/SearchModalLists");
                                                if (json) {
                                                    const data = JSON.parse(json);
                                                    this.setModalLists(data);
                                                } else {
                                                    $.get("/Admin/Agent/SearchModalLists", function (response) {
                                                        console.log({ response });
                                                        if (!response.Success) {
                                                            return;
                                                        }
                                                        localStorage.setItem("/Admin/Agent/SearchModalLists", JSON.stringify(response.Data));
                                                        _this.setModalLists(response.Data);
                                                    });
                                                }
                                            };
                                            Model.prototype.agentSelected = function (item) {
                                                console.log(item);
                                            };
                                            Model.prototype.loadClicked = function () {
                                                this.load();
                                            };
                                            Model.prototype.closeClicked = function () {
                                                node.remove();
                                            };
                                            Model.prototype.graphClicked = function () {
                                                var _this = this;
                                                require(["parts/agent-graph"], function (AgentGraph) {
                                                    var container = div({
                                                        style: {
                                                            position: "absolute",
                                                            top: "100px",
                                                            right: "20px",
                                                            padding: "20px",
                                                            width: "440px",
                                                            zIndex: z++
                                                        },
                                                        children: [
                                                            applyBindings("<div style='text-align: right;'><span style='text-decoration: underline;' data-bind='click: $data.closeClicked'>close</span></div>", { closeClicked: function () { container.remove(); } })
                                                        ],
                                                        classList: ["text-window"]
                                                    });
                                                    var node = div({
                                                        style: {
                                                            width: "400px",
                                                            height: "600px"
                                                        }
                                                    });
                                                    container.appendChild(node);
                                                    p.editor.container.parentNode.appendChild(container);
                                                    var guids = _this.results().map(x => x.Agent.Guid).join(",");
                                                    var graph = new AgentGraph({
                                                        layout: "cose",
                                                        node: node,
                                                        agentGuids: guids
                                                    });
                                                });
                                            };
                                            Model.prototype.loadWordCloud = function (data) {
                                                var _this = this;

                                            };
                                            Model.prototype.load = function () {
                                                var _this = this;
                                                var params = {
                                                    agentGuid: this.agentGuid,
                                                    mode: this.mode(),
                                                    sectionGuid: this.sectionGuid(),
                                                    range: this.range(),
                                                    minimumTotal: this.minimumTotal(),
                                                    limit: this.limit()
                                                };
                                                $.get("/Admin/Agent/ProximityChart", params, function (response) {
                                                    console.log({ ajax: "/Admin/Agent/ProximityChart", response })
                                                    var data = _this.data = response.Data.Results;
                                                    _this.results(data.concat().sort((a, b) => a.Total < b.Total ? 1 : a.Total == b.Total ? 0 : -1));
                                                    _this.loadWordCloud(data);
                                                });
                                            };
                                            return Model;
                                        })();
                                        var model = new Model({
                                            agentGuid: p.value,
                                        });
                                        var table = applyBindings(html, model);
                                        var node = div({
                                            style: {
                                                position: "absolute",
                                                right: "20px",
                                                top: "100px",
                                                width: "400px",
                                                height: "650px",
                                                padding: "20px",
                                            },
                                            classList: ["text-window"],
                                            children: [table]
                                        });
                                        document.body.appendChild(node);
                                        require(["jquery-ui"], function () {
                                            $(node).draggable();
                                        });
                                        var win = WindowManager.addWindow({
                                            type: "agent-sentences",
                                            params: {
                                                guid: p.value
                                            },
                                            node: node
                                        });
                                    });
                                },
                                "control-Z": function (p) {
                                    require(["libs/chartjs", "jquery", "jquery-ui"], function (Chart, $) {
                                        var container = div({
                                            style: {
                                                position: "absolute",
                                                top: "150px",
                                                right: "40px",
                                                padding: "20px 20px",
                                                width: "800px",
                                                height: "500px",
                                                zIndex: z++
                                            },
                                            children: [
                                                applyBindings(`
<div style='text-align: right;'><span style='text-decoration: underline;' data-bind='click: $data.closeClicked'>close</span></div>
<h4><span data-bind='text: $data.agent.name'></span></h4>`, {
                                                    closeClicked: function () {
                                                        container.remove();
                                                    },
                                                    agent: {
                                                        guid: p.value,
                                                        name: p.text
                                                    }
                                                })
                                            ],
                                            classList: ["text-window"]
                                        });
                                        var canvas = newElement("canvas");
                                        container.appendChild(canvas);
                                        document.body.appendChild(container);
                                        $(container).draggable();
                                        var agentGuid = p.value;
                                        $.get("/Admin/Agent/TextChart", { agentGuid: agentGuid }, function (response) {
                                            console.log({ ajax: "/Admin/Agent/TextChart", response })
                                            var data = response.Data.Results;
                                            if (!data.length) {
                                                return;
                                            }
                                            canvas.style.display = "block";
                                            var ctx = canvas.getContext('2d');
                                            var labels = data.map(x => x.Date);
                                            var chart = new Chart(ctx, {
                                                type: 'bar',
                                                data: {
                                                    labels: labels,
                                                    datasets: [{
                                                        label: "Total",
                                                        data: data.map(x => x.Total),
                                                        backgroundColor: "red",
                                                        borderWidth: 1
                                                    }]
                                                },
                                                legend: {
                                                    display: true,
                                                    position: "bottom"
                                                },
                                                options: {
                                                    scales: {
                                                        yAxes: [{
                                                            ticks: {
                                                                beginAtZero: true,
                                                                callback: function (value) {
                                                                    if (value % 1 === 0) {
                                                                        return value;
                                                                    }
                                                                }
                                                            }
                                                        }],
                                                        xAxes: [{
                                                            ticks: {
                                                                autoSkip: data.length > 50
                                                            }
                                                        }]
                                                    }
                                                }
                                            });
                                            $(canvas).click(
                                                function (evt) {
                                                    var activePoints = chart.getElementsAtEvent(evt);
                                                    console.log("activePoints", activePoints);
                                                    var index = activePoints[0]._index;
                                                    var label = labels[index];
                                                    var items = data.filter(x => x.Date == label);
                                                    if (items) {
                                                        _this.loadTextWindow(items[0].Guid, document.body);
                                                    }
                                                }
                                            );
                                            var win = WindowManager.addWindow({
                                                type: "text-chart",
                                                params: {
                                                    guid: agentGuid
                                                },
                                                node: container
                                            });
                                        });
                                    });
                                },

                                "control-shift-H": (p) => {
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
                                },
                                "control-shift-K": (p) => {
                                    require(["parts/agent-graph"], (AgentGraph) => {
                                        p.graphNode = document.createElement("DIV");
                                        var rect = p.editor.container.getBoundingClientRect();
                                        console.log({ container: p.editor.container, rect });
                                        p.graphNode.style.position = "fixed";
                                        p.graphNode.style.top = rect.y + "px";
                                        p.graphNode.style.left = rect.x + "px";
                                        p.graphNode.style.width = p.editor.container.offsetWidth + "px";
                                        p.graphNode.style.height = p.editor.container.offsetHeight + "px";
                                        p.graphNode.addEventListener("keyup", (e) => {
                                            console.log({ e });
                                            if (e.keyCode == 27) {
                                                p.graphNode.remove();
                                                p.editor.container.style.filter = "none";
                                                p.editor.container.style.opacity = 1;
                                            }
                                        });
                                        p.graphNode.addEventListener("mouseout", (e) => {
                                            console.log({ e });
                                            if (e.target != p.graphNode) {
                                                p.graphNode.remove();
                                                p.editor.container.style.filter = "none";
                                                p.editor.container.style.opacity = 1;
                                            }
                                        });
                                        p.editor.container.parentNode.appendChild(p.graphNode);
                                        p.editor.container.style.filter = "blur(2px)";
                                        p.editor.container.style.opacity = 0.5;
                                        var graph = new AgentGraph({
                                            node: p.graphNode,
                                            agentGuid: p.value
                                        });
                                    });
                                },
                                //"control-shift-L": (p) => {
                                //    var guid = p.value;
                                //    var matches = p.editor.data.properties.filter(x => x.value == guid && p.type == "agent" && !p.isDeleted);
                                //    matches.forEach(x => x.highlight());
                                //    p.schema.showScrollBar(p.editor, matches);
                                //},
                                //"esc": (p) => {
                                //    var guid = p.value;
                                //    var matches = p.editor.data.properties.filter(x => x.value == guid && p.type == "agent" && !p.isDeleted);
                                //    matches.forEach(x => x.unhighlight());
                                //    p.schema.hideScrollBar(p.editor);
                                //    if (p.graphNode) {
                                //        p.graphNode.remove();
                                //        p.editor.container.style.filter = "none";
                                //        p.editor.container.style.opacity = 1;
                                //    }
                                //}
                            }
                        },
                        load: function (prop) {
                            openModal("/Static/Templates/Agent/SearchModal.html", {
                                name: "Agents",
                                ajaxContentAdded: function (element) {
                                    require(["modals/search-agents"], function (AgentModal) {
                                        var inline = _.createInlineAgentSelector();
                                        var agentGuids = inline ? inline().map(item => item.value) : [];
                                        var modal = new AgentModal({
                                            popup: element,
                                            tabs: ["search"],
                                            currentTab: "search",
                                            tab: {
                                                search: {
                                                    filter: {
                                                        Guid: prop.value,
                                                        Name: !prop.value ? prop.text : null
                                                    }
                                                }
                                            },
                                            handler: {
                                                onSelected: function (guid, name) {
                                                    closeModal(element);
                                                }
                                            }
                                        });
                                        ko.applyBindings(modal, element);
                                        modal.start();
                                    });
                                }
                            });
                        },
                        propertyValueSelector: function (prop, process) {
                            _.selectAgent(prop, process);
                        },
                    },
                    "syntax/sentence": {
                        format: "decorate",
                        className: "sentence",
                        exportText: false,
                    },
                    "text/block": {
                        format: "decorate",
                        className: "block",
                        exportText: false,
                        labelRenderer: function (prop) {
                            return "block " + (prop.value || 0);
                        },
                        attributes: {
                            "indent": {
                                renderer: function (prop) {
                                    return "indent " + prop.attributes.indent;
                                },
                                selector: function (prop, process) {
                                    var value = prompt("indent", prop.attributes["indent"]);
                                    process(value);
                                }
                            }
                        },
                        data: {
                            labels: [],
                            minimap: null,
                            menu: null
                        },
                        method: {
                            clearSelection: (p) => {
                                p.unhighlight();
                                const data = p.schema.data;
                                if (!!data.labels) {
                                    data.labels.forEach(x => x.label.remove());
                                    data.labels = [];
                                }
                                if (!!data.minimap) {
                                    data.minimap.remove();
                                }
                            }
                        },
                        event: {

                            monitor: {
                                mouseover: (p) => {
                                    p.schema.method.clearSelection(p);
                                    require(["libs/randomColor"], function (randomColor) {
                                        p.highlight();
                                        const { schema, editor } = p;
                                        var blocks = editor.data.properties.filter(x => x.type == "text/block" && !!x.blockNode && !x.isDeleted);
                                        blocks.sort((a, b) => a.blockNode.offsetTop > b.blockNode.offsetTop ? 1 : -1);
                                        const colours = randomColor({
                                            count: blocks.length,
                                            seed: "orange",
                                            luminosity: 'bright',
                                            format: 'rgb',
                                            hue: 'random'
                                        });
                                        var items = blocks.map((p, i) => {
                                            return {
                                                text: i + 1,
                                                colour: colours[i],
                                                property: p
                                            }
                                        });
                                        var labels = _this.generateLabels(items);
                                        schema.data.labels = labels;
                                        labels.forEach(item => {
                                            const blockNode = item.property.blockNode;
                                            const y = blockNode.offsetTop;
                                            updateElement(item.label, {
                                                style: {
                                                    display: "block",
                                                    left: "40px",
                                                    top: y + "px"
                                                }
                                            });
                                            item.property.blockNode.appendChild(item.label);
                                        });
                                        //require(["parts/minimap"], function (Minimap) {
                                        //    var minimap = schema.data.minimap = new Minimap({ editor });
                                        //    minimap.createBar({ backgroundColor: "none" });
                                        //    const properties = blocks.map((b, i) => {
                                        //        return { ...b, colour: colours[i] };
                                        //    })
                                        //    minimap.addMarkers(properties, { hide: false, opacity: "1", usePropertyHeight: true, mixBlendMode: "multiply" });
                                        //});
                                    });
                                },
                                mouseout: (p) => {
                                    p.schema.method.clearSelection(p);
                                }
                            }
                        }
                    },
                    "text/sentence": {
                        format: "decorate",
                        className: "sentence",
                        exportText: false,
                        labelRenderer: function (prop) {
                            return "sentence " + (prop.value || 0);
                        },
                        data: {
                            labels: [],
                            minimap: null
                        },
                        method: {
                            clearSelection: (p) => {
                                if (p.svg) {
                                    p.svg.remove();
                                }
                                if (!!p.schema.data.labels) {
                                    console.log("text/sentence: !!p.schema.data.minimap");
                                    p.schema.data.labels.forEach(x => x.label.remove());
                                    p.schema.data.labels = [];
                                }
                                if (!!p.schema.data.minimap) {
                                    console.log("text/sentence: !!p.schema.data.minimap");
                                    p.schema.data.minimap.remove();
                                }
                            }
                        },
                        event: {
                            input: {
                                caretMoved: function (data) {

                                }
                            },
                            keyboard: {
                                "control-L": (p) => {
                                    const { schema } = p;
                                    schema.spotlight = !schema.spotlight;
                                    _this.spotlightSentence(p);
                                }
                            },
                            monitor: {
                                mouseover: (p) => {
                                    p.schema.method.clearSelection(p);
                                    require(["libs/randomColor"], function (randomColor) {
                                        const editor = p.editor;
                                        var schema = p.schema;
                                        var sentences = editor.data.properties.filter(x => x.type == "text/sentence");
                                        sentences.sort((a, b) => a.startIndex() > b.startIndex() ? 1 : -1);
                                        const colours = randomColor({
                                            count: sentences.length,
                                            seed: "orange",
                                            luminosity: 'bright',
                                            format: 'rgb',
                                            hue: 'random'
                                        });
                                        const sentenceIndex = sentences.indexOf(p);
                                        _this.drawClippedRectangle(p, { stroke: colours[sentenceIndex], strokeWidth: 3 });
                                        const items = sentences.map((p, i) => {
                                            return {
                                                text: i + 1,
                                                colour: colours[i],
                                                property: p
                                            }
                                        });
                                        var labels = _this.generateLabels(items);
                                        schema.data.labels = labels;
                                        labels.forEach(item => item.property.startNode.appendChild(item.label));
                                        require(["parts/minimap"], function (Minimap) {
                                            var minimap = schema.data.minimap = new Minimap({ editor });
                                            minimap.createBar({ backgroundColor: "none" });
                                            const properties = sentences.map((s, i) => {
                                                return { ...s, colour: colours[i] };
                                            })
                                            minimap.addMarkers(properties, { hide: false, opacity: "1", usePropertyHeight: true, mixBlendMode: "multiply" });
                                            const caret = editor.getCaret();
                                            const cursor = caret.left || caret.right;
                                            minimap.setArrowAt(cursor);
                                        });
                                    });
                                },
                                mouseout: (p) => {
                                    console.log("text/sentence: mouseout");
                                    p.schema.method.clearSelection(p);
                                }
                            }
                        }
                    },
                    "syntax/part-of-speech": {
                        format: "decorate",
                        className: "pos",
                        attributes: {
                            "person": {
                                renderer: function (prop) {
                                    return "person [" + (prop.attributes["person"] || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                                },
                                selector: function (prop, process) {
                                    var value = prompt("person?", prop.attributes["person"]);
                                    process(value);
                                }
                            },
                            "lemma": {
                                renderer: function (prop) {
                                    return "lemma [" + (prop.attributes["lemma"] || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                                },
                                selector: function (prop, process) {
                                    var value = prompt("lemma?", prop.attributes["lemma"]);
                                    process(value);
                                }
                            },
                            "token-id": {
                                renderer: function (prop) {
                                    return "token-id [" + (prop.attributes["token-id"] || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                                },
                                selector: function (prop, process) {
                                    var value = prompt("token-id?", prop.attributes["token-id"]);
                                    process(value);
                                }
                            },
                            "lang": {
                                renderer: function (prop) {
                                    return "lang [" + (prop.attributes["lang"] || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                                },
                                selector: function (prop, process) {
                                    var lang = prompt("lang?", prop.attributes["lang"]);
                                    process(lang);
                                }
                            }
                        },
                    },
                    "trait": {
                        format: "decorate",
                        className: "",
                        //format: "overlay",
                        //className: "trait",
                        shortcut: "t",
                        labelRenderer: function (prop) {
                            return "<span class='output-trait'>trait<span>";
                        },
                        render: {
                            options: {
                                colour: "gray",
                                opacity: 0.5,
                                offsetY: 2
                            },
                            init: (p) => {
                                p.schema.render.draw(p);
                            },
                            update: (p) => {
                                p.schema.render.draw(p);
                            },
                            batchUpdate: (data) => {
                                const { editor, properties } = data;
                                const fragment = document.createDocumentFragment();
                                const { container } = editor;
                                const containerRect = container.getBoundingClientRect();
                                const containerWidth = containerRect.width;
                                properties.forEach(p => {
                                    const { schema } = p;
                                    const { options } = schema.render;
                                    const svg = Helper.drawUnderline(p, { containerWidth, stroke: options.colour, strokeOpacity: options.opacity, offsetY: options.offsetY });
                                    fragment.appendChild(svg);
                                });
                                container.appendChild(fragment);
                            },
                            draw: (p) => {
                                const { schema, editor } = p;
                                const { options } = schema.render;
                                const { container } = editor;
                                const containerRect = container.getBoundingClientRect();
                                const containerWidth = containerRect.width;
                                const svg = Helper.drawUnderline(p, { containerWidth, stroke: schema.render.options.colour, strokeOpacity: options.opacity, offsetY: options.offsetY });
                                container.appendChild(svg);
                            }
                        },
                        event: {
                            keyboard: {
                                "control-X": (p) => {
                                    require(["knockout/speedy-viewer", "jquery-ui"], function () {
                                        var cache = {};

                                        $.get("/Static/Templates/Agent/sentences-panel.html?v=29", function (html) {
                                            var node = newElement("DIV", {
                                                style: {
                                                    position: "absolute",
                                                    top: "50px",
                                                    right: "20px",
                                                    width: "500px",
                                                    height: "800px",
                                                    maxHeight: "600px",
                                                    padding: "10px",
                                                    zIndex: z++,
                                                },
                                                classList: ["text-window"],
                                                innerHTML: html
                                            });
                                            var Model = (function () {
                                                function Model(cons) {
                                                    this.list = {
                                                        sections: ko.observableArray([]),
                                                        sentiment: [null, "Positive", "Negative"],
                                                        sortOptions: [{ Text: "By name", Value: "ByName" }, { Text: "By date added", Value: "ByDateAdded" }],
                                                        directions: ["Ascending", "Descending"],
                                                        pages: ko.observableArray([1]),
                                                        pageRows: [5, 10, 20]
                                                    };
                                                    this.filter = {
                                                        agentGuid: ko.observable(cons.filter.agentGuid),
                                                        traitGuid: ko.observable(cons.filter.traitGuid),
                                                        sectionGuid: ko.observable(),
                                                        page: ko.observable(),
                                                        sentiment: ko.observable(),
                                                        order: ko.observable("ByName"),
                                                        direction: ko.observable("Ascending"),
                                                        pageRows: ko.observable(5)
                                                    };
                                                    this.cache = {};
                                                    this.count = ko.observable();
                                                    this.page = ko.observable(1);
                                                    this.maxPage = ko.observable(1);
                                                    this.results = ko.observableArray([]);
                                                    this.setLists();
                                                }
                                                Model.prototype.closeClicked = function () {
                                                    node.remove();
                                                };
                                                Model.prototype.setPages = function (page, maxPage) {
                                                    var pages = [];
                                                    for (var i = 1; i <= maxPage; i++) {
                                                        pages.push(i);
                                                    }
                                                    this.list.pages(pages);
                                                    this.filter.page(page);
                                                    this.maxPage(maxPage);
                                                };
                                                Model.prototype.previousPageClicked = function () {
                                                    var page = this.filter.page();
                                                    if (page <= 1) {
                                                        return;
                                                    }
                                                    this.filter.page(page - 1);
                                                    this.searchClicked();
                                                };
                                                Model.prototype.nextPageClicked = function () {
                                                    var page = this.filter.page();
                                                    if (page >= this.maxPage()) {
                                                        return;
                                                    }
                                                    this.filter.page(page + 1);
                                                    this.searchClicked();
                                                };
                                                Model.prototype.textSelected = function (item) {
                                                    var guid = item.Text.Guid;
                                                    _this.loadTextWindow(guid, document.body);
                                                };
                                                Model.prototype.setLists = function () {
                                                    var _this = this;
                                                    $.get("/Admin/Agent/SearchModalLists", (response) => {
                                                        _this.list.sections(response.Data.Sections);
                                                    });
                                                };
                                                Model.prototype.clearClicked = function () {
                                                    this.results([]);
                                                };
                                                Model.prototype.searchClicked = function () {
                                                    var _this = this;
                                                    var filter = ko.toJS(this.filter);
                                                    var key = JSON.stringify(filter);
                                                    if (cache[key]) {
                                                        var data = JSON.parse(cache[key]);
                                                        this.results(data.Results);
                                                        this.count(data.Count);
                                                        this.setPages(data.Page, data.MaxPage);
                                                        return;
                                                    }
                                                    $.get("/Admin/Text/TraitSentences", filter, function (response) {
                                                        console.log({ response });
                                                        if (!response.Success) {
                                                            return;
                                                        }
                                                        cache[key] = JSON.stringify(response.Data);
                                                        _this.results(response.Data.Results);
                                                        _this.count(response.Data.Count);
                                                        _this.setPages(response.Data.Page, response.Data.MaxPage);
                                                    });
                                                };
                                                Model.prototype.applyBindings = function (node) {
                                                    ko.applyBindings(this, node);
                                                };
                                                return Model;
                                            })();
                                            var model = new Model({
                                                filter: {
                                                    traitGuid: p.value,
                                                }
                                            });
                                            model.searchClicked();
                                            model.applyBindings(node);
                                            document.body.appendChild(node);
                                            $(node).draggable();
                                        });
                                    });
                                },
                            }
                        },
                        propertyValueSelector: function (prop, process) {
                            require(["modals/search-traits", "jquery-ui"], function (TraitModal) {
                                $.get("/Static/Templates/Trait/search-panel.html?v=2", function (html) {
                                    var container = div({
                                        classList: ["text-window"],
                                        style: {
                                            position: "absolute",
                                            zIndex: 31,
                                            top: "200px",
                                            right: "100px",
                                            width: "1000px",
                                            height: "400px"
                                        }
                                    });
                                    var modal = new TraitModal({
                                        popup: container,
                                        currentTab: "quickAdd",
                                        tabMode: "quickAdd",
                                        tab: {
                                            search: {
                                                filter: {
                                                    Guid: prop.value
                                                }
                                            },
                                            quickAdd: {
                                                model: {
                                                    Entity: {
                                                        Name: prop.text ? prop.text : null
                                                    }
                                                }
                                            }
                                        },
                                        handler: {
                                            inlineAgentSelector: _.createInlineAgentSelector(),
                                            onSelected: function (guid) {
                                                process(guid);
                                                container.remove();
                                            },
                                            closeClicked: function () {
                                                container.remove();
                                            }
                                        }
                                    });
                                    var node = applyBindings(html, modal);
                                    container.appendChild(node);
                                    document.body.appendChild(container);
                                    $(container).draggable();
                                });
                            });
                        },
                    },
                    "section": {
                        format: "decorate",
                        className: "section"
                    },
                    "claim": {
                        format: "decorate",
                        className: "",
                        //format: "overlay",
                        //className: "claim",
                        labelRenderer: (p) => {
                            return "<span class='output-claim'>claim<span>";
                        },
                        render: {
                            options: {
                                stroke: "blue",
                                opacity: 0.3,
                                offsetY: 2
                            },
                            batchUpdate: (data) => {
                                const { editor, properties } = data;
                                const fragment = document.createDocumentFragment();
                                const { container } = editor;
                                const containerRect = container.getBoundingClientRect();
                                const containerWidth = containerRect.width;
                                properties.forEach(p => {
                                    const { schema } = p;
                                    const { options } = schema.render;
                                    const svg = Helper.drawUnderline(p, { containerWidth, stroke: options.colour, strokeOpacity: options.opacity, offsetY: options.offsetY });
                                    fragment.appendChild(svg);
                                });
                                editor.container.appendChild(fragment);
                            },
                            destroy: (p) => {
                                if (p.svg) {
                                    p.svg.remove();
                                }
                            }
                        },
                        propertyValueSelector: function (prop, process) {
                            require(["modals/search-claims"], function (ClaimModal) {
                                $.get("/Static/Templates/Claim/search-panel.html?v=1", function (html) {
                                    var selector = _this.createInlineAgentSelector();
                                    var container = div({
                                        classList: ["text-window"],
                                        style: {
                                            position: "absolute",
                                            zIndex: 31,
                                            top: "100px",
                                            right: "20px",
                                            width: "800px",
                                            maxHeight: "800px"
                                        }
                                    });
                                    var modal = new ClaimModal({
                                        popup: container,
                                        currentTab: "quickAdd",
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
                                            }
                                        },
                                        handler: {
                                            inlineAgentSelector: selector,
                                            onSelected: function (guid) {
                                                process(guid);
                                                win.remove();
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
                                    const handle = $(node).find("[data-role='handle']")[0];
                                    var win = WindowManager.addWindow({
                                        type: "claim-panel",
                                        node: container,
                                        draggable: {
                                            node: handle
                                        }
                                    });
                                    $(container).draggable();
                                });
                            });
                        },
                    },
                    dataPoint: {
                        format: "overlay",
                        className: "dataPoint",
                        labelRenderer: function (prop) {
                            return "<span class='output-dataPoint'>data point<span>";
                        },
                        propertyValueSelector: function (prop, process) {
                            require(["modals/search-data-points"], function (DataPointModal) {
                                openModal("/Static/Templates/DataPoint/SearchModal.html", {
                                    name: "Data Points",
                                    ajaxContentAdded: function (element) {
                                        var modal = new DataPointModal({
                                            popup: element,
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
                                                }
                                            },
                                            handler: {
                                                onSelected: function (guid) {
                                                    process(guid);
                                                    closeModal(element);
                                                }
                                            }
                                        });
                                        ko.applyBindings(modal, element);
                                    }
                                });
                            });
                        }
                    },
                    "source_of_intertext": {
                        format: "overlay",
                        className: "source_of_intertext_overlay",
                        labelRenderer: function (prop) {
                            return "intertext (source)";
                        },
                        propertyValueSelector: function (prop) {
                            require(["parts/intertext-processor"], function (IntertextProcessor) {
                                openModal("/Static/Templates/Text/intertext-modal.html", {
                                    name: "Intertext",
                                    ajaxContentAdded: function (element) {
                                        var data = _.editor.unbind();
                                        var mode = (!!prop.value ? "edit" : "add");
                                        var sourceProperties = (mode == "add" ? [prop] : _.editor.data.properties.filter(property => !property.isDeleted && property.type == "source_of_intertext"));
                                        var modal = new IntertextProcessor({
                                            popup: element,
                                            mode: mode,
                                            section: _.model.Section(),
                                            name: _.model.Name(),
                                            text: data.text,
                                            sourceProperties: sourceProperties.map(property => property.toNode()),
                                            handler: {
                                                onIntertextRelatedToTarget: function (data) {
                                                    closeModal(element);
                                                    _.editor.addProperties(data.properties);
                                                },
                                                onCancel: function () {
                                                    closeModal(element);
                                                }
                                            }
                                        });
                                    }
                                });
                            });
                        }
                    },
                    "target_of_intertext": {
                        format: "overlay",
                        className: "source_of_intertext_overlay",
                        labelRenderer: function (prop) {
                            return "intertext (target)";
                        },
                        propertyValueSelector: function (prop, process) {
                            //require(["parts/intertext-processor"], function (IntertextProcessor) {
                            //    openModal("/Static/Templates/Text/intertext-modal.html", {
                            //        name: "Intertext",
                            //        ajaxContentAdded: function (element) {
                            //            var data = _.editor.unbind();
                            //            var modal = new IntertextProcessor({
                            //                popup: element,
                            //                section: _.model.Section(),
                            //                name: _.model.Name(),
                            //                text: data.text,
                            //                sourceProperty: prop.toNode(),
                            //                handler: {
                            //                    onIntertextRelatedToTarget: function (data) {
                            //                        closeModal(element);
                            //                        _.editor.addProperties(data.properties);
                            //                    },
                            //                    onCancel: function () {
                            //                        closeModal(element);
                            //                    }
                            //                }
                            //            });
                            //        }
                            //    });
                            //});
                        }
                    },
                    marginalia: {
                        format: "overlay",
                        zeroPoint: {
                            className: "marginalia",
                        },
                        labelRenderer: function (prop) {
                            return "<span class='output-text'>marginalia<span>";
                        },
                        animation: {
                            init: function (p) {
                                const top = p.startNode.offsetTop;
                                const width = p.editor.container.offsetWidth;
                                const halfway = width / 2;
                                const x = p.startNode.offsetLeft;
                                const isLeft = x <= halfway;
                                const isRight = !isLeft;
                                const container = div({
                                    style: {
                                        position: "absolute",
                                        right: {
                                            condition: isRight,
                                            value: "5px"
                                        },
                                        left: {
                                            condition: isLeft,
                                            value: "5px"
                                        },
                                        top: top + "px"
                                    },
                                    handler: {
                                        click: function (e) {
                                            var node = e.currentTarget;
                                            var prop = node.speedy.standoffProperty;
                                            var rect = node.getBoundingClientRect();
                                            var options = {
                                                top: (rect.y - 200) + "px"
                                            };
                                            if (node.speedy.position == "left") {
                                                options.left = "20px";
                                            } else {
                                                options.right = "20px";
                                            }
                                            _this.loadTextWindow(prop.value, document.body, options);
                                        }
                                    }
                                });
                                container.speedy = {
                                    standoffProperty: p,
                                    position: isLeft ? "left" : "right"
                                };
                                const src = isLeft ? "/images/icons/manicula-right.png" : "/images/icons/manicula-left.png";
                                const icon = img({
                                    attribute: {
                                        src: src
                                    },
                                    style: {
                                        width: "60px"
                                    }
                                });
                                container.appendChild(icon);
                                p.editor.container.appendChild(container);
                            }
                        },
                        propertyValueSelector: function (prop, process) {
                            var TextModal = require("modals/search-texts");
                            openModal("/Static/Templates/Text/SearchModal.html", {
                                name: "Texts",
                                ajaxContentAdded: function (element) {
                                    var modal = new TextModal({
                                        popup: element,

                                        tab: {
                                            search: {
                                                filter: {
                                                    Guid: prop.value
                                                }
                                            }
                                        },
                                        handler: {
                                            onSelected: function (guid) {
                                                process(guid);
                                                closeModal(element);
                                            },
                                            onCancelled: function () {
                                                closeModal(element);
                                            }
                                        }
                                    });
                                    ko.applyBindings(modal, element);
                                }
                            });
                        }
                    },
                    text: {
                        format: "overlay",
                        //shortcut: "t",
                        className: "text",
                        labelRenderer: function (prop) {
                            return prop.isZeroPoint ? "<span class='output-text'>footnote<span>" : "<span class='output-text'>text<span>";
                        },
                        attributes: {
                            position: {
                                renderer: function (prop) {
                                    return "position [" + (prop.attributes.position || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                                },
                                selector: function (prop, process) {
                                    var position = prompt("Position?", prop.attributes.position);
                                    process(position);
                                }
                            }
                        },
                        zeroPoint: {
                            className: "zero-text",
                            offerConversion: function (prop) {
                                return !prop.isZeroPoint;
                            },
                            selector: function (prop, process) {
                                var label = prompt("Label", prop.text);
                                process(label);
                            }
                        },
                        event: {
                            annotation: {
                                "control-click": (p) => {
                                    //p.schema.load(p);
                                    _this.loadTextWindow(p.value, document.body);
                                }
                            }
                        },
                        zIndex: z++,
                        right: 50,
                        load: function (prop) {
                            _this.loadTextWindow(prop.value);
                        },
                        propertyValueSelector: function (prop, process) {
                            var TextModal = require("modals/search-texts");
                            openModal("/Static/Templates/Text/SearchModal.html", {
                                name: "Texts",
                                ajaxContentAdded: function (element) {
                                    var modal = new TextModal({
                                        popup: element,

                                        tab: {
                                            search: {
                                                filter: {
                                                    Guid: prop.value
                                                }
                                            }
                                        },
                                        handler: {
                                            onSelected: function (guid) {
                                                process(guid);
                                                closeModal(element);
                                            },
                                            onCancelled: function () {
                                                closeModal(element);
                                            }
                                        }
                                    });
                                    ko.applyBindings(modal, element);
                                }
                            });
                        }
                    },
                    metaRelation: {
                        format: "decorate",
                        className: "",
                        //format: "overlay",
                        //className: "metaRelation",
                        labelRenderer: function (prop) {
                            return "<span class='output-metaRelation'>meta relation<span>";
                        },
                        render: {
                            options: {
                                stroke: "orange",
                                opacity: 0.3,
                                offsetY: 2
                            },
                            init: (p) => {
                                p.schema.render.draw(p);
                            },
                            update: (p) => {
                                p.schema.render.draw(p);
                            },
                            batchUpdate: (data) => {
                                const { editor, properties } = data;
                                const fragment = document.createDocumentFragment();
                                const { container } = editor;
                                const containerRect = container.getBoundingClientRect();
                                const containerWidth = containerRect.width;
                                properties.forEach(p => {
                                    const { schema } = p;
                                    const { options } = schema.render;
                                    const svg = Helper.drawUnderline(p, { containerWidth, stroke: options.colour, strokeOpacity: options.opacity, offsetY: options.offsetY });
                                    fragment.appendChild(svg);
                                });
                                editor.container.appendChild(fragment);
                            },
                            draw: (p) => {
                                const { editor, schema } = p;
                                const { options } = schema.render;
                                const svg = Helper.drawUnderline(p, { stroke: options.colour, strokeOpacity: options.opacity, offsetY: options.offsetY });
                                editor.container.appendChild(svg);
                            }
                        },
                        propertyValueSelector: function (prop, process) {
                            require(["modals/search-meta-relations"], function (MetaRelationModal) {
                                openModal("/Static/Templates/MetaRelation/SearchModal.html", {
                                    name: "Meta Relations",
                                    ajaxContentAdded: function (element) {
                                        var modal = new MetaRelationModal({
                                            popup: element,
                                            tab: {
                                                search: {
                                                    filter: {
                                                        Guid: prop.value
                                                    }
                                                }
                                            },
                                            handler: {
                                                onSelected: function (guid) {
                                                    process(guid);
                                                    closeModal(element);
                                                }
                                            }
                                        });
                                        ko.applyBindings(modal, element);
                                    }
                                });
                            });
                        }
                    },
                    time: {
                        format: "decorate",
                        className: "",
                        //format: "overlay",
                        //className: "time",
                        labelRenderer: function (prop) {
                            return "<span class='output-time'>time<span>";
                        },
                        render: {
                            options: {
                                stroke: "cyan",
                                opacity: 0.3,
                                offsetY: 4
                            },
                            batchUpdate: (data) => {
                                const { editor, properties } = data;
                                const fragment = document.createDocumentFragment();
                                const { container } = editor;
                                const containerRect = container.getBoundingClientRect();
                                const containerWidth = containerRect.width;
                                properties.forEach(p => {
                                    const { schema } = p;
                                    const { options } = schema.render;
                                    const svg = Helper.drawUnderline(p, { containerWidth, stroke: options.stroke, strokeOpacity: options.opacity, offsetY: options.offsetY });
                                    fragment.appendChild(svg);
                                });
                                editor.container.appendChild(fragment);
                            },
                            destroy: (p) => {
                                if (p.svg) {
                                    p.svg.remove();
                                }
                            }
                        },
                        propertyValueSelector: function (prop, process) {
                            require(["modals/search-times"], function (TimeModal) {
                                openModal("/Static/Templates/Time/SearchModal.html", {
                                    name: "Time",
                                    ajaxContentAdded: function (element) {
                                        var modal = new TimeModal({
                                            popup: element,
                                            filter: {
                                                Guid: prop.value
                                            },
                                            handler: {
                                                onSelected: function (guid) {
                                                    process(guid);
                                                    closeModal(element);
                                                }
                                            }
                                        });
                                        ko.applyBindings(modal, element);
                                    }
                                });
                            });
                        }
                    },
                    subject: {
                        format: "overlay",
                        className: "subject",
                        labelRenderer: function (prop) {
                            return prop.text ? "<span class='output-subject'>subject<span> (" + prop.text + ")" : "<span class='output-subject'>subject<span>";
                        },
                        propertyValueSelector: function (prop, process) {
                            openModal("/Static/Templates/Agent/SearchModal.html", {
                                name: "Agents",
                                ajaxContentAdded: function (element) {
                                    require(["modals/search-agents"], function (AgentModal) {
                                        var modal = new AgentModal({
                                            popup: element,
                                            tabs: ["search", "recentlyUsed", "quickAdd"],
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
                                                }
                                            },
                                            handler: {
                                                onSelected: function (guid, name) {
                                                    process(guid, name);
                                                    closeModal(element);
                                                }
                                            }
                                        });
                                        ko.applyBindings(modal, element);
                                        modal.start();
                                    });
                                }
                            });
                        }
                    },
                    concept: {
                        format: "overlay",
                        className: "concept",
                        labelRenderer: function (prop) {
                            return "<span class='output-concept'>concept<span>";
                        },
                        propertyValueSelector: function (prop, process) {
                            require(["modals/search-concepts"], function (ConceptModal) {
                                openModal("/Static/Templates/Concept/SearchModal.html", {
                                    name: "Concepts",
                                    ajaxContentAdded: function (element) {
                                        var modal = new ConceptModal({
                                            popup: element,
                                            tab: {
                                                search: {
                                                    filter: {
                                                        Guid: prop.value,
                                                        Name: !prop.value ? prop.text : null
                                                    },
                                                },
                                                quickAdd: {
                                                    model: {
                                                        Entity: {
                                                            Name: prop.text
                                                        }
                                                    }
                                                }
                                            },
                                            handler: {
                                                onSelected: function (guid) {
                                                    process(guid);
                                                    closeModal(element);
                                                }
                                            }
                                        });
                                        ko.applyBindings(modal, element);
                                    }
                                });
                            });
                        }
                    },
                    lexeme: {
                        format: "overlay",
                        shortcut: "l",
                        className: "lexeme",
                        labelRenderer: function (prop) {
                            return "<span class='output-lexeme'>lexeme<span>";
                        },
                        propertyValueSelector: function (prop, process) {
                            require(["modals/search-lexemes"], function (LexemeModal) {
                                openModal("/Static/Templates/Lexeme/SearchModal.html", {
                                    name: "Lexemes",
                                    ajaxContentAdded: function (element) {
                                        var modal = new LexemeModal({
                                            popup: element,
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
                                                            Name: prop.text
                                                        }
                                                    }
                                                }
                                            },
                                            handler: {
                                                onSelected: function (guid) {
                                                    process(guid);
                                                    closeModal(element);
                                                }
                                            }
                                        });
                                        ko.applyBindings(modal, element);
                                        modal.start();
                                    }
                                });
                            });
                        }
                    }
                }
            };
            this.editor = new Editor(configuration);
            this.autocomplete = new Autocomplete({
                editor: this.editor
            });
            this.arrowSelector = new ArrowSelector({ editor: this.editor });
            this.arrowSelector.addHandler("onSelection", (args) => {
                _this.autocomplete.applyToSelection({ start: args.start, end: args.end });
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
                    comment: '<span data-toggle="tooltip" data-original-title="Comment" class="fa fa-comment monitor-button"></span>',
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
                commentManager: configuration.commentManager,
                css: {
                    highlight: "text-highlight"
                },
                updateCurrentRanges: this.editor.updateCurrentRanges.bind(this.editor)
            });
            this.editor.addMonitor(monitorBar);
            // this.editor.addSelector(this.contextMenuActivated);
        };
        TextBlock.prototype.contextMenuActivated = function (params) {
            const { editor, e, selection } = params;
            console.log("contextMenuActivated", params);
            var exists = !!editor.contextMenu;
            var node = exists ? editor.contextMenu : div();
            node.speedy = {
                role: 1,
                stream: 1
            };
            node.range = selection;
            var height = 60;
            var width = 300;
            if (!exists) {
                updateElement(node, {
                    style: {
                        position: "absolute",
                        padding: "10px 10px",
                        backgroundColor: "rgb(128, 128, 128, 0.5)",
                        backdropFilter: "blur(4px)",
                        borderRadius: "3px"
                    }
                });
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
                                _this.fontClicked();
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
                                var p = editor.createZeroPointProperty("intralinear");
                                var type = editor.propertyType.intralinear;
                                type.animation.init(p);
                            },
                            listItemClicked: () => {
                                var item = editor.createBlockProperty2({ type: "list/item" });
                                var list = editor.createParentBlockProperty("list", item);
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
                                var p = editor.createZeroPointProperty("wink");
                                var wink = editor.propertyType.wink;
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
                                editor.clearSelection();
                                editor.mode.contextMenu.active = false;
                                editor.contextMenu.remove();
                                editor.contextMenu = null;
                            },
                            searchTextBlocks: function () {
                                const { text } = node.range;
                                this.close();
                                require(["parts/search-text-blocks"], function (SearchTextBlocks) {
                                    (async () => {
                                        var search = new SearchTextBlocks({
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
                    document.body.appendChild(node);
                    editor.contextMenu = node;
                });
            }
            editor.mode.contextMenu.active = true;
            const top = params.e.pageY - 165;
            // const left = params.e.pageX - 200;
            const firstCharRect = selection.start.getBoundingClientRect();
            const left = params.e.pageX < firstCharRect.x ? params.e.pageX : firstCharRect.x;
            updateElement(node, {
                style: {
                    display: "block",
                    left: left + "px",
                    top: top + "px",
                    zIndex: WindowManager.getNextIndex() + 2
                }
            });
        };
        TextBlock.prototype.setupEventHandlers = function () {
            var _this = this;
            this.model.Name.subscribe(function () {
                _this.nameMode("View");
            });
            this.checkbox.styles.subscribe(function () {
                var value = _this.checkbox.styles();
                _this.checkbox.bold(value);
                _this.checkbox.italics(value);
                _this.checkbox.superscript(value);
                _this.checkbox.subscript(value);
                _this.checkbox.strike(value);
                _this.checkbox.underline(value);
                _this.checkbox.size(value);
                _this.checkbox.highlight(value);
                _this.checkbox.colour(value);
                _this.checkbox.uppercase(value);
            });
            this.checkbox.layout.subscribe(function () {
                var value = _this.checkbox.layout();
                _this.checkbox.hyphen(value);
                _this.checkbox.line(value);
                _this.checkbox.page(value);
                _this.checkbox.paragraph(value);
            });
            this.checkbox.entities.subscribe(function () {
                _this.showHideOverlays();
                //var value = _this.checkbox.entities();
                //_this.checkbox.agent(value);
                //_this.checkbox.claim(value);
                //_this.checkbox.concept(value);
                //_this.checkbox.text(value);
                //_this.checkbox.metaRelation(value);
                //_this.checkbox.time(value);
                //_this.checkbox.dataPoint(value);
                //_this.checkbox.lexeme(value);
                //_this.checkbox.structure(value);
                //_this.checkbox.subject(value);
            });
            this.checkbox.agent.subscribe(function () {
                return _this.showHide("agent");
            });
            this.checkbox.claim.subscribe(function () {
                return _this.showHide("claim");
            });
            this.checkbox.concept.subscribe(function () {
                return _this.showHide("concept");
            });
            this.checkbox.text.subscribe(function () {
                return _this.showHide("text");
            });
            this.checkbox.metaRelation.subscribe(function () {
                return _this.showHide("metaRelation");
            });
            this.checkbox.expansions.subscribe(function () {
                return _this.showHideExpansions();
            });
            this.checkbox.zeroWidths.subscribe(function () {
                return _this.showHideZeroWidths();
            });
            this.checkbox.line.subscribe(function () {
                return _this.toggle("line", "border-bottom", "3px solid #AAA", "unset");
            });
            this.checkbox.paragraph.subscribe(function () {
                return _this.toggle("paragraph", "border-bottom", "3px solid #BBB", "unset");
            });
            this.checkbox.page.subscribe(function () {
                return _this.toggle("page", "border-bottom", "3px solid #CCC", "unset");
            });
            this.checkbox.subject.subscribe(function () {
                return _this.showHide("subject");
            });
            this.checkbox.structure.subscribe(function () {
                return _this.showHide("structure");
            });
            this.checkbox.dataPoint.subscribe(function () {
                return _this.showHide("dataPoint");
            });
            this.checkbox.time.subscribe(function () {
                return _this.showHide("time");
            });
            this.checkbox.highlight.subscribe(function () {
                return _this.showHide("highlight");
            });
            this.checkbox.lexeme.subscribe(function () {
                return _this.showHide("lexeme");
            });
            this.checkbox.hyphen.subscribe(function () {
                return _this.showHide("hyphen");
            });
            this.checkbox.colour.subscribe(function () {

            });
            this.checkbox.size.subscribe(function () {

            });
            this.checkbox.bold.subscribe(function () {
                return _this.toggle("bold", "font-weight", "bold", "unset");
            });
            this.checkbox.uppercase.subscribe(function () {
                return _this.toggle("uppercase", "text-transform", "uppercase", "unset");
            });
            this.checkbox.strike.subscribe(function () {
                return _this.toggle("strike", "text-decoration", "line-through", "unset");
            });
            this.checkbox.italics.subscribe(function () {
                return _this.toggle("italics", "font-style", "italic", "unset");
            });
            this.checkbox.underline.subscribe(function () {
                return _this.toggle("underline", "text-decoration", "underline", "unset");
            });
            this.checkbox.strike.subscribe(function () {
                return _this.toggle("underline", "text-decoration", "underline", "unset");
            });
            this.checkbox.subscript.subscribe(function () {
                _this.toggle("subscript", "vertical-align", "sub", "unset");
                _this.toggle("subscript", "font-size", "0.7rem", "1rem");
                return true;
            });
            this.checkbox.superscript.subscribe(function () {
                _this.toggle("superscript", "vertical-align", "super", "unset");
                _this.toggle("superscript", "font-size", "0.7rem", "1rem");
                return true;
            });
        };
        TextBlock.prototype.loadEntitiesPanel = function (data) {
            //options = options || {};
            var _this = this;
            require(["libs/randomColor", "parts/minimap"], function (randomColor, Minimap) {
                const { editor } = data;
                const { properties } = editor.data;
                var guids = properties
                    .filter(p => p.type == "agent" && p.isDeleted == false && p.value)
                    .map(p => p.value);
                if (!guids.length) {
                    return;
                }
                var params = {
                    Guids: guids
                };
                $.post("/Admin/Agent/QuickSearchJson", params, function (response) {
                    console.log({ response });
                    if (!response.Success) {
                        return;
                    }
                    var colours = randomColor({
                        count: response.Data.length,
                        seed: "orange",
                        luminosity: 'bright',
                        format: 'rgb',
                        hue: 'random'
                    });
                    var properties = editor.data.properties.filter(p => p.type == "agent" && p.isDeleted == false);
                    var model = {
                        showOnlySelectedRows: ko.observable(false),
                        sort: ko.observable("entity"),
                        order: ko.observable("asc"),
                        total: 0,
                        items: ko.observableArray(response.Data.map((x, i) => {
                            return {
                                colour: colours[i],
                                selected: ko.observable(false),
                                highlighted: ko.observable(false),
                                initial: (x.Name || "").substr(0, 1),
                                entity: x,
                                text: properties.filter(p => p.value == x.Guid)[0].getText(),
                                count: properties.filter(p => p.value == x.Guid).length
                            };
                        })),
                        toggleOrder: function () {
                            this.order(this.order() == "asc" ? "desc" : "asc");
                        },
                        percentage: function (item) {
                            var percent = Math.ceil((item.count / this.total) * 100);
                            return percent + "%";
                        },
                        sortItems: function () {
                            var sort = this.sort(), order = this.order(), asc = order == "asc";
                            this.items.sort((a, b) => {
                                if (sort == "text") {
                                    if (asc) {
                                        return a.text > b.text ? 1 : a.text < b.text ? -1 : 0;
                                    } else {
                                        return a.text < b.text ? 1 : a.text > b.text ? -1 : 0;
                                    }
                                } else if (sort == "entity") {
                                    if (asc) {
                                        return a.entity.Name > b.entity.Name ? 1 : a.entity.Name < b.entity.Name ? -1 : 0;
                                    } else {
                                        return a.entity.Name < b.entity.Name ? 1 : a.entity.Name > b.entity.Name ? -1 : 0;
                                    }
                                } else if (sort == "total") {
                                    if (asc) {
                                        return a.count > b.count ? 1 : a.count < b.count ? -1 : 0;
                                    } else {
                                        return a.count < b.count ? 1 : a.count > b.count ? -1 : 0;
                                    }
                                } else {
                                    if (asc) {
                                        return a.entity.Name > b.entity.Name ? 1 : a.entity.Name < b.entity.Name ? -1 : 0;
                                    } else {
                                        return a.entity.Name < b.entity.Name ? 1 : a.entity.Name > b.entity.Name ? -1 : 0;
                                    }
                                }
                            });
                        },
                        headingColour: function (column) {
                            return this.sort() == column ? "red" : "#000";
                        },
                        arrow: function (column) {
                            if (this.sort() != column) {
                                return "";
                            }
                            return this.order() == "asc" ? "↑" : "↓";
                        },
                        sortEntityClicked: function () {
                            this.sortClicked("entity");
                        },
                        sortTextClicked: function () {
                            this.sortClicked("text");
                        },
                        sortTotalClicked: function () {
                            this.sortClicked("total");
                        },
                        sortClicked: function (field) {
                            var sort = this.sort();
                            if (sort == field) {
                                this.toggleOrder();
                            } else {
                                this.sort(field);
                                this.order("asc");
                            }
                            this.sortItems();
                        },
                        closeClicked: function () {
                            this.unhighlightAll();
                            container.remove();
                            minimap.remove();
                        },
                        minimizeClicked: function () {
                            win.minimize({ name: "entity panel" });
                        },
                        clearClicked: function () {
                            this.unhighlightAll();
                            this.showOnlySelectedRows(false);
                            //minimap.remove();
                        },
                        unhighlightAll: function () {
                            this.items().forEach(x => {
                                x.selected(true);
                                this.highlightClicked(x);
                            });
                        },
                        publishClicked: function (item) {
                            var agent = editor.createProperty("agent", item.entity.Guid);
                            agent.text = item.Text;
                        },
                        toggleGlassModeClicked: function () {
                            this.glass = !this.glass;
                            if (this.glass) {
                                container.classList.add("glass-window");

                            } else {
                                container.classList.remove("glass-window");
                            }
                        },
                        itemEnter: function (item) {
                            item.highlighted(true);
                            var mentions = editor.data.properties.filter(x => x.value == item.entity.Guid);
                            mentions.forEach(p => p.highlight());
                            this.toggleMarkers(true, item.entity.Guid, item.selected());
                        },
                        itemLeave: function (item) {
                            item.highlighted(false);
                            var mentions = editor.data.properties.filter(x => x.value == item.entity.Guid);
                            mentions.forEach(p => p.unhighlight());
                            this.toggleMarkers(false || item.selected(), item.entity.Guid, false);
                        },
                        toggleMarkers: function (highlight, entityGuid, glow) {
                            if (highlight) {
                                minimap.showMarkers(entityGuid, glow)
                            } else {
                                minimap.hideMarkers(entityGuid);
                            }
                        },
                        toggleShowOnlySelectedRows: function () {
                            const show = this.showOnlySelectedRows();
                            this.showOnlySelectedRows(!show);
                        },
                        drawCircles: function (item, properties) {
                            var highlight = item.selected();
                            properties.forEach(p => {
                                p.unhighlight();
                                var circles = p.startNode.getElementsByClassName("letter-circle");
                                var circle;
                                if (!circles.length) {
                                    circle = newElement("DIV", {
                                        style: {
                                            position: "absolute",
                                            display: "inline",
                                            top: "-10px",
                                            left: "-3px",
                                            backgroundColor: item.colour
                                        },
                                        classList: ["letter-circle"],
                                        innerHTML: item.initial,
                                        attribute: {
                                            alt: item.entity.Name,
                                            title: item.entity.Name
                                        }
                                    });
                                    circle.speedy = {
                                        role: 3,
                                        stream: 1
                                    };
                                    p.startNode.appendChild(circle);
                                } else {
                                    circle = circles[0];
                                }
                                if (highlight) {
                                    circle.style.display = "inline";
                                } else {
                                    circle.remove();
                                }
                                this.toggleMarkers(highlight, item.entity.Guid);
                            });
                        },
                        highlightClicked: function (item) {
                            var highlight = !item.selected();
                            item.selected(highlight);
                            var mentions = editor.data.properties.filter(x => x.value == item.entity.Guid);
                            this.drawCircles(item, mentions);
                        }
                    };
                    var minimap = new Minimap({ editor: data.editor });
                    minimap.createBar();
                    model.items().forEach(item => {
                        var props = properties.filter(x => x.value == item.entity.Guid);
                        minimap.addMarkers(props, { hide: true, colour: item.colour, opacity: 0.5 });
                    });
                    model.total = model.items().map(x => x.count).reduce((total, num) => total + num);
                    var rect = editor.container.getBoundingClientRect();
                    var x = rect.x + rect.width + 20;
                    var y = rect.y - 65;
                    var container = newElement("DIV", {
                        style: {
                            position: "absolute",
                            top: y + "px",
                            left: x + "px",
                            width: "450px",
                            padding: "20px 20px",
                            maxHeight: "760px",
                            paddingBottom: "20px",
                            fontSize: "0.8rem",
                            zIndex: 20
                        },
                        classList: ["text-window"]
                    });
                    $.get("/Static/Templates/Agent/text-entities-panel.html?v=8", function (html) {
                        const node = applyBindings(html, model);
                        container.appendChild(node);
                        var win = WindowManager.addWindow({
                            type: "inline-entities",
                            loader: {
                                params: {
                                    textGuid: _this.model.Guid,
                                    guids: guids
                                }
                            },
                            node: container
                        });
                        win.addNodeToLayer(container);
                        $(container).draggable({
                            scroll: false
                        });
                    });
                });
            });
        };
        TextBlock.prototype.loadTimeline = function (options) {
            options = options || {};
            options.name = options.name || "?";
            require(["knockout/speedy-viewer", "jquery-ui"], function (rr) {
                $.get("/Static/Templates/Agent/timeline-panel.html?v=22", function (html) {
                    $.get("/Admin/Agent/Timeline", { id: options.guid }, function (response) {
                        console.log({ response });
                        if (!response.Success) {
                            return;
                        }
                        var container = div({
                            classList: ["text-window"],
                            style: {
                                position: "absolute",
                                top: options.top || "100px",
                                width: options.width || "800px",
                                maxHeight: "700px",
                                fontSize: "0.8rem",
                                padding: "20px 20px"
                            }
                        });
                        if (options.left) {
                            container.style.left = options.left;
                        } else {
                            container.style.right = options.right || "20px";
                        }
                        var content = applyBindings(html, {
                            items: response.Data,
                            toggleGlassModeClicked: function () {
                                this.glass = !this.glass;
                                if (this.glass) {
                                    container.classList.add("glass-window");

                                } else {
                                    container.classList.remove("glass-window");
                                }
                            },
                            agent: {
                                guid: options.guid,
                                name: options.name
                            },
                            textSelected: function (item) {
                                _this.loadTextWindow(item.TextGuid, document.body);
                            },
                            closeClicked: function () {
                                container.remove();
                            },
                            minimizeClicked: () => win.minimize({ name: "timeline :: " + options.name }),
                            diagram: function (item) {

                            }
                        });
                        container.appendChild(content);
                        //const layer = options.layer || document.body;
                        //layer.appendChild(container);
                        $(container).draggable();
                        $(container).resizable();
                        $(container).niceScroll({ cursorcolor: "#333", horizrailenabled: false });
                        var win = WindowManager.addWindow({
                            type: "timeline",
                            loader: {
                                params: {
                                    guid: options.guid
                                }
                            },
                            node: container,
                            zIndex: options.zIndex
                        });
                        win.addNodeToLayer(container);
                    });
                });
            });
        };
        TextBlock.prototype.showHideOverlays = function () {
            var _this = this;
            var types = this.editor.data.properties
                .filter(x => x.schema.format == "overlay")
                .map(x => x.type)
                .filter(onlyUnique);
            var value = this.checkbox.entities();
            types.forEach(t => {
                var css = _this.editor.propertyType[t].className;
                changeCss("." + css, "display", value ? "inline" : "none");
            });
        };
        TextBlock.prototype.loadMarginaliaText = function (options) {
            var _this = this;
            options = options || {};
            options = {
                node: options.layer || options.node || document.body,
                top: options.top || "100px",
                left: options.left || "600px",
                width: options.width || "auto"
            };
            var guid = options.guid;
            var TextModal = require("modals/search-texts");
            $.get("/Admin/Text/LoadEditorJson", { id: guid }, function (response) {
                console.log({ response });
                var data = _this.decompress(response.Data);
                options.name = response.Data.Name;
                var container = div({
                    style: {
                        position: "absolute",
                        fontSize: "2rem",
                        lineHeight: "1.5rem",
                        minWidth: "200px",
                        color: "red",
                        top: options.top,
                        left: options.left,
                        width: options.width,
                        padding: "20px",
                        border: "2px dotted #ccc"
                    }
                });
                var client = new TextBlock({
                    tabsVisible: false,
                    monitorVisible: false,
                    handler: {
                        onSelected: function (id) {
                            win.loader.params.guid = id;
                        },
                        onCancelled: function () {
                            container.remove();
                        },
                        closeClicked: function () {
                            container.remove();
                        },
                        minimizeClicked: function () {
                            win.minimize({ name: options.name });
                        },
                        maximiseClicked: function () {

                        }
                    }
                });
                var editor = div({
                    style: {
                        backgroundColor: "transparent",

                    },
                    attribute: {
                        contenteditable: true,
                        spellcheck: false
                    }
                });
                var handle = div({
                    style: {
                        position: "absolute",
                        bottom: "-50px",
                        right: "-15px",
                        color: "#fff"
                    },
                    innerHTML: `<i style="font-size: 1.5rem;" class="fas fa-hand-pointer"></i>`
                });
                var save = div({
                    style: {
                        position: "absolute",
                        bottom: "-50px",
                        right: "-30px",
                        color: "#fff"
                    },
                    children: [
                        applyBindings(`<span data-bind="click: $data.saveClicked"><i style="font-size: 1.5rem;" class="fas fa-saver"></i></span>`, {
                            saveClicked: function () {
                                client.saveClicked();
                            }
                        })
                    ]
                });
                container.appendChild(handle);
                container.appendChild(save);
                container.appendChild(editor);
                options.node.appendChild(container);
                client.bind({
                    guid: guid,
                    name: options.name || data.Name
                });
                client.setupEditor({ container: editor });
                if (data.Sections) {
                    client.model.sections(data.Sections.filter(x => !!x.Target).map(x => x.Target.Name));
                }
                client.editor.bind({
                    text: data.Text,
                    properties: data.Properties
                });
                client.showHideExpansions();
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
                require(["jquery-ui"], () => {
                    $(container).draggable({ handle: handle });
                });
                var win = WindowManager.addWindow({
                    type: "marginalia",
                    loader: {
                        params: {
                            guid: options.guid
                        }
                    },
                    node: container,
                    zIndex: options.zIndex
                });
            });
        };
        TextBlock.prototype.loadMonitorPanel = function (data) {
            const getMiddle = (left, right, offset) => {
                if (!left && !right) {
                    return null;
                }
                if (!right) {
                    return left.offsetLeft + left.offsetWidth - offset;
                }
                return right.offsetLeft - offset;
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
                cu_y = target.offsetTop + target.offsetHeight - 8;
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
        TextBlock.prototype.createMarginaliaText = function (options) {
            var _this = this;
            options = options || {};
            options = {
                node: options.node || document.body,
                top: options.top || "100px",
                left: options.left || "600px",
                width: options.width || "auto"
            };
            var TextModal = require("modals/search-texts");
            var container = div({
                style: {
                    position: "absolute",
                    fontSize: "2rem",
                    lineHeight: "1.5rem",
                    minWidth: "200px",
                    color: "red",
                    top: options.top,
                    left: options.left,
                    width: options.width,
                    padding: "20px",
                    border: "2px dotted #ccc"
                }
            });
            var client = new TextBlock({
                tabsVisible: false,
                monitorVisible: false,
                handler: {
                    onSelected: function (id) {
                        win.loader.params.guid = id;
                    },
                    onCancelled: function () {
                        container.remove();
                    },
                    closeClicked: function () {
                        container.remove();
                    },
                    minimizeClicked: function () {
                        win.minimize({ name: options.name });
                    },
                    maximiseClicked: function () {

                    }
                }
            });
            var editor = div({
                style: {
                    backgroundColor: "transparent",
                },
                attribute: {
                    contenteditable: true,
                    spellcheck: false
                }
            });
            var handle = div({
                style: {
                    position: "absolute",
                    bottom: "-50px",
                    right: "-15px",
                    color: "#fff"
                },
                innerHTML: `<i style="font-size: 1.5rem;" class="fas fa-hand-pointer"></i>`
            });
            var save = div({
                style: {
                    position: "absolute",
                    bottom: "-50px",
                    right: "-30px",
                    color: "#fff"
                },
                children: [
                    applyBindings(`<span data-bind="click: $data.saveClicked"><i style="font-size: 1.5rem;" class="fas fa-saver"></i></span>`, {
                        saveClicked: function () {
                            client.saveClicked();
                        }
                    })
                ]
            });
            container.appendChild(save);
            container.appendChild(handle);
            container.appendChild(editor);
            options.node.appendChild(container);
            client.setupEditor({ container: editor });
            require(["jquery-ui"], () => {
                $(container).draggable({ handle: handle });
            });
            var win = WindowManager.addWindow({
                type: "marginalia",
                loader: {
                    params: {
                        guid: null
                    }
                },
                node: container
            });
            client.model.Name(null);
            client.editor.bind({
                text: "",
                properties: []
            });
        };
        TextBlock.prototype.loadUserBubbles = function (users, client) {
            var _this = this;
            var rect = client.window.text.node.getBoundingClientRect();
            var y = rect.y - 30;
            var x = rect.x + rect.width - 175;
            var items = users.map(u => {
                var name = u == "fb067f75-a121-47c1-8767-99271c75cfc0" ? "iian" : "argimenes";
                return {
                    name: name, guid: u
                }
            });
            var container = div({
                style: {
                    float: "right",
                    marginTop: "5px",
                    zIndex: WindowManager.getNextIndex()
                },
                template: {
                    view: `
<ul data-bind="foreach: $data.items">
    <li style="list-style: none; padding: 0; margin-right: 5px; display: inline-block;" data-bind="click: $parent.selectClicked.bind($parent)"><span class="statement_agent-role" data-bind="text: $data.name, css: { tag_selected: $parent.selected() == $data.guid }"></span></li>
</ul>
`,
                    model: {
                        items: items,
                        selected: ko.observable(),
                        selectClicked: function (item) {
                            var guid = item.guid, selected = this.selected();
                            if (selected == guid) {
                                this.selected(null);
                                window.requestAnimationFrame(() => {
                                    client.resetUserAnnotations();
                                })
                                return;
                            }
                            window.requestAnimationFrame(() => {
                                client.showUserAnnotations(guid);
                            });
                            this.selected(guid);
                        }
                    }
                }
            });
            client.window.text.node.insertBefore(container, client.window.text.node.firstChild);
        };
        TextBlock.prototype.resetUserAnnotations = function () {
            var properties = this.editor.data.properties;
            properties.forEach(p => p.unsetSpanRange());
            properties.forEach(p => p.setSpanRange());
        };
        TextBlock.prototype.showUserAnnotations = function (guid) {
            var properties = this.editor.data.properties;
            var userProps = properties.filter(p => p.userGuid == guid);
            properties.forEach(p => p.unsetSpanRange());
            userProps.forEach(p => p.setSpanRange());
        };
        TextBlock.prototype.showSidePanelClicked = function () {
            var _this = this;
            this.tabsVisible(!this.tabsVisible());
            if (this.tabsVisible()) {
                var textPanel = this.window.text.node;
                var rect = textPanel.getBoundingClientRect();
                var y = rect.y;
                var x = rect.x + rect.width + 20;
                var w = rect.width;
                this.sidePanel = div({
                    classList: ["text-window"],
                    style: {
                        position: "absolute",
                        top: y + "px",
                        left: x + "px",
                        width: w + "px",
                        backgroundColor: "#fff",
                        zIndex: WindowManager.getNextIndex()
                    }
                });
                $.get("/Static/Templates/Text/text-editor-side-panel.html?v=2", function (html) {
                    var node = applyBindings(html, _this);
                    _this.sidePanel.appendChild(node);
                    document.body.appendChild(_this.sidePanel);
                });
            } else {
                this.sidePanel.remove();
            }
        };
        TextBlock.prototype.loadTextBlockWindow = function (options) {
            var _this = this;
            options = options || {};
            options = {
                guid: options.textBlockGuid,
                textBlockGuid: options.textBlockGuid,
                node: options.layer || options.node || document.body,
                top: options.top || "100px",
                left: options.left || "600px",
                width: options.width || "675px",
                height: options.height || "auto",
                maxHeight: options.maxHeight || "800px",
                zIndex: options.zIndex || 10,
                chromeless: options.chromeless,
                border: options.border,
                onLoaded: options.onLoaded,
                windowType: "text-block"
            };
            const node = options.node;
            require("modals/search-texts");
            _this.loadTextEditorClient(options, function (client) {
                var loader = div({
                    classList: ["loader", "loader-center"]
                });
                client.editor.container.parentNode.appendChild(loader);
                const params = {
                    textBlockGuid: options.textBlockGuid
                };
                $.get("/Admin/Text/LoadTextBlockJson", params, function (response) {
                    console.log({ response });
                    loader.remove();
                    var data = _this.decompress(response.Data);
                    options.name = response.Data.Name;
                    var users = distinct(data.Properties.filter(x => !!x.userGuid).map(x => x.userGuid));
                    const name = options.name || data.Name;
                    client.bind({
                        guid: options.textGuid,
                        textBlockGuid: options.textBlockGuid,
                        name: name
                    });
                    if (data.Sections) {
                        client.model.sections(data.Sections.filter(x => !!x.Target).map(x => x.Target.Name));
                    }
                    var properties = data.Properties.filter(x => x.type != "text/block");
                    window.requestAnimationFrame(() => {
                        client.editor.container.style.display = "none";
                        client.editor.bind({
                            text: data.Text,
                            properties: properties.map(p => {
                                return {
                                    ...p, startIndex: p.startIndex - data.BlockStartIndex, endIndex: p.endIndex - data.BlockStartIndex
                                }
                            })
                        });
                        client.showHideExpansions();
                        var animations = properties.filter(p => !p.isDeleted && p.schema && p.schema.animation);
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
                        _this.loadUserBubbles(users, client);
                        if (options.onLoaded) {
                            options.onLoaded(client);
                        }
                        client.editor.container.style.display = "block";
                        client.window.text.name = name;
                    });
                });
            });
        };
        TextBlock.prototype.loadTextWindow = function (guid, node, options) {
            var _this = this;
            options = options || {};
            options = {
                guid: guid,
                node: options.layer || node, // || document.body,
                top: options.top || "100px",
                left: options.left || "600px",
                minWidth: options.minWidth,
                minHeight: options.minHeight,
                width: options.width || "675px",
                height: options.height || "auto",
                maxHeight: options.maxHeight || "800px",
                zIndex: options.zIndex || 10,
                chromeless: options.chromeless,
                border: options.border,
                onSaved: options.onSaved,
                onLoaded: options.onLoaded
            };
            require("modals/search-texts");
            if (guid) {
                _this.loadTextEditorClient(options, function (client) {
                    var loader = div({
                        classList: ["loader", "loader-center"]
                    });
                    client.editor.container.parentNode.appendChild(loader);
                    $.get("/Admin/Text/LoadEditorJson", { id: guid }, function (response) {
                        console.log({ response });
                        loader.remove();
                        var data = _this.decompress(response.Data);
                        options.name = response.Data.Name;
                        var users = distinct(data.Properties.filter(x => !!x.userGuid).map(x => x.userGuid));
                        const name = options.name || data.Name || (response.Data.Value ? response.Data.Value.substr(0, 20) : response.Data.Guid)
                        client.bind({
                            guid: guid,
                            name: name
                        });
                        if (data.Sections) {
                            client.model.sections(data.Sections.filter(x => !!x.Target).map(x => x.Target.Name));
                        }
                        var properties = data.Properties.filter(x => x.type != "text/block");
                        window._editor = client.editor;
                        client.editor.container.style.display = "none";
                        client.editor.bind({
                            text: data.Text,
                            properties: properties
                        });
                        _this.characterCount(data.Text.length);
                        _this.wordCount(data.Text.split(" ").length);
                        client.showHideExpansions();
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
                        _this.loadUserBubbles(users, client);
                        if (options.onLoaded) {
                            options.onLoaded(client);
                        }
                        client.editor.container.style.display = "block";
                        client.window.text.name = name;
                    });
                });
            }
            else {
                options.name = "<new>";
                const builder = options.chromeless ? _this.loadChromelessTextEditorClient : _this.loadTextEditorClient;
                builder(options, function (client) {
                    client.model.Name(null);
                    client.editor.bind({
                        text: "",
                        properties: []
                    });
                    if (options.onLoaded) {
                        options.onLoaded(client);
                    }
                });
            }
        };
        TextBlock.prototype.generateLabels = function (list) {
            var labels = list.map(item => {
                const text = item.text;
                const label = newElement("DIV", {
                    style: {
                        position: "absolute",
                        display: "inline",
                        top: "-10px",
                        left: "0px",
                        backgroundColor: item.colour || "gray"
                    },
                    classList: ["letter-circle"],
                    innerHTML: text,
                    attribute: {
                        alt: text,
                        title: text
                    }
                });
                label.speedy = {
                    role: 3,
                    stream: 1
                };
                return {
                    label: label,
                    property: item.property
                };
            });
            return labels;
        };
        TextBlock.prototype.textLoader = function () {
            var _this = this;
            require(["modals/search-texts", "jquery-ui"], function (TextModal) {
                $.get("/Static/Templates/Text/search-panel.html?v=37", function (html) {
                    var container = div({
                        classList: ["text-window"],
                        style: {
                            position: "absolute",
                            bottom: "43px",
                            left: "-7px",
                            width: "1200px",
                            //width: "600px",
                            maxWidth: "1200px",
                            height: "750px",
                            maxHeight: "750px",
                            backgroundColor: "transparent",
                            backdropFilter: "blur(2em)",
                            color: "#fff",
                            padding: "20px",
                            zIndex: 9990
                        }
                    });
                    var modal = new TextModal({
                        popup: container,
                        tabMode: "search",
                        tab: {
                            search: {
                                filter: {
                                    Order: "ByDateAdded",
                                    Direction: "Descending"
                                }
                            }
                        },
                        handler: {
                            onSelected: function (guid) {
                                win.close();
                                _this.loadTextWindow(guid);
                            },
                            closeClicked: function () {
                                win.close();
                            },
                            loadAllTextsClicked: function () {
                                win.close();
                                var guids = modal.tab.search.results().map(t => t.Entity.Guid);
                                var theta = [];
                                var n = guids.length;
                                var frags = 360 / n;
                                var r = 350;
                                for (var i = 0; i <= n; i++) {
                                    theta.push((frags / 180) * i * Math.PI);
                                }
                                var mainHeight = parseInt(window.getComputedStyle(document.body).height.slice(0, -2));
                                for (var i = 0; i < n; i++) {
                                    var posx = Math.round(r * (Math.cos(theta[i])));
                                    var posy = Math.round(r * (Math.sin(theta[i])));
                                    var x = (mainHeight / 2) + posx + 200;
                                    var y = (mainHeight / 2) + posy - 75;
                                    _this.loadTextWindow(guids[i], null, { left: x + "px", top: y + "px" });
                                }
                                //guids.forEach(guid => {
                                //    _this.loadTextWindow(guid, document.body);
                                //});
                                //_this.loadTextGraph({ guids: guids });
                            }
                        }
                    });
                    var node = applyBindings(html, modal);
                    container.appendChild(node);
                    document.body.appendChild(container);
                    $(container).draggable();
                    $(container).find("[data-role='niceScroll']").niceScroll();
                    var win = WindowManager.addWindow({
                        type: "text-search",
                        node: container
                    });
                });
            });
        };
        TextBlock.prototype.decompress = function (data) {
            var _this = this;
            var result = Helper.decompress(data);
            result.Properties.forEach(p => {
                p.attributes = _this.deserializeAttributes(p.attributes);
            });
            return result;
        };
        TextBlock.prototype.loadChromelessTextEditorClient = function (options, callback) {
            var _this = this;
            $.get("/Static/Templates/Text/chromeless-text-editor.html?v=71", function (html) {
                var container = div({
                    style: {
                        position: "absolute",
                        fontSize: "0.8rem",
                        top: options.top,
                        left: options.left,
                        width: options.width,
                        minWidth: options.minWidth,
                        minHeight: options.minHeight,
                        height: options.height,
                        border: options.border,
                        backgroundColor: options.backgroundColor || "transparent"
                    }
                });
                var add = new TextBlock({
                    tabsVisible: false,
                    monitorVisible: false,
                    chromeless: options.chromeless,
                    handler: {
                        onSelected: function (id) {
                            win.close();
                            win.loader.guid = id;
                            _this.loadTextWindow(id, null, {
                                onLoaded: function (client) {
                                    if (options.onSaved) {
                                        options.onSaved({ isNew: !options.guid, client: client });
                                    }
                                }
                            });
                            delete add;
                        },
                        onCancelled: function () {
                            this.removeMonitor();
                            win.close();
                            delete add;
                        },
                        removeMonitor: function () {
                            const { editor } = add;
                            if (editor.monitors.length) {
                                const monitorBar = editor.monitors[0];
                                const monitor = monitorBar.monitor;
                                if (!!monitor) {
                                    monitor.remove();
                                }
                                if (!!monitorBar.caretUp) {
                                    monitorBar.caretUp.remove();
                                }
                            }
                        },
                        settingsClicked: function () {

                        },
                        closeClicked: function () {
                            this.removeMonitor();
                            win.close();
                        }
                    }
                });
                const handle = div({
                    classList: ["chromeless-editor-handle"]
                });
                var content = applyBindings(html, add);
                container.appendChild(handle);
                container.appendChild(content);

                var editor = container.querySelectorAll("[data-role='editor'")[0];
                if (!options.guid) {
                    editor.style.height = "auto";
                }
                var monitor = div({
                    classList: ["context-monitor"],
                    style: {
                        display: "none"
                    }
                });

                add.setupEditor({ container: editor });
                var monitorBar = new MonitorBar({
                    monitor: monitor,
                    monitorOptions: {
                        highlightProperties: true
                    },
                    monitorButton: {
                        link: '<button data-toggle="tooltip" data-original-title="Edit" class="btn btn-sm"><span class="fa fa-link"></span></button>',
                        layer: '<button data-toggle="tooltip" data-original-title="Layer" class="btn btn-sm"><span class="fa fa-cog"></span></button>',
                        load: '<button data-toggle="tooltip" data-original-title="Load" class="btn btn-sm"><span class="fa fa-download"></span></button>',
                        remove: '<button data-toggle="tooltip" data-original-title="Delete" class="btn btn-sm"><span class="fa fa-trash"></span></button>',
                        comment: '<button data-toggle="tooltip" data-original-title="Comment" class="btn btn-sm"><span class="fa fa-comment"></span></button>',
                        shiftLeft: '<button data-toggle="tooltip" data-original-title="Left" class="btn btn-sm"><span class="fa fa-arrow-circle-left"></span></button>',
                        shiftRight: '<button data-toggle="tooltip" data-original-title="Right" class="btn btn-sm"><span class="fa fa-arrow-circle-right"></span></button>',
                        redraw: '<button data-toggle="tooltip" data-original-title="Redraw" class="btn btn-sm"><i class="fas fa-pencil-alt"></i></button>',
                        expand: '<button data-toggle="tooltip" data-original-title="Expand" class="btn btn-sm"><span class="fa fa-plus-circle"></span></button>',
                        contract: '<button data-toggle="tooltip" data-original-title="Contract" class="btn btn-sm"><span class="fa fa-minus-circle"></span></button>',
                        toZeroPoint: '<button data-toggle="tooltip" data-original-title="Convert to zero point" class="btn btn-sm"><span style="font-weight: 600;">Z</span></button>',
                        zeroPointLabel: '<button data-toggle="tooltip" data-original-title="Label" class="btn btn-sm"><span class="fa fa-file-text-o"></span></button>',
                    },
                    propertyType: add.editor.propertyType,
                    commentManager: add.editor.commentManager,
                    css: {
                        highlight: "text-highlight"
                    },
                    updateCurrentRanges: add.editor.updateCurrentRanges.bind(add.editor)
                });
                add.editor.addMonitor(monitorBar);
                var win = WindowManager.addWindow({
                    type: options.windowType || "text",
                    scroller: {
                        node: container
                    },
                    draggable: {
                        node: handle
                    },
                    loader: {
                        params: {
                            guid: options.guid
                        },
                        handler: _this.loadTextWindow
                    },
                    node: container,
                    zIndex: options.zIndex
                });
                if (options.node) {
                    options.node.appendChild(container);
                    options.node.appendChild(monitor);
                } else {
                    win.addNodeToLayer(container);
                    win.addNodeToLayer(monitor);
                }
                add.window.text = win;
                if (callback) {
                    callback(add);
                }
            });
        };
        TextBlock.prototype.loadTextEditorClient = function (options, callback) {
            var _this = this;
            $.get("/Static/Templates/Text/text-editor.html?v=67", function (html) {
                var container = div({
                    classList: ["text-window"],
                    style: {
                        position: "absolute",
                        fontSize: "0.8rem",
                        top: options.top,
                        left: options.left ? options.left : "unset",
                        right: !options.left ? options.right : "unset",
                        width: options.width,
                        height: options.height,
                        backgroundColor: "#fff"
                    }
                });
                var state = "open";
                var focus = false, glass = false;
                var add = new TextBlock({
                    tabsVisible: false,
                    monitorVisible: false,
                    chromeless: options.chromeless,
                    handler: {
                        onSelected: function (id) {
                            win.close();
                            win.loader.guid = id;
                            _this.loadTextWindow(id, null, {
                                onLoaded: function (client) {
                                    if (options.onSaved) {
                                        options.onSaved({ isNew: !options.guid, client: client });
                                    }
                                }
                            });
                            delete add;
                        },
                        onCancelled: function () {
                            this.removeMonitor();
                            win.close();
                            delete add;
                        },
                        removeMonitor: function () {
                            const { editor } = add;
                            if (editor.monitors.length) {
                                const monitorBar = editor.monitors[0];
                                const monitor = monitorBar.monitor;
                                if (!!monitor) {
                                    monitor.remove();
                                }
                                if (!!monitorBar.caretUp) {
                                    monitorBar.caretUp.remove();
                                }
                            }
                        },
                        togglePinClicked: function () {
                            win.togglePin();
                            _this.pinned(win.pin);
                        },
                        settingsClicked: function () {

                        },
                        toggleGlassModeClicked: function () {
                            glass = !glass;
                            if (glass) {
                                container.classList.add("glass-window");
                                editor.classList.add("glass-editor");

                            } else {
                                container.classList.remove("glass-window");
                                editor.classList.remove("glass-editor");
                            }
                        },
                        closeClicked: function () {
                            this.removeMonitor();
                            win.close();
                        },
                        pinClicked: function () {
                            win.pin();
                        },
                        focusClicked: function () {
                            focus = !focus;
                            if (focus) {
                                win.focus();
                            } else {
                                win.unfocus();
                            }
                        },
                        minimizeClicked: function () {
                            win.minimize({ name: options.name });
                        },
                        zoomClicked: function () {
                            if (win.state == "open") {
                                win.zoom();
                                win.state = "zoom";
                            } else {
                                win.unzoom();
                                win.state = "open";
                            }
                        },
                        maximiseClicked: function () {

                        }
                    }
                });
                var content = applyBindings(html, add);
                container.appendChild(content);

                var editor = container.querySelectorAll("[data-role='editor'")[0];
                if (!options.guid) {
                    editor.style.height = "350px";
                }
                var handle = container.querySelectorAll("[data-role='drag-handle']")[0];
                var monitor = div({
                    classList: ["context-monitor"],
                    style: {
                        display: "none"
                    }
                });

                add.setupEditor({ container: editor });
                var monitorBar = new MonitorBar({
                    monitor: monitor,
                    monitorOptions: {
                        highlightProperties: true
                    },
                    monitorButton: {
                        link: '<button data-toggle="tooltip" data-original-title="Edit" class="btn btn-sm"><span class="fa fa-link"></span></button>',
                        layer: '<button data-toggle="tooltip" data-original-title="Layer" class="btn btn-sm"><span class="fa fa-cog"></span></button>',
                        load: '<button data-toggle="tooltip" data-original-title="Load" class="btn btn-sm"><span class="fa fa-download"></span></button>',
                        remove: '<button data-toggle="tooltip" data-original-title="Delete" class="btn btn-sm"><span class="fa fa-trash"></span></button>',
                        comment: '<button data-toggle="tooltip" data-original-title="Comment" class="btn btn-sm"><span class="fa fa-comment"></span></button>',
                        shiftLeft: '<button data-toggle="tooltip" data-original-title="Left" class="btn btn-sm"><span class="fa fa-arrow-circle-left"></span></button>',
                        shiftRight: '<button data-toggle="tooltip" data-original-title="Right" class="btn btn-sm"><span class="fa fa-arrow-circle-right"></span></button>',
                        redraw: '<button data-toggle="tooltip" data-original-title="Redraw" class="btn btn-sm"><i class="fas fa-pencil-alt"></i></button>',
                        expand: '<button data-toggle="tooltip" data-original-title="Expand" class="btn btn-sm"><span class="fa fa-plus-circle"></span></button>',
                        contract: '<button data-toggle="tooltip" data-original-title="Contract" class="btn btn-sm"><span class="fa fa-minus-circle"></span></button>',
                        toZeroPoint: '<button data-toggle="tooltip" data-original-title="Convert to zero point" class="btn btn-sm"><span style="font-weight: 600;">Z</span></button>',
                        zeroPointLabel: '<button data-toggle="tooltip" data-original-title="Label" class="btn btn-sm"><span class="fa fa-file-text-o"></span></button>',
                    },
                    propertyType: add.editor.propertyType,
                    commentManager: add.editor.commentManager,
                    css: {
                        highlight: "text-highlight"
                    },
                    updateCurrentRanges: add.editor.updateCurrentRanges.bind(add.editor)
                });
                add.editor.addMonitor(monitorBar);
                var win = WindowManager.addWindow({
                    type: options.windowType || "text",
                    scroller: {
                        node: editor
                    },
                    draggable: {
                        node: handle
                    },
                    loader: {
                        params: {
                            guid: options.guid
                        },
                        handler: _this.loadTextWindow
                    },
                    node: container,
                    zIndex: options.zIndex
                });
                if (options.node) {
                    options.node.appendChild(container);
                    options.node.appendChild(monitor);
                } else {
                    win.addNodeToLayer(container);
                    win.addNodeToLayer(monitor);
                }
                add.window.text = win;
                if (callback) {
                    callback(add);
                }
            });
        };
        TextBlock.prototype.marginaliaClicked = function () {
            var p = this.editor.createZeroPointProperty("marginalia");
            p.schema.animation.init(p);
        };
        TextBlock.prototype.imageBackgroundClicked = function () {
            var url = this.model.imageBackground();
            var panel = this.editor.container;
            panel.style["background-size"] = "cover";
            panel.style.background = "url(" + url + ") no-repeat center center fixed";
        };
        TextBlock.prototype.gildBackground = function () {
            this.editor.container.style.background = "radial-gradient(ellipse at center, #443501 0%,#000000 100%)";
        };
        TextBlock.prototype.blurClicked = function () {
            this.editor.createProperty("blur");
        };
        TextBlock.prototype.showKeyBindings = function () {
            $.get("/Static/Templates/Text/key-bindings.html?v=11", function (html) {
                var container = div({
                    style: {
                        position: "absolute",
                        padding: "10px 20px",
                        right: "20px",
                        bottom: "20px",
                        width: "550px",
                        //height: "550px",
                        backgroundColor: "#fff",
                        zIndex: 60
                    },
                    classList: ["text-window"]
                });
                var node = applyBindings(html, {
                    closeClicked: function () {
                        win.close();
                    }
                });
                container.appendChild(node);
                document.body.appendChild(container);
                require(["jquery-ui"], function () {
                    $(container).draggable();
                });
                var win = WindowManager.addWindow({
                    type: "key-bindings",
                    node: container
                });
            });
        };
        TextBlock.prototype.terminalClicked = function () {
            var container = this.editor.container;
            var monitor = this.editor.monitors[0].monitor;
            var show = !this.terminalMode();
            if (show) {
                container.classList.add("terminal");
                // monitor.classList.add("terminal");
            } else {
                container.classList.remove("terminal");
                //monitor.classList.remove("terminal");
            }
            this.terminalMode(show);
        };
        TextBlock.prototype.gildClicked = function () {
            this.gildBackground();
            this.editor.createProperty("gild");
        };
        TextBlock.prototype.starWarsClicked = function () {
            this.backgroundColour("#111");
            this.changeBackgroundColourClicked();
            this.editor.container.style.marginTop = "-67px";
            this.editor.container.style.transform = "perspective(456px) rotateX(25deg)";
            this.textColour("#feda4a");
            this.changeTextColourClicked();
            this.fontFamily("NewsGothicW01-Bold");
            this.changeFontFamilyClicked();
        };
        TextBlock.prototype.darkModeClicked = function () {
            this.backgroundColour("#121212");
            this.changeBackgroundColourClicked();
            this.textColour("#ccc");
            this.changeTextColourClicked();
            var monitor = this.editor.monitors[0].monitor;
            monitor.style.backgroundColor = "#121212";
            monitor.style.color = "#ccc";
        };
        TextBlock.prototype.lightModeClicked = function () {
            this.backgroundColour("#fff");
            this.changeBackgroundColourClicked();
            this.textColour("#333");
            this.changeTextColourClicked();
            var monitor = this.editor.monitors[0].monitor;
            monitor.style.backgroundColor = "#fff";
            monitor.style.color = "#333";
        };
        TextBlock.prototype.setGroup = function (group) {
            this.group(group);
        };
        TextBlock.prototype.videoBackgroundClicked = function () {
            //https://jsfiddle.net/kiirosora/36Lj4kxt/
            this.darkModeClicked();
            var src = this.model.videoBackground();
            var videoContainer = this.videoContainer;
            if (!videoContainer) {
                videoContainer = this.videoContainer = document.createElement("DIV");
                videoContainer.style.position = "relative";
                videoContainer.style.width = "100%";
                videoContainer.style.height = "100%";
                videoContainer.style.backgroundAttachment = "scroll";
                videoContainer.style.overflow = "hidden";

                var video = document.createElement("VIDEO");
                //object-fit: cover;
                video.style["object-fit"] = "cover";
                video.setAttribute("playsinline", "playsinline");
                video.setAttribute("autoplay", "autoplay");
                video.setAttribute("muted", "muted");
                video.setAttribute("loop", "loop");
                video.style.minWidth = "100%";
                video.style.minHeight = "100%";
                video.style.position = "relative";
                video.style.zIndex = z++;

                var source = document.createElement("SOURCE");
                source.setAttribute("src", src);
                source.setAttribute("type", "video/mp4");
                video.appendChild(source);
                this.editor.container.style.backgroundColor = "rgb(255, 255, 255, 0)";
                this.editor.container.style.zIndex = z++;
                this.editor.container.style.top = 0;
                this.editor.container.style.left = 0;
                this.editor.container.style.minWidth = "100%";
                this.editor.container.style.minHeight = "100%";
                this.editor.container.style.position = "absolute";

                videoContainer.appendChild(video);
                this.editor.container.parentNode.appendChild(videoContainer);
                videoContainer.insertBefore(this.editor.container, video);
                //videoContainer.parentNode.insertBefore(videoContainer, this.editor.monitors[0].monitor);
            } else {
                var source = this.videoContainer.firstChild().firstChild();
                source.setAttribute("src", src);
            }
        };
        TextBlock.prototype.toggleAnnotationVisibilityClicked = function () {
            this.showAnnotationToggles(!this.showAnnotationToggles());
        };
        TextBlock.prototype.toggle2 = function (name, value, attr, trueValue, falseValue) {
            var css = this.editor.propertyType[name].className;
            changeCss("." + css, attr, value ? trueValue : falseValue);
            return true;
        };
        TextBlock.prototype.toggle = function (name, attr, trueValue, falseValue) {
            var value = this.checkbox[name]();
            var css = this.editor.propertyType[name].className;
            changeCss("." + css, attr, value ? trueValue : falseValue);
            return true;
        };
        TextBlock.prototype.listItemClicked = function () {
            var item = this.editor.createBlockProperty2({ type: "list/item" });
            var list = this.editor.createParentBlockProperty("list", item);
            item.parent = list;
        };
        TextBlock.prototype.indentClicked = function () {
            this.editor.createBlockProperty("alignment/indent");
        };
        TextBlock.prototype.justifyClicked = function () {
            this.editor.createBlockProperty("alignment/justify");
        };
        TextBlock.prototype.dropClicked = function () {
            var p = this.editor.createProperty("drop");
            var drop = this.editor.propertyType.drop;
            drop.animation.init(p, this.editor);
            drop.animation.start(p, this.editor);
        };
        TextBlock.prototype.rectangleClicked = function () {
            this.editor.createProperty("rectangle");
        };
        TextBlock.prototype.showHideExpansions = function () {
            var show = this.checkbox.expansions();
            var types = ["expansion", "line", "leiden/expansion", "leiden/line", "page"];
            var expansions = this.editor.data.properties.filter(p => types.indexOf(p.type) >= 0);
            expansions.forEach(p => show ? p.showBrackets() : p.hideBrackets());
        };
        TextBlock.prototype.showHideZeroWidths = function () {
            var show = this.checkbox.zeroWidths();
            var expansions = this.editor.data.properties.filter(p => p.isZeroPoint);
            expansions.forEach(p => show ? p.showZeroWidth() : p.hideZeroWidth());
        };
        TextBlock.prototype.shiftAllLeftClicked = function () {
            this.editor.shiftPropertiesLeftFromCaret();
            return false;
        };
        TextBlock.prototype.shiftAllRightClicked = function () {
            this.editor.shiftPropertiesRightFromCaret();
            return false;
        };
        TextBlock.prototype.rightClicked = function () {
            this.editor.createBlockProperty("alignment/right");
        };
        TextBlock.prototype.centerClicked = function () {
            this.editor.createBlockProperty("alignment/center");
        };
        TextBlock.prototype.showHide = function (name) {
            return this.toggle(name, "display", "inline", "none");
        };
        TextBlock.prototype.germanSyntaxClicked = function () {
            this.syntaxClicked("de");
        };
        TextBlock.prototype.spanishSyntaxClicked = function () {
            this.syntaxClicked("es");
        };
        TextBlock.prototype.portugueseSyntaxClicked = function () {
            this.syntaxClicked("pt");
        };
        TextBlock.prototype.frenchSyntaxClicked = function () {
            this.syntaxClicked("fr");
        };
        TextBlock.prototype.h1Clicked = function () {
            this.editor.createProperty("h1");
        };
        TextBlock.prototype.h2Clicked = function () {
            this.editor.createProperty("h2");
        };
        TextBlock.prototype.h3Clicked = function () {
            this.editor.createProperty("h3");
        };
        TextBlock.prototype.italianSyntaxClicked = function () {
            this.syntaxClicked("it");
        };
        TextBlock.prototype.englishSyntaxClicked = function () {
            this.syntaxClicked("en");
        };
        TextBlock.prototype.toggleTabsVisible = function () {
            var state = this.tabsVisible();
            this.tabsVisible(!state);
        };
        TextBlock.prototype.toggleMonitorVisible = function () {
            var state = this.monitorVisible();
            this.monitorVisible(!state);
        };
        TextBlock.prototype.metaDataClicked = function () {
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
        TextBlock.prototype.syntaxClicked = function (lang) {
            var _this = this;
            var selection = this.editor.getSelection();
            $.post("/Admin/Text/GetSyntaxAnnotations", { text: selection.text, lang: lang }, function (response) {
                console.log({ response });
                if (!response.Success) {
                    return;
                }
                var si = selection.startIndex;
                var properties = response.Data.Data.map(function (item) {
                    return {
                        type: item.Type,
                        startIndex: item.StartIndex + si,
                        endIndex: item.EndIndex + si,
                        attributes: _this.deserializeAttributes(item.Attributes)
                    };
                });
                console.log({ properties });
                _this.editor.addProperties(properties);
            });
        };
        TextBlock.prototype.namedEntityRecognitionClicked = function () {
            var _this = this;
            require(["parts/ner-processor"], function (NER) {
                openModal("/Static/Templates/Text/ner-processor.html", {
                    name: "Named Entity Recognition",
                    ajaxContentAdded: function (element) {
                        var modal = new NER({
                            popup: element,
                            text: _this.editor.unbindText(),
                            handler: {
                                inlineAgentSelector: _this.createInlineAgentSelector(),
                                onMergeProperties: function (properties) {
                                    closeModal(element);
                                    _this.editor.addProperties(properties);

                                },
                                onCancel: function (properties) {
                                    closeModal(element);

                                }
                            }
                        });
                        ko.applyBindings(modal, element);
                    }
                });
            });
        };
        TextBlock.prototype.selectTextClicked = function () {
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
                //var modal = null;
                //openModal("/Static/Templates/Text/text-selector.html", {
                //    name: "Text Selection",
                //    ajaxContentAdded: function (element) {
                //        modal = new TextSelector({
                //            popup: element,
                //            selection: sel,
                //            text: _this.editor.unbindText(),
                //            handler: {
                //                onMergeProperties: function (properties) {
                //                    closeModal(element);
                //                    _this.editor.addProperties(properties);
                //                    modal.onClose();
                //                },
                //                onCancel: function () {
                //                    closeModal(element);
                //                    modal.onClose();
                //                }
                //            }
                //        });
                //        ko.applyBindings(modal, element);
                //    },
                //    onClose: (element) => {
                //        closeModal(element);
                //        modal.onClose();
                //    }
                //});
            });
        };
        TextBlock.prototype.specialCharacterSelected = function () {
            var c = this.model.specialCharacter();
            this.editor.insertCharacterAtCarot(c);
        };
        TextBlock.prototype.backCursor = function () {
            this.editor.backCursor();
        };
        TextBlock.prototype.forwardCursor = function () {
            this.editor.forwardCursor();
        };
        TextBlock.prototype.selectAgent = function (prop, process) {
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
        TextBlock.prototype.pronounRecognitionClicked = function () {
            var _this = this;
            openModal("/Static/Templates/Text/ner-processor.html", {
                name: "Pronoun Recognition",
                ajaxContentAdded: function (element) {
                    require(["parts/pronoun-processor"], function (PronounProcessor) {
                        var data = _this.editor.unbind();
                        var modal = new PronounProcessor({
                            popup: element,
                            text: data.text,
                            handler: {
                                inlineAgentSelector: _this.createInlineAgentSelector(),
                                onMergeProperties: function (properties) {
                                    closeModal(element);
                                    _this.editor.addProperties(properties);
                                },
                                onCancel: function (properties) {
                                    closeModal(element);
                                }
                            }
                        });
                        ko.applyBindings(modal, element);
                    });
                }
            });
        };
        TextBlock.prototype.splitClicked = function () {
            var bottom = document.createElement("DIV");
            var top = this.editor.container;
            top.style.height = "250px";
            bottom.classList.add("editor");
            bottom.style.height = "250px";
            bottom.style.borderTop = "solid 2px #ccc";
            //spellcheck="false" style="position: relative;" contenteditable="true"
            bottom.style.position = "relative";
            bottom.setAttribute("spellcheck", false);
            bottom.setAttribute("contenteditable", true);
            top.parentNode.insertBefore(bottom, top.nextElementSibling);
            this.editor.synchronise(bottom);
        };
        TextBlock.prototype.createInlineAgentSelector = function () {
            var _this = this;
            var func = function () {
                var data = _this.editor.unbind();
                var agents = data.properties.filter(function (item) {
                    return item.type == "agent" && !item.isDeleted;
                }).filter(function (value, index, self) {
                    return self.indexOf(value) == index;
                }).map(x => {
                    return {
                        Entity: {
                            Guid: x.value,
                            Name: x.text
                        },
                        Aliases: [],
                        Types: []
                    };
                });
                return agents;
            };
            return func;
        };
        TextBlock.prototype.lemmatizeClicked = function () {
            var _this = this;
            var data = this.editor.unbind();
            $.post("/Admin/Text/Lemmatize", { text: data.text }, function (response) {
                console.log(response);
                if (!response.Success) {
                    return;
                }
                var lemmas = response.Data.Lemmas;
                _this.editor.addProperties(select(lemmas, function (item) {
                    return {
                        type: "lemma",
                        value: item.Word,
                        text: item.Word,
                        startIndex: item.StartIndex,
                        endIndex: item.EndIndex
                    };
                }));
            });
        };
        TextBlock.prototype.setLists2 = function (args) {
            const { list, model } = args;
            this.list.Sections(list.Sections);
            this.list.Types(list.Types);
            if (model) {
                this.model.Section(model.section);
                this.model.Type(model.type);
            }
        };
        TextBlock.prototype.drawClippedRectangle = function (p, options) {
            return Helper.drawClippedRectangle(p, options);
        };
        TextBlock.prototype.setLists = function (cons, model) {
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
        TextBlock.prototype.unbindClicked = function () {
            var data = this.editor.unbind();
            this.viewer(JSON.stringify(data));
        };
        TextBlock.prototype.bindClicked = function () {
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
        TextBlock.prototype.addPDFClicked = function () {
            var url = prompt("url");
            var p = this.editor.createMetadataProperty({ type: "adjacent-pdf", value: url });
            p.schema.animation.init(p);
        };
        TextBlock.prototype.addImageClicked = function () {
            var url = prompt("url");
            var p = this.editor.createMetadataProperty({ type: "adjacent-image", value: url });
            p.schema.animation.init(p);
        };
        TextBlock.prototype.addVideoClicked = function () {
            var url = prompt("url");
            const parsedUrl = new URL(url);
            const v = parsedUrl.searchParams.get("v");
            const embedUrl = "https://www.youtube.com/embed/" + v;
            const p = this.editor.createMetadataProperty({ type: "adjacent-video", value: embedUrl });
            p.schema.animation.init(p);
        };
        TextBlock.prototype.submitClicked = function () {
            this.saveClicked();
        };
        TextBlock.prototype.layerClicked = function (layer) {
            var selected = layer.selected();
            this.editor.setLayerVisibility(layer.name, selected);
            return true;
        };
        TextBlock.prototype.changeOpacityClicked = function () {
            var opacity = this.opacity();
            changeCss(".agent", "opacity", opacity);
            changeCss(".claim", "opacity", opacity);
            changeCss(".time", "opacity", opacity);
            changeCss(".metaRelation", "opacity", opacity);
            changeCss(".dataPoint", "opacity", opacity);
            changeCss(".lexeme", "opacity", opacity);
            changeCss(".structure", "opacity", opacity);
            changeCss(".text", "opacity", opacity);
        };
        TextBlock.prototype.loadPdfWindow = function (data) {
            const url = data.url;
            const entityGuid = data.entityGuid;
            var y = data.y || 200;
            var x = data.x || 800;
            var width = data.width || 600;
            var height = data.height || 800;
            var container = div({
                classList: ["text-window"],
                style: {
                    position: "absolute",
                    top: y + "px",
                    left: x + "px",
                    width: width + "px",
                    height: height + "px",
                    backgroundColor: "#000"
                }
            });
            var loader = div({
                classList: ["loader", "loader-center"]
            });
            container.appendChild(loader);
            var embed = el({
                type: "EMBED",
                attribute: {
                    width: "630px",
                    height: "800px",
                    src: url,
                    type: "application/pdf"
                },
                handler: {
                    load: () => {
                        loader.remove();
                    }
                }
            });
            var handle = div({
                template: {
                    view: `
<div class="safari_buttons">
    <div>
        <div data-bind="click: $data.closeClicked" class="safari_close"></div><div data-bind="click: $data.minimizeClicked" class="safari_minimize"></div><div data-bind="click: $data.zoomClicked" class="safari_zoom"></div><div data-bind="click: $data.focusClicked" class="safari_focus"></div><div data-bind="click: $data.toggleGlassModeClicked" class="safari_glass"></div>
    </div>
    <div style="float: right; padding:0; margin: 0; margin-top: -10px; margin-right: 5px;">
<span data-bind="click: $data.togglePinClicked, style: { color: $data.pinned() ? '#fff' : '#6f7b8a' }"><i class="fas fa-thumbtack"></i></span>
        <span data-bind="click: $data.settingsClicked"><i style="font-size: 1.25rem;" class="fas fa-angle-double-right"></i></span>
    </div>
</div>`,
                    model: {
                        settingsClicked: () => {
                            var rect = container.getBoundingClientRect();
                            var x = rect.x + rect.width + 10;
                            var y = rect.y;
                            _this.loadEntityClicked(entityGuid, {
                                left: x, top: y, onReady: (entityWindow) => {
                                    win.children.push(entityWindow);
                                }
                            });
                        },
                        position: {},
                        zoomClicked: function () {
                            this.zoomed = !this.zoomed;
                            if (this.zoomed) {
                                var w = screen.width, h = screen.height;
                                var fh = h - 30;
                                var rect = container.getBoundingClientRect();
                                this.position.x = rect.x;
                                this.position.y = rect.y;
                                embed.setAttribute("width", w + "px");
                                embed.setAttribute("height", fh + "px");
                                container.style.position = "fixed";
                                container.style.top = 0;
                                container.style.left = 0;
                                container.style.height = "100%";
                                container.style.width = "100%";
                                container.style.zIndex = "10";
                                win.state = "fullscreen";
                            } else {
                                embed.setAttribute("width", width + "px");
                                embed.setAttribute("height", height + "px");
                                container.style.position = "absolute";
                                container.style.left = this.position.x + "px";
                                container.style.top = this.position.y + "px";
                                container.style.height = "auto";
                                container.style.width = width + "px";
                                container.style.zIndex = WindowManager.getNextIndex().toString();
                                win.state = "open";
                            }
                        },
                        pinned: ko.observable(false),
                        togglePinClicked: function () {
                            win.togglePin();
                            this.pinned(win.pin);
                        },
                        glass: false,
                        toggleGlassModeClicked: function () {
                            this.glass = !this.glass;
                            if (this.glass) {
                                container.classList.add("glass-window");
                                embed.style.opacity = 0.2;

                            } else {
                                container.classList.remove("glass-window");
                                embed.style.opacity = 1;
                            }
                        },
                        closeClicked: () => win.close(),
                        minimizeClicked: () => win.minimize(),
                        focusClicked: function () {
                            focus = !focus;
                            if (focus) {
                                win.focus();
                            } else {
                                win.unfocus();
                            }
                        }
                    }
                }
            });
            container.appendChild(handle);
            container.appendChild(embed);
            const layer = data.layer || WindowManager.currentLayer.container;
            layer.appendChild(container);
            var win = WindowManager.addWindow({
                type: "pdf",
                draggable: {
                    node: handle,
                    stop: function (e, ui) {
                        var rect = container.getBoundingClientRect();
                        //prop.attributes = {
                        //    x: rect.x,
                        //    y: rect.y,
                        //    width: rect.width,
                        //    height: rect.height
                        //};
                    }
                },
                loader: {
                    params: {
                        entityGuid: entityGuid
                    }
                },
                node: container,
                zIndex: WindowManager.getNextIndex()
            });

        };
        TextBlock.prototype.loadWebsiteWindow = function (data) {
            var _this = this;
            const url = data.url;
            const entityGuid = data.entityGuid;
            var y = data.y || 200;
            var x = data.x || 800;
            var width = data.width || 600;
            var height = data.height || 800;
            var container = div({
                classList: ["text-window"],
                style: {
                    position: "absolute",
                    top: y + "px",
                    left: x + "px",
                    width: width + "px",
                    height: height + "px",
                    minHeight: height + "px",
                    backgroundColor: "#000"
                }
            });
            var loader = div({
                classList: ["loader", "loader-center"]
            });
            container.appendChild(loader);
            const layer = data.layer || WindowManager.currentLayer.container;
            layer.appendChild(container);
            var iframe = newElement("IFRAME", {
                attribute: {
                    width: width,
                    height: height,
                    src: url,
                    frameborder: 0
                },
                handler: {
                    load: (e) => {
                        console.log("iframe loaded", iframe, e, iframe.contentDocument);
                        loader.remove();
                        if (win.state == "fullscreen") {
                            return;
                        }
                        //win.maximize();
                    }
                }
            });
            var model = {
                zoomed: false,
                position: {},
                settingsClicked: () => {
                    var rect = container.getBoundingClientRect();
                    var x = rect.x + rect.width + 10;
                    var y = rect.y;
                    _this.loadEntityClicked(entityGuid, {
                        left: x, top: y, onReady: (entityWindow) => {
                            win.children.push(entityWindow);
                        }
                    });
                },
                closeClicked: () => {
                    Helper.destroyIFrame(iframe);
                    win.close();
                },
                minimizeClicked: () => win.minimize({
                    name: data.name,
                    thumbnail: div({
                        innerHTML: `<div><i style="font-size: 40px;" class="fas fa-link"></i></div>`
                    })
                }),
                glass: false,
                toggleGlassModeClicked: function () {
                    this.glass = !this.glass;
                    if (this.glass) {
                        container.classList.add("glass-window");
                        iframe.style.opacity = 0.2;

                    } else {
                        container.classList.remove("glass-window");
                        iframe.style.opacity = 1;
                    }
                },
                zoomClicked: function () {
                    this.zoomed = !this.zoomed;
                    if (this.zoomed) {
                        var w = screen.width, h = screen.height;
                        var fh = h - 30;
                        var rect = container.getBoundingClientRect();
                        this.position.x = rect.x;
                        this.position.y = rect.y;
                        iframe.setAttribute("width", w);
                        iframe.setAttribute("height", fh);
                        container.style.position = "fixed";
                        container.style.top = 0;
                        container.style.left = 0;
                        container.style.height = "100%";
                        container.style.width = "100%";
                        container.style.zIndex = "10";
                        win.state = "fullscreen";
                    } else {
                        iframe.setAttribute("width", width);
                        iframe.setAttribute("height", height);
                        container.style.position = "absolute";
                        container.style.left = this.position.x + "px";
                        container.style.top = this.position.y + "px";
                        container.style.height = "auto";
                        container.style.width = width + "px";
                        container.style.zIndex = WindowManager.getNextIndex().toString();
                        win.state = "open";
                    }
                },
                focusClicked: function () {
                    focus = !focus;
                    if (focus) {
                        win.focus();
                    } else {
                        win.unfocus();
                    }
                }
            };
            var handle = div({
                template: {
                    view: `
<div class="safari_buttons">
    <div>
        <div data-bind="click: $data.closeClicked" class="safari_close"></div><div data-bind="click: $data.minimizeClicked" class="safari_minimize"></div><div data-bind="click: $data.zoomClicked" class="safari_zoom"></div><div data-bind="click: $data.focusClicked" class="safari_focus"></div><div data-bind="click: $data.toggleGlassModeClicked" class="safari_glass"></div>
    </div>
    <div style="float: right; padding:0; margin: 0; margin-top: -10px; margin-right: 5px;">
        <span data-bind="click: $data.settingsClicked"><i style="font-size: 1.25rem;" class="fas fa-angle-double-right"></i></span>
    </div>
</div>`,
                    model: model
                }
            });
            container.appendChild(handle);
            container.appendChild(iframe);

            var win = WindowManager.addWindow({
                type: "website",
                draggable: {
                    node: handle,
                    stop: function (e, ui) {
                        var rect = container.getBoundingClientRect();
                        //prop.attributes = {
                        //    x: rect.x,
                        //    y: rect.y,
                        //    width: rect.width,
                        //    height: rect.height
                        //};
                    }
                },
                loader: {
                    params: {
                        entityGuid: entityGuid
                    }
                },
                node: container,
                zIndex: data.zIndex
            });
            //model.minimizeClicked();
        };
        TextBlock.prototype.createYouTubeContent = function (args) {
            var _this = this;
            const { container, url, name, entityGuid, zIndex, loader, win } = args;
            const parsedUrl = new URL(url);
            const v = parsedUrl.searchParams.get("v");
            var player;
            var playerContainer = div({});
            var handle = div({
                template: {
                    view: `
<div class="safari_buttons">
    <div>
        <div data-bind="click: $data.closeClicked" class="safari_close"></div><div data-bind="click: $data.minimizeClicked" class="safari_minimize"></div><div data-bind="click: $data.zoomClicked" class="safari_zoom"></div><div data-bind="click: $data.focusClicked" class="safari_focus"></div><div data-bind="click: $data.toggleGlassModeClicked" class="safari_glass"></div>
    </div>
    <div style="float: right; padding:0; margin: 0; margin-top: -10px; margin-right: 5px;">
        <span data-bind="click: $data.skip30Clicked">skip 30</span>
        <span data-bind="click: $data.togglePinClicked, style: { color: $data.pinned() ? '#fff' : '#6f7b8a' }"><i class="fas fa-thumbtack"></i></span>
        <span data-bind="click: $data.settingsClicked"><i style="font-size: 1.25rem;" class="fas fa-angle-double-right"></i></span>
    </div>
</div>`,
                    model: {
                        zoomed: false,
                        position: {},
                        pinned: ko.observable(false),
                        togglePinClicked: function () {
                            win.togglePin();
                            this.pinned(win.pin);
                        },
                        glass: false,
                        toggleGlassModeClicked: function () {
                            console.log({ player });
                            const iframe = player.getIframe();
                            this.glass = !this.glass;
                            if (this.glass) {
                                container.classList.add("glass-window");
                                iframe.style.opacity = 0.2;

                            } else {
                                container.classList.remove("glass-window");
                                iframe.style.opacity = 1;
                            }
                        },
                        zoomClicked: function () {
                            console.log({ player });
                            const iframe = player.getIframe();
                            this.zoomed = !this.zoomed;
                            if (this.zoomed) {
                                var w = screen.width, h = screen.height;
                                var fh = h - 30;
                                var rect = container.getBoundingClientRect();
                                this.position.x = rect.x;
                                this.position.y = rect.y;
                                iframe.setAttribute("width", w);
                                iframe.setAttribute("height", fh);
                                container.style.position = "fixed";
                                container.style.top = 0;
                                container.style.left = 0;
                                container.style.height = "100%";
                                container.style.width = "100%";
                                container.style.zIndex = "10";
                                win.state = "fullscreen";
                            } else {
                                iframe.setAttribute("width", 560);
                                iframe.setAttribute("height", 315);
                                container.style.position = "absolute";
                                container.style.left = this.position.x + "px";
                                container.style.top = this.position.y + "px";
                                container.style.height = "auto";
                                container.style.width = "560px";
                                container.style.zIndex = WindowManager.getNextIndex().toString();
                                win.state = "open";
                            }
                        },
                        skip30Clicked: () => {
                            player.skip(30);
                        },
                        settingsClicked: () => {
                            var rect = container.getBoundingClientRect();
                            var x = rect.x + rect.width + 10;
                            var y = rect.y;
                            _this.loadEntityClicked(entityGuid, {
                                left: x, top: y, onReady: (entityWindow) => {
                                    win.children.push(entityWindow);
                                }
                            });
                        },
                        closeClicked: () => {
                            player.player.destroy();
                            win.close();
                        },
                        minimizeClicked: () => win.minimize({
                            name: name,
                            thumbnail: div({
                                innerHTML: `<div><i style="font-size: 40px; color: #c4302b;" class="fab fa-youtube"></i></div>`
                            })
                        }),
                        focusClicked: function () {
                            focus = !focus;
                            if (focus) {
                                win.focus();
                            } else {
                                win.unfocus();
                            }
                        }
                    }
                }
            });
            var content = div({
                children: [handle, playerContainer]
            });
            updateElement(container, {
                style: {
                    width: "560px",
                    height: "341px"
                }
            });
            win.setDraggable({ node: handle });
            //var win = WindowManager.addWindow({
            //    type: "video",
            //    draggable: {
            //        node: handle
            //    },
            //    loader: {
            //        params: {
            //            entityGuid: entityGuid
            //        }
            //    },
            //    node: container,
            //    zIndex: zIndex
            //});
            require(["parts/youtube-player"], function (YouTubePlayer) {
                player = new YouTubePlayer({
                    container: playerContainer,
                    identifier: v,
                    handler: {
                        onPlayerReady: () => {
                            loader.remove();
                        }
                    }
                });
            });
            return content;
        };
        TextBlock.prototype.createVimeoContent = function (args) {
            const { container, url, name, entityGuid, zIndex, loader } = args;
            const parts = url.split("/");
            const id = parts[parts.length - 1];
            const embedUrl = "https://player.vimeo.com/video/" + id;
            container.style.width = "640px";
            container.style.height = "504px";
            var iframe = newElement("IFRAME", {
                attribute: {
                    width: 640,
                    height: 480,
                    src: embedUrl,
                    frameborder: 0,
                    allow: "autoplay; fullscreen",
                    allowfullscreen: "allowfullscreen"
                },
                handler: {
                    load: () => {
                        loader.remove();
                    }
                }
            });
            var handle = div({
                template: {
                    view: `
<div class="safari_buttons">
    <div>
        <div data-bind="click: $data.closeClicked" class="safari_close"></div><div data-bind="click: $data.minimizeClicked" class="safari_minimize"></div><div data-bind="click: $data.zoomClicked" class="safari_zoom"></div><div data-bind="click: $data.focusClicked" class="safari_focus"></div><div data-bind="click: $data.toggleGlassModeClicked" class="safari_glass"></div>
    </div>
    <div style="float: right; padding:0; margin: 0; margin-top: -10px; margin-right: 5px;">
        <span data-bind="click: $data.togglePinClicked, style: { color: $data.pinned() ? '#fff' : '#6f7b8a' }"><i class="fas fa-thumbtack"></i></span>
        <span data-bind="click: $data.settingsClicked"><i style="font-size: 1.25rem;" class="fas fa-angle-double-right"></i></span>
    </div>
</div>`,
                    model: {
                        zoomed: false,
                        position: {},
                        pinned: ko.observable(false),
                        togglePinClicked: function () {
                            win.togglePin();
                            this.pinned(win.pin);
                        },
                        glass: false,
                        toggleGlassModeClicked: function () {
                            this.glass = !this.glass;
                            if (this.glass) {
                                container.classList.add("glass-window");
                                iframe.style.opacity = 0.2;

                            } else {
                                container.classList.remove("glass-window");
                                iframe.style.opacity = 1;
                            }
                        },
                        zoomClicked: function () {
                            this.zoomed = !this.zoomed;
                            if (this.zoomed) {
                                var w = screen.width, h = screen.height;
                                var fh = h - 30;
                                var rect = container.getBoundingClientRect();
                                this.position.x = rect.x;
                                this.position.y = rect.y;
                                iframe.setAttribute("width", w);
                                iframe.setAttribute("height", fh);
                                container.style.position = "fixed";
                                container.style.top = 0;
                                container.style.left = 0;
                                container.style.height = "100%";
                                container.style.width = "100%";
                                container.style.zIndex = "10";
                                win.state = "fullscreen";
                            } else {
                                iframe.setAttribute("width", 640);
                                iframe.setAttribute("height", 480);
                                container.style.position = "absolute";
                                container.style.left = this.position.x + "px";
                                container.style.top = this.position.y + "px";
                                container.style.height = "auto";
                                container.style.width = "640px";
                                container.style.zIndex = WindowManager.getNextIndex().toString();
                                win.state = "open";
                            }
                        },
                        settingsClicked: () => {
                            var rect = container.getBoundingClientRect();
                            var x = rect.x + rect.width + 10;
                            var y = rect.y;
                            _this.loadEntityClicked(entityGuid, {
                                left: x, top: y, onReady: (entityWindow) => {
                                    win.children.push(entityWindow);
                                }
                            });
                        },
                        closeClicked: () => win.close(),
                        minimizeClicked: () => win.minimize({
                            name: name,
                            thumbnail: div({
                                innerHTML: `<div><i style="font-size: 40px; color: #c4302b;" class="fab fa-youtube"></i></div>`
                            })
                        }),
                        focusClicked: function () {
                            focus = !focus;
                            if (focus) {
                                win.focus();
                            } else {
                                win.unfocus();
                            }
                        }
                    }
                }
            });
            var content = div({
                children: [handle, iframe]
            });
            win.setDraggable({ node: handle });
            //var win = WindowManager.addWindow({
            //    type: "video",
            //    draggable: {
            //        node: handle
            //    },
            //    loader: {
            //        params: {
            //            entityGuid: entityGuid
            //        }
            //    },
            //    node: container,
            //    zIndex: zIndex
            //});
            return content;
        };
        TextBlock.prototype.loadVideoWindow = function (data) {
            var _this = this;
            const { url, name, zIndex, entityGuid } = data;
            var y = data.y || 200;
            var x = data.x || 600;
            var container = div({
                classList: ["text-window"],
                style: {
                    position: "absolute",
                    top: y + "px",
                    left: x + "px",
                    backgroundColor: "#000",
                    zIndex: zIndex || WindowManager.getNextIndex()
                }
            });
            var loader = div({
                classList: ["loader", "loader-center"]
            });
            container.appendChild(loader);
            var win = WindowManager.addWindow({
                type: "video",
                node: container,
                loader: {
                    params: {
                        entityGuid: entityGuid
                    }
                },
                //zIndex: zIndex || WindowManager.getNextIndex()
            });
            win.layer.container.appendChild(container);
            if (data.fetchUrl) {
                $.get("/Admin/Agent/Overview", { id: entityGuid }, function (response) {
                    let url = response.Data.VideoUrl;
                    let name = response.Data.Name;
                    _this.createVideoContent({ container, url, entityGuid, name, zIndex, loader, win });
                });
            } else {
                this.createVideoContent({ container, url, entityGuid, name, zIndex, loader, win });
            }
        };
        TextBlock.prototype.createVideoContent = function (args) {
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
        };
        TextBlock.prototype.createVideoFileContent = function (args) {
            const _this = this;
            const { container, url, loader, win, entityGuid } = args;
            const src = url;
            loader.remove();
            const videoContainer = div({
                classList: ["text-window"],
                style: {
                    overflow: "hidden",
                    zIndex: WindowManager.getNextIndex(),
                    backgroundColor: "#000"
                }
            });
            var handle = div({
                style: {
                    backgroundColor: "#000"
                },
                template: {
                    view: `
<div class="safari_buttons">
    <div>
        <div data-bind="click: $data.closeClicked" class="safari_close"></div><div data-bind="click: $data.minimizeClicked" class="safari_minimize"></div><div data-bind="click: $data.zoomClicked" class="safari_zoom"></div><div data-bind="click: $data.focusClicked" class="safari_focus"></div><div data-bind="click: $data.toggleGlassModeClicked" class="safari_glass"></div>
    </div>
    <div style="float: right; padding:0; margin: 0; margin-top: -10px; margin-right: 5px;">
        <span data-bind="click: $data.togglePinClicked, style: { color: $data.pinned() ? '#fff' : '#6f7b8a' }"><i class="fas fa-thumbtack"></i></span>
        <span data-bind="click: $data.settingsClicked"><i style="font-size: 1.25rem;" class="fas fa-angle-double-right"></i></span>
    </div>
</div>`,
                    model: {
                        zoomed: false,
                        position: {},
                        pinned: ko.observable(false),
                        togglePinClicked: function () {
                            win.togglePin();
                            this.pinned(win.pin);
                        },
                        glass: false,
                        toggleGlassModeClicked: function () {
                            this.glass = !this.glass;
                            if (this.glass) {
                                container.classList.add("glass-window");
                                video.style.opacity = 0.2;

                            } else {
                                container.classList.remove("glass-window");
                                video.style.opacity = 1;
                            }
                        },
                        zoomClicked: function () {
                            this.zoomed = !this.zoomed;
                            if (this.zoomed) {
                                var w = screen.width, h = screen.height;
                                var fh = h - 30;
                                var rect = container.getBoundingClientRect();
                                this.position.x = rect.x;
                                this.position.y = rect.y;
                                video.setAttribute("width", w);
                                video.setAttribute("height", fh);
                                container.style.position = "fixed";
                                container.style.top = 0;
                                container.style.left = 0;
                                container.style.height = "100%";
                                container.style.width = "100%";
                                container.style.zIndex = "10";
                                win.state = "fullscreen";
                            } else {
                                video.setAttribute("width", 640);
                                video.setAttribute("height", 480);
                                container.style.position = "absolute";
                                container.style.left = this.position.x + "px";
                                container.style.top = this.position.y + "px";
                                container.style.height = "auto";
                                container.style.width = "640px";
                                container.style.zIndex = WindowManager.getNextIndex().toString();
                                win.state = "open";
                            }
                        },
                        settingsClicked: () => {
                            var rect = container.getBoundingClientRect();
                            var x = rect.x + rect.width + 10;
                            var y = rect.y;
                            _this.loadEntityClicked(entityGuid, {
                                left: x, top: y, onReady: (entityWindow) => {
                                    win.children.push(entityWindow);
                                }
                            });
                        },
                        closeClicked: () => win.close(),
                        minimizeClicked: () => win.minimize({
                            name: name,
                            thumbnail: div({
                                innerHTML: `<div><i style="font-size: 40px; color: #c4302b;" class="fab fa-youtube"></i></div>`
                            })
                        }),
                        focusClicked: function () {
                            focus = !focus;
                            if (focus) {
                                win.focus();
                            } else {
                                win.unfocus();
                            }
                        }
                    }
                }
            });
            var video = newElement("VIDEO", {
                style: {
                    position: "relative",
                    width: "100%"
                },
                attribute: {
                    playsinline: "playsinline",
                    autoplay: "autoplay",
                    muted: "muted",
                    loop: "loop"
                }
            });
            var source = newElement("SOURCE", {
                attribute: {
                    src: src,
                    type: "video/mp4"
                }
            });
            video.appendChild(source);
            var content = div({
                children: [handle, video]
            });
            videoContainer.appendChild(content);
            win.setDraggable({ node: handle });
            return videoContainer;
        };
        TextBlock.prototype.loadImageWindow = function (data) {
            var _this = this;
            var url = data.url;
            var entityGuid = data.entityGuid;
            var y = data.y || 100;
            var x = data.x || 800;
            var width = data.width;
            var height = data.height + 40;
            var container = div({
                classList: ["text-window", "noselect"],
                style: {
                    position: "absolute",
                    top: y + "px",
                    left: x + "px",
                    width: width ? width + "px" : "auto",
                    height: height ? height + "px" : "auto",
                    backgroundColor: "#000",
                    zIndex: WindowManager.getNextIndex()
                }
            });
            const layer = data.layer || WindowManager.currentLayer.container;
            layer.appendChild(container);
            if (false == data.fetchUrl) {
                this.addImageToContainer({ container, url, entityGuid, zIndex: data.zIndex });
            } else {
                $.get("/Admin/Agent/Overview", { id: entityGuid }, function (response) {
                    let url = response.Data.ImageUrl;
                    _this.addImageToContainer({ container, url, entityGuid, zIndex: data.zIndex });
                });
            }
        };
        TextBlock.prototype.addImageToContainer = function (data) {
            const { container, url, entityGuid, zIndex } = data;
            var _this = this;
            var loader = div({
                classList: ["loader", "loader-center"]
            });
            container.appendChild(loader);
            var model = {
                container: container,
                focus: false,
                pinned: ko.observable(false),
                togglePinClicked: function () {
                    win.togglePin();
                    this.pinned(win.pin);
                },
                glass: false,
                toggleCircleModeClicked: function () {
                    this.circle = !this.circle;
                    if (this.circle) {
                        this.container.classList.add("circle-window");
                        this.container.dataset.originalWidth = this.container.style.width;
                        this.container.style.width = container.style.height;
                        const width = this.container.offsetWidth;
                        const x = (width / 2) - 50;
                        updateElement(handle, {
                            style: {
                                position: "relative",
                                top: "5px",
                                left: x + "px"
                            }
                        });
                        updateElement(img, {
                            style: {
                                maxWidth: "none",
                                maxHeight: "none",
                                width: "100%",
                                height: "100%"
                            }
                        });
                    } else {
                        this.container.classList.remove("circle-window");
                        this.container.style.width = this.container.dataset.originalWidth;
                        updateElement(handle, {
                            style: {
                                top: 0,
                                left: 0
                            }
                        });
                        updateElement(img, {
                            style: {
                                maxWidth: "640px",
                                maxHeight: "640px",
                                width: "auto",
                                height: "auto"
                            }
                        });
                    }
                },
                toggleGlassModeClicked: function () {
                    this.glass = !this.glass;
                    if (this.glass) {
                        this.container.classList.add("glass-window");
                        img.style.opacity = 0.2;

                    } else {
                        this.container.classList.remove("glass-window");
                        img.style.opacity = 1;
                    }
                },
                position: {},
                zoomClicked: function () {
                    this.zoomed = !this.zoomed;
                    if (this.zoomed) {
                        var w = screen.width, h = screen.height;
                        var fh = h - 30;
                        var rect = container.getBoundingClientRect();
                        this.position.x = rect.x;
                        this.position.y = rect.y;
                        this.position.w = rect.width;
                        this.position.h = rect.height;
                        img.style.maxWidth = w + "px";
                        img.style.maxHeight = h + "px";
                        img.style.width = "auto";
                        img.style.height = "100%";
                        container.style.position = "fixed";
                        container.style.top = 0;
                        container.style.left = 0;
                        container.style.textAlign = "center";
                        container.style.height = "100%";
                        container.style.width = "100%";
                        container.style.zIndex = "10";
                        win.state = "fullscreen";
                    } else {
                        img.style.maxWidth = "600px";
                        img.style.maxHeight = "600px";
                        container.style.position = "absolute";
                        container.style.textAlign = "left";
                        container.style.left = this.position.x + "px";
                        container.style.top = this.position.y + "px";
                        container.style.height = this.position.h + "px";
                        container.style.width = this.position.w + "px";
                        container.style.zIndex = WindowManager.getNextIndex().toString();
                        win.state = "open";
                    }

                },
                settingsClicked: () => {
                    var rect = container.getBoundingClientRect();
                    var x = rect.x + rect.width + 10;
                    var y = rect.y;
                    _this.loadEntityClicked(entityGuid, {
                        left: x, top: y, onReady: (ew) => {
                            win.children.push(ew);
                        }
                    });
                },
                closeClicked: () => win.close(),
                minimizeClicked: () => win.minimize({
                    thumbnail: div({
                        innerHTML: `<div><i style="font-size: 40px; " class="far fa-file-image"></i></div>`
                    }),
                }),
                focusClicked: function () {
                    this.focus = !this.focus;
                    if (this.focus) {
                        win.focus();
                    } else {
                        win.unfocus();
                    }
                }
            };
            var handle = div({
                template: {
                    view: `
<div class="safari_buttons">
    <div>
        <div data-bind="click: $data.closeClicked" class="safari_close"></div><div data-bind="click: $data.minimizeClicked" class="safari_minimize"></div><div data-bind="click: $data.zoomClicked" class="safari_zoom"></div><div data-bind="click: $data.focusClicked" class="safari_focus"></div><div data-bind="click: $data.toggleGlassModeClicked" class="safari_glass"></div><div data-bind="click: $data.toggleCircleModeClicked" class="safari_circle"></div>
    </div>
     <div style="float: right; padding:0; margin: 0; margin-top: -10px; margin-right: 5px;">
        <span data-bind="click: $data.togglePinClicked, style: { color: $data.pinned() ? '#fff' : '#6f7b8a' }"><i class="fas fa-thumbtack"></i></span>
        <span data-bind="click: $data.settingsClicked"><i style="font-size: 1.25rem;" class="fas fa-angle-double-right"></i></span>
    </div>
</div>`,
                    model: model
                }
            });
            container.appendChild(handle);
            var img = newElement("IMG", {
                attribute: {
                    src: url
                },
                style: {
                    maxWidth: "640px",
                    maxHeight: "640px",
                    //width: "100%",
                    //height: "100%"
                },
                handler: {
                    load: () => {
                        loader.remove();
                        container.style.width = img.width + "px";
                    }
                }
            });
            container.appendChild(img);
            $(img).on("click", function (e) {
                if (e.ctrlKey) {
                    changeSize("+", 0.1);
                } else {
                    changeSize("-", 0.1);
                }
                if (model.circle) {
                    const width = container.offsetWidth;
                    const x = (width / 2) - 50;
                    updateElement(handle, {
                        style: {
                            left: x + "px"
                        }
                    });
                }
            });
            function changeSize(op, ratio) {
                var rect = img.getBoundingClientRect();
                var width = rect.width, height = rect.height;
                var w, h;
                if (op == "+") {
                    w = width + (width * ratio);
                    h = height + (height * ratio);
                } else {
                    w = width - (width * ratio);
                    h = height - (height * ratio);
                }
                img.style.width = w + "px";
                img.style.maxWidth = w + "px";
                img.style.height = h + "px";
                img.style.maxHeight = h + "px";
                container.style.width = w + "px";
                container.style.height = h + "px";
            }
            var win = WindowManager.addWindow({
                type: "image",
                draggable: {
                    node: handle
                },
                loader: {
                    params: {
                        entityGuid: entityGuid
                    }
                },
                node: container,
                zIndex: data.zIndex
            });
        };
        TextBlock.prototype.loadTweetWindow = function (data) {
            var _this = this;
            var value = data.value;
            var entityGuid = data.entityGuid;
            var y = data.y || 100;
            var x = data.x || 800;
            var container = div({
                classList: ["text-window"],
                style: {
                    position: "absolute",
                    top: y + "px",
                    left: x + "px",
                    width: "560px",
                    height: "auto",
                    maxHeight: "550px",
                    overflowY: "hidden",
                    overflowX: "hidden",
                    backgroundColor: "#fff"
                }
            });
            var tweet = div({
                style: {
                    width: "550px",
                    height: "auto"
                },
                innerHTML: value
            });
            var focus = false;
            var handle = div({
                template: {
                    view: `
<div class="safari_buttons">
    <div>
        <div data-bind="click: $data.closeClicked" class="safari_close"></div><div data-bind="click: $data.minimizeClicked" class="safari_minimize"></div><div data-bind="click: $data.zoomClicked" class="safari_zoom"></div><div data-bind="click: $data.focusClicked" class="safari_focus"></div><div data-bind="click: $data.toggleGlassModeClicked" class="safari_glass"></div>
    </div>
    <div style="float: right; padding:0; margin: 0; margin-top: -10px; margin-right: 5px;">
        <span data-bind="click: $data.togglePinClicked, style: { color: $data.pinned() ? '#ccc' : '#6f7b8a' }"><i class="fas fa-thumbtack"></i></span>
        <span data-bind="click: $data.settingsClicked"><i style="font-size: 1.25rem;" class="fas fa-angle-double-right"></i></span>
    </div>
</div>`,
                    model: {
                        pinned: ko.observable(false),
                        togglePinClicked: function () {
                            win.togglePin();
                            this.pinned(win.pin);
                        },
                        position: {},
                        zoomClicked: function () {
                            //this.zoomed = !this.zoomed;
                            //if (this.zoomed) {
                            //    var w = screen.width, h = screen.height;
                            //    var fh = h - 30;
                            //    var rect = container.getBoundingClientRect();
                            //    this.position.x = rect.x;
                            //    this.position.y = rect.y;
                            //    tweet.style.width= w + "px";
                            //    tweet.style.height = fh + "px";
                            //    container.style.position = "fixed";
                            //    container.style.top = 0;
                            //    container.style.left = 0;
                            //    container.style.maxHeight = "unset";
                            //    container.style.height = fh + "px";
                            //    container.style.width = "100%";
                            //    container.style.zIndex = "10";
                            //    win.state = "fullscreen";
                            //} else {
                            //    tweet.style.width = "550px";
                            //    tweet.style.height = "auto";
                            //    container.style.position = "absolute";
                            //    container.style.left = this.position.x + "px";
                            //    container.style.top = this.position.y + "px";
                            //    container.style.height = "auto";
                            //    container.style.width = "560px";
                            //    container.style.maxHeight = "550px";
                            //    container.style.zIndex = WindowManager.getNextIndex().toString();
                            //    win.state = "open";
                            //}
                        },
                        glass: false,
                        toggleGlassModeClicked: function () {
                            this.glass = !this.glass;
                            if (this.glass) {
                                container.classList.add("glass-window");
                                tweet.style.opacity = 0.2;

                            } else {
                                container.classList.remove("glass-window");
                                tweet.style.opacity = 1;
                            }
                        },
                        settingsClicked: () => {
                            var rect = container.getBoundingClientRect();
                            var x = rect.x + rect.width + 10;
                            var y = rect.y;
                            _this.loadEntityClicked(entityGuid, {
                                left: x, top: y,
                                onReady: (ew) => {
                                    win.children.push(ew);
                                }
                            });
                        },
                        closeClicked: () => win.close(),
                        minimizeClicked: () => win.minimize(),
                        focusClicked: function () {
                            focus = !focus;
                            if (focus) {
                                win.focus();
                            } else {
                                win.unfocus();
                            }
                        }
                    }
                }
            });
            container.appendChild(handle);
            container.appendChild(tweet);
            const layer = data.layer || document.body;
            layer.appendChild(container);
            _this.nodeScriptReplace(tweet);
            var win = WindowManager.addWindow({
                type: "tweet",
                draggable: {
                    node: handle,
                    stop: function (e, ui) {
                        var rect = container.getBoundingClientRect();
                        //prop.attributes = {
                        //    x: rect.x,
                        //    y: rect.y,
                        //    width: rect.width,
                        //    height: rect.height
                        //};
                    }
                },
                loader: {
                    params: {
                        entityGuid: entityGuid
                    }
                },
                node: container,
                zIndex: data.zIndex
            });
        };
        TextBlock.prototype.nodeScriptReplace = function (node) {
            function nodeScriptIs(node) {
                return node.tagName === 'SCRIPT';
            }
            function nodeScriptClone(node) {
                var script = document.createElement("script");
                script.text = node.innerHTML;
                for (var i = node.attributes.length - 1; i >= 0; i--) {
                    script.setAttribute(node.attributes[i].name, node.attributes[i].value);
                }
                return script;
            }
            if (nodeScriptIs(node) === true) {
                node.parentNode.replaceChild(nodeScriptClone(node), node);
            }
            else {
                var i = 0;
                var children = node.childNodes;
                while (i < children.length) {
                    this.nodeScriptReplace(children[i++]);
                }
            }
            return node;
        };
        TextBlock.prototype.loadSketchfabWindow = function (data) {
            var _this = this;
            var value = data.value;
            var entityGuid = data.entityGuid;
            var y = data.y || 100;
            var x = data.x || 800;
            var container = div({
                classList: ["text-window"],
                style: {
                    position: "absolute",
                    top: y + "px",
                    left: x + "px",
                    backgroundColor: "#000"
                }
            });
            var sketchfab = div({
                style: {
                    width: "640px",
                    height: "480px"
                },
                innerHTML: value
            });
            var focus = false;
            var handle = div({
                template: {
                    view: `
<div class="safari_buttons">
    <div>
        <div data-bind="click: $data.closeClicked" class="safari_close"></div><div data-bind="click: $data.minimizeClicked" class="safari_minimize"></div><div class="safari_zoom"></div><div data-bind="click: $data.focusClicked" class="safari_focus"></div>
    </div>
    <div style="float: right; padding:0; margin: 0; margin-top: -10px; margin-right: 5px;">
        <span data-bind="click: $data.settingsClicked"><i style="font-size: 1.25rem;" class="fas fa-angle-double-right"></i></span>
    </div>
</div>`,
                    model: {
                        settingsClicked: () => {
                            var rect = container.getBoundingClientRect();
                            var x = rect.x + rect.width + 10;
                            var y = rect.y;
                            _this.loadEntityClicked(entityGuid, {
                                left: x, top: y,
                                onReady: (ew) => win.children.push(ew)
                            });
                        },
                        closeClicked: () => win.close(),
                        minimizeClicked: () => win.minimize(),
                        focusClicked: function () {
                            focus = !focus;
                            if (focus) {
                                win.focus();
                            } else {
                                win.unfocus();
                            }
                        }
                    }
                }
            });
            container.appendChild(handle);
            container.appendChild(sketchfab);
            const layer = data.layer || document.body;
            layer.appendChild(container);
            var win = WindowManager.addWindow({
                type: "sketchfab",
                draggable: {
                    node: handle,
                    stop: function (e, ui) {
                        var rect = container.getBoundingClientRect();
                        //prop.attributes = {
                        //    x: rect.x,
                        //    y: rect.y,
                        //    width: rect.width,
                        //    height: rect.height
                        //};
                    }
                },
                loader: {
                    params: {
                        entityGuid: entityGuid
                    }
                },
                node: container,
                zIndex: data.zIndex
            });
        };
        TextBlock.prototype.changeLineHeightClicked = function () {
            changeCss(".editor", "line-height", this.lineHeight());
        };
        TextBlock.prototype.decreaseFontSize = function () {
            var fontSize = this.getFontSize();
            fontSize -= 1;
            this.fontSize(fontSize + "px");
            this.changeFontSizeClicked();

            var lineHeight = this.getLineHeight();
            lineHeight -= 1;
            this.lineHeight(lineHeight + "px");
            this.changeLineHeightClicked();
        };
        TextBlock.prototype.increaseFontSize = function () {
            var fontSize = this.getFontSize();
            fontSize += 1;
            this.fontSize(fontSize + "px");
            this.changeFontSizeClicked();

            var lineHeight = this.getLineHeight();
            lineHeight += 1;
            this.lineHeight(lineHeight + "px");
            this.changeLineHeightClicked();
        };
        TextBlock.prototype.getLineHeight = function () {
            var value = "16px";
            if (this.editor && this.editor.container) {
                value = window.getComputedStyle(this.editor.container).lineHeight;
            }
            var valueFloat = parseFloat(value.replace("px", ""));
            return valueFloat;
        };
        TextBlock.prototype.getFontSize = function () {
            var fontSize = "16px";
            if (this.editor && this.editor.container) {
                fontSize = window.getComputedStyle(this.editor.container).fontSize;
            }
            var fontSizeFloat = parseFloat(fontSize.replace("px", ""));
            return fontSizeFloat;
        };
        TextBlock.prototype.changeFontSizeClicked = function () {
            changeCss(".editor", "font-size", this.fontSize());
        };
        TextBlock.prototype.changeFontFamilyClicked = function () {
            changeCss(".editor", "font-family", this.fontFamily());
        };
        TextBlock.prototype.changeTextColourClicked = function () {
            changeCss(".editor", "color", this.textColour());
        };
        TextBlock.prototype.changeBackgroundColourClicked = function () {
            changeCss(".editor", "background-color", this.backgroundColour());
        };
        TextBlock.prototype.eraseClicked = function () {
            this.editor.createProperty("erase");
        };
        TextBlock.prototype.subscriptClicked = function () {
            this.editor.createProperty("subscript");
        };
        TextBlock.prototype.blockquoteClicked = function () {
            var p = this.editor.createBlockProperty("blockquote");
        };
        TextBlock.prototype.pageClicked = function () {
            this.editor.createProperty("page");
        };
        TextBlock.prototype.domainClicked = function () {
            this.editor.createProperty("domain");
        };
        TextBlock.prototype.alignedIframeClicked = function () {
            this.editor.createProperty("aligned-iframe");
        };
        TextBlock.prototype.languageClicked = function () {
            this.editor.createProperty("language");
        };
        TextBlock.prototype.highlightClicked = function () {
            this.editor.createProperty("highlight");
        };
        TextBlock.prototype.scrollToGuid = function (guid) {
            var properties = this.editor.data.properties.filter(x => x.guid == guid);
            var sorted = properties.concat().sort((a, b) => a.startIndex() > b.startIndex() ? 1 : a.startIndex() == b.startIndex() ? 0 : -1);
            var first = sorted[0];
            first.scrollTo();
        };
        TextBlock.prototype.scrollToIndex = function (index) {
            var node = this.editor.nodeAtIndex(index);
            if (node) {
                node.scrollIntoView();
            }
        };
        TextBlock.prototype.highlightPartOfSpeech = function (pos, highlight, style) {
            this.editor.data.properties.filter(x => x.type == "syntax/part-of-speech" && x.attributes.tag == pos).forEach(p => highlight ? p.highlight(style) : p.unhighlight("inherit"));
        };
        TextBlock.prototype.highlightSentiments = function (highlight) {
            var _this = this;
            const properties = this.editor.data.properties.filter(x => x.type == "sentiment/sentence");
            if (!properties.length) {
                return;
            }
            properties.forEach(p => {
                if (highlight) {
                    const colour = _this.toHSL(p.attributes.magnitude, p.attributes.score);
                    p.colour = colour;
                    _this.drawClippedRectangle(p, { fill: colour });

                } else {
                    if (p.svg) {
                        p.svg.remove();
                    }
                }
            });
            var schema = properties[0].schema;
            const editor = properties[0].editor;
            if (highlight) {
                require(["parts/minimap"], function (Minimap) {
                    const caret = editor.getCaret();
                    const cursor = caret.left || caret.right;
                    var minimap = schema.minimap = new Minimap({ editor });
                    minimap.createBar({ backgroundColor: "none" });
                    minimap.addMarkers(properties, { hide: false, opacity: "1", usePropertyHeight: true, mixBlendMode: "multiply" });
                    minimap.setArrowAt(cursor);
                });
            } else {
                if (schema.minimap) {
                    schema.minimap.remove();
                }
            }
        };
        TextBlock.prototype.toHSL = function (magnitude, score) {
            var score = parseFloat(score);
            var magnitude = Math.abs(parseFloat(magnitude) * 10);
            var H = score >= 0 ? 125 : 0;
            var S = 100;
            var diff = 10 - Math.ceil(magnitude);
            var L = 90 + diff;
            return "hsl({H}, {S}%, {L}%)".fmt({ H, S, L });
        };
        TextBlock.prototype.uppercaseClicked = function () {
            this.editor.createProperty("uppercase");
        };
        TextBlock.prototype.boldClicked = function () {
            this.editor.createProperty("bold");
        };
        TextBlock.prototype.italicsClicked = function () {
            this.editor.createProperty("italics");
        };
        TextBlock.prototype.strikeClicked = function () {
            this.editor.createProperty("strike");
        };
        TextBlock.prototype.superscriptClicked = function () {
            this.editor.createProperty("superscript");
        };
        TextBlock.prototype.underlineClicked = function () {
            this.editor.createProperty("underline");
        };
        TextBlock.prototype.lineClicked = function () {
            this.editor.createProperty("line");
        };
        TextBlock.prototype.expansionClicked = function () {
            this.editor.createProperty("expansion");
        };
        TextBlock.prototype.hyphenClicked = function () {
            this.editor.createZeroPointProperty("hyphen");
        };
        TextBlock.prototype.paragraphClicked = function () {
            this.editor.createProperty("paragraph");
        };
        TextBlock.prototype.agentClicked = function () {
            this.editor.createProperty("agent");
        };
        TextBlock.prototype.lexemeClicked = function () {
            this.editor.createProperty("lexeme");
        };
        TextBlock.prototype.footnoteClicked = function () {
            var content = prompt("Footnote text");
            this.editor.createZeroPointProperty("text", content);
        };
        TextBlock.prototype.spinnerClicked = function () {
            var p = this.editor.createZeroPointProperty("spinner");
            var spinner = this.editor.propertyType.spinner;
            spinner.animation.init(p);
            spinner.animation.start(p);
        };
        //
        TextBlock.prototype.counterClicked = function () {
            var p = this.editor.createZeroPointProperty("counter");
            var type = this.editor.propertyType.counter;
            type.animation.init(p);
            type.animation.start(p);
        };
        TextBlock.prototype.clockClicked = function () {
            var p = this.editor.createBlockProperty("clock");
            var clock = this.editor.propertyType.clock;
            clock.animation.init(p);
            clock.animation.start(p);
        };
        TextBlock.prototype.peekabooClicked = function () {
            var p = this.editor.createBlockProperty("peekaboo");
            var type = this.editor.propertyType.peekaboo;
            type.animation.init(p);
            type.animation.start(p);
        };
        TextBlock.prototype.pulsateClicked = function () {
            var p = this.editor.createBlockProperty("pulsate");
            var pulsate = this.editor.propertyType.pulsate;
            pulsate.animation.init(p);
            pulsate.animation.start(p);
        };
        TextBlock.prototype.dragClicked = function () {
            var p = this.editor.createBlockProperty("drag");
            var drag = this.editor.propertyType.drag;
            drag.animation.init(p);
            //drag.animation.start(p);
        };
        TextBlock.prototype.flipClicked = function () {
            this.editor.createBlockProperty("flip");
        };
        TextBlock.prototype.upsideDownClicked = function () {
            this.editor.createBlockProperty("upside-down");
        };
        TextBlock.prototype.capitalClicked = function () {
            var p = this.editor.createProperty("capital");
            var capital = this.editor.propertyType.capital;
            capital.animation.init(p);
            capital.animation.start(p);
        };
        TextBlock.prototype.iconClicked = function (css) {
            var p = this.editor.createZeroPointProperty("icon");
            p.value = css;
            p.schema.animation.init(p);
            p.schema.animation.start(p);
        };
        TextBlock.prototype.imageClicked = function () {
            var p = this.editor.createZeroPointProperty("image");
            var image = this.editor.propertyType.image;
            image.animation.init(p);
            image.animation.start(p);
        };
        TextBlock.prototype.videoClicked = function () {
            var p = this.editor.createZeroPointProperty("video");
            var video = this.editor.propertyType.video;
            video.animation.init(p);
            video.animation.start(p);
        };
        TextBlock.prototype.iframeClicked = function () {
            var p = this.editor.createZeroPointProperty("iframe");
            var iframe = this.editor.propertyType.iframe;
            iframe.animation.init(p);
            iframe.animation.start(p);
        };
        TextBlock.prototype.audioClicked = function () {
            var p = this.editor.createProperty("audio");
            var audio = this.editor.propertyType.audio;
            audio.animation.init(p);
        };
        TextBlock.prototype.winkClicked = function () {
            var p = this.editor.createZeroPointProperty("wink");
            var wink = this.editor.propertyType.wink;
            wink.animation.init(p);
            wink.animation.start(p);
        };
        TextBlock.prototype.pauseClicked = function () {
            var props = this.editor.data.properties.filter(p => !!p.animation);
            props.forEach(p => {
                if (p.animation) {
                    p.animation.stop = !p.animation.stop;
                }
            });
        };
        TextBlock.prototype.tabClicked = function () {
            this.editor.createZeroPointProperty("tab", "&nbsp;");
        };
        TextBlock.prototype.textClicked = function () {
            this.editor.createProperty("text");
        };
        TextBlock.prototype.intertextClicked = function () {
            this.editor.createProperty("source_of_intertext");
        };
        TextBlock.prototype.claimClicked = function () {
            this.editor.createProperty("claim");
        };
        TextBlock.prototype.traitClicked = function () {
            this.editor.createProperty("trait");
        };
        TextBlock.prototype.metaRelationClicked = function () {
            this.editor.createProperty("metaRelation");
        };
        TextBlock.prototype.timeClicked = function () {
            this.editor.createProperty("time");
        };
        TextBlock.prototype.intralinearClicked = function () {
            var p = this.editor.createZeroPointProperty("intralinear");
            var type = this.editor.propertyType.intralinear;
            type.animation.init(p);
        };
        TextBlock.prototype.dataPointClicked = function () {
            this.editor.createProperty("dataPoint");
        };
        TextBlock.prototype.subjectClicked = function () {
            this.editor.createProperty("subject");
        };
        TextBlock.prototype.conceptClicked = function () {
            this.editor.createProperty("concept");
        };
        TextBlock.prototype.prosodySelected = function () {
            var value = this.model.prosody();
            this.editor.createProperty(value);
        };
        TextBlock.prototype.pasteHtmlBlockClicked = function () {
            var p = this.editor.createZeroPointProperty("html");
            p.schema.animation.init(p);
            p.schema.animation.start(p);
        };
        TextBlock.prototype.attitudeSelected = function () {
            var value = this.model.attitude();
            this.editor.createProperty(value);
        };
        TextBlock.prototype.sectionClicked = function () {
            this.editor.createProperty("section");
        };
        TextBlock.prototype.figurativeSelected = function () {
            var value = this.model.figurative();
            this.editor.createProperty(value);
        };
        TextBlock.prototype.richardsSelected = function () {
            var value = this.model.richards();
            this.editor.createProperty(value);
        };
        TextBlock.prototype.teiSelected = function () {
            var value = this.model.TEI();
            var type = this.editor.propertyType[value];
            if (type.zeroPoint) {
                this.editor.createZeroPointProperty(value);
            }
            else {
                this.editor.createProperty(value);
            }
        };
        TextBlock.prototype.dexterSelected = function () {
            var value = this.model.Dexter();
            this.editor.createProperty(value);
        };
        TextBlock.prototype.valedictionClicked = function () {
            this.editor.createProperty("valediction");
        };
        TextBlock.prototype.salutationClicked = function () {
            this.editor.createProperty("salutation");
        };
        TextBlock.prototype.structureClicked = function () {
            this.editor.createProperty("structure");
        };
        TextBlock.prototype.closeClicked = function () {
            //pubsub.publish("CloseModal");
            if (this.handler.closeClicked) {
                this.handler.closeClicked();
            }
        };
        TextBlock.prototype.minimizeClicked = function () {
            //pubsub.publish("CloseModal");
            if (this.handler.minimizeClicked) {
                this.handler.minimizeClicked();
            }
        };
        TextBlock.prototype.focusClicked = function () {
            //pubsub.publish("CloseModal");
            if (this.handler.focusClicked) {
                this.handler.focusClicked();
            }
        };
        TextBlock.prototype.togglePinClicked = function () {
            if (this.handler.togglePinClicked) {
                this.handler.togglePinClicked();
            }
        };
        TextBlock.prototype.toggleGlassModeClicked = function () {
            //pubsub.publish("CloseModal");
            if (this.handler.toggleGlassModeClicked) {
                this.handler.toggleGlassModeClicked();
            }
        };
        TextBlock.prototype.pinClicked = function () {
            //pubsub.publish("CloseModal");
            if (this.handler.pinClicked) {
                this.handler.pinClicked();
            }
        };
        TextBlock.prototype.zoomClicked = function () {
            //pubsub.publish("CloseModal");
            if (this.handler.zoomClicked) {
                this.handler.zoomClicked();
            }
        };
        TextBlock.prototype.colourSelected = function (hex) {
            this.editor.createProperty("colour", hex);
        };
        TextBlock.prototype.fontClicked = function () {
            var font = prompt("Font", "monospace");
            this.editor.createProperty("font", font);
        };
        TextBlock.prototype.sizeClicked = function () {
            var size = prompt("Size", "1em");
            this.editor.createProperty("size", size);
        };
        TextBlock.prototype.cloneClicked = function () {
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
        TextBlock.prototype.populate = function (guid) {
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
        TextBlock.prototype.cancelClicked = function () {
            if (this.mode == "modal") {
                this.handler.onCancelled();
            }
            if (!this.model.Guid) {
                return;
            }
            window.location.href = "/Admin/Text/Index/{guid}".fmt({ guid: this.model.Guid });
        };
        //
        TextBlock.prototype.getTextBlocksClicked = function () {
            var blocks = this.editor.getTextBlocks();
            console.log({ blocks });
            var properties = blocks.map((s, i) => {
                return { ...s, type: "text/block", value: i + 1 };
            });
            this.editor.addProperties(properties);
        };
        TextBlock.prototype.getSentencesClicked = function () {
            this.generateSentenceProperties();
        };
        TextBlock.prototype.generateSentenceProperties = function () {
            var _this = this;
            var properties = this.editor.data.properties.filter(p => p.type == "text/sentence");
            properties.forEach(p => _this.editor.removeProperty(p));
            var sentences = this.editor.getSentences();
            console.log({ sentences });
            var properties = sentences.map((s, i) => {
                return { ...s, type: "text/sentence", value: i + 1 };
            });
            var matches = this.editor.addProperties(properties);
        };
        TextBlock.prototype.saveClicked = function () {
            this.save(this.handler.onSelected);
        };
        TextBlock.prototype.setSections = function (list) {
            var section = this.model.Section();
            this.list.Sections(list);
            this.model.Section(section);
        };
        TextBlock.prototype.deserializeAttributes = function (arr) {
            var obj = {};
            arr.forEach(pair => {
                var parts = pair.split("|");
                obj[parts[0]] = parts[1];
            });
            return obj;
        };
        TextBlock.prototype.moodClicked = function () {
            var p = this.editor.createProperty("mood");
            p.schema.animation.init(p);
        };
        TextBlock.prototype.loadTextGraph = function (args) {
            require(["parts/text-graph", "jquery-ui"], function (TextGraph) {
                var panel = div({
                    style: {
                        position: "absolute",
                        top: "100px",
                        right: "100px",
                        padding: "20px",
                        width: "850px",
                        zIndex: WindowManager.getNextIndex()
                    },
                    children: [
                        applyBindings(`
<div class="safari_buttons">
    <div data-bind="click: $data.closeClicked" class="safari_close"></div><div data-bind="click: $data.minimizeClicked" class="safari_minimize"></div><div class="safari_zoom"></div>
</div>
 <div data-role="drag-handle" style="text-align: right;"><span style="text-decoration: underline;" data-bind="click: closeClicked">close</span></div>
 `,
                            {
                                closeClicked: () => {
                                    panel.remove();
                                    delete graph;
                                    win.close();
                                },
                                minimizeClicked: () => win.minimize()
                            })
                    ],
                    classList: ["text-window"]
                });
                var node = div({
                    style: {
                        width: "850px",
                        height: "450px"
                    }
                });
                panel.appendChild(node);
                document.body.appendChild(panel);
                var graph = new TextGraph({
                    layout: "cose",
                    node: node,
                    textGuid: args.guid,
                    textGuids: args.guids
                });
                var handle = panel.querySelectorAll("[data-role='drag-handle'")[0]
                $(panel).draggable({ handle: handle });
                var win = WindowManager.addWindow({
                    type: "text-graph",
                    loader: {
                        params: {
                            guid: args.guid,
                            guids: args.guids
                        }
                    },
                    node: panel
                });
            });
        };
        TextBlock.prototype.loadAgentGraph = function (args) {
            var _this = this;
            require(["parts/agent-graph"], (AgentGraph) => {
                const x = args.x || 800;
                const y = args.y || 200;
                const w = args.width || 600;
                const h = args.height || 600;
                const shape = args.shape || "Rectilinear";
                const surface = args.surface || "Default";
                const z = args.z || WindowManager.getNextIndex();
                var container = div({
                    classList: ["text-window"],
                    style: {
                        position: "absolute",
                        left: x + "px",
                        top: y + "px",
                        width: w + "px",
                        height: h + "px",
                        zIndex: z
                    }
                });
                var node = newElement("DIV", {
                    style: {
                        width: w + "px",
                        height: h + "px"
                    }
                });
                var model = {
                    data: [],
                    model: {
                        relationTypeGuid: ko.observable()
                    },
                    list: {
                        relationTypes: ko.observableArray([])
                    },
                    toggleCircleModeClicked: function () {
                        this.circle = !this.circle;
                        if (this.circle) {
                            this.switchToCircleMode();

                        } else {
                            this.switchToRectilinearMode();
                        }
                    },
                    switchToRectilinearMode: function () {
                        win.shape = "Rectilinear";
                        container.classList.remove("circle-window");
                        updateElement(handle, {
                            style: {
                                top: 0,
                                left: 0
                            }
                        });
                    },
                    switchToCircleMode: function () {
                        win.shape = "Circle";
                        container.classList.add("circle-window");
                        updateElement(handle, {
                            style: {
                                top: "3px",
                                left: "245px"
                            }
                        });
                    },
                    switchToGlassSurface: function () {
                        win.surface = "Glass";
                        container.classList.add("glass-window");
                    },
                    switchToDefaultSurface: function () {
                        win.surface = "Default";
                        container.classList.remove("glass-window");
                    },
                    toggleGlassModeClicked: function () {
                        this.glass = !this.glass;
                        if (this.glass) {
                            this.switchToGlassSurface();
                        } else {
                            this.switchToDefaultSurface();
                        }
                        win.surface = this.glass ? "Glass" : "Default";
                    },
                    closeClicked: () => win.close(),
                    filterClicked: function () {
                        var relationTypeGuid = this.model.relationTypeGuid();
                        if (!relationTypeGuid) {
                            return; // not right, but fix later
                        }
                        this.showRelations = !this.showRelations;
                        if (this.showRelations) {
                            graph.showRelations(relationTypeGuid);
                        } else {
                            graph.hideRelations(relationTypeGuid);
                        }
                    }
                };
                var handle = div({
                    style: {
                        position: "relative",
                        height: "20px",
                        zIndex: WindowManager.getNextIndex()
                    },
                    children: [applyBindings(
                        `
<div class="safari_buttons">
    <div data-bind="click: $data.closeClicked" class="safari_close"></div><div data-bind="click: $data.minimizeClicked" class="safari_minimize"></div><div class="safari_zoom"></div><div data-bind="click: $data.focusClicked" class="safari_focus"></div><div data-bind="click: $data.toggleGlassModeClicked" class="safari_glass"></div><div data-bind="click: $data.toggleCircleModeClicked" class="safari_circle"></div>
</div>
<!-- <div class="row">
    <div class="col-md-2">
        <select class="form-control" data-bind="value: $data.model.relationTypeGuid, options: $data.list.relationTypes, optionsText: 'Text', optionsValue: 'Value'"></select>
    </div>
    <div class="col-md-1">
        <button class="btn btn-default" data-bind="click: $data.filterClicked">Filter</button>
    </div>
</div> -->
`, model)]
                });
                container.appendChild(handle);
                container.appendChild(node);
                container.appendChild(div({ innerHTML: "&nbsp;" }));

                var graph = new AgentGraph({
                    node: node,
                    agentGuid: args.guid,
                    agentGuids: args.guids,
                    handler: {
                        loaded: (data) => {
                            model.data = data;
                            var types = distinct(data.map(x => {
                                return {
                                    Text: x.Type.DominantCode || x.Type.DisplayName,
                                    Value: x.Type.Guid
                                };
                            }), (existing, item) => existing.Value == item.Value);
                            types.unshift({
                                Text: null,
                                Value: null
                            });
                            model.list.relationTypes(types || []);
                        }
                    }
                });
                var win = WindowManager.addWindow({
                    type: "agent-graph",
                    loader: {
                        params: {
                            guid: args.guid,
                            guids: args.guids
                        }
                    },
                    node: container,
                    draggable: {
                        node: handle,
                        stop: () => {
                            graph.resize();
                        }
                    }
                });
                if (shape == "Circle") {
                    model.switchToCircleMode();
                }
                if (surface == "Glass") {
                    model.switchToGlassSurface();
                }
                win.addNodeToLayer(container);
            });
        };
        TextBlock.prototype.loadVideo = function (data) {
            const parsedUrl = new URL(data.video.url);
            const v = parsedUrl.searchParams.get("v");
            const embedUrl = "https://www.youtube.com/embed/" + v;
            var iframe = newElement("IFRAME", {
                attribute: {
                    width: 560,
                    height: 315,
                    src: embedUrl,
                    frameborder: 0
                }
            });
            var node = data.node || document.body;
            node.appendChild(iframe);
        };
        TextBlock.prototype.loadEntityReferences = function (p) {
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
        TextBlock.prototype.loadEntityClicked = function (guid, options) {
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
                                            client.showHideExpansions();
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
                                            _this.loadUserBubbles(users, client);
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
        TextBlock.prototype.editNameClicked = function () {
            this.nameMode("Edit");
        };
        TextBlock.prototype.cancelEditNameClicked = function () {
            this.nameMode("View");
        };
        //TextBlock.prototype.spotlightSentence = function (p) {
        //    const { editor, schema } = p;
        //    const highlight = "#FFFF99";
        //    const diffuseHighlight = "#FFFFE3";
        //    p.setStyle({ opacity: 1 });
        //    this.drawClippedRectangle(p, { fill: highlight });
        //    const sentences = editor.data.properties.filter(x => x.type == "text/sentence" && !x.isDeleted);
        //    const otherSentences = sentences.filter(x => x != p);
        //    const si = sentences.indexOf(p);
        //    if (!schema.spotlight) {
        //        sentences.forEach(s => {
        //            s.setStyle({ opacity: 1, backgroundColor: "transparent" });
        //            if (s.svg) {
        //                s.svg.remove();
        //            }
        //        });
        //        return;
        //    }
        //    otherSentences.forEach(s => {
        //        s.setStyle({ opacity: 0.25, backgroundColor: "transparent" });
        //        if (s.svg) {
        //            s.svg.remove();
        //        }
        //    });
        //    if (si > 0) {
        //        const previous = sentences[si - 1];
        //        this.drawClippedRectangle(previous, { fill: diffuseHighlight });
        //    }
        //    if (si < sentences.length - 2 && sentences.length >= 2) {
        //        const next = sentences[si + 1];
        //        this.drawClippedRectangle(next, { fill: diffuseHighlight });
        //    }
        //};
        TextBlock.prototype.spotlightSentence = function (p) {
            const { editor, schema } = p;
            p.setStyle({ opacity: 1, filter: "unset" });
            const sentences = editor.data.properties.filter(x => x.type == "text/sentence" && !x.isDeleted);
            const otherSentences = sentences.filter(x => x != p);
            const si = sentences.indexOf(p);
            if (!schema.spotlight) {
                sentences.forEach(s => {
                    s.setStyle({ opacity: 1, filter: "unset" });
                });
                return;
            }
            otherSentences.forEach(s => {
                s.setStyle({ opacity: 0.25, filter: "blur(1px)" });
            });
            if (si > 0) {
                const previous = sentences[si - 1];
                previous.setStyle({ opacity: 0.5 });
            }
            if (si < sentences.length - 2 && sentences.length >= 2) {
                const next = sentences[si + 1];
                next.setStyle({ opacity: 0.5 });
            }
        };
        TextBlock.prototype.save = function (callback) {
            var _ = this;
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
            this.state.saveButton.disabled(true);
            this.state.saveButton.saving(true);
            $.post("/Admin/Text/SaveEditorJson", model, function (response) {
                console.log(response);
                if (!response.Success) {
                    alert("There was an error ...");
                    return;
                }
                sessionStorage.setItem("text-add/model", JSON.stringify(model));
                _.state.saveButton.disabled(false);
                _.state.saveButton.saving(false);
                _.updateWithSavedPropertyGuids(response.Data.Properties);
                _.model.Guid = response.Data.TextGuid;
                if (callback) {
                    callback(response.Data.TextGuid);
                }
            });

        };
        TextBlock.prototype.updateWithSavedPropertyGuids = function (properties) {
            const newProperties = this.editor.data.properties.filter(x => !x.guid);
            newProperties.forEach(np => {
                const saved = properties.find(p => p.Index == np.index);
                if (saved) {
                    np.guid = saved.Guid;
                }
            });
        };
        return TextBlock;
    })();

    return TextBlock;
}));
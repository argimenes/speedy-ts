(function (factory) {
    define("speedy/tags/style", ["jquery", "knockout", "app/helpers", "parts/window-manager", "pubsub"], factory);
}(function ($, ko, Helper, _WindowManager, pubsub) {

    const { div, openModal, newElement, updateElement } = Helper;
    const WindowManager = _WindowManager.getWindowManager();
    const closeModal = (element) => {
        $(element).modal("hide");
        ko.cleanNode(element);
        element.remove();
    }

    const tags = {
        "autocomplete/highlight": {
            format: "decorate",
            className: "autocomplete-highlight"
        },
        quotation: {
            format: "decorate",
            className: "quotation"
        },
        blockquote: {
            format: "block",
            className: "blockquote"
        },
        "section": {
            format: "decorate",
            className: "section"
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
                            // var labels = _this.generateLabels(items);
                            var labels = p.editor.client.generateLabels(items);
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
                        p.schema.data.labels.forEach(x => x.label.remove());
                        p.schema.data.labels = [];
                    }
                    if (!!p.schema.data.minimap) {
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
                        // _this.spotlightSentence(p);
                        p.editor.client.spotlightSentence(p);
                    }
                },
                monitor: {
                    mouseover: (p) => {
                        p.schema.method.clearSelection(p);
                        require(["libs/randomColor"], function (randomColor) {
                            const editor = p.editor;
                            const client = editor.client;
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
                            // _this.drawClippedRectangle(p, { stroke: colours[sentenceIndex], strokeWidth: 3 });
                            client.drawClippedRectangle(p, { stroke: colours[sentenceIndex], strokeWidth: 3 });
                            const items = sentences.map((p, i) => {
                                return {
                                    text: i + 1,
                                    colour: colours[i],
                                    property: p
                                }
                            });
                            // var labels = _this.generateLabels(items);
                            var labels = client.generateLabels(items);
                            schema.data.labels = labels;
                            labels.forEach(item => item.property.startNode.appendChild(item.label));
                            editor.updateOffsets();
                            //require(["parts/minimap"], function (Minimap) {
                            //    var minimap = schema.data.minimap = new Minimap({ editor });
                            //    minimap.createBar({ backgroundColor: "none" });
                            //    const properties = sentences.map((s, i) => {
                            //        return { ...s, colour: colours[i] };
                            //    })
                            //    minimap.addMarkers(properties, { hide: false, opacity: "1", usePropertyHeight: true, mixBlendMode: "multiply" });
                            //    const caret = editor.getCaret();
                            //    const cursor = caret.left || caret.right;
                            //    minimap.setArrowAt(cursor);
                            //});
                        });
                    },
                    mouseout: (p) => {
                        console.log("text/sentence: mouseout");
                        p.schema.method.clearSelection(p);
                    }
                }
            }
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
                        const { editor } = p;
                        const { client } = editor;
                        // _this.drawClippedRectangle(p);
                        client.drawClippedRectangle(p);


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
        paragraph: {
            format: "decorate",
            className: "speedy__paragraph"
        },
        "air-quotes": {
            format: "decorate",
            className: "",
            render: {
                update: (p) => {
                    if (p.executed) {
                        return;
                    }
                    const { editor } = p;
                    const left = newElement("IMG", {
                        attribute: {
                            src: "/Images/icons/left-air-quote.png"
                        },
                        style: {
                            width: "20px",
                            height: "auto"
                        }
                    });
                    left.speedy = {
                        stream: 1,
                        role: 0
                    };
                    const right = newElement("IMG", {
                        attribute: {
                            src: "/Images/icons/right-air-quote.png"
                        },
                        style: {
                            width: "20px",
                            height: "auto"
                        }
                    });
                    right.speedy = {
                        stream: 1,
                        role: 0
                    };
                    const container = p.startNode.parentNode;
                    container.insertBefore(left, p.startNode);
                    container.insertBefore(right, p.endNode.nextElementSibling);
                    editor.addCellToChain({ cell: left, right: p.startNode });
                    editor.addCellToChain({ cell: right, right: p.endNode.speedy.next });
                    p.nodes = {
                        left, right
                    };
                    p.executed = true;
                },
                destroy: (p) => {
                    if (p.nodes) {
                        p.nodes.left.remove();
                        p.nodes.right.remove();
                    }
                }
            }
        },
        "todo": {
            format: "decorate",
            className: "",
            render: {
                batchUpdate: (data) => {
                    const { editor, properties } = data;
                    const todos = editor.data.properties.filter(x => !x.isDeleted && x.type == "todo");
                    const labels = properties.map(p => {
                        const { offset } = p.startNode.speedy;
                        if (p.label) {
                            p.label.remove();
                        }
                        const x = offset.x;
                        const y = offset.cy - 15;
                        const i = todos.indexOf(p);
                        const label = newElement("DIV", {
                            style: {
                                position: "absolute",
                                padding: 0,
                                margin: 0,
                                top: y + "px",
                                left: x + "px",
                                height: "15px",
                                fontFamily: "monospace",
                                fontSize: "11px",
                                color: "#333"
                            },
                            innerHTML: "todo #" + (i + 1)
                        });
                        p.label = label;
                        return label;
                    });
                    const fragment = document.createDocumentFragment();
                    labels.forEach(x => fragment.appendChild(x));
                    editor.container.appendChild(fragment);
                },
                destroy: (p) => {
                    if (p.label) {
                        p.label.remove();
                    }
                }
            }
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
                const { editor } = prop;
                const _ = editor.client;
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
        hr: {
            format: "decorate",
            labelRenderer: function (prop) {
                return "line";
            },
            zeroPoint: {
                className: "speedy__line"
            },
            render: {
                update: (p) => {
                    if (p.node) {
                        p.node.remove();
                    }
                    const hr = newElement("HR");
                    hr.speedy = {
                        role: 0,
                        stream: 1
                    };
                    p.startNode.appendChild(hr);
                    p.node = hr;
                }
            }
        },
        rectangle: {
            format: "decorate",
            className: "rectangle",
            labelRenderer: (p) => {
                return "rectangle";
            },
            render: {
                update: (p) => {
                    const { editor } = p;
                    const { client } = editor;
                    // _this.drawClippedRectangle(p);
                    client.drawClippedRectangle(p);
                },
                destroy: (p) => {
                    if (p.svg) {
                        p.svg.remove();
                    }
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
        "item-number": {
            format: "decorate",
            className: "item-number",
            labelRenderer: (p) => {
                return "item " + p.text;
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
            //render: {
            //    update: (p) => {
            //        const img = document.createElement("IMG");
            //        img.speedy = {
            //            stream: 1
            //        };
            //        img.setAttribute("src", p.value);
            //        p.startNode.appendChild(img);
            //    }
            //},
            animation: {
                init: (p) => {
                    //p.attributes.alignment = "left";
                    //p.attributes["right-margin"] = "20px";
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
                        const { editor } = property;
                        if (!property) {
                            return;
                        }
                        var list = property.parent;
                        var item = editor.createBlockProperty2({ type: "list/item", parent: list, startNode: newBlock.firstChild, endNode: newBlock.lastChild });
                    }
                }
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
                const { editor } = p;
                const { client } = editor;
                // var defaultValue = prop.value || !!_.lastLineNumber ? _.lastLineNumber + 1 : 1;
                var defaultValue = prop.value || !!client.lastLineNumber ? client.lastLineNumber + 1 : 1;
                var num = prompt("Line number?", defaultValue);
                if (!!num) {
                    // num = _.lastLineNumber = parseInt(num);
                    num = client.lastLineNumber = parseInt(num);
                }
                process(num);
            }
        },
        "tab": {
            format: "decorate",
            zeroPoint: {
                className: "tab"
            },
            labelRenderer: function () {
                return "tab";
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
        bold: {
            format: "decorate",
            shortcut: "b",
            className: "bold",
            labelRenderer: function () {
                return "<b>bold</b>";
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
        code: {
            format: "decorate",
            shortcut: "",
            className: "code",
            labelRenderer: function () {
                return "<em>code</em>";
            }
        },
        url: {
            format: "decorate",
            shortcut: "",
            className: "url",
            labelRenderer: function () {
                return "<em>url</em>";
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
        }
    };

    return tags;

}));
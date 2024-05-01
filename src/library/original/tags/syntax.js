(function (factory) {
    define("speedy/tags/syntax", ["app/helpers", "parts/window-manager", "pubsub"], factory);
}(function (Helper, _WindowManager, pubsub) {

    const { newElement } = Helper;

    const tags = {
        "named-entity/agent": {
            format: "decorate",
            className: "named-entity",
            labelRenderer: (p) => {
                return p.text + " [NER]";
            },
            attributes: {
                "entity/type": {
                    renderer: function (prop) {
                        return "type [" + (prop.attributes["entity/type"] || "") + "]";
                    }
                },
                "entity/wikipedia-url": {
                    renderer: function (prop) {
                        return "Wikipedia [" + (prop.attributes["entity/wikipedia-url"] || "") + "]";
                    }
                },
                "entity/knowledge-graph-mid": {
                    renderer: function (prop) {
                        return "MID [" + (prop.attributes["entity/knowledge-graph-mid"] || "") + "]";
                    }
                },
            },
            render: {
                options: {
                    colour: "purple",
                    opacity: 0.25,
                    offsetY: 0
                },
                batchUpdate: (data) => {
                    // _this.batchUpdate(data);
                    const { editor, properties } = data;
                    const labels = properties.map(p => {
                        const { offset } = p.startNode.speedy;
                        if (p.labelNode) {
                            p.labelNode.remove();
                        }
                        const x = offset.x;
                        const y = offset.cy - 23;
                        const label = newElement("DIV", {
                            style: {
                                position: "absolute",
                                padding: 0,
                                margin: 0,
                                top: y + "px",
                                left: x + "px",
                                fontFamily: "monospace",
                                fontSize: "11px",
                                color: "gray"
                            },
                            innerHTML: p.attributes["entity/type"]
                        });
                        p.labelNode = label;
                        return label;
                    });
                    const fragment = document.createDocumentFragment();
                    labels.forEach(x => fragment.appendChild(x));
                    editor.container.appendChild(fragment);
                },
                destroy: (p) => {
                    if (p.svg) {
                        p.svg.remove();
                    }
                    if (p.labelNode) {
                        p.labelNode.remove();
                    }
                }
            },
            event: {
                annotation: {
                    "control-click": (p) => {
                        p.remove();
                    },
                    "alt-click": (p) => {
                        console.log("alt-click", { p });
                        const { editor } = p;
                        const { client } = editor;
                        if (client.linkedReferencesManager) {
                            (async () => {
                                await client.linkedReferencesManager.addLinkedReferenceComponent({
                                    agent: {
                                        name: p.text,
                                        guid: p.value
                                    },
                                    handler: {
                                        onCloseClicked: (manager) => {
                                            container.remove();
                                        }
                                    },
                                    linkedReferenceComponent: {
                                        handler: {
                                            onCloseClicked: (component) => {
                                                component.destroy();
                                            },
                                            onTextSelected: (textGuid) => {
                                                client.loadTextWindow(textGuid);
                                            },
                                            onPopoutTextBlockClicked: (args) => {
                                                const { textBlockGuid } = args;
                                            }
                                        }
                                    }
                                });
                            })();
                            return;
                        }
                        pubsub.publish("client/" + client.index + "/load-linked-references-manager", {
                            client: client,
                            property: p,
                            caret: editor.getCaret(),
                            agent: {
                                name: p.text,
                                guid: p.value
                            }
                        });
                    }
                }
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
                        const { editor } = p;
                        const { client } = editor;
                        // _this.drawClippedRectangle(p, { fill: "yellow" });
                        client.drawClippedRectangle(p, { fill: "yellow" }); // need to
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
                        process(magnitude);
                    }
                }
            }
        },
        "syntax/sentence": {
            format: "decorate",
            className: "sentence",
            exportText: false,
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
        }
    };

    return tags;

}));
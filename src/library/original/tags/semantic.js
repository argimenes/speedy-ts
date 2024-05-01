(function (factory) {
    define("speedy/tags/semantic", ["jquery", "knockout", "app/helpers", "parts/window-manager", "pubsub"], factory);
}(function ($, ko, Helper, _WindowManager, pubsub) {

    const { div, openModal, newElement, updateElement, groupBy, drawUnderline } = Helper;
    const WindowManager = _WindowManager.getWindowManager();
    const closeModal = (element) => {
        $(element).modal("hide");
        ko.cleanNode(element);
        element.remove();
    }
    const applyBindings = (html, model) => {
        var node = newElement("DIV", { innerHTML: html });
        ko.applyBindings(model, node);
        return node;
    };

    const batchUpdate = (data) => {
        const { editor, properties } = data;
        const fragment = document.createDocumentFragment();
        const { container } = editor;
        const containerRect = container.getBoundingClientRect();
        const containerWidth = containerRect.width;
        const blockGroup = groupBy(properties, p => editor.getCurrentContainer(p.startNode));
        const blockRows = Array.from(blockGroup);
        blockRows.forEach(row => {
            let container = row[0];
            let blockProperties = row[1];
            blockProperties.forEach(p => {
                const { schema } = p;
                const { options } = schema.render;
                const svg = drawUnderline(p, { containerWidth, stroke: options.colour, strokeOpacity: options.opacity, offsetY: options.offsetY });
                fragment.appendChild(svg);
            });
            container.appendChild(fragment);
        });
    };

    const tags = {
        domain: {
            format: "decorate",
            className: "domain",
            labelRenderer: function (prop) {
                return prop.text ? "<span style='position: relative;'><span class='output-domain hover-item'>domain</span><span class='hover-item-hide'>" + prop.text + "</span></span>" : "<span class='output-domain'>domain<span>";
            },
            propertyValueSelector: function (prop, process) {
                const { editor } = prop;
                const { client } = editor;
                openModal("/Static/Templates/Agent/SearchModal.html", {
                    name: "Agents",
                    ajaxContentAdded: function (element) {
                        require(["modals/search-agents"], function (AgentModal) {
                            // var inline = _.createInlineAgentSelector();
                            var inline = client.createInlineAgentSelector();
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
                                    // inlineAgentSelector: _.createInlineAgentSelector(),
                                    inlineAgentSelector: client.createInlineAgentSelector(),
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
        "trait": {
            format: "decorate",
            className: "",
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
                    batchUpdate(data);
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
                            const client = p.editor.client;
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
                                        // _this.loadTextWindow(guid, document.body);
                                        client.loadTextWindow(guid, document.body);
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
                const client = prop.editor.client;
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
                                // inlineAgentSelector: _.createInlineAgentSelector(),
                                inlineAgentSelector: client.createInlineAgentSelector(),
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
                    // _this.batchUpdate(data);
                    batchUpdate(data);
                },
                destroy: (p) => {
                    if (p.svg) {
                        p.svg.remove();
                    }
                }
            },
            propertyValueSelector: function (prop, process) {
                const client = prop.editor.client;
                require(["modals/search-claims"], function (ClaimModal) {
                    $.get("/Static/Templates/Claim/search-panel.html?v=1", function (html) {
                        var selector = client.createInlineAgentSelector();
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
                const editor = prop.editor;
                const client = editor.client;
                require(["parts/intertext-processor"], function (IntertextProcessor) {
                    openModal("/Static/Templates/Text/intertext-modal.html", {
                        name: "Intertext",
                        ajaxContentAdded: function (element) {
                            // var data = _.editor.unbind();
                            var data = editor.unbind();
                            var mode = (!!prop.value ? "edit" : "add");
                            // var sourceProperties = (mode == "add" ? [prop] : _.editor.data.properties.filter(property => !property.isDeleted && property.type == "source_of_intertext"));
                            var sourceProperties = (mode == "add" ? [prop] : editor.data.properties.filter(property => !property.isDeleted && property.type == "source_of_intertext"));
                            var modal = new IntertextProcessor({
                                popup: element,
                                mode: mode,
                                // section: _.model.Section(),
                                section: client.model.Section(),
                                // name: _.model.Name(),
                                name: client.model.Name(),
                                text: data.text,
                                sourceProperties: sourceProperties.map(property => property.toNode()),
                                handler: {
                                    onIntertextRelatedToTarget: function (data) {
                                        closeModal(element);
                                        // _.editor.addProperties(data.properties);
                                        editor.addProperties(data.properties);
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
                                // _this.loadTextWindow(prop.value, document.body, options);
                                p.editor.client.loadTextWindow(prop.value, document.body, options);
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
            format: "decorate",
            //shortcut: "t",
            className: "",
            labelRenderer: function (prop) {
                return prop.isZeroPoint ? "<span class='output-text'>footnote<span>" : "<span class='output-text'>text<span>";
            },
            render: {
                options: {
                    colour: "yellow",
                    opacity: 0.5,
                    offsetY: 0
                },
                batchUpdate: (data) => {
                    // _this.batchUpdate(data);
                    batchUpdate(data);
                },
                destroy: (p) => {
                    if (p.svg) {
                        p.svg.remove();
                    }
                }
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
                        // _this.loadTextWindow(p.value, document.body);
                        p.editor.client.loadTextWindow(p.value, document.body);
                    }
                }
            },
            zIndex: WindowManager.getNextIndex(),
            right: 50,
            load: function (prop) {
                // _this.loadTextWindow(prop.value);
                p.editor.client.loadTextWindow(prop.value);
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
                    // _this.batchUpdate(data);
                    batchUpdate(data);
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
                    // _this.batchUpdate(data);
                    batchUpdate(data);
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
        agent: {
            format: "decorate",
            className: "",
            labelRenderer: function (prop) {
                return prop.text ? `<span style="position: relative;"><span class='output-agent hover-item'>entity</span><span class="hover-item-hide">` + prop.text + `</span></span>` : `<span class='output-agent'>entity<span>`;
            },
            attributes: {
                name: {
                    renderer: function (prop) {
                        return "name [" + (prop.attributes.name || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                    },
                    selector: function (prop, process) {
                        var name = prompt("Name", prop.attributes.name);
                        process(name);
                    }
                }
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
                    batchUpdate(data);
                },
                destroy: (p) => {
                    if (p.svg) {
                        p.svg.remove();
                    }
                }
            },
            showLinkedReferences: (args) => {
                const p = args.property;
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
                                },
                                onMounted: (manager) => {

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
                    caret: args.caret,
                    agent: {
                        name: p.text,
                        guid: p.value
                    }
                });
            },
            event: {
                annotation: {
                    //"alt-click": function (p) {
                    //    _this.loadEntityClicked(p.value, { tab: "references" });
                    //},
                    "control-click": (p) => {
                        const { editor } = p;
                        const { client } = editor;
                        client.loadEntityReferences(p);
                    },
                    "shift-click": (p) => {
                        p.schema.showLinkedReferences({ property: p });
                    },
                    "alt-click": (p) => {
                        const { editor } = p;
                        const { client } = editor;
                        client.loadEntityClicked(p.value);
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
                    "control-shift-RIGHT-ARROW": (p) => {
                        const { editor } = p;
                        const caret = editor.getCaret();
                        editor.setCarotByNode(caret.right.speedy.next, 0);
                        p.shiftRight();
                    },
                    "control-shift-LEFT-ARROW": (p) => {
                        const { editor } = p;
                        const caret = editor.getCaret();
                        editor.setCarotByNode(caret.left.speedy.previous, 1);
                        p.shiftLeft();
                    },
                    "control-shift-UP-ARROW": (p) => {
                        p.expand();
                    },
                    "control-shift-DOWN-ARROW": (p) => {
                        p.contract();
                    },
                    "control-8": (p) => {
                        Helper.drawUnderline(p);
                    },
                    "CHAR:F3": (args) => {
                        require(["components/entity-inspector"], (EntityInspector) => {
                            const p = args.property;
                            const rect = p.startNode.getBoundingClientRect();
                            const x = rect.x;
                            const y = rect.y + rect.height + 10;
                            const inspector = new EntityInspector({
                                entityGuid: p.value,
                                editor: p.editor,
                                x, y
                            });
                            inspector.open();
                        });
                    },
                    "CHAR:F2": (args) => {
                        const p = args.property;
                        p.schema.showLinkedReferences(args);
                    },
                    "control-shift-B": (p) => {
                        // _this.loadTimeline({ guid: p.value, name: p.text });
                        p.editor.client.loadTimeline({ guid: p.value, name: p.text });
                    },
                    "control-G": (p) => {
                        // _this.loadAgentGraph({ guid: p.value });
                        p.editor.client.loadAgentGraph({ guid: p.value });
                    },
                    "control- ": function (p, e) {
                        // _this.loadEntityReferences(p);
                        // p.editor.client.loadEntityReferences(p);
                        p.editor.client.loadMonitorPanel({ editor: p.editor, e: e });
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
                    "control-Q": function (p) {
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
                                            //_this.loadTextWindow(items[0].Guid, document.body);
                                            p.editor.client.loadTextWindow(items[0].Guid, document.body);
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
                            // var inline = _.createInlineAgentSelector();
                            var inline = prop.editor.client.createInlineAgentSelector();
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
                // _.selectAgent(prop, process);
                prop.editor.client.selectAgent(prop, process);
            },
        }
    };

    return tags;

}));
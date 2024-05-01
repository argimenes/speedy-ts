(function (factory) {
    define("parts/text-graph", ["jquery", "cytoscape", "cytoscape/cose-bilkent", "cytoscape/edgehandles","app/helpers", "knockout"], factory);
}(function ($, cytoscape, coseBilkent, edgehandles, Helpers, ko) {

    coseBilkent(cytoscape);
    edgehandles(cytoscape);

    const applyBindings = (html, model) => {
        var node = Helpers.newElement("DIV", { innerHTML: html });
        ko.applyBindings(model, node);
        return node;
    }

    class Model {
        constructor(cons) {
            this.layout = "cose"; // cons.layout;
            this.node = cons.node;
            this.textGuid = cons.textGuid;
            this.textGuids = cons.textGuids;
            this.textBlockGuids = cons.textBlockGuids;
            this.graph = null;
            this.load();

        }
        distinct(arr, func) {
            const result = [];
            const map = new Map();
            for (const item of arr) {
                if (!map.has(func(item))) {
                    map.set(func(item), true);    // set any value to Map
                    result.push(item);
                }
            }
            return result;
        }
        loadStatementsClicked() {
            this.loadStatements();
        }
        loadStatements() {
            var _this = this;
            $.get("/Admin/Text/TextStatements", { id: this.textGuid }, response => {
                console.log("/Admin/Text/TextStatements", response);
                if (!response.Data.length) {
                    return;
                }
                _this.addStatementsToGraph(response.Data);
            });
        }
        addStatementsToGraph(data) {
            var elements = this.toStatementElements(data);
            var cy = this.graph;
            var nodes = elements.filter(x => !x.data.source && !cy.$id(x.data.id).length);
            var edges = elements.filter(x => x.data.source && !cy.elements("edge#" + x.data.id).length);
            console.log({ elements, nodes, edges });
            if (!edges.length) {
                return;
            }
            nodes.forEach(x => {
                cy.add({
                    group: "nodes",
                    data: x.data
                });
            });
            cy.add(edges.map(x => {
                return {
                    group: "edges",
                    data: x.data
                };
            }));
            cy.layout({ name: this.layout }).run();
        }
        toStatementElements(data) {
            var sourceNodes = data.map(x => {
                var result = {
                    data: {
                        name: x.Source.Name,
                        id: x.Source.Guid,
                        type: "agent"
                    }
                };
                if (x.Source.ImageURL) {
                    result.data["image"] = x.Source.ImageURL;
                }
                return result;
            });

            var targetNodes = data.map(x => {
                var result = {
                    data: {
                        name: x.Target.Name,
                        id: x.Target.Guid,
                        type: "agent"
                    }
                };
                if (x.Target.ImageURL) {
                    result.data["image"] = x.Target.ImageURL;
                }
                return result;
            });

            var elements = this.distinct(sourceNodes.concat(targetNodes), x => x.data.id);
            return elements;
        }
        load() {
            var _this = this;
            if (this.textGuid) {
                $.get("/Admin/Text/TextRelations", { id: this.textGuid }, response => {
                    console.log("/Admin/Text/TextRelations", response);
                    if (!response.Data.length) {
                        return;
                    }
                    _this.drawGraph(response.Data);
                });
            } else if (this.textBlockGuids) {
                $.post("/Admin/Text/ManyTextBlockRelations", { guids: this.textBlockGuids.join(",") }, response => {
                    console.log("/Admin/Text/ManyTextBlockRelations", response);
                    if (!response.Data.length) {
                        return;
                    }
                    _this.drawGraph(response.Data);
                });
            } else {
                $.get("/Admin/Text/ManyTextRelations", { guids: this.textGuids.join(",") }, response => {
                    console.log("/Admin/Text/ManyTextRelations", response);
                    if (!response.Data.length) {
                        return;
                    }
                    _this.drawGraph(response.Data);
                });
            }

        }
        toElements(data) {
            var sourceNodes = data.map(x => {
                var result = {
                    data: {
                        name: x.Source.Name,
                        id: x.Source.Guid,
                        type: "agent"
                    }
                };
                if (x.Source.ImageURL) {
                    result.data["image"] = x.Source.ImageURL;
                }
                return result;
            });
            var targetNodes = data.map(x => {
                var result = {
                    data: {
                        name: x.Target.Name,
                        id: x.Target.Guid,
                        type: "agent"
                    }
                };
                if (x.Target.ImageURL) {
                    result.data["image"] = x.Target.ImageURL;
                }
                return result;
            });
            var edges = data.map(x => {
                var source = x.Source.IsDominant ? x.Source.Guid : x.Target.Guid;
                var target = !x.Target.IsDominant ? x.Target.Guid : x.Source.Guid;
                var result = {
                    data: {
                        metaRelationStandoffProperty: x.MetaRelationStandoffProperty,
                        id: source + "_" + x.Type.Name + "_" + target,
                        name: (x.Type.DominantCode || x.Type.Name).replace(/-/g, " ").replace(/_/g, " "),
                        source: source,
                        target: target,
                        type: "agent"
                    }
                };

                return result;
            });
            var elements = this.distinct(sourceNodes.concat(targetNodes).concat(edges), x => x.data.id);
            return elements;
        }
        drawGraph(data) {
            var _this = this;
            this.node.style.display = "block";
            var elements = this.toElements(data);
            console.log({ elements });
            var layout = null;
            var cy = this.graph = cytoscape({
                container: this.node, // container to render in
                elements: elements,
                wheelSensitivity: 0.25,
                layout: {
                    name: "cose"
                },
                ready: function () {
                    layout = this.layout({
                        name: _this.layout,
                        animationDuration: 1000,
                        randomize: true
                    });
                    layout.run();
                },
                style: [ // the stylesheet for the graph
                    {
                        selector: 'node',
                        style: {
                            'background-opacity': '0',
                            //'background-color': 'rgba(255, 255, 255, 0.8)',
                            //'background-image': 'data(image)',
                            'background-fit': 'cover cover',
                            'label': 'data(name)',
                            'font-family': "Inter",
                            'font-size': '0.4em',
                            "text-wrap": "wrap",
                            "text-max-width": 80,
                            'text-valign': function (ele) { return !!ele.data().image ? "top" : "center"; },
                            'text-halign': 'center',
                        }
                    },
                    {
                        selector: 'edge',
                        style: {
                            'width': 1,
                            'label': 'data(name)',
                            'curve-style': 'taxi',
                            'line-color': ele => !!ele.data().metaRelationStandoffProperty ? 'red' : '#ccc',
                            'target-arrow-color': '#ccc',
                            'target-arrow-shape': 'triangle',
                            'font-family': "Inter",
                            'font-size': '0.3em',
                            'opacity': '0.8',
                            'color': 'blue'
                        }
                    },
                    {
                        selector: 'node.highlight',
                        style: {
                            'border-color': '#FFF',
                            'border-width': '2px'
                        }
                    },
                    {
                        selector: 'node.semitransp',
                        style: { 'opacity': '0.3' }
                    },
                    {
                        selector: 'edge.highlight',
                        style: { 'mid-target-arrow-color': '#FFF' }
                    },
                    {
                        selector: 'edge.semitransp',
                        style: { 'opacity': '0.1' }
                    }
                ]
            });
            cy.on('click', 'node', function (evt) {
                var node = evt.target;
                var id = node._private.data.id;
                _this.fetchMetaRelationsForAgent(id);
                //_this.fetchStatementsForAgent(id);
            });
            cy.on("click", "edge", (e) => {
                console.log({ e });
                const edge = e.target;
                var data = edge._private.data;
                console.log({ data });
                if (!data.metaRelationStandoffProperty) {
                    return;
                }
                $.get("/Admin/Text/FindTextBlockWithMetaRelationJson", { metaRelationGuid: data.metaRelationStandoffProperty.Guid }, function (response) {
                    console.log("/Admin/Text/FindTextBlockWithMetaRelationJson", response);
                    const text = response.Data.Text;
                    const blockStartIndex = response.Data.BlockStartIndex;
                    var element = Helpers.newElement("DIV", {
                        classList: ["editor"],
                        style: {
                            width: "500px",
                            height: "100%",
                            maxHeight: "400px",
                            padding: "15px",
                            fontSize: "1rem",
                            fontFamily: "Arial",
                            overflowX: "hidden",
                            overflowY: "scroll",
                            borderRadius: "10px",
                            lineHeight: "1.75rem",
                            resize: "none"
                        }
                    });
                    var bar = applyBindings(`<div class="safari_buttons" style="background-color: #fff;"><div data-bind="click: $data.closeClicked" class="safari_close"></div><div class="safari_minimize"></div><div class="safari_zoom"></div></div>`, { closeClicked: function () { container.remove(); } });
                    var rect = _this.node.getBoundingClientRect();
                    var box = e.target.renderedBoundingBox();
                    var top = rect.y + box.y1 + 50;
                    var left = rect.x + box.x1 + 50;
                    var container = Helpers.newElement("DIV", {
                        style: {
                            position: "absolute",
                            zIndex: 1000,
                            top: top + "px",
                            left: left + "px",
                            borderRadius: "5px",
                            boxShadow: "0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)"
                        },
                        children: [bar, element]
                    });
                    document.body.appendChild(container);
                    require(["parts/text-add"], function (Editor) {
                        var editor = new Editor();
                        var properties = response.Data.Properties.map(sp => {
                            return {
                                guid: sp.g,
                                type: sp.y,
                                value: sp.v,
                                startIndex: sp.s - blockStartIndex,
                                endIndex: sp.e - blockStartIndex
                            }
                        });
                        properties.push({
                            startIndex: data.metaRelationStandoffProperty.StartIndex - blockStartIndex,
                            endIndex: data.metaRelationStandoffProperty.EndIndex - blockStartIndex,
                            type: "highlight"
                        });
                        editor.setupEditor({ container: element });
                        editor.editor.bind({
                            text: text,
                            properties: properties
                        });
                        element.style.height = element.scrollHeight + "px";
                        var isOpen = true;
                        $(container).draggable({
                            scroll: false
                        });
                    });
                });
            });
            cy.on('mouseover', 'node', function (e) {
                var sel = e.target;
                cy.elements()
                    .difference(sel.outgoers()
                        .union(sel.incomers()))
                    .not(sel)
                    .addClass('semitransp');
                sel.addClass('highlight')
                    .outgoers()
                    .union(sel.incomers())
                    .addClass('highlight');
            });
            cy.on('mouseout', 'node', function (e) {
                var sel = e.target;
                cy.elements()
                    .removeClass('semitransp');
                sel.removeClass('highlight')
                    .outgoers()
                    .union(sel.incomers())
                    .removeClass('highlight');
            });
            cy.on("cxttapend", "node", function (e) {
                console.log({ e });
                var node = e.target;
                var guid = node._private.data.id;
                require(["modals/search-texts", "parts/text-add"], function (TextModal, QuickAdd) {
                    var client = new QuickAdd();
                    client.loadEntityClicked(guid, {
                        left: 400, top: 200
                    });
                });
            });
            cy.fit();
            this.loadStatements();
        }
        fetchMetaRelationsForAgent(id) {
            var _this = this;
            var cy = this.graph;
            $.get("/Admin/Agent/MetaRelations", { id: id }, response => {
                console.log("/Admin/Agent/MetaRelations", response);
                if (!response.Data.length) {
                    return;
                }
                var elements = _this.toElements(response.Data);
                var nodes = elements.filter(x => !x.data.source && !cy.$id(x.data.id).length);
                var edges = elements.filter(x => x.data.source && !cy.elements("edge#" + x.data.id).length);
                console.log({ elements, nodes, edges });
                if (!edges.length) {
                    return;
                }
                nodes.forEach(x => {
                    cy.add({
                        group: "nodes",
                        data: x.data
                    });
                });
                cy.add(edges.map(x => {
                    return {
                        group: "edges",
                        data: x.data
                    };
                }));
                cy.layout({ name: _this.layout, randomize: false }).run();
            });
        }
        fetchStatementsForAgent(id) {
            var _this = this;
            var cy = this.graph;
            $.get("/Admin/Agent/StatementsForAgent", { id: id }, response => {
                console.log("/Admin/Agent/StatementsForAgent", response);
                if (!response.Data.length) {
                    return;
                }
                var elements = _this.toStatementElements(response.Data);
                var nodes = elements.filter(x => !x.data.source && !cy.$id(x.data.id).length);
                var edges = elements.filter(x => x.data.source && !cy.elements("edge#" + x.data.id).length);
                console.log({ elements, nodes, edges });
                if (!edges.length) {
                    return;
                }
                nodes.forEach(x => {
                    cy.add({
                        group: "nodes",
                        data: x.data
                    });
                });
                cy.add(edges.map(x => {
                    return {
                        group: "edges",
                        data: x.data
                    };
                }));
                cy.layout({ name: _this.layout, randomize: false }).run();
            });
        }
        applyBindings(node) {
            ko.applyBindings(this, node);
        }
    }

    return Model;

}));
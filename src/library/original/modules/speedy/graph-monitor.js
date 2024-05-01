(function (factory) {
    define("parts/text-graph", ["jquery", "cytoscape"], factory);
}(function ($, cytoscape) {

    class GraphMonitor {
        constructor(cons) {
            this.layout = cons.layout;
            this.node = cons.node;
            this.textGuid = cons.textGuid;
            this.graph = null;

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
        update(data) {
            var current = data.editor.getCurrentNodeWithIndex();
            this.load(current.index);
        }
        load(index) {
            var _this = this;
            $.get("/Admin/Text/TextRelations", { id: this.textGuid, index: index }, response => {
                console.log("/Admin/Text/TextRelations", response);
                if (!response.Data.length) {
                    return;
                }
                _this.drawGraph(response.Data);
            });            
        }
        toElements(data) {
            var sourceNodes = data.map(x => {
                return {
                    data: {
                        name: x.Source.Name,
                        id: x.Source.Guid,
                        type: "agent"
                    }
                };
            });
            var targetNodes = data.map(x => {
                return {
                    data: {
                        name: x.Target.Name,
                        id: x.Target.Guid,
                        type: "agent"
                    }
                }
            });
            var edges = data.map(x => {
                var source = x.Source.IsDominant ? x.Source.Guid : x.Target.Guid;
                var target = !x.Target.IsDominant ? x.Target.Guid : x.Source.Guid;
                return {
                    data: {
                        id: source + "_" + x.Type.DisplayName + "_" + target,
                        name: (x.Type.DominantCode || x.Type.DisplayName).replace(/-/g, " ").replace(/_/g, " "),
                        source: source,
                        target: target,
                        type: "agent"
                    }
                };
            });
            var elements = this.distinct(sourceNodes.concat(targetNodes).concat(edges), x => x.data.id);
            return elements;
        }
        drawGraph(data) {
            var _this = this;
            this.node.style.display = "block";
            var elements = this.toElements(data);
            console.log({ elements });
            var cy = this.graph = cytoscape({
                container: this.node, // container to render in
                elements: elements,
                ready: function () {
                    this.layout({
                        name: 'cose', animationDuration: 1000
                    }).run();
                },
                style: [ // the stylesheet for the graph
                    {
                        selector: 'node',
                        style: {
                            'background-color': function (ele) { return ele.data().type == "agent" ? "#666" : "orange"; },
                            'shape': function (ele) { return ele.data().type == "agent" ? "circle" : "hexagon"; },
                            'width': function (ele) { return ele.data().type == "agent" ? "30px" : "20px"; },
                            'height': function (ele) { return ele.data().type == "agent" ? "30px" : "20px"; },
                            'color': function (ele) { return ele.data().type == "agent" ? "#666" : "orange"; },
                            'label': 'data(name)',
                            'font-size': '0.5em'
                        }
                    },
                    {
                        selector: 'edge',
                        style: {
                            'width': 3,
                            'label': 'data(name)',
                            'curve-style': 'bezier',
                            'line-color': 'red',
                            'target-arrow-color': 'red',
                            'target-arrow-shape': 'triangle',
                            'font-size': '0.4em',
                            'opacity': '0.8',
                            'color': function (ele) { return ele.data().type == "agent" ? "blue" : "orange"; },
                        }
                    }
                ]
            });
            cy.on('click', 'node', function (evt) {
                var node = evt.target;
                var id = node._private.data.id;
                _this.fetchMetaRelationsForAgent(id);
            });
            cy.fit();            
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
                cy.layout({ name: "cose" }).run();
            });
        }        
        applyBindings(node) {
            ko.applyBindings(this, node);
        }
    }

    return GraphMonitor;

}));
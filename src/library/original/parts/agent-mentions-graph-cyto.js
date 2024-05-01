(function (factory) {
    define("parts/agent-mentions-graph", ["jquery", "cytoscape"], factory);
}(function ($, cytoscape) {


    class Model {
        constructor(cons) {
            this.layout = cons.layout;
            this.node = cons.node;
            this.agentGuid = cons.agentGuid;
            this.elements = [];
            this.load();
        }
        distinct(arr, func) {
            const result = [];
            const map = new Map();
            for (const item of arr) {
                if (!map.has(func(item))) {
                    map.set(func(item), true);
                    result.push(item);
                }
            }
            return result;
        }
        load() {
            var _this = this;
            $.get("/Admin/Agent/MentionsFromAgent", { id: this.agentGuid }, response => {
                console.log("/Admin/Agent/MentionsFromAgent", response);
                if (!response.Data.length) {
                    return;
                }
                _this.drawGraph(response.Data);
            });
        }
        toElements(data) {
            var agentNodes = data.map(x => {
                var result = {
                    data: {
                        type: "agent",
                        name: x.Name,
                        guid: x.Guid,
                    }
                };
                if (x.ImageURL) {
                    result.data["image"] = x.ImageURL;
                }
                return result;
            });
            var edges = data.map(x => {
                var sourceName = x.Source.IsDominant ? x.Source.Name : x.Target.Name;
                var targetName = !x.Target.IsDominant ? x.Target.Name : x.Source.Name;
                return {
                    data: {
                        id: sourceName + "_" + x.Type.DisplayName + "_" + targetName,
                        name: (x.Type.DominantCode || x.Type.DisplayName).replace(/-/g, " ").replace(/_/g, " "),
                        source: sourceName,
                        target: targetName
                    }
                };
            });
            var elements = this.distinct(sourceNodes.concat(targetNodes).concat(edges), x => x.data.id);
            //elements = elements.concat(edges);
            return elements;
        }
        drawGraph(data) {
            var _this = this;
            this.node.style.display = "block";
            var elements = this.toElements(data);
            console.log({ elements });
            var layout = null;
            var cy = cytoscape({
                container: this.node,
                elements: elements,
                wheelSensitivity: 0.25,
                ready: function () {
                    layout = this.layout({
                        name: 'cose', animationDuration: 1000
                    });
                    layout.run();
                },
                style: [
                    {
                        selector: 'node',
                        style: {
                            'background-color': 'rgba(255, 255, 255, 0.8)',
                            'background-image': 'data(image)',
                            'background-fit': 'cover cover',
                            'label': 'data(id)',
                            'color': function (ele) {
                                console.log({ ele, agentGuid: _this.agentGuid });
                                return ele.data().guid == _this.agentGuid ? 'red' : '#000'
                            },
                            'font-size': '0.5em',
                            "text-wrap": "wrap",
                            "text-max-width": 80,
                            'text-valign': function (ele) { return !!ele.data().image ? "top" : "center"; },
                            'text-halign': 'center',
                        }
                    },
                    {
                        selector: 'edge',
                        style: {
                            'width': 3,
                            'label': 'data(name)',
                            'curve-style': 'bezier',
                            'opacity': 0.5,
                            'line-color': '#ccc',
                            'target-arrow-color': '#ccc',
                            'target-arrow-shape': 'triangle',
                            'font-size': '0.4em',
                            'opacity': '0.8',
                            'color': 'blue'
                        }
                    }
                ],
                //layout: {
                //    name: this.layout
                //}
            });

            cy.on('click', 'node', function (evt) {
                var node = evt.target;
                $.get("/Admin/Agent/MetaRelations", { id: node._private.data.guid }, response => {
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
            });
            cy.fit();
        }
        applyBindings(node) {
            ko.applyBindings(this, node);
        }
    }

    return Model;

}));
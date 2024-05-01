(function (factory) {
    define("parts/agent-graph", ["jquery", "cytoscape", "cytoscape/cose-bilkent", "cytoscape/edgehandles"], factory);
}(function ($, cytoscape, coseBilkent, edgehandles) {

    coseBilkent(cytoscape);
    edgehandles(cytoscape);

    var cache = {
        identicon: {}
    };

    class Model {
        constructor(cons) {
            cons = cons || {};
            cons.handler = cons.handler || {};
            this.layout = cons.layout;
            this.node = cons.node;
            this.agentGuid = cons.agentGuid;
            this.agentGuids = cons.agentGuids;
            this.cy = null;
            this.elements = [];
            this.data = [];
            this.handler = {
                loaded: cons.handler.loaded
            };
            this.images = [
                "nebula.png",
                "pleiades.png",
                "blackhole-2.jpg",
                "magic-ball.jpg",
                "blackhole-1.jpg",
                "galaxy-ball.jpg",
                // planets
                "jupiter.png",
                "mars.png",
                "venus.jpg",
                "mercury.png",
                "jupiter.png",
                "neptune.png",
                "plasma-1.jpg",
                "plasma-2.jpg",
                "palantir-sauron.jpg",
                "palantir-model.jpg",
                "moon.png",
            ];
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
            if (this.agentGuid) {
                $.get("/Admin/Agent/MetaRelations", { id: this.agentGuid }, response => {
                    console.log("/Admin/Agent/MetaRelations", response);
                    if (!response.Data.length) {
                        return;
                    }
                    _this.data = response.Data;
                    _this.drawGraph(response.Data);
                    if (_this.handler.loaded) {
                        _this.handler.loaded(_this.data);
                    }
                });
            } else {
                var guids = this.agentGuids.join(",");
                $.get("/Admin/Agent/ManyMetaRelations", { guids: guids }, response => {
                    console.log("/Admin/Agent/ManyMetaRelations", response);
                    if (!response.Data.length) {
                        return;
                    }
                    _this.data = response.Data;
                    _this.drawGraph(response.Data);
                    if (_this.handler.loaded) {
                        _this.handler.loaded(_this.data);
                    }
                });
            }
        }
        getRandomImage(args) {
            if (args.imageUrl) {
                return args.imageUrl;
            }
            const max = this.images.length, min = 0;
            const rnd = Math.floor(Math.random() * (max - min) + min);
            const url = "/Images/graph/nodes/" + this.images[rnd];
            return url;
        }
        toElements(data) {
            const edges = data.map(x => {
                const sourceName = x.Source.IsDominant ? x.Source.Name : x.Target.Name;
                const targetName = !x.Target.IsDominant ? x.Target.Name : x.Source.Name;
                const typeName = x.Type.Name || x.Type.DominantName;
                return {
                    data: {
                        id: sourceName + "_" + typeName + "_" + targetName,
                        guid: x.Type.Guid,
                        isDominant: x.Source.IsDominant,
                        name: typeName,
                        source: sourceName,
                        target: targetName
                    }
                };
            });
            const sourceNodes = data.map(x => {
                var result = {
                    data: {
                        id: x.Source.Name,
                        guid: x.Source.Guid,
                    }
                };
                //if (x.Source.ImageURL) {
                //    result.data["image"] = x.Source.ImageURL;
                //}
                result.data["image"] = this.getRandomImage({ id: x.Source.Guid, imageUrl: x.Source.ImageURL });
                return result;
            });
            const targetNodes = data.map(x => {
                var result = {
                    data: {
                        id: x.Target.Name,
                        guid: x.Target.Guid
                    }
                }
                //if (x.Target.ImageURL) {
                //    result.data["image"] = x.Target.ImageURL;
                //}
                result.data["image"] = this.getRandomImage({ id: x.Target.Guid, imageUrl: x.Target.ImageURL });
                return result;
            });
            const elements = this.distinct(sourceNodes.concat(targetNodes).concat(edges), x => x.data.id);
            //elements = elements.concat(edges);
            return elements;
        }
        resize() {
            this.cy.fit()
            this.cy.center()
            this.cy.resize();
        }
        drawGraph(data) {
            var _this = this;
            this.node.style.display = "block";
            var elements = this.toElements(data);
            console.log({ elements });
            //const layoutConfig = {
            //    name: "cose-bilkent",
            //    handleDisconnected: true,
            //    animate: true,
            //    avoidOverlap: true,
            //    infinite: false,
            //    unconstrIter: 1,
            //    userConstIter: 0,
            //    allConstIter: 1,
            //    ready: e => {
            //        e.cy.fit()
            //        e.cy.center()
            //    }
            //}
            const layoutConfig = this.layoutConfig = {
                name: "cose",
                animate: true,
                ready: e => {
                    e.cy.fit()
                    e.cy.center()
                }
            }
            var cy = this.cy = cytoscape({
                container: this.node,
                elements: elements,
                wheelSensitivity: 0.25,
                //layout: {
                //    name: 'cose-bilkent',
                //    directed: true
                //},
                layout: {
                    name: 'cose',
                },
                ready: function () {
                    //layout = this.layout({
                    //    name: 'cose', animationDuration: 1000
                    //});
                    //layout.run();
                },
                style: [
                    {
                        selector: 'node',
                        style: {
                            // 'background-color': 'rgba(255, 255, 255, 0.8)',
                            // 'background-image': 'data(image)',
                            // 'background-fit': 'cover cover',
                            // 'background-repeat': 'no-repeat',
                            // 'background-position': 'center center',
                            'label': 'data(id)',
                            'color': function (ele) {
                                console.log({ ele, agentGuid: _this.agentGuid });
                                return ele.data().guid == _this.agentGuid ? 'red' : 'gray' // '#000'
                            },
                            'font-family': "Inter",
                            'font-size': '0.4em',
                            "text-wrap": "wrap",
                            'border-width': 0,
                            "text-max-width": 60,
                            'text-valign': function (ele) { return !!ele.data().image ? "top" : "center"; },
                            'text-halign': 'center',
                        }
                    },
                    {
                        selector: 'edge',
                        style: {
                            'width': 1,
                            'label': 'data(name)',
                            'curve-style': 'bezier',
                            'opacity': 0.5,
                            'line-color': 'gray',
                            'target-arrow-color': 'gray',
                            'target-arrow-shape': 'vee',
                            'font-family': "Inter",
                            'font-size': '0.3em',
                            'opacity': '0.8',
                            'color': '#333' // 'blue'
                        }
                    },
                    {
                        selector: 'node.highlight',
                        style: {
                            'border-color': '#333',
                            'border-width': '2px'
                        }
                    },
                    {
                        selector: 'node.semitransp',
                        style: { 'opacity': '0.3' }
                    },
                    {
                        selector: 'edge.highlight',
                        style: { 'mid-target-arrow-color': '#333' }
                    },
                    {
                        selector: 'edge.semitransp',
                        style: { 'opacity': '0.1' }
                    }
                ],

            });
            cy.on('click', 'node', function (evt) {
                var node = evt.target;
                const e = evt.originalEvent;
                const id = node._private.data.guid;
                if (e.ctrlKey) {
                    cy.remove(node);
                    return;
                }
                $.get("/Admin/Agent/MetaRelations", { id: node._private.data.guid }, response => {
                    console.log("/Admin/Agent/MetaRelations", response);
                    if (!response.Data.length) {
                        return;
                    }
                    _this.addRelations(response.Data);
                });
            });
            cy.on('mouseover', 'node', function (e) {
                const sel = e.target;
                _this.highlightContext(sel);
            });
            cy.on('mouseout', 'node', function (e) {
                var sel = e.target;
                _this.unhighlightContext(sel);
            });
            // context menu event
            cy.on("cxttapend", "node", function (e) {
                var node = e.target;
                var guid = node._private.data.guid;
                require(["modals/search-texts", "parts/text-add"], function (TextModal, QuickAdd) {
                    var client = new QuickAdd();
                    client.loadEntityClicked(guid, {
                        left: 400, top: 200
                    });
                });
            });
            cy.fit();
        }
        highlightContext(sel) {
            const { cy } = this;
            cy.elements()
                .difference(sel.outgoers()
                    .union(sel.incomers()))
                .not(sel)
                .addClass('semitransp');
            sel.addClass('highlight')
                .outgoers()
                .union(sel.incomers())
                .addClass('highlight');
        }
        unhighlightContext(sel) {
            const { cy } = this;
            cy.elements()
                .removeClass('semitransp');
            sel.removeClass('highlight')
                .outgoers()
                .union(sel.incomers())
                .removeClass('highlight');
        }
        addRelations(data) {
            const { cy, layoutConfig } = this;
            const elements = this.toElements(data);
            const nodes = elements.filter(x => !x.data.source && !cy.$id(x.data.id).length);
            const edges = elements.filter(x => x.data.source && !cy.elements("edge#" + x.data.id).length);
            //console.log({ elements, nodes, edges });
            if (!nodes.length || !edges.length) {
                return;
            }
            cy.nodes().forEach(node => {
                node.lock();
            });
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
            const layout = cy.makeLayout(layoutConfig);
            layout.run();
            layout.on("layoutstop", () => {
                cy.nodes().forEach(node => {
                    node.unlock();
                })
            });
        }
        setFilter(filter) {

        }
        hideRelations(guid) {
            this.cy.edges().filter(el => {
                return el.data("guid") == guid && el.data("isDominant") == true;
            }).targets().style("display", "none");
        }
        showRelations(guid) {
            this.cy.edges().filter(el => {
                return el.data("guid") == guid && el.data("isDominant") == true;
            }).targets().style("display", "element");
        }
        applyBindings(node) {
            ko.applyBindings(this, node);
        }
    }

    return Model;

}));
(function (factory) {
    define("parts/text-graph", ["jquery", "knockout"], factory);
}(function ($, ko) {

    class Model {
        constructor(cons) {
            this.textGuid = cons.textGuid;
            this.results = ko.observableArray([]);
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
        
        load() {
            var _this = this;
            $.get("/Admin/Text/TextRelations", { id: this.textGuid }, response => {
                console.log("/Admin/Text/TextRelations", response);
                if (!response.Data.length) {
                    return;
                }
                _this.drawGraph(response.Data);
            });
            var familyRelationGuid = "3875d5b8-5b93-4091-b185-6a8aaddbe0ed";
            $.get("/Admin/Text/TextHigherRelations", { textGuid: this.textGuid, conceptGuid: familyRelationGuid }, response => {
                console.log("/Admin/Text/TextHigherRelations", response);
                // _this.drawGraph(response.Data);
            });
        }
        drawGraph(data) {
            $("#sigma-container").show();
            var s = new sigma(
                {
                    renderer: {
                        container: document.getElementById('sigma-container'),
                        type: 'canvas'
                    },
                    settings: {
                        minEdgeSize: 0.1,
                        maxEdgeSize: 4,
                        minNodeSize: 1,
                        maxNodeSize: 15,
                        defaultLabelSize: 20,
                        edgeLabelSize: "proportional",
                        defaultEdgeLabelSize: 15,
                        minArrowSize: 15
                    }
                }
            );
            var N = data.length;
            var sourceNodes = data.map((x, i) => {
                return {
                    id: x.Source.Guid,
                    label: x.Source.Name,
                    x: Math.random(),
                    y: Math.random(),
                    size: 20,
                    color: '#EE651D'
                };
            });
            var targetNodes = data.map((x, i) => {
                return {
                    id: x.Target.Guid,
                    label: x.Target.Name,
                    x: Math.random(),
                    y: Math.random(),
                    size: 20,
                    color: '#EE651D'
                };
            });
            var nodes = this.distinct(sourceNodes.concat(targetNodes), x => x.id);
            var edges = this.distinct(data.filter(x => x.Source.IsDominant).map((x, i) => {
                return {
                    id: x.Type.Guid,
                    source: x.Source.Guid,
                    target: x.Target.Guid,
                    label: (x.Type.DominantCode || x.Type.DominantName || x.Type.Name) + " of",
                    color: '#202020',
                    count: 0,
                    size: 20,
                    type: "arrow"
                };
            }), x => x.id);
            var map = {};
            for (var i = 0; i < edges.length; i++) {
                var edge = edges[i];
                var id = edge.source + edge.target;
                if (map[id]) {
                    edge.count = map[id]++;
                    edge.type = "curvedArrow";
                    continue;
                }
                map[id] = 1;
            }
            var graph = {
                nodes: nodes,
                edges: edges
            };
            console.log({ graph });
            s.graph.read(graph);
            s.refresh();
            s.startForceAtlas2({
                worker: true,
                adjustSizes: true,
                gravity: 1,
                startingIterations: 50,
                barnesHutOptimize: true
            });
            s.killForceAtlas2();
            // Initialize the dragNodes plugin:
            var dragListener = sigma.plugins.dragNodes(s, s.renderers[0]);
            dragListener.bind('startdrag', function (event) {
                console.log(event);
            });
            dragListener.bind('drag', function (event) {
                console.log(event);
            });
            dragListener.bind('drop', function (event) {
                console.log(event);
            });
            dragListener.bind('dragend', function (event) {
                console.log(event);
            });
        }
        applyBindings(node) {
            ko.applyBindings(this, node);
        }
    }

    return Model;

}));
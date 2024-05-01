(function (factory) {
    define("modals/search-mentions", ["knockout", "jquery", "app/helpers", "app/utils", "google/maps", "bootstrap"], factory);
}(function (ko, $, Helper, Utils) {

    var openModal = Helper.openModal;
    var setList = Helper.setList;
    var any = Utils.any;
    var emptyItem = { Text: null, Value: null };

    //
    // This ensures that tooltips are applied to all targets, whether or not they are dynamically created.
    //
    $("body").tooltip({
        selector: '[data-toggle="tooltip"]'
    });

    function groupBy(list, keyGetter) {
        const map = new Map();
        list.forEach((item) => {
            const key = keyGetter(item);
            const collection = map.get(key);
            if (!collection) {
                map.set(key, [item]);
            } else {
                collection.push(item);
            }
        });
        return map;
    }
    function distinct(value, index, self) {
        return self.indexOf(value) === index;
    }

    function addToList(key, item) {
        var list = JSON.parse(sessionStorage.getItem(key)) || [];
        if (any(list, function (x) { return JSON.stringify(x) == JSON.stringify(item); })) {
            return;
        }
        list.splice(0, 0, item);
        sessionStorage.setItem(key, JSON.stringify(list));
    }

    var Modal = (function () {
        function Modal(cons) {
            cons = cons || {};
            cons.filter = cons.filter || {};
            cons.component = cons.component || {};
            cons.component.map = cons.component.map || {};
            this.component = {
                map: new google.maps.Map(cons.component.map.node, { zoom: 16 })
            };
            this.filter = {
                Text: ko.observable(),
                Section: ko.observable(),
                Agent: ko.observable(),
                Page: ko.observable(),
                PageRows: ko.observable(),
                Order: ko.observable(),
                Method: ko.observable("exact"),
                ExactText: ko.observable(),
                Direction: ko.observable(),
            };
            this.list = {
                Methods: ko.observableArray([{ text: null, value: null }, { text: "Exact match", value: "exact" }, { text: "Match lemma", value: "lemma" }, { text: "Morphology", value: "morphology" }]),
                Sections: ko.observableArray([]),
                Agents: ko.observableArray([]),
                SortOptions: ko.observableArray([]),
                Pages: ko.observableArray([1]),
                Direction: ko.observableArray(["Ascending", "Descending"]),
                PageRows: ko.observableArray([10, 20, 40]),
            };
            this.total = ko.observable();
            this.results = ko.observableArray([]);
            this.setup(cons);
        }
        Modal.prototype.setup = function (cons) {
            var _this = this;
            $.get("/Admin/Text/MentionsModalLists", response => {
                console.log({ url: "/Admin/Text/MentionsModalLists", response });
                if (!response.Success) {
                    return;
                }
                _this.bind({
                    filter: cons.filter,
                    list: response.Data
                });
            });
        };
        Modal.prototype.applyBindings = function (node) {
            ko.applyBindings(this, node);
        };
        Modal.prototype.searchAgentClicked = function () {
            this.searchAgent();
        };
        Modal.prototype.searchAgent = function () {
            var _ = this;
            require(["modals/search-agents"], function (AgentModal) {
                openModal("/Static/Templates/Agent/SearchModal.html", {
                    name: "Find agent",
                    ajaxContentAdded: function (element) {
                        var modal = new AgentModal({
                            popup: element,
                            tabs: ["search"],
                            currentTab: "search",
                            handler: {
                                onSelected: function (guid, name) {
                                    closeModal(element);
                                    _.addAgent({ Text: name, Value: guid });
                                    _.updateAgents();
                                }
                            }
                        });
                        ko.applyBindings(modal, element);
                        modal.start();
                    }
                });
            });
        };
        Modal.prototype.updateAgents = function () {
            var agents = JSON.parse(sessionStorage.getItem("selected/agents")) || [];
            agents.splice(0, 0, emptyItem);
            this.list.Agents(agents);
        };
        Modal.prototype.addAgent = function (item) {
            addToList("selected/agents", item);
        };
        Modal.prototype.clearClicked = function () {
            this.clear();
        };
        Modal.prototype.clear = function () {
            this.filter.Agent(null);
            this.filter.Section(null);
            this.filter.Text(null);
            this.filter.ExactText(null);
            this.search();
        };
        Modal.prototype.bind = function (data) {
            if (!data) {
                return;
            }
            if (data.list) {
                if (data.list.Sections) {
                    this.list.Sections(data.list.Sections);
                }
                if (data.list.Agents) {
                    this.list.Agents(data.list.Agents);
                }
                if (data.list.SortOptions) {
                    this.list.SortOptions(data.list.SortOptions);
                }
            }
            if (data.filter) {
                if (data.filter.Section) {
                    this.filter.Section(data.filter.Section);
                }
                if (data.filter.Agent) {
                    this.filter.Agent(data.filter.Agent);
                }
                if (data.filter.Direction) {
                    this.filter.Direction(data.filter.Direction);
                }
                if (data.filter.Order) {
                    this.filter.Order(data.filter.Order);
                }
            }
        };
        Modal.prototype.submitClicked = function () {
            this.search();
        };
        Modal.prototype.setPage = function (page, maxPage) {
            var list = [];
            for (var i = 1; i <= maxPage; i++) {
                list.push(i);
            }
            this.list.Pages(list);
            this.filter.Page(page);
        };
        Modal.prototype.search = function (guid) {
            var _this = this;
            var params = ko.toJS(this.filter);
            $.get("/Admin/Text/SearchMentions", params, response => {
                console.log({ url: "/Admin/Text/SearchMentions", response });
                if (!response.Success) {
                    return;
                }
                _this.total(response.Data.Count);
                _this.setPage(response.Data.Page, response.Data.MaxPage);
                _this.results(response.Data.Results);
                _this.setMap(response.Data.Results);
            });
        };
        Modal.prototype.setMap = function (data) {
            var references = data.flatMap(x => x.References);
            var agentProperties = references.flatMap(x => x.Agents);
            console.log({ agentProperties });
            var latlongs = agentProperties.map(x => {
                if (!x.Properties) {
                    return null;
                }
                var lat = x.Properties[1];
                if (!lat) {
                    return null;
                }
                var lng = x.Properties[0];
                if (!lng) {
                    return null;
                }
                return { lat: lat.Value, lng: lng.Value };
            });
            console.log({ latlongs });
            var markers = groupBy(latlongs.filter(x => !!x), x => x.lat + ":" + x.lng);
            console.log({ markers });
            var test = [];
            for (let row of markers) {
                test.push(row);
            }
            console.log({ test });
            var markerTotals = test.map(x => { return { lat: x[1][0].lat, lng: x[1][0].lng, weight: x[1].length }; });
            console.log({ markerTotals });
            var heatmapTransformed = markerTotals.map(item => {
                return {
                    location: new google.maps.LatLng(item.lat, item.lng),
                    weight: item.weight
                };
            });
            var heatmap = new google.maps.visualization.HeatmapLayer({
                data: heatmapTransformed
            });
            var bounds = new google.maps.LatLngBounds();
            markerTotals.forEach(item => {
                bounds.extend(new google.maps.LatLng(item.lat, item.lng));
            });
            this.component.map.fitBounds(bounds);
            heatmap.setMap(this.component.map);
            heatmap.set("radius", 30);            
        };
        return Modal;
    })();

    return Modal;
}));
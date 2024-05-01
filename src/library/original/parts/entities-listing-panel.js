(function (factory) {
    define("parts/entities-listing-panel", ["jquery", "knockout", "app/helpers", "libs/randomColor", "parts/minimap"], factory);
}(function ($, ko, Helper, randomColor, Minimap) {

    /**
     * Test {
     *      editor: SPEEDy;
     *      textGuid: Guid?;
     *      textBlockGuid: Guid?;
     * }
     * */

    class Panel {
        constructor() {

        }
        load() {

        }
    }

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
            var node = applyBindings(html, model);
            container.appendChild(node);
            document.body.appendChild(container);
            require(["jquery-ui"], () => {
                $(container).draggable({
                    scroll: false
                });
            });
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
        });
    });

}));
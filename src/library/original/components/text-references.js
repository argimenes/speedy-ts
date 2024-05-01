(function (factory) {
    define("components/text-references", ["jquery", "knockout", "app/helpers", "parts/window-manager", "libs/randomColor", "parts/minimap"], factory);
}(function ($, ko, Helper, _WindowManager, randomColor, Minimap) {

    const { div, newElement } = Helper;
    const WindowManager = _WindowManager.getWindowManager();

    class Panel {
        constructor(data) {
            this.editor = data.editor;
            this.properties = this.editor.properties;
        }
        loadPanel() {
            const editor = this.editor;
            const properties = this.properties;
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
                        if (this.concertina) {
                            return;
                        }
                        item.highlighted(true);
                        var mentions = editor.data.properties.filter(x => x.value == item.entity.Guid);
                        mentions.forEach(p => p.highlightWithClass("text-highlight"));
                        this.toggleMarkers(true, item.entity.Guid, item.selected());
                    },
                    itemLeave: function (item) {
                        if (this.concertina) {
                            return;
                        }
                        item.highlighted(false);
                        var mentions = editor.data.properties.filter(x => x.value == item.entity.Guid);
                        mentions.forEach(p => p.unhighlightWithClass("text-highlight"));
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
                        const _this = this;
                        var highlight = item.selected();
                        this.circles = [];
                        properties.forEach(p => {
                            p.unhighlight();
                            if (!p.startNode) {
                                return;
                            }
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
                            _this.circles.push(circle);
                            this.toggleMarkers(highlight, item.entity.Guid);
                        });
                    },
                    hideCircles: function () {
                        if (this.circles) {
                            this.circles.forEach(c => c.style.display = "none");
                        }
                    },
                    showCircles: function () {
                        if (this.circles) {
                            this.circles.forEach(c => c.style.display = "inline");
                        }
                    },
                    highlightClicked: function (item) {
                        var highlight = !item.selected();
                        item.selected(highlight);
                        const mentions = editor.data.properties.filter(x => x.value == item.entity.Guid);
                        this.drawCircles(item, mentions);
                    },
                    toggleSurroundingBlocks: function (item) {
                        const _this = this;
                        if (!!this.concertina) {
                            if (this.concertina != item) {
                                this.toggleSurroundingBlocks(this.concertina);
                                this.toggleSurroundingBlocks(item);
                            }
                        }
                        var highlight = !item.selected();
                        item.selected(highlight);
                        const containers = editor.getContainers();
                        const properties = editor.data.properties.filter(x => x.value == item.entity.Guid && x.isDeleted == false);
                        const entityContainers = distinct(properties.map(x => editor.getCurrentContainer(x.startNode)));
                        const nonEntityContainers = containers.filter(c => entityContainers.indexOf(c) == -1);
                        editor.container.style.overflowY = "hidden";
                        containers.forEach(c => {
                            c.classList.remove("concertina-block");
                            c.style.display = "block";
                            c.style.height = "auto";
                            c.style.maxHeight = "none";
                        });
                        if (item.selected()) {
                            this.concertina = item;
                            _this.hideCircles();
                            minimap.hide();
                            editor.container.style.overflowY = "auto";
                            nonEntityContainers.forEach(c => {
                                c.style.display = "none";
                            });
                            entityContainers.forEach(c => {
                                c.classList.add("concertina-block");
                                const props = properties.filter(p => editor.getCurrentContainer(p.startNode) == c)
                                    .sort((a, b) => a.startNode.speedy.offset.y > b.startNode.speedy.offset.y ? 1 : a.startNode.speedy.offset.y < b.startNode.speedy.offset.y ? -1 : 1);
                                props.forEach(p => p.highlightWithClass("text-highlight"));
                                if (props.length) {
                                    const group = groupBy(props, x => x.startNode.speedy.offset.y);
                                    const rows = Array.from(group);
                                    const yCoords = rows.map(x => x[0]);
                                    const from = yCoords[0];
                                    const to = yCoords[yCoords.length - 1];
                                    const _h = (to - from) + 50;
                                    const minH = 75;
                                    const maxH = 200;
                                    var h = _h < minH ? minH : _h;
                                    const y = props[0].startNode.speedy.offset.y;
                                    if (y > h) {
                                        h = y + minH;
                                    }
                                    if (h > maxH) {
                                        h = maxH;
                                    }
                                    c.style.height = h + "px";
                                    window.setTimeout(() => c.scrollBy(0, (y - 25 > 0) ? y - 25 : y), 1);
                                }
                                else {
                                    c.style.height = "150px";
                                    c.style.maxHeight = "150px";
                                }
                            });
                        } else {
                            this.concertina = null;
                            _this.showCircles();
                            minimap.show();
                        }
                        editor.updateOffsets();
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
                $.get("/Static/Templates/Agent/text-entities-panel.html?v=12", function (html) {
                    const node = applyBindings(html, model);
                    container.appendChild(node);
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
                    win.addNodeToLayer(container);
                    $(container).draggable({
                        scroll: false
                    });
                });
            });
        }
    }

    

}));
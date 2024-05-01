const { observable } = require("knockout");

(function (factory) {
    define("components/entity-highlighter", ["jquery", "knockout", "app/helpers", "parts/window-manager", "libs/randomColor", "parts/minimap"], factory);
}(function ($, ko, Helper, _WindowManager, randomColor, Minimap) {

    const { div, distinct, groupBy, applyBindings } = Helper;
    const WindowManager = _WindowManager.getWindowManager();

    class Panel {
        constructor(cons) {
            this.editor = cons.editor;
            this.textGuid = cons.textGuid;
            this.entities = ko.observableArray([]);
            this.properties = ko.observableArray([]);
            this.colours = [];
            this.showOnlySelectedRows = ko.observable(false);
            this.sort = ko.observable("entity");
            this.order = ko.observable("asc");
            this.hideSurroundingLines = ko.observable(true);
            this.items = ko.observableArray([]);
            this.minimap = null;
            this.total = 0;
            this.setup();
        }
        getProperties() {
            return this.editor.data.properties.filter(p => p.type == "agent" && !p.isDeleted);
        }
        getTotal() {
            return this.items().map(x => x.count).reduce((total, num) => total + num);
        }
        setup() {
            const _this = this;
            var entityGuids = this.editor.data.properties
                .filter(p => p.type == "agent" && !p.isDeleted && p.value)
                .map(p => p.value);
            const params = { Guids: entityGuids };
            $.post("/Admin/Agent/QuickSearchJson", params, function (response) {
                const entities = response.Data;
                const properties = _this.getProperties();
                _this.colours = _this.createColours(entities);
                const items = _this.createItems(entities, properties);
                _this.entities(entities);
                _this.items(items);
                _this.properties(properties);
                _this.total = _this.getTotal();
                _this.minimap = _this.createMinimap(properties);
                _this.setupContainer();
            });
        }
        createColours(entities) {
            return randomColor({
                count: entities.length,
                seed: "orange",
                luminosity: 'bright',
                format: 'rgb',
                hue: 'random'
            });
        }
        setupContainer() {
            const _this = this;
            $.get("/Static/Templates/Agent/text-entities-panel.html?v=18", (html) => {
                const rect = _this.editor.container.getBoundingClientRect();
                const x = rect.x - 450 - 10;
                const y = rect.y - 65;
                const container = div({
                    style: {
                        position: "absolute",
                        dispay: "none",
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
                const node = applyBindings(html, _this);
                container.appendChild(node);
                const win = WindowManager.addWindow({
                    type: "inline-entities",
                    loader: {
                        params: {
                            textGuid: _this.textGuid
                        }
                    },
                    node: container
                });
                win.addNodeToLayer(container);
                $(container).draggable({
                    scroll: false
                });
                _this.container = container;
            });
        }
        open() {

        }
        close() {
            this.unhighlightAll();
            if (this.container) {
                this.container.remove();
            }
            this.minimap.remove();
        }
        createItems(entities, properties) {
            const colours = this.colours;
            const items = entities.map((x, i) => {
                return {
                    colour: colours[i],
                    selected: ko.observable(false),
                    highlighted: ko.observable(false),
                    initial: (x.Name || "").substr(0, 1),
                    entity: x,
                    text: properties.filter(p => p.value == x.Guid)[0].getText(),
                    count: properties.filter(p => p.value == x.Guid).length
                };
            });
            return items;
        }
        createMinimap(properties) {
            const _this = this;
            const minimap = new Minimap({
                editor: this.editor,
                container: this.editor.container
            });
            minimap.createBar({
                position: "fixed"
            });
            this.items().forEach(item => {
                const props = properties.filter(x => x.value == item.entity.Guid);
                minimap.addMarkers(props, { hide: true, colour: item.colour, opacity: 0.5 });
            });
            return minimap;
        }
        toggleOrder() {
            this.order(this.order() == "asc" ? "desc" : "asc");
        }
        percentage(item) {
            var percent = Math.ceil((item.count / this.total) * 100);
            return percent + "%";
        }
        sortItems() {
            var sort = this.sort(),
                order = this.order(),
                asc = order == "asc";
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
        }
        headingColour(column) {
            return this.sort() == column ? "red" : "#000";
        }
        arrow(column) {
            if (this.sort() != column) {
                return "";
            }
            return this.order() == "asc" ? "↑" : "↓";
        }
        sortEntityClicked() {
            this.sortClicked("entity");
        }
        sortTextClicked() {
            this.sortClicked("text");
        }
        sortTotalClicked() {
            this.sortClicked("total");
        }
        sortClicked(field) {
            var sort = this.sort();
            if (sort == field) {
                this.toggleOrder();
            } else {
                this.sort(field);
                this.order("asc");
            }
            this.sortItems();
        }
        closeClicked() {
            this.close();
        }
        minimizeClicked() {
            this.window.minimize({ name: "entity panel" });
        }
        clearClicked() {
            this.unhighlightAll();
            this.showOnlySelectedRows(false);
        }
        unhighlightAll() {
            this.items().forEach(x => {
                x.selected(true);
                this.highlightClicked(x);
            });
        }
        publishClicked(item) {
            var agent = this.editor.createProperty("agent", item.entity.Guid);
            agent.text = item.Text;
        }
        toggleGlassModeClicked() {
            this.glass = !this.glass;
            if (this.glass) {
                this.container.classList.add("glass-window");

            } else {
                this.container.classList.remove("glass-window");
            }
        }
        itemEnter(item) {
            if (this.concertina) {
                return;
            }
            item.highlighted(true);
            const mentions = this.editor.data.properties.filter(x => x.value == item.entity.Guid);
            mentions.forEach(p => p.highlightWithClass("text-highlight"));
            this.toggleMarkers(true, item.entity.Guid, item.selected());
        }
        itemLeave(item) {
            if (this.concertina) {
                return;
            }
            item.highlighted(false);
            const mentions = this.editor.data.properties.filter(x => x.value == item.entity.Guid);
            mentions.forEach(p => p.unhighlightWithClass("text-highlight"));
            this.toggleMarkers(false || item.selected(), item.entity.Guid, false);
        }
        toggleMarkers(highlight, entityGuid, glow) {
            if (highlight) {
                this.minimap.showMarkers(entityGuid, glow)
            } else {
                this.minimap.hideMarkers(entityGuid);
            }
        }
        toggleShowOnlySelectedRows() {
            const show = this.showOnlySelectedRows();
            this.showOnlySelectedRows(!show);
        }
        drawCircles(item, properties) {
            const _this = this;
            var highlight = item.selected();
            this.circles = [];
            properties.forEach(p => {
                p.unhighlight();
                if (!p.startNode) {
                    return;
                }
                const circles = p.startNode.getElementsByClassName("letter-circle");
                var circle;
                if (!circles.length) {
                    circle = div({
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
                _this.toggleMarkers(highlight, item.entity.Guid);
            });
        }
        hideCircles() {
            if (this.circles) {
                this.circles.forEach(c => c.style.display = "none");
            }
        }
        showCircles() {
            if (this.circles) {
                this.circles.forEach(c => c.style.display = "inline");
            }
        }
        highlightClicked(item) {
            var highlight = !item.selected();
            item.selected(highlight);
            const mentions = this.editor.data.properties.filter(x => x.value == item.entity.Guid);
            this.drawCircles(item, mentions);
        }
        toggleSurroundingBlocks(item) {
            const _this = this;
            const editor = this.editor;
            if (!!this.concertina) {
                if (this.concertina != item) {
                    this.toggleSurroundingBlocks(this.concertina);
                    this.toggleSurroundingBlocks(item);
                }
            }
            var highlight = !item.selected();
            item.selected(highlight);
            const containers = editor.getContainers();
            const properties = editor.data.properties.filter(x => x.value == item.entity.Guid && !x.isDeleted);
            const entityContainers = distinct(properties.map(x => editor.getCurrentContainer(x.startNode)));
            const nonEntityContainers = containers.filter(c => entityContainers.indexOf(c) == -1);
            editor.container.style.overflowY = "hidden";
            containers.forEach(c => {
                c.classList.remove("concertina-block");
                c.style.display = "block";
                c.style.height = "auto";
                c.style.maxHeight = "none";
                if (_this.hideSurroundingLines()) {
                    //const containerCells = editor.getContainerCells(c);
                    //containerCells.forEach(x => x.classList.remove("hide-cell"));
                }
                if (c.speedy.minimap) {
                    c.speedy.minimap.remove();
                }
            });
            if (item.selected()) {
                this.concertina = item;
                this.hideCircles();
                this.minimap.hide();
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
                        const y = props[0].startNode.speedy.offset.y;
                        const rh = props[0].startNode.speedy.offset.h;
                        const containerCells = editor.getContainerCells(c);
                        const lineGroups = groupBy(containerCells, x => x.speedy.offset.y);
                        const lineRows = Array.from(lineGroups);
                        if (_this.hideSurroundingLines()) {
                            //const containerCells = editor.getContainerCells(c);
                            //const lineGroups = groupBy(containerCells, x => x.speedy.offset.y);
                            //const lineRows = Array.from(lineGroups);
                            //const excludeLines = lineRows.filter(x => x[1][0].speedy.offset.y >= y + (rh * 2));
                            //const lineCells = excludeLines.map(line => line[1]).flat();
                            //lineCells.forEach(cell => cell.classList.add("hide-cell"));
                        }
                        const group = groupBy(props, x => x.startNode.speedy.offset.y);
                        const rows = Array.from(group);
                        const yCoords = rows.map(x => x[0]);
                        const from = yCoords[0];
                        const to = yCoords[yCoords.length - 1];
                        const _h = (to - from) + 50;
                        const minH = 100;
                        const maxH = 200;
                        var h = _h < minH ? minH : _h;
                        if (y > h) {
                            h = y + minH;
                        }
                        if (h > maxH) {
                            h = maxH;
                        }
                        if (c.speedy.offset.h < minH) {
                            h = c.speedy.offset.h + 25;
                        }
                        if (lineRows.length == 1) {
                            h = 50;
                        }
                        c.style.height = h + "px";
                        const _minimap = c.speedy.minimap = new Minimap({
                            editor: editor,
                            container: c,
                            height: h,
                            buffer: 1,
                            useGlobalCoordinates: false
                        });
                        const scrollY = (y - 25 > 0) ? y - 25 : y;
                        requestAnimationFrame(() => c.scrollTo(0, scrollY));
                        _minimap.createBar({
                            position: "absolute"
                        });
                        _minimap.addMarkers(props, { hide: true, colour: item.colour, opacity: 0.5 });
                        _minimap.showMarkers(props[0].value, false);
                        //const ratio = _minimap.getRatio();
                        //_minimap.setArrowAtPosition(scrollY * ratio);
                    }
                    else {
                        c.style.height = "150px";
                        c.style.maxHeight = "150px";
                    }
                });
            } else {
                this.concertina = null;
                this.showCircles();
                this.minimap.show();
            }
            editor.updateOffsets();
        }
    }

    return Panel;

}));
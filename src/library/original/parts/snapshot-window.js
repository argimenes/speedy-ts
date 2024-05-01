(function (factory) {
    define("parts/snapshot-window", ["jquery", "knockout", "app/helpers", "parts/window-manager", "pubsub","jquery-ui"], factory);
}(function ($, ko, Helper, _WindowManager, pubsub) {

    const { div, createSnapshotWindow, getParent, updateElement } = Helper;
    const WindowManager = _WindowManager.getWindowManager();
    const Layer = _WindowManager.getLayerType();

    class SnapshotWindow {
        constructor() {

        }
        load(args) {
            var _this = this;
            $.get("/Admin/Agent/LoadSnapshotJson", { id: args.guid }, response => {
                console.log("/Admin/Agent/LoadSnapshotJson", { response });
                if (!response.Success) {
                    return;
                }
                const snapshot = response.Data;
                var model = {
                    setCircleMode: function () {
                        const thumbnail = container.querySelector(".snapshot-thumbnail");
                        thumbnail.classList.add("circle-window");
                        updateElement(thumbnail, {
                            style: {
                                width: "200px",
                                height: "200px",
                                paddingTop: "48px"
                            }
                        });
                        win.shape = "Circle";
                    },
                    setDefaultMode: function () {
                        const thumbnail = container.querySelector(".snapshot-thumbnail");
                        thumbnail.classList.remove("circle-window");
                        updateElement(thumbnail, {
                            style: {
                                width: "auto",
                                height: "auto",
                                paddingTop: 0
                            }
                        });
                        win.shape = "Default";
                    },
                    toggleCircleWindowClicked: function () {
                        this.circle = !this.circle;
                        if (this.circle) {
                            this.setCircleMode();
                        } else {
                            this.setDefaultMode();
                        }
                    },
                    closeClicked: () => {
                        win.close();
                    }
                };
                const container = div({
                    style: {
                        position: "absolute",
                        top: args.y + "px",
                        left: args.x + "px",
                        width: args.width + "px",
                        height: args.height + "px",
                        zIndex: args.z
                    },
                    template: {
                        view: `
<div class="safari_buttons handle" style="margin-bottom: 10px;">
    <div data-bind="click: $data.closeClicked" class="safari_close"></div>
<div data-bind="click: $data.toggleCircleWindowClicked" class="safari_circle"></div>
</div>
`, model: model
                    }
                });
                const thumbnail = this.generateSnapshotThumbnail({ snapshot: snapshot, isOpen: false });
                container.appendChild(thumbnail);
                const layer = args.layer || document.body;
                layer.appendChild(container);
                var win = WindowManager.addWindow({
                    type: "snapshot",
                    node: container,
                    loader: {
                        params: {
                            guid: args.guid
                        }
                    },
                    draggable: {
                        node: container.querySelectorAll(".handle")[0]
                    }
                });
                $(container).draggable();
                if (args.shape == "Circle") {
                    model.setCircleMode();
                }
                //this.overlay({ ...args, snapshot });
            });
        }
        overlay(args) {
            const { snapshot } = args;
            const snapshotParsed = JSON.parse(snapshot.Value);
            var l = new Layer({
                manager: WindowManager,
                guid: args.guid
            });
            l.deserialise({
                windows: snapshotParsed.windows
            });
            const scale = 200 / window.innerWidth;
            const wrapper = div({
                style: {
                    position: "absolute",
                    top: args.y + "px",
                    left: args.x + "px",
                    width: "200px",
                    height: "200px",
                    zIndex: args.z + 1,
                    transform: `scale(${scale})`
                }
            });
            wrapper.appendChild(l.container);
            layer.appendChild(wrapper);
        }
        generateSnapshotThumbnail(args) {
            var _this = this;
            const { snapshot, isOpen } = args;
            const thumbnailWidth = args.thumbnailWidth || 200;
            const thumbnailHeight = args.thumbnailHeight || 112;
            const borderColor = isOpen ? "yellow" : "#ccc";
            const container = div({
                classList: ["snapshot-thumbnail"],
                style: {
                    border: `2px solid ${borderColor}`
                }
            });
            const inner = div({
                classList: ["snapshot-thumbnail-inner"],
                style: {
                    position: "relative",
                    margin: 0,
                    padding: 0,
                    width: thumbnailWidth + "px",
                    height: thumbnailHeight + "px"
                }
            });
            const data = JSON.parse(snapshot.Value);
            const thumbnails = data.windows.filter(x => !x.isDeleted).map(win => createSnapshotWindow({ ...args, win: win }));
            thumbnails.forEach(t => inner.appendChild(t));
            container.snapshot = snapshot;
            container.addEventListener("click", (e) => {
                const snapshotNode = getParent(e.target, x => !!x.snapshot);
                let snapshot = snapshotNode.snapshot;
                pubsub.publish("dock/load-snapshot", snapshot.Guid);
            });
            container.appendChild(inner);
            const wrapper = div({});
            wrapper.appendChild(container);
            const label = div({
                classList: ["snapshot-thumbnail-label"],
                style: {
                    color: isOpen ? "yellow" : "#fff",
                },
                template: {
                    view: `
<div>
    <div style="text-align: center;"><span data-bind="text: $data.name"></span></div>
    <span style="float: left; margin-top: -17px;">
        <span style="margin-right: 5px;" data-bind="click: $data.listViewClicked"><i class="far fa-list-alt"></i></span>
        <span data-bind="click: $data.editNameClicked"><i class="far fa-edit"></i></span>
    </span>
    <span style="float: right; margin-top: -17px;">
        <span data-bind="click: $data.popoutClicked"><i class="far fa-window-restore"></i><span>
        <!-- <span data-bind="click: $data.deleteClicked"><i class="far fa-trash-alt"></i></span> -->
        <span data-bind="click: $data.removeClicked"><img src="/Images/icons/x-mark.svg" style="width: 15px; filter: invert(100%);" /></span>
    </span>
</div>
`,
                    model: {
                        container: container,
                        guid: snapshot.Guid,
                        name: snapshot.Name,
                        mode: ko.observable("read"),
                        listVisible: false,
                        list: null,
                        setNameClicked: () => {
                            console.log("setNameClicked");
                        },
                        editNameClicked: () => {
                            console.log("editNameClicked");
                        },
                        removeClicked: () => {
                            container.parentNode.remove();
                            _this.removeSnapshotLayer(this.guid);
                        },
                        deleteClicked: () => {
                            console.log("deleteClicked");
                        },
                        popoutClicked: function () {
                            _this.popoutSnapshotWindow(container.snapshot);
                        },
                        listViewClicked: function () {
                            this.listVisible = !this.listVisible;
                            if (this.listVisible) {
                                this.list = _this.loadListView(this.container);
                            } else {
                                this.list.remove();
                            }
                        }
                    }
                }
            });
            wrapper.appendChild(label);
            return wrapper;
        }
        removeSnapshotLayer(guid) {
            const layers = WindowManager.layers;
            const layer = layers.find(x => x.guid == guid);
            const i = layers.indexOf(layer);
            WindowManager.layers.splice(i, 1);
        }
        loadListView(container) {
            const { snapshot } = container;
            const data = JSON.parse(snapshot.Value);
            const windows = data.windows;
            const items = windows.map(w => {
                return {
                    type: w.type,
                    name: w.name
                };
            });
            console.log("loadListView", { container, snapshot, windows, items });
            const y = container.offsetTop;
            const x = container.offsetLeft + container.offsetWidth + 10;
            const list = div({
                style: {
                    position: "absolute",
                    top: y + "px",
                    left: x + "px",
                    padding: "10px",
                    color: "#333",
                    backgroundColor: "#fff",
                    textShadow: "none",
                    zIndex: WindowSnapshotWindow.getNextIndex()
                },
                template: {
                    view: `
<div>
    <table class="table">
        <tr>
            <th>Type</th>
            <th>Name</th>
        </tr>
        <!-- ko foreach: $data.items -->
        <tr>
            <td><span data-bind="text: $data.type"></span></td>
            <td><span data-bind="text: $data.name"></span></td>
        </tr>
        <!-- /ko -->
    </table>
</div>
`,
                    model: {
                        items: items
                    }
                }
            });
            container.parentNode.appendChild(list);
            return list;
        }
    }

    return SnapshotWindow;

}));
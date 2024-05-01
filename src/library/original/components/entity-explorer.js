(function (factory) {
    define("components/entity-explorer", ["knockout", "jquery", "app/helpers", "parts/window-manager", "components/clipboard", "pubsub", "parts/text-add", "modals/search-texts", "jquery-ui"], factory);
}(function (ko, $, Helper, _WindowManager, _Clipboard, pubsub, QuickAdd, TextModal) {

    const { applyBindings, div } = Helper;
    const WindowManager = _WindowManager.getWindowManager();
    const Clipboard = _Clipboard.getInstance();
    const Mode = {
        "Cutting": "Cutting",
        "Copying": "Copying"
    };
    const WindowMode = {
        "Free": "Free",
        "Docked": "Docked"
    };
    const EditMode = {
        "None": "None",
        "EntityName": "EntityName",
        "LocalName": "LocalName"
    };

    class EntityFile {
        constructor(args) {
            const _this = this;
            args = args || {};
            args.state = args.state || {};
            args.entity = args.entity || {};
            args.handler = args.handler || {};
            this.state = {
                lastClickedTime: ko.observable(),
                edit: ko.observable(args.state.edit || EditMode.None),
                selected: ko.observable(args.state.selected || false),
                mode: ko.observable(args.state.mode)
            };
            this.entity = args.entity;
            this.entity = {
                Guid: ko.observable(args.entity.Guid),
                Value: ko.observable(args.entity.Value),
                Name: ko.observable(args.entity.Name),
                LocalName: ko.observable(args.entity.LocalName),
                AgentType: ko.observable(args.entity.AgentType),
                Attributes: ko.observableArray(args.entity.Attributes || []),
                DateAddedUTC: ko.observable(!!args.entity.DateAddedUTC ? new Date(args.entity.DateAddedUTC) : null),
                ChildOfFolderGuid: ko.observable(args.entity.ChildOfFolderGuid)
            };
            this.dateAdded = ko.computed(() => {
                const date = _this.entity.DateAddedUTC();
                if (!date) {
                    return "";
                }
                return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
            });
            this.selectionState = ko.computed(() => {
                return _this.state.selected() ? "entity-selected" : "entity-not-selected";
            });
            this.handler = {
                addSubfolder: args.handler.addSubfolder
            };
        }
        isMediaType() {
            const type = this.entity.AgentType();
            const mediaTypes = ["Image", "Video", "Website", "Tweet", "Snapshot", "PDF"];
            if (mediaTypes.indexOf(type) >= 0) {
                return true;
            }
            return false;
        }
        deactivateEditMode() {
            this.state.edit(EditMode.None);
        }
        activateEditEntityNameMode() {
            this.state.edit(EditMode.EntityName);
        }
        activateEditLocalNameMode() {
            this.state.edit(EditMode.LocalName);
            if (!this.entity.LocalName()) {
                this.entity.LocalName(this.entity.Name());
            }
        }
        localNameSubmitted() {
            this.updateLocalName();
        }
        updateLocalName() {
            this.deactivateEditMode();
            const params = {
                childOfFolderGuid: this.entity.ChildOfFolderGuid(),
                localName: this.entity.LocalName()
            };
            $.post("/Admin/Agent/UpdateLocalName", params, (response) => {
                console.log("/Admin/Agent/UpdateLocalName", { params, response });
            });
        }
        sendToDesktopClicked() {
            pubsub.publish("dock/add-icon-to-desktop", {
                type: this.entity.AgentType(),
                name: this.entity.LocalName() || this.entity.Name(),
                guid: this.entity.Guid()
            });
        }
        entityNameSubmitted() {
            this.updateEntityName();
        }
        updateEntityName() {
            const _this = this;
            this.deactivateEditMode();
            const params = {
                guid: this.entity.Guid(),
                name: this.entity.Name(),
                value: this.entity.Value(),
                agentType: this.entity.AgentType()
            };
            const isNew = !this.entity.Guid();
            $.post("/Admin/Agent/UpdateName", params, (response) => {
                console.log("/Admin/Agent/UpdateName", { params, response });
                const entity = response.Data;
                _this.entity.Guid(entity.Guid);
                _this.entity.DateAddedUTC(new Date(entity.DateAddedUTC));
                if (isNew) {
                    if (_this.handler.addSubfolder) {
                        _this.handler.addSubfolder(_this.entity);
                    }
                }
            });
        }
        updateClickedTime() {
            return true;
            const lastClickedTime = this.state.lastClickedTime();
            const now = new Date();
            this.state.lastClickedTime(now);
            if (lastClickedTime) {
                var diff = now - lastClickedTime;
                if (diff >= 600 && diff <= 2000) {
                    this.activateEditNameMode();
                    this.state.lastClickedTime(null);
                }
            }
        }
    }

    class Component {
        constructor(cons) {
            const _this = this;
            cons = cons || {};
            this.client = new QuickAdd();
            this.folderPath = ko.observableArray([]);
            this.entities = ko.observableArray([]); // EntityFile[]
            this.allEntitiesSelected = ko.observable(false);
            this.win = null;
            this.selectedEntitiesCount = ko.computed(() => {
                return _this.entities().filter(x => x.state.selected()).length;
            });
            this.entitiesSelected = ko.computed(() => {
                return _this.selectedEntitiesCount() > 0;
            });
            this.filesOnClipboard = ko.observable(false);
            this.sort = ko.observable("type");
            this.order = ko.observable("asc");
            this.windowMode = WindowMode.Free;
            this.position = {};
            if (cons.entities) {
                this.setEntities(cons.entities);
            }
            if (cons.folderPath) {
                this.folderPath(cons.folderPath);
            }
        }
        duplicateWindowClicked() {
            const len = this.folderPath().length;
            const currentFolder = this.folderPath()[len - 1];
            const folderGuid = currentFolder.Guid;
            if (folderGuid) {
                pubsub.publish("dock/load-entity-explorer", folderGuid);
            }
        }
        loadUserClicked() {
            this.loadDefaultFolder();
        }
        loadRecentsClicked() {
            this.loadRecents();
        }
        loadRecents() {
            const _this = this;
            const params = {
                Page: 1,
                PageRows: 20,
                Order: "ByDateAdded",
                Direction: "Descending"
            };
            this.folderPath([{ Name: "Recents", Guid: null }]);
            $.post("/Admin/Agent/SearchJson", params, (response) => {
                console.log("/Admin/Agent/SearchJson", { params, response });
                if (!response.Success) {
                    return;
                }
                const entities = response.Data.Results.map(x => x.Entity);
                _this.setEntities(entities);
            });
        }
        setEntities(entities) {
            const _this = this;
            const entityItems = entities.map(x => _this.toEntityFile(x));
            this.entities(entityItems);
        }
        toggleOrder() {
            this.order(this.order() == "asc" ? "desc" : "asc");
        }
        showArrow(column) {
            return this.sort() == column;
        }
        arrow(column) {
            if (this.sort() != column) {
                return "";
            }
            return this.order() == "asc" ? "↑" : "↓";
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
        sortNameClicked() {
            this.sortClicked("name");
        }
        sortDateModifiedClicked() {
            this.sortClicked("dateModified");
        }
        sortTypeClicked() {
            this.sortClicked("type");
        }
        getSortByName(a, b, column, order) {
            order = order || this.order();
            column = column || 1;
            const value = 1;
            const asc = order == "asc";
            const plus = value / column;
            const minus = -1 * (plus);
            if (asc) {
                return a.entity.Name() > b.entity.Name() ? plus : a.entity.Name() < b.entity.Name() ? minus : 0;
            } else {
                return a.entity.Name() < b.entity.Name() ? plus : a.entity.Name() > b.entity.Name() ? minus : 0;
            }
        }
        sortItems() {
            const _this = this;
            var sort = this.sort(), order = this.order(), asc = order == "asc";
            this.entities.sort((a, b) => {
                if (sort == "name") {
                    return _this.getSortByName(a, b);
                } else if (sort == "dateModified") {
                    if (asc) {
                        return a.entity.DateAddedUTC() > b.entity.DateAddedUTC() ? 1 : a.entity.DateAddedUTC() < b.entity.DateAddedUTC() ? -1 : 0;
                    } else {
                        return a.entity.DateAddedUTC() < b.entity.DateAddedUTC() ? 1 : a.entity.DateAddedUTC() > b.entity.DateAddedUTC() ? -1 : 0;
                    }
                } else if (sort == "type") {
                    if (asc) {
                        var result = a.entity.AgentType() > b.entity.AgentType() ? 1 : a.entity.AgentType() < b.entity.AgentType() ? -1 : 0;
                        result += _this.getSortByName(a, b, 2);
                        return result;
                    } else {
                        var result = a.entity.AgentType() < b.entity.AgentType() ? 1 : a.entity.AgentType() > b.entity.AgentType() ? -1 : 0;
                        result += _this.getSortByName(a, b, 2);
                        return result;
                    }
                } else {
                    if (asc) {
                        return a.entity.Name() > b.entity.Name() ? 1 : a.entity.Name() < b.entity.Name() ? -1 : 0;
                    } else {
                        return a.entity.Name() < b.entity.Name() ? 1 : a.entity.Name() > b.entity.Name() ? -1 : 0;
                    }
                }
            });
        }
        parentFolderSelected() {
            const path = this.folderPath();
            const len = path.length;
            if (len == 1) {
                return;
            }
            this.loadFolder(path[len - 2].Guid);
        }
        addSubfolder(subfolder) {
            const len = this.folderPath().length;
            const currentFolder = this.folderPath()[len - 1];
            const params = {
                folderGuid: currentFolder.Guid,
                subfolderGuid: subfolder.Guid
            };
            $.get("/Admin/Agent/AddSubfolderTo", params, (response) => {

            });
        }
        createFolderClicked() {
            var folder = new EntityFile({
                state: {
                    edit: EditMode.EntityName
                },
                entity: {
                    Name: "New Folder",
                    AgentType: "Folder"
                },
                handler: {
                    addSubfolder: this.addSubfolder.bind(this)
                }
            });
            this.entities.push(folder);
        }
        toggleAllEntitiesSelected() {
            const selected = this.allEntitiesSelected();
            if (selected) {
                this.entities().forEach(x => x.state.selected(true));
            } else {
                this.entities().forEach(x => x.state.selected(false));
            }
            return true;
        }
        closeClicked() {
            this.win.close();
        }
        focusClicked() {
            this.focus = !this.focus;
            if (this.focus) {
                this.win.focus();
            } else {
                this.win.unfocus();
            }
        }
        toggleGlassModeClicked() {
            this.glass = !this.glass;
            if (this.glass) {
                this.win.node.classList.add("glass-window");

            } else {
                this.win.node.classList.remove("glass-window");
            }
        }
        folderPathItemSelected(folder) {
            this.loadFolder(folder.Guid);
        }
        setFolderPath(folderGuid, callback) {
            const _this = this;
            const params = { id: folderGuid };
            $.get("/Admin/Agent/GetFolderPath", params, (response) => {
                console.log("/Admin/Agent/GetFolderPath", { params, response })
                if (!response.Success) {
                    return;
                }
                _this.folderPath(response.Data);
                if (callback) {
                    callback();
                }
            });
        }
        loadText(guid) {
            this.client.loadTextWindow(guid, null, { focus: true });
        }
        entitySelected(item, e) {
            if (item.state.edit() != EditMode.None) {
                return;
            }
            if (item.entity.AgentType() == "Folder") {
                this.loadFolder(item.entity.Guid());
                return;
            }
            if (item.entity.AgentType() == "Text") {
                this.loadText(item.entity.Value());
                return;
            }
            if (item.entity.AgentType() == "Snapshot") {
                var attrs = {};
                item.entity.Attributes().forEach(x => {
                    const pair = x.split("|");
                    attrs[pair[0]] = pair[1];
                });
                const snapshotGuid = attrs.SnapshotGuid;
                pubsub.publish("dock/load-snapshot", snapshotGuid);
                return;
            }
            if (e.ctrlKey) {
                this.loadFolder(item.entity.Guid());
                return;
            }
            const hidePanel = item.isMediaType();
            this.client.loadEntityClicked(item.entity.Guid(), { hidePanel: hidePanel });
        }
        loadDefaultFolder() {
            const _this = this;
            $.get("/Admin/Agent/GetRootFolder", (response) => {
                console.log("/Admin/Agent/GetRootFolder", { response });
                if (!response.Success) {
                    return;
                }
                const root = response.Data;
                _this.loadFolder(root.Guid);
            });
        }
        folderPathItemSelected(folder) {
            console.log("folderPathItemSelected", { folder });
            this.loadFolder(folder.Guid);
        }
        loadFolder(folderGuid) {
            const _this = this;
            const params = {
                id: folderGuid
            };
            this.setFolderPath(folderGuid, () => {
                $.get("/Admin/Agent/GetFolderEntities", params, (response) => {
                    console.log("/Admin/Agent/GetFolderEntities", { params, response });
                    if (!response.Success) {
                        return;
                    }
                    const entities = response.Data.map(x => _this.toEntityFile(x));
                    _this.entities(entities);
                    _this.sortItems();
                });
            });
        }
        dockLeftClicked() {

        }
        dockRightClicked() {

        }
        toEntityFile(data) {
            return new EntityFile({
                entity: data,
                handler: {
                    addSubfolder: this.addSubfolder.bind(this)
                }
            });
        }
        getCentreCoords(w, h) {
            const dh = 51; // dock height
            const x = (window.innerWidth) / 2 - (w / 2);
            const y = (window.innerHeight - dh) / 2 - (h / 2);
            return { x, y };
        }
        getCurrentFolderGuid() {
            const len = this.folderPath().length;
            return this.folderPath()[len - 1].Guid;
        }
        addEntityToFolder(entity, targetFolderGuid) {
            const folderGuid = targetFolderGuid ?? this.getCurrentFolderGuid();
            const params = {
                folderGuid: folderGuid,
                entityGuid: entity.Guid()
            };
            $.get("/Admin/Agent/AddEntityToFolder", params, (response) => {

            });
        }
        removeEntityItem(entityFile) {
            const len = this.folderPath().length;
            const folderGuid = this.folderPath()[len - 1].Guid;
            const entityGuid = entityFile.entity.Guid();
            this.entities.remove(entityFile);
            $.get("/Admin/Agent/RemoveEntityFromFolder", { folderGuid, entityGuid });
        }
        deleteFilesClicked() {
            const entityGuids = this.entities()
                .filter(e => e.state.selected())
                .map(x => x.entity.Guid());
            this.deleteFiles(entityGuids);
        }
        deleteFiles(entityGuids) {
            const _this = this;
            const len = this.folderPath().length;
            const folderGuid = this.folderPath()[len - 1].Guid;
            const entities = this.entities().filter(e => entityGuids.some(guid => e.entity.Guid() == guid));
            entities.forEach(e => {
                const entityGuid = e.entity.Guid();
                _this.entities.remove(e);
                $.get("/Admin/Agent/RemoveEntityFromFolder", { folderGuid, entityGuid });
            });
            _this.sortItems();
        }
        pasteSelectedEntitesFromClipboard() {
            const _this = this;
            const item = Clipboard.pop();
            const entities = item.data.map(x => _this.toEntityFile(x.entity));
            this.filesOnClipboard(false);
            entities.forEach(x => {
                _this.entities.push(x);
                _this.addEntityToFolder(x.entity);
                _this.sendPasteCompletedEvent({ windowId: item.window.id, entityGuid: x.entity.Guid() });
            });
            this.sortItems();
        }
        sendPasteCompletedEvent(item) {
            pubsub.publish("entity-explorer/paste-completed/window:" + item.windowId, item.entityGuid);
        }
        cutSelectedEntitiesToClipboard() {
            const selected = this.entities().filter(x => x.state.selected());
            selected.forEach(x => x.state.mode(Mode.Cutting));
            const data = selected.map(x => {
                const entity = ko.toJS(x.entity);
                return { entity };
            });
            const item = {
                data: data,
                window: {
                    id: this.win.index
                },
                source: {
                    componentId: "entity-explorer"
                },
                dataType: "entities",
                dateAdded: new Date()
            };
            Clipboard.push(item);
            this.filesOnClipboard(true);
        }
        copySelectedEntitiesToClipboard() {
            const selected = this.entities().filter(x => x.state.selected());
            selected.forEach(x => x.state.mode(Mode.Copying));
            const data = selected.map(x => {
                const entity = ko.toJS(x.entity);
                return { entity };
            });
            const item = {
                data: data,
                window: {
                    id: this.win.index
                },
                source: {
                    componentId: "entity-explorer"
                },
                dataType: "entities",
                dateAdded: new Date()
            };
            Clipboard.push(item);
            this.filesOnClipboard(true);
        }
        cutFilesClicked() {
            this.cutSelectedEntitiesToClipboard();
        }
        copyFilesClicked() {
            this.copySelectedEntitiesToClipboard();
        }
        pasteFilesClicked() {
            this.pasteSelectedEntitesFromClipboard();
        }
        handlePasteCompletedEvent(entityGuid) {
            const item = this.entities().find(x => x.entity.Guid() == entityGuid);
            if (item.state.mode() != Mode.Cutting) {
                item.state.mode(null);
                return;
            }
            this.deleteFiles([entityGuid]);
        }
        setupEventHandlers() {
            const _this = this;
            const container = this.win.node;
            pubsub.subscribe(`entity-explorer/paste-completed/window:${this.win.index}`, (__, entityGuid) => {
                _this.handlePasteCompletedEvent(entityGuid);
            });
            container.addEventListener("keydown", (e) => {
                if (false == e.ctrlKey) {
                    return;
                }
                if (e.key == "Control") {
                    return;
                }
                if (false == _this.win.active) {
                    return;
                }
                const keyCode = (e.which || e.keyCode);
                const key = String.fromCharCode(keyCode);
                if (key == "C") {
                    _this.copySelectedEntitiesToClipboard();
                }
                if (key == "X") {
                    _this.cutSelectedEntitiesToClipboard();
                }
                if (key == "V") {
                    _this.pasteSelectedEntitesFromClipboard();
                }
            });
        }
        getEntityInRow(element) {
            var node = element;
            while (node != null) {
                if (node.dataset.entity) {
                    return JSON.parse(node.dataset.entity);
                }
                node = node.parentNode;
            }
            return null;
        }
        searchForEntityClicked() {
            const _this = this;
            require(["parts/entity-loader"], (EntityLoader) => {
                var loader = new EntityLoader({
                    handler: {
                        entitySelected: (guid) => {
                            $.get("/Admin/Agent/GetAgent", { id: guid }, (response) => {
                                console.log("/Admin/Agent/GetAgent", { guid, response });
                                if (!response.Success) {
                                    return;
                                }
                                const entityFile = _this.toEntityFile(response.Data);
                                _this.entities.push(entityFile);
                                _this.addEntityToFolder(entityFile.entity);
                            });
                        }
                    }
                });
                loader.load();
            });
        }
        entityDragStarted(item, e) {
            if (item.state.edit() != EditMode.None) {
                return false;
            }
            item.state.mode(Mode.Cutting);
            const message = {
                windowId: this.win.index,
                shiftKey: e.shiftKey,
                ctrlKey: e.ctrlKey,
                entities: [ko.toJS(item.entity)]
            };
            const json = JSON.stringify(message);
            e.originalEvent.dataTransfer.setData("entityItems", json);
            return true;
        }
        entityDropped(item, e) {
            const json = e.originalEvent.dataTransfer.getData("entityItems");
            const message = JSON.parse(json);
            const dragCutting = (false == message.ctrlKey);
            const windowId = message.windowId;
            const entityItem = message.entities[0];
            const entityFile = this.toEntityFile(entityItem);
            const targetEntity = this.getEntityInRow(e.target);
            const isTargetFolder = targetEntity && targetEntity.AgentType == "Folder";
            if (isTargetFolder) {
                this.addEntityToFolder(entityFile.entity, targetEntity.Guid);
                if (dragCutting) {
                    const foundFile = this.entities().find(x => x.entity.Guid() == entityFile.entity.Guid());
                    if (foundFile) {
                        this.removeEntityItem(foundFile);
                    }
                }
            } else {
                const exists = this.entities().some(x => x.entity.Guid() == entityFile.entity.Guid());
                if (false == exists) {
                    this.entities.push(entityFile);
                    this.addEntityToFolder(entityFile.entity);
                    if (dragCutting) {
                        this.sendPasteCompletedEvent({ windowId, entityGuid: entityFile.entity.Guid() });
                    }
                }
            }
            return true;
        }
        saveWindowPosition() {
            const rect = this.container.getBoundingClientRect();
            this.position = {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height
            };
        }
        restoreWindowPosition() {
            this.windowMode = WindowMode.Free;
            this.container.style.top = this.position.y + "px";
            this.container.style.left = this.position.x + "px";
            this.container.style.width = this.position.width + "px";
            this.container.style.height = this.position.height + "px";
        }
        undockClicked() {
            this.restoreWindowPosition();
        }
        dockLeftClicked() {
            if (this.windowMode == WindowMode.Free) {
                this.saveWindowPosition();
                this.windowMode = WindowMode.Docked;
            }
            this.container.style.top = 0;
            this.container.style.left = 0;
            this.container.style.right = "unset";
            this.container.style.width = "50%";
            this.container.style.height = "90%";
        }
        dockRightClicked() {
            if (this.windowMode == WindowMode.Free) {
                this.saveWindowPosition();
                this.windowMode = WindowMode.Docked;
            }
            this.container.style.top = 0;
            this.container.style.right = 0;
            this.container.style.left = "unset";
            this.container.style.width = "50%";
            this.container.style.height = "90%";
        }
        load(callback) {
            const _this = this;
            $.get("/Static/Templates/Component/entity-explorer.html?v=76", function (html) {
                const w = 800;
                const h = 600;
                const { x, y } = _this.getCentreCoords(w, h);
                const container = _this.container = div({
                    classList: ["text-window"],
                    attribute: {
                        tabindex: -1
                    },
                    style: {
                        position: "absolute",
                        left: x + "px",
                        top: y + "px",
                        width: w + "px",
                        height: "auto",
                        minHeight: h + "px",
                        backgroundColor: "#fff",
                        zIndex: WindowManager.getNextIndex()
                    }
                });
                var node = applyBindings(html, _this);
                container.appendChild(node);
                const win = _this.win = WindowManager.addWindow({
                    type: "entity-explorer",
                    node: container,
                    draggable: {
                        node: container
                    }
                });
                document.body.appendChild(container);
                //win.layer.container.appendChild(container);
                const handle = container.querySelector("[data-role='draggable']");
                win.setDraggable({
                    node: handle
                });
                _this.setupEventHandlers();
                if (callback) {
                    callback(_this);
                }
            });
        }
    }

    return Component;

}));
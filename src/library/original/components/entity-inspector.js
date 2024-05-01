const { observable } = require("knockout");

(function (factory) {
    define("components/entity-inspector", ["jquery", "knockout", "app/helpers", "parts/window-manager", "pubsub", "jquery-ui"], factory);
}(function ($, ko, Helper, _WindowManager, pubsub) {

    const { div, groupBy } = Helper;
    const WindowManager = _WindowManager.getWindowManager();
    const Menu = {
        "Relations": "Relations",
        "Entities": "Entities"
    };
    const Direction = {
        "Incoming": "Incoming",
        "Outgoing": "Outgoing"
    };
    class Relation {
        constructor(cons) {
            const _this = this;
            this.selected = ko.observable(false);
            this.guid = cons.guid;
            this.name = cons.name;
            this.direction = cons.direction;
            this.total = cons.total;
            this.arrowImageUrl = ko.computed(() => _this.direction == Direction.Outgoing ? "/Images/icons/right-arrow-1.svg" : "/Images/icons/left-arrow-1.svg");
        }
        setSelected(value) {
            this.selected(value);
        }
        highlight() {
            this.setSelected(true);
        }
        unhighlight() {
            this.setSelected(false);
        }
    }
    class Entity {
        constructor(cons) {
            this.selected = ko.observable(false);
            this.guid = cons.guid;
            this.name = cons.name;
        }
        setSelected(value) {
            this.selected(value);
        }
        highlight() {
            this.setSelected(true);
        }
        unhighlight() {
            this.setSelected(false);
        }
    }
    class EntityInspector {
        constructor(cons) {
            this.editor = cons.editor;
            this.entityGuid = cons.entityGuid;
            this.x = cons.x;
            this.y = cons.y;
            this.active = false;
            this.menu = ko.observable(Menu.Relations);
            this.relationIndex = ko.observable(0);
            this.entityIndex = ko.observable(0);
            this.relations = ko.observableArray([]);
            this.entities = ko.observableArray([]);
            this.originalEditorHandlers = {};
            this.types = ko.observableArray([]);
            this.editorHandlers = this.createEditorHandlers();
            this.node = this.createNode();
            this.container = cons.container || document.body;
            this.load();
        }
        load() {
            this.fetchRelationships();
            this.container.appendChild(this.node);
            $(this.node).draggable();
        }
        open() {
            this.setupEditorHandlers();
            this.show();
        }
        close() {
            this.restoreEditorHandlers();
            this.hide();
        }
        show() {
            this.node.style.display = "block";            
        }
        hide() {
            this.node.style.display = "none";
        }
        setupEditorHandlers() {
            const editor = this.editor;
            for (let key in this.editorHandlers) {
                // cache original editor handlers
                this.originalEditorHandlers[key] = editor.event.keyboard[key];
                // copy component handlers across to editor
                editor.event.keyboard[key] = this.editorHandlers[key];
            }
        }
        createEditorHandlers() {
            const _this = this;
            const handlers = {
                "!DOWN-ARROW": () => _this.handleDownArrow(),
                "!UP-ARROW": () => _this.handleUpArrow(),
                "!LEFT-ARROW": () => { _this.handleLeftArrow() },
                "!RIGHT-ARROW": () => { _this.handleRightArrow() },
                "!ENTER": () => { _this.handleEnter() },
                "!ESCAPE": () => { _this.handleEscape() },
                "CHAR:+": () => { _this.handleAddNewRelation() },
            };
            return handlers;
        }
        handleLeftArrow() {
            // this.menu(Menu.Relations);
            this.entities([]);
        }
        handleRightArrow() {
            // this.menu(Menu.Entities);
            const relation = this.relations()[this.relationIndex()];
            this.relationClicked(relation);
        }
        handleDownArrow() {
            // increment index of current menu
            this.entities([]);
            if (this.menu() == Menu.Relations) {
                this.relationIndex(this.relationIndex() + 1);
                if (this.relationIndex() > this.relations().length - 1) {
                    this.relationIndex(0);
                }
                this.highlightCurrentRelation();
            } else {
                this.entityIndex(this.entityIndex() + 1);
                if (this.entityIndex() > this.entities().length - 1) {
                    this.entityIndex(0);
                }
                this.highlightCurrentEntity();
            }
        }
        highlightCurrentRelation() {
            const item = this.relations()[this.relationIndex()];
            this.relations().forEach(x => x.unhighlight());
            item.highlight();
        }
        highlightCurrentEntity() {
            const item = this.entities()[this.entityIndex()];
            this.entities().forEach(x => x.unhighlight());
            item.highlight();
        }
        handleUpArrow() {
            // decrement index of current menu
            this.entities([]);
            if (this.menu() == Menu.Relations) {
                this.relationIndex(this.relationIndex() - 1);
                if (this.relationIndex() < 0) {
                    this.relationIndex(this.relations().length - 1);
                }
                this.highlightCurrentRelation();
            } else {
                this.entityIndex(this.entityIndex() - 1);
                if (this.entityIndex() < 0) {
                    this.entityIndex(this.entities().length - 1);
                }
                this.highlightCurrentEntity();
            }
        }
        handleEnter() {
            // if in relation menu, load & switch to entities menu
            // if in entities menu, load entity panel
        }
        handleEscape() {
            this.close();
            // if in entities menu, close & switch to relation menu
            // if in relation menu, close component
        }
        handleAddNewRelation() {

        }
        restoreEditorHandlers() {
            const editor = this.editor;
            for (let key in this.editorHandlers) {
                editor.event.keyboard[key] = this.originalEditorHandlers[key];
            }
        }
        createNode() {
            const box = div({
                style: {
                    display: "none",
                    position: "absolute",
                    top: this.y + "px",
                    left: this.x + "px",
                    backgroundColor: "#fff",
                    border: "1px solid #333",
                    "box-shadow": "0 3px 7px -1px grey",
                    height: "auto",
                    maxHeight: "400px",
                    overflowX: "hidden",
                    overflowY: "auto",
                    zIndex: WindowManager.getNextIndex()
                }
            });
            const content = this.createContent();
            box.appendChild(content);
            return box;
        }
        createContent() {
            const content = div({
                template: {
                    view: `
<div>
    <div class="LHS" style="display: inline-block; width: 200px;vertical-align: top;">
        <div data-bind="foreach: $data.relations">
            <div data-bind="click: $parent.relationClicked.bind($parent), css: { 'active-list-item': $data.selected() }" style="border-bottom: 1px solid #333; padding: 0 5px;">
                <img data-bind="attr: { src: $data.arrowImageUrl }" style="height: 15px;"></span> <span data-bind="text: $data.name"></span>
            </div>
        </div>
    </div>
    <div style="display: inline-block; width: auto; max-width: 400px; border-left: 1px solid #333; vertical-align: top;" class="RHS" data-bind="visible: !!$data.entities()">
        <div data-bind="foreach: $data.entities">
            <div data-bind="css: { 'active-list-item': $data.selected() }" style="border-bottom: 1px solid #333; padding: 0 5px;">
                <span data-bind="text: $data.name"></span>
            </div>
        </div>
    </div>
</div>
`,
                    model: this
                }
            });
            return content;
        }
        fetchRelationships() {
            const _this = this;
            const params = {
                id: this.entityGuid
            };
            $.get("/Admin/Agent/MetaRelations", params, (response) => {
                if (!response.Success) {
                    return;
                }
                _this.setResults(response.Data);
            });
        }
        setResults(data) {
            this.results = data;
            const group = Array.from(groupBy(data, x => x.Type.Name));
            const relations = group.map(x => {
                const items = x[1];
                const direction = items[0].Source.IsDominant ? Direction.Outgoing : Direction.Incoming;
                return new Relation({
                    name: x[0],
                    total: items.length,
                    direction: direction
                });
            });
            this.relations(relations);
            this.highlightCurrentRelation();
        }
        relationClicked(relation) {
            const items = this.results.filter(x => x.Type.Name == relation.name);
            if (!items.length) {
                console.log({ msg: "relation not found", relation });
                return;
            }
            const entities = items
                .map(x => x.Target)
                .map(x => new Entity({ guid: x.Guid, name: x.Name }))
                ;
            this.entities(entities);
        }
    }

    return EntityInspector;
}));
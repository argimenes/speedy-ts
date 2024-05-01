(function (factory) {
    define("parts/text-search", ["knockout", "jquery", "app/helpers", "app/mapper", "speedy/editor", "speedy/arabic-shaping", "speedy/monitor-bar"], factory);
}(function (ko, $, Helper, Mapper, Editor, ArabicShaping, MonitorBar) {

    var openModal = Helper.openModal;

    const div = (config) => {
        return newElement("DIV", config);
    }

    const span = (config) => {
        return newElement("SPAN", config);
    }

    const newElement = (type, config) => {
        var el = document.createElement(type);
        return updateElement(el, config);
    };

    const applyBindings = (html, model) => {
        var node = newElement("DIV", { innerHTML: html });
        ko.applyBindings(model, node);
        return node;
    }

    const updateElement = (el, config) => {
        config = config || {};
        if (config.property) {
            el.property = config.property;
        }
        if (config.innerHTML) {
            el.innerHTML = config.innerHTML;
        }
        if (config.style) {
            for (var key in config.style) {
                el.style[key] = config.style[key];
            }
        }
        if (config.handler) {
            for (var key in config.handler) {
                el.addEventListener(key, config.handler[key]);
            }
        }
        if (config.attribute) {
            for (var key in config.attribute) {
                el.setAttribute(key, config.attribute[key]);
            }
        }
        if (config.dataset) {
            for (var key in config.dataset) {
                el.dataset[key] = config.dataset[key];
            }
        }
        if (config.classList) {
            config.classList.forEach(x => el.classList.add(x));
        }
        if (config.children) {
            config.children.forEach(x => el.appendChild(x));
        }
        return el;
    };

    const extendElement = (source, config) => {
        var el = source.cloneNode(true);
        return updateElement(el, config);
    };

    function closeModal(element) {
        $(element).modal("hide");
        ko.cleanNode(element);
        element.remove();
    }

    var Search = (function () {
        function Search(cons) {
            this.popup = cons.popup;
            this.results = ko.observableArray([]);
            this.handler = cons.handler;
            this.total = ko.observable();
            cons.list = cons.list || {};
            this.list = {
                Sections: ko.observableArray(cons.list.Sections),
                SortOptions: ko.observableArray(cons.list.SortOptions || [
                    { Text: "By date", Value: "ByDateAdded" },
                    { Text: "By name", Value: "ByName" },
                    { Text: "By size", Value: "ByCharacters" }
                ]),
                Records: ko.observableArray(cons.list.Records || [5, 10, 20]),
                Directions: ko.observableArray(cons.list.Directions || [{ Text: "ASC", Value: "Ascending" }, { Text: "DESC", Value: "Descending" }]),
                Types: ko.observableArray([
                    { Text: null, Value: null },
                    { Text: "Document", Value: "Document" },
                    { Text: "Outliner Block Item", Value: "OutlinerBlockItem" }
                ]),
                Pages: ko.observableArray([1]),
            };
            this.filter = {
                Guid: ko.observable(cons.filter.Guid),
                Name: ko.observable(cons.filter.Name),
                Text: ko.observable(cons.filter.Text),
                Section: ko.observable(cons.filter.Section),
                Page: ko.observable(cons.filter.Page || 1),
                PageRows: ko.observable(cons.filter.PageRows),
                Order: ko.observable(cons.filter.Order || "ByDateAdded"),
                Direction: ko.observable(cons.filter.Direction || "Descending"),
                Type: ko.observable(cons.filter.Type),
                AnnotationType: ko.observable(cons.filter.AnnotationType),
                AttributeName: ko.observable(cons.filter.AttributeName),
                AttributeValue: ko.observable(cons.filter.AttributeValue),
                PageNum: ko.observable(cons.filter.PageNum),
            };
            this.maxPage = ko.observable();
            this.computed = {};
            this.start();
        }
        Search.prototype.start = function () {
            var _this = this;
            _this.setFilter();
            _this.loadPage();
            //this.loadLists(function () {

            //});
        };
        Search.prototype.loadAllTextsClicked = function () {
            if (this.handler.loadAllTextsClicked) {
                this.handler.loadAllTextsClicked();
            }
        };
        Search.prototype.deleteClicked = function (text) {
            if (this.handler.deleteClicked) {
                this.results.remove(text);
                this.handler.deleteClicked(text.Entity.Guid);
            }
        };
        Search.prototype.setFilter = function (data) {
            var filter = sessionStorage.getItem("text-search/search");
            if (filter) {
                this.bind({
                    filter: JSON.parse(filter)
                });
            }
        };
        Search.prototype.bind = function (data) {
            if (data.filter) {
                this.filter.Guid(data.filter.Guid);
                this.filter.Name(data.filter.Name);
                this.filter.Text(data.filter.Text);
                this.filter.Section(data.filter.Section);
                this.filter.Page(data.filter.Page);
                this.filter.PageRows(data.filter.PageRows);
                this.filter.Order(data.filter.Order);
                this.filter.Direction(data.filter.Direction);
                this.filter.Type(data.filter.Type);
                this.filter.AnnotationType(data.filter.AnnotationType);
                this.filter.AttributeName(data.filter.AttributeName);
                this.filter.AttributeValue(data.filter.AttributeValue);
                this.filter.PageNum(data.filter.PageNum);
            }
        };
        Search.prototype.toTextType = function (index) {
            switch (index) {
                case 0: return "Body";
                case 1: return "Footnote";
                case 2: return "Endnote";
                case 3: return "MarginNote";
                case 4: return "Annotation";
                case 5: return "StandoffPropertyComment";
                case 6: return "Intertext";
                default: return null;
            }
        };
        Search.prototype.toDate = function (json) {
            return new Date(json.match(/\d+/)[0] * 1);
        };
        Search.prototype.previousPageClicked = function () {
            var page = this.filter.Page();
            if (page <= 1) {
                return;
            }
            this.filter.Page(page - 1);
            this.loadPage();
        };
        Search.prototype.nextPageClicked = function () {
            var page = this.filter.Page();
            if (page >= this.maxPage()) {
                return;
            }
            this.filter.Page(page + 1);
            this.loadPage();
        };
        Search.prototype.previewClicked = function (item) {
            var _this = this;
            var guid = item.Entity.Guid;
            this.results().forEach(x => x.selected(false));
            item.selected(true);
            $.get("/Admin/Text/LoadEditorJson", { id: guid, start: 0, end: 1500 }, function (response) {
                console.log({ response });
                var data = Helper.decompress(response.Data);
                var element = div({
                    style: {
                        position: "relative",
                        padding: "10px 15px",
                        paddingLeft: "35px",
                        fontSize: "1rem",

                    },
                    attribute: {
                        contenteditable: "true",
                        spellcheck: "false",
                    },
                    classList: ["editor"]
                });
                var monitor = div({
                    classList: ["monitor"],
                    innerHTML: "&nbsp;",
                    style: {
                        backgroundColor: "transparent"
                    },
                    attribute: {
                        id: "header-" + guid
                    }
                });
                var preview = _this.popup.querySelectorAll('[data-role="text-preview"]')[0];
                preview.innerHTML = "";
                preview.appendChild(element);
                preview.appendChild(monitor);
                var QuickAdd = require("parts/text-add");
                var add = new QuickAdd({
                    handler: {
                        onSelected: function (guid) {
                            _this.handler.onSelected(guid);
                        },
                        onCancelled: function () {
                            _this.handler.closeClicked();
                        }
                    }
                });
                add.setupEditor({ container: element });
                add.editor.bind({
                    text: data.Text,
                    properties: data.Properties
                });
                var monitorBar = new MonitorBar({
                    monitor: monitor,
                    monitorOptions: {
                        highlightProperties: true
                    },
                    monitorButton: {
                        link: '<button data-toggle="tooltip" data-original-title="Edit" class="btn btn-sm"><span class="fa fa-link"></span></button>',
                        layer: '<button data-toggle="tooltip" data-original-title="Layer" class="btn btn-sm"><span class="fa fa-cog"></span></button>',
                        load: '<button data-toggle="tooltip" data-original-title="Load" class="btn btn-sm"><span class="fa fa-download"></span></button>',
                        remove: '<button data-toggle="tooltip" data-original-title="Delete" class="btn btn-sm"><span class="fa fa-trash"></span></button>',
                        comment: '<button data-toggle="tooltip" data-original-title="Comment" class="btn btn-sm"><span class="fa fa-comment"></span></button>',
                        shiftLeft: '<button data-toggle="tooltip" data-original-title="Left" class="btn btn-sm"><span class="fa fa-arrow-circle-left"></span></button>',
                        shiftRight: '<button data-toggle="tooltip" data-original-title="Right" class="btn btn-sm"><span class="fa fa-arrow-circle-right"></span></button>',
                        redraw: '<button data-toggle="tooltip" data-original-title="Redraw" class="btn btn-sm"><span class="fa fa-pencil"></span></button>',
                        expand: '<button data-toggle="tooltip" data-original-title="Expand" class="btn btn-sm"><span class="fa fa-plus-circle"></span></button>',
                        contract: '<button data-toggle="tooltip" data-original-title="Contract" class="btn btn-sm"><span class="fa fa-minus-circle"></span></button>',
                        toZeroPoint: '<button data-toggle="tooltip" data-original-title="Convert to zero point" class="btn btn-sm"><span style="font-weight: 600;">Z</span></button>',
                        zeroPointLabel: '<button data-toggle="tooltip" data-original-title="Label" class="btn btn-sm"><span class="fa fa-file-text-o"></span></button>',
                    },
                    propertyType: add.editor.propertyType,
                    commentManager: add.editor.commentManager,
                    css: {
                        highlight: "text-highlight"
                    },
                    updateCurrentRanges: add.editor.updateCurrentRanges.bind(add.editor)
                });
                add.editor.addMonitor(monitorBar);
                add.showHideExpansions();
                var animations = add.editor.data.properties.filter(p => !p.isDeleted && p.schema && p.schema.animation);
                if (animations.length) {
                    animations.forEach(p => {
                        p.schema.animation.init(p, add.editor);
                        p.schema.animation.start(p, add.editor);
                    });
                }
            });
        };
        Search.prototype.loadLists = function (callback) {
            var _this = this, key = "/Admin/Text/SearchModalLists";
            var json = sessionStorage.getItem(key);
            if (!json) {
                $.get("/Admin/Text/SearchModalLists", null, function (response) {
                    console.log("response", response);
                    if (!response.Success) {
                        return;
                    }
                    var data = response.Data;
                    sessionStorage.setItem(key, JSON.stringify(data));
                    _this.bindLists(data, callback);
                });
            } else {
                var data = JSON.parse(json);
                this.bindLists(data, callback);
            }
        };
        Search.prototype.bindLists = function (data, callback) {
            var order = this.filter.Order();
            var direction = this.filter.Direction();
            this.list.Sections(data.Sections);
            this.list.SortOptions(data.SortOptions);
            this.list.Directions(data.Directions);
            this.list.Types(data.Types);
            this.filter.Order(order);
            this.filter.Direction(direction);
            if (callback) {
                callback.call(this);
            }
        };
        Search.prototype.loadPage = function () {
            var _ = this;
            var filter = ko.toJS(this.filter);
            sessionStorage.setItem("text-search/search", JSON.stringify(filter));
            $.get("/Admin/Text/SearchJson", filter, function (response) {
                console.log("response", response);
                if (!response.Success) {
                    return;
                }
                response.Data.Results.forEach(x => x.selected = ko.observable(false));
                _.results(response.Data.Results);
                _.list.Pages([]);
                for (var page = 1; page <= response.Data.MaxPage; page++) {
                    _.list.Pages.push(page);
                }
                _.maxPage(response.Data.MaxPage);
                _.filter.Page(filter.Page);
                _.total(response.Data.Count);
            });
        };
        Search.prototype.editClicked = function (item) {
            require(["modals/search-texts"], function (Modal) {
                $.get("/Admin/Text/FindStandoffPropertyGraph", { id: item.Entity.Guid }, function (response) {
                    console.log("response", response);
                    if (!response.Success) {
                        return;
                    }
                    var data = response.Data;
                    var model = data.Model;
                    openModal("/Static/Templates/Text/SearchModal.html", {
                        name: "Edit Text",
                        ajaxContentAdded: function (element) {
                            var spt = Mapper.toStandoffPropertyText(model);
                            var modal = new Modal({
                                popup: element,
                                tabs: ["quickAdd"],
                                currentTab: "quickAdd",
                                tab: {
                                    quickAdd: {
                                        model: {
                                            Guid: model.Entity.Guid,
                                            Name: model.Entity.Name,
                                            Type: model.Entity.Type
                                        }
                                    }
                                },
                                handler: {
                                    onSelected: function (value, name) {
                                        closeModal(element);
                                    },
                                    onCancel: function () {
                                        closeModal(element);
                                    }
                                },
                                editor: {
                                    userGuid: data.UserGuid,
                                    text: spt.text,
                                    properties: spt.properties
                                }
                            });
                            ko.applyBindings(modal, element);
                            modal.start();
                        }
                    });
                });
            });
        };
        Search.prototype.selectClicked = function (item) {
            this.handler.onSelected(item.Entity.Guid);
        };
        Search.prototype.submitClicked = function () {
            this.loadPage();
        };
        Search.prototype.clearClicked = function () {
            this.clear();
            this.loadPage();
        };
        Search.prototype.closeClicked = function () {
            this.handler.closeClicked();
        };
        Search.prototype.minimizeClicked = function () {
            this.handler.minimizeClicked();
        };
        Search.prototype.clear = function () {
            this.filter.Guid(null);
            this.filter.Type(null);
            this.filter.AnnotationType(null);
            this.filter.AttributeName(null);
            this.filter.AttributeValue(null);
            this.filter.PageNum(null);
            this.filter.Name(null);
            this.filter.Text(null);
            this.filter.Order(null);
            this.filter.PageRows(null);
            this.filter.Page(null);
            this.filter.Section(null);
            this.filter.Order(null);
            this.filter.Direction("Ascending");
        };
        return Search;
    })();

    return Search;
}));
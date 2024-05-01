(function (factory) {
    define("parts/intertext-processor", ["speedy/editor", "knockout", "jquery", "pubsub", "app/helpers", "app/utils", "app/mapper"], factory);
}(function (Editor, ko, $, pubsub, Helper, Utils, Mapper) {

    var openModal = Helper.openModal;
    var setList = Helper.setList;
    var select = Utils.select;

    var camel = function (obj) {
        var result = {};
        for (var n in obj) {
            var n1 = n[0].toLowerCase() + n.substring(1);
            result[n1] = obj[n];
        }
        return result;
    };

    function getParent(startNode, func) {
        var s = startNode, loop = true;
        while (loop) {
            if (func(s)) {
                return s;
            }
            s = s.parentElement;
        }
        return null;
    }

    function closeModal(element) {
        $(element).modal("hide");
        ko.cleanNode(element);
        element.remove();
    }

    var MonitorBar = (function () {
        function MonitorBar(cons) {
            this.monitorOptions = cons.monitorOptions;
            this.monitorButton = cons.monitorButton;
            this.css = cons.css;
            this.monitor = cons.monitor; // HTMLElement
            this.propertyType = cons.propertyType; // Hack: property types editor accepts
            this.properties = [];
        }
        MonitorBar.prototype.newSpan = function (text) {
            var s = document.createElement("SPAN");
            s.style.position = "relative";
            if (text) {
                s.innerHTML = text;
            }
            return s;
        };
        MonitorBar.prototype.clear = function () {
            if (!this.monitor) {
                return;
            }
            this.monitor.textContent = "";
        };
        MonitorBar.prototype.setProperties = function (props) {
            if (!this.monitor) {
                return;
            }
            var _ = this;
            this.properties = props;
            this.monitor.textContent = "";
            for (var i = 0; i < props.length; i++) {
                var prop = props[i];
                var propertyType = this.propertyType[prop.type];
                var range = this.newSpan();
                range.style.marginRight = "10px";
                var labelRenderer = propertyType.labelRenderer;
                var label = labelRenderer ? labelRenderer(prop) : prop.type;

                var type = this.newSpan(label);
                type.property = prop;

                if (_.monitorOptions && _.monitorOptions.highlightProperties) {
                    type.addEventListener("mouseover", function (e) {
                        setTimeout(() => {
                            var span = getParent(e.target, function (x) { return !!x.property; });
                            if (!span) {
                                return;
                            }
                            var p = span.property;
                            p.highlight();
                            span.classList.add(_.css.highlight);
                        }, 1);
                    });
                    type.addEventListener("mouseout", function (e) {
                        setTimeout(() => {
                            var span = getParent(e.target, function (x) { return !!x.property; });
                            if (!span) {
                                return;
                            }
                            var p = span.property;
                            p.unhighlight();
                            span.classList.remove(_.css.highlight);
                        });
                    }, 1);
                }

                var del = this.newSpan(this.monitorButton.remove || "[x]");
                del.property = prop;
                del.style.marginLeft = "5px";
                del.addEventListener("click", function (e) {
                    var span = getParent(e.target, function (x) { return !!x.property; });
                    if (!span) {
                        return;
                    }
                    var p = span.property;
                    p.remove();
                });

                var shiftLeft = this.newSpan(this.monitorButton.shiftLeft || "<-");
                shiftLeft.property = prop;
                shiftLeft.style.marginLeft = "5px";
                shiftLeft.addEventListener("click", function (e) {
                    var span = getParent(e.target, function (x) { return !!x.property; });
                    if (!span) {
                        return;
                    }
                    var p = span.property;
                    p.shiftLeft();
                });

                var shiftRight = this.newSpan(this.monitorButton.shiftRight || "->");
                shiftRight.property = prop;
                shiftRight.style.marginLeft = "5px";
                shiftRight.addEventListener("click", function (e) {
                    var span = getParent(e.target, function (x) { return !!x.property; });
                    if (!span) {
                        return;
                    }
                    var p = span.property;
                    p.shiftRight();
                });

                var expand = this.newSpan(this.monitorButton.expand || "[+]");
                expand.property = prop;
                expand.style.marginLeft = "5px";
                expand.addEventListener("click", function (e) {
                    var span = getParent(e.target, function (x) { return !!x.property; });
                    if (!span) {
                        return;
                    }
                    var p = span.property;
                    p.expand();
                });

                var contract = this.newSpan(this.monitorButton.contract || "[-]");
                contract.property = prop;
                contract.style.marginLeft = "5px";
                contract.addEventListener("click", function (e) {
                    var span = getParent(e.target, function (x) { return !!x.property; });
                    if (!span) {
                        return;
                    }
                    var p = span.property;
                    p.contract();
                });

                range.appendChild(type);
                range.appendChild(shiftLeft);
                range.appendChild(shiftRight);
                range.appendChild(expand);
                range.appendChild(contract);
                range.appendChild(del);

                this.monitor.appendChild(range);
            }
        };
        return MonitorBar;
    })();

    var Selector = (function () {
        function Selector(cons) {
            var _ = this;
            cons = cons || {};
            this.mode = cons.mode;
            this.guid = cons.guid;
            this.text = cons.text;
            this.properties = [];
            this.handler = cons.handler;
            this.editor = null;
        }
        Selector.prototype.setupEditor = function (settings) {
            settings = settings || {};
            settings.model = settings.model || {};
            this.editor = new Editor({
                container: settings.container,
                model: {
                    Guid: settings.model.Guid
                },
                lockText: true,
                onPropertyCreated: function (prop, data) {
                    // Copy the custom fields across from the JSON data to the Property.
                    if (!data) {
                        return;
                    }
                    prop.userGuid = data.userGuid;
                },
                onPropertyUnbound: function (data, prop) {
                    // Copy the custom fields across from the Property to the JSON data.
                    data.userGuid = prop.userGuid;
                },
                monitorOptions: {
                    highlightProperties: true
                },
                css: {
                    highlight: "text-highlight"
                },
                monitorButton: {
                    remove: '<button data-toggle="tooltip" data-original-title="Delete" class="btn btn-sm"><span class="fa fa-trash"></span></button>',
                    shiftLeft: '<button data-toggle="tooltip" data-original-title="Left" class="btn btn-sm"><span class="fa fa-arrow-circle-left"></span></button>',
                    shiftRight: '<button data-toggle="tooltip" data-original-title="Right" class="btn btn-sm"><span class="fa fa-arrow-circle-right"></span></button>',
                    expand: '<button data-toggle="tooltip" data-original-title="Expand" class="btn btn-sm"><span class="fa fa-plus-circle"></span></button>',
                    contract: '<button data-toggle="tooltip" data-original-title="Contract" class="btn btn-sm"><span class="fa fa-minus-circle"></span></button>'
                },
                propertyType: {
                    "source_of_intertext": {
                        format: "decorate",
                        shortcut: "t",
                        className: "source_of_intertext",
                        labelRenderer: function (prop) {
                            return "selection";
                        }
                    },
                    "target_of_intertext": {
                        format: "decorate",
                        shortcut: "t",
                        className: "target_of_intertext",
                        labelRenderer: function (prop) {
                            return "selection";
                        }
                    }
                }
            });
            var monitor = new MonitorBar({
                monitor: settings.monitor,
                propertyType: this.editor.propertyType,
                monitorButton: {
                    remove: '<button data-toggle="tooltip" data-original-title="Delete" class="btn btn-sm"><span class="fa fa-trash"></span></button>',
                    shiftLeft: '<button data-toggle="tooltip" data-original-title="Left" class="btn btn-sm"><span class="fa fa-arrow-circle-left"></span></button>',
                    shiftRight: '<button data-toggle="tooltip" data-original-title="Right" class="btn btn-sm"><span class="fa fa-arrow-circle-right"></span></button>',
                    expand: '<button data-toggle="tooltip" data-original-title="Expand" class="btn btn-sm"><span class="fa fa-plus-circle"></span></button>',
                    contract: '<button data-toggle="tooltip" data-original-title="Contract" class="btn btn-sm"><span class="fa fa-minus-circle"></span></button>'
                },
                monitorOptions: {
                    highlightProperties: true
                },
                css: {
                    highlight: "text-highlight"
                }
            });
            this.editor.addMonitor(monitor);
            this.editor.bind({
                text: settings.text
            });
            if (settings.sourceProperties) {
                this.editor.addProperties(settings.sourceProperties)
            }
        };
        Selector.prototype.unbind = function () {
            var data = this.editor.unbind();
            var properties = data.properties.filter(function (item) {
                return !item.isDeleted;
            });
            return properties;
        };
        Selector.prototype.fetchText = function () {
            var _this = this;
            $.post("/Admin/Text/FindStandoffPropertyGraph", { id: this.id }, function (response) {
                console.log("response", response);
                if (!response.Success) {
                    return;
                }
                _this.editor.bind({
                    text: response.Data.Text
                });
            });
        };
        Selector.prototype.submitClicked = function () {
            this.submit();
        };
        Selector.prototype.loadClicked = function () {
            var _this = this;
            var TextModal = require("modals/search-texts");
            openModal("/Static/Templates/Text/SearchModal.html", {
                name: "Texts",
                ajaxContentAdded: function (element) {
                    var modal = new TextModal({
                        popup: element,
                        tab: {
                            search: {
                                filter: {

                                }
                            }
                        },
                        handler: {
                            onSelected: function (guid) {
                                $.get("/Admin/Text/FindStandoffPropertyGraph", { id: guid }, function (response) {
                                    console.log("response", response);
                                    if (!response.Success) {
                                        return;
                                    }
                                    _this.guid = guid;
                                    var data = response.Data;
                                    var model = data.Model;
                                    var spt = Mapper.toStandoffPropertyText(model);
                                    _this.editor.bind(spt);
                                });
                                closeModal(element);
                            }
                        }
                    });
                    ko.applyBindings(modal, element);
                }
            });
        };
        Selector.prototype.selectClicked = function () {
            if (this.mode == "source") {
                this.editor.createProperty("source_of_intertext");
            } else if (this.mode == "target") {
                this.editor.createProperty("target_of_intertext");
            } else {
                // unhandled
            }
        };
        Selector.prototype.closeClicked = function () {
            this.handler.onCancel();
        };
        Selector.prototype.submit = function () {
            var _ = this;
            var data = this.editor.unbind();
            var properties = data.properties.filter(function (item) {
                return !item.isDeleted && !!item.value;
            });
            this.handler.onSubmitted(properties);
        };
        return Selector;
    })();

    var Intertext = (function () {
        function Intertext(cons) {
            var _ = this;
            cons = cons || {};
            cons.model = cons.model || {};
            this.text = cons.text;
            this.properties = [];
            this.handler = cons.handler;
            var CodexEditor = require("parts/text-add");
            this.codexEditor = new CodexEditor({
                mode: "modal",
                model: {
                    Type: "Intertext",
                    Section: cons.model.section,
                    Name: cons.model.name ? cons.model.name + " [intertext]" : null
                },
                handler: {
                    onSelected: cons.handler.onIntertextSaved,
                    onCancelled: cons.handler.onCancelled
                }
            });
        }
        Intertext.prototype.unbind = function () {
            var data = this.codexEditor.editor.unbind();
            var properties = data.properties.filter(function (item) {
                return !item.isDeleted;
            });
            return properties;
        };
        Intertext.prototype.setupEditor = function (settings) {
            this.codexEditor.setupEditor({
                container: settings.container,
                monitor: settings.monitor
            });
            if (settings.text && settings.properties) {
                this.codexEditor.editor.bind({
                    text: settings.text,
                    properties: settings.properties
                });
            }
        }
        return Intertext;
    })();

    var Modal = (function () {
        function Modal(cons) {
            var _this = this;
            this.popup = cons.popup;
            this.mode = cons.mode;
            this.handler = cons.handler;
            this.text = cons.text;
            this.sourceProperties = cons.sourceProperties;
            this.source = new Selector({
                mode: "source"
            });
            this.target = new Selector({
                mode: "target"
            });
            this.intertext = new Intertext({
                model: {
                    section: cons.section,
                    name: cons.name
                },
                handler: {
                    onIntertextSaved: (intertextGuid) => {
                        var sourceProperties = _this.source.unbind().map(sp => {
                            sp.value = intertextGuid;
                            sp.attributes.origin = "source";
                            return sp;
                        });
                        var targetProperties = _this.target.unbind().map(sp => {
                            sp.value = intertextGuid;
                            sp.attributes = ["origin|target"];
                            return sp;
                        });
                        console.log({ handler: "onIntertextSaved", targetProperties });
                        $.ajax({
                            method: "POST",
                            url: "/Admin/Text/RelateToIntertextTargets",
                            data: {
                                targetTextGuid: _this.target.guid,
                                standoffProperties: targetProperties
                            }
                        })
                        .done(response => {
                            console.log({ ajax: "/Admin/Text/RelateToIntertextTargets", handler: "onIntertextSaved", response });
                            if (!response.Success) {
                                return;
                            }
                            cons.handler.onIntertextRelatedToTarget({
                                properties: sourceProperties
                            });
                        });
                    },
                    onCancelled: cons.handler.onCancel
                }
            });
            this.setup();
        }
        Modal.prototype.start = function (node) {
            var _this = this;
            ko.applyBindings(this, this.popup);
            var $popup = $(this.popup);
            if (this.mode == "add") {
                this.source.setupEditor({
                    container: $popup.find("#source-editor [data-role=editor]")[0],
                    monitor: $popup.find("#source-editor [data-role=monitor]")[0],
                    text: this.text,
                    sourceProperties: this.sourceProperties
                });
                this.target.setupEditor({
                    container: $popup.find("#target-editor [data-role=editor]")[0],
                    monitor: $popup.find("#target-editor [data-role=monitor]")[0],
                    text: this.text
                });
                this.intertext.setupEditor({
                    container: $popup.find("#intertext-editor [data-role=editor]")[0],
                    monitor: $popup.find("#intertext-editor [data-role=monitor]")[0]
                });
            } else if (this.mode == "edit") {
                var guid = this.sourceProperties[0].value;
                $.get("/Admin/Text/FindIntertextCluster", { id: guid }, response => {
                    console.log({ response });
                    if (!response.Success) {
                        return;
                    }
                    var data = response.Data;
                    _this.source.setupEditor({
                        container: $popup.find("#source-editor [data-role=editor]")[0],
                        monitor: $popup.find("#source-editor [data-role=monitor]")[0],
                        model: {
                            Guid: data.Source.Text.Guid
                        },
                        text: data.Source.Text.Value,
                        sourceProperties: data.Source.StandoffProperties.map(x => camel(x))
                    });
                    _this.target.setupEditor({
                        container: $popup.find("#target-editor [data-role=editor]")[0],
                        monitor: $popup.find("#target-editor [data-role=monitor]")[0],
                        model: {
                            Guid: data.Target.Text.Guid
                        },
                        text: data.Target.Text.Value,
                        sourceProperties: data.Target.StandoffProperties.map(x => camel(x))
                    });
                    _this.intertext.setupEditor({
                        container: $popup.find("#intertext-editor [data-role=editor]")[0],
                        monitor: $popup.find("#intertext-editor [data-role=monitor]")[0],
                        model: {
                            Guid: data.Intertext.Text.Guid
                        },
                        text: data.Intertext.Text.Value,
                        properties: data.Intertext.StandoffProperties.map(x => camel(x))
                    });
                });
            } else {
                // Unhandled.
            }
        };
        Modal.prototype.setup = function () {
            var _this = this;
            $.get("/Static/Templates/Text/intertext-selector.html", function (selectorHtml) {
                $.get("/Static/Templates/Text/text-editor.html", function (editorHtml) {
                    _this.addTemplate(selectorHtml);
                    _this.addTemplate(editorHtml);
                    _this.start({
                        text: _this.text,
                        properties: _this.properties
                    });
                });
            });
        };
        Modal.prototype.closeClicked = function () {
            this.close();
        };
        Modal.prototype.close = function () {
            this.handler.onCancel();
        };
        Modal.prototype.addTemplate = function (html) {
            var template = document.createElement("DIV");
            template.innerHTML = html;
            template.style.display = "none";
            document.body.appendChild(template);
        };
        return Modal;
    })();

    return Modal;
}));
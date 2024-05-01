(function (factory) {
    define("parts/text-selector", ["speedy/editor", "knockout", "jquery", "pubsub", "app/helpers", "modals/search-agents", "app/utils"], factory);
}(function (Editor, ko, $, pubsub, Helper, AgentModal, Utils) {

    var openModal = Helper.openModal;
    var setList = Helper.setList;
    var select = Utils.select;
    var div = Helper.div;
    var applyBindings = Helper.applyBindings;
    var WindowManager = Helper.getWindowManager();

    var Processor = (function () {
        function Processor(cons) {
            var _ = this;
            cons = cons || {};
            this.popup = cons.popup;
            this.selection = cons.selection;
            this.text = cons.text;
            this.properties = [];
            this.handler = cons.handler;
            this.editor = new Editor({
                container: $(this.popup).find("[data-role=editor]")[0],
                monitor: $(this.popup).find("[data-role=monitor]")[0],
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
                monitorButton: {
                    link: '<button data-toggle="tooltip" data-original-title="Edit" class="btn btn-sm"><span class="fa fa-link"></span></button>',
                    layer: '<button data-toggle="tooltip" data-original-title="Layer" class="btn btn-sm"><span class="fa fa-cog"></span></button>',
                    remove: '<button data-toggle="tooltip" data-original-title="Delete" class="btn btn-sm"><span class="fa fa-trash"></span></button>',
                    comment: '<button data-toggle="tooltip" data-original-title="Comment" class="btn btn-sm"><span class="fa fa-comment"></span></button>',
                    shiftLeft: '<button data-toggle="tooltip" data-original-title="Left" class="btn btn-sm"><span class="fa fa-arrow-circle-left"></span></button>',
                    shiftRight: '<button data-toggle="tooltip" data-original-title="Right" class="btn btn-sm"><span class="fa fa-arrow-circle-right"></span></button>',
                    expand: '<button data-toggle="tooltip" data-original-title="Expand" class="btn btn-sm"><span class="fa fa-plus-circle"></span></button>',
                    contract: '<button data-toggle="tooltip" data-original-title="Contract" class="btn btn-sm"><span class="fa fa-minus-circle"></span></button>',
                    toZeroPoint: '<button data-toggle="tooltip" data-original-title="Convert to zero point" class="btn btn-sm"><span style="font-weight: 600;">Z</span></button>',
                    zeroPointLabel: '<button data-toggle="tooltip" data-original-title="Label" class="btn btn-sm"><span class="fa fa-file-text-o"></span></button>',
                },
                propertyType: {
                    "agent": {
                        format: "overlay",
                        shortcut: "a",
                        className: "agent",
                        labelRenderer: function (prop) {
                            return prop.name ? "agent (" + prop.name + ")" : "agent";
                        },
                        event: {
                            annotation: {
                                "dblclick": (prop) => {
                                    var _this = _;
                                    require(["modals/search-agents", "jquery-ui"], function (AgentModal) {
                                        $.get("/Static/Templates/Agent/search-panel.html?v=27", function (html) {
                                            var container = div({
                                                classList: ["text-window"],
                                                style: {
                                                    position: "absolute",
                                                    zIndex: 31,
                                                    top: "100px",
                                                    right: "20px",
                                                    width: "800px",
                                                    maxHeight: "800px"
                                                }
                                            });
                                            var modal = new AgentModal({
                                                popup: container,
                                                tabs: ["search", "quickAdd"],
                                                currentTab: "search",
                                                tab: {
                                                    search: {
                                                        filter: {
                                                            Guid: prop.value,
                                                            Name: !prop.value ? prop.text : null
                                                        }
                                                    },
                                                    quickAdd: {
                                                        model: {
                                                            Entity: {
                                                                Name: prop.text ? prop.text : null
                                                            }
                                                        }
                                                    }
                                                },
                                                handler: {
                                                    onSelected: function (guid, name) {
                                                        prop.className = "agent-set";
                                                        prop.value = guid;
                                                        prop.text = name;
                                                        container.remove();
                                                    },
                                                    closeClicked: function () {
                                                        container.remove();
                                                    }
                                                }
                                            });
                                            modal.start();
                                            var node = applyBindings(html, modal);
                                            container.appendChild(node);
                                            document.body.appendChild(container);
                                            $(container).draggable();
                                            var win = WindowManager.addWindow({
                                                type: "agent-search",
                                                params: {
                                                    value: prop.value,
                                                    text: prop.text
                                                },
                                                node: container
                                            });
                                        });
                                    });
                                    //openModal("/Static/Templates/Agent/SearchModal.html", {
                                    //    name: "Agents",
                                    //    ajaxContentAdded: function (element) {
                                    //        var modal = new AgentModal({
                                    //            popup: element,
                                    //            tab: {
                                    //                search: {
                                    //                    filter: {
                                    //                        Guid: prop.value,
                                    //                        Name: !prop.value ? prop.text : null
                                    //                    }
                                    //                },
                                    //                quickAdd: {
                                    //                    model: {
                                    //                        Entity: {
                                    //                            Name: prop.text ? prop.text : null
                                    //                        }
                                    //                    }
                                    //                }
                                    //            },
                                    //            handler: {
                                    //                onSelected: function (guid, name) {
                                    //                    prop.className = "agent-set";
                                    //                    process(guid, name);
                                    //                    $(element).modal("hide");
                                    //                    ko.cleanNode(element);
                                    //                }
                                    //            }
                                    //        });
                                    //        ko.applyBindings(modal, element);
                                    //        modal.start();
                                    //    }
                                    //});
                                }
                            }
                        },
                        propertyValueSelector: function (prop, process) {
                            openModal("/Static/Templates/Agent/SearchModal.html", {
                                name: "Agents",
                                ajaxContentAdded: function (element) {
                                    var modal = new AgentModal({
                                        popup: element,
                                        tab: {
                                            search: {
                                                filter: {
                                                    Guid: prop.value,
                                                    Name: !prop.value ? prop.text : null
                                                }
                                            },
                                            quickAdd: {
                                                model: {
                                                    Entity: {
                                                        Name: prop.text ? prop.text : null
                                                    }
                                                }
                                            }
                                        },
                                        handler: {
                                            onSelected: function (guid, name) {
                                                prop.className = "agent-set";
                                                process(guid, name);
                                                $(element).modal("hide");
                                                ko.cleanNode(element);
                                            }
                                        }
                                    });
                                    ko.applyBindings(modal, element);
                                    modal.start();
                                }
                            });
                        },
                    }
                }
            });
            this.editor.bind({
                text: cons.text || "",
                properties: []
            });
            this.start();
        }
        Processor.prototype.showScrollBar = function (matches) {
            var rect = this.editor.container.getBoundingClientRect();
            var buffer = 20;
            var scrollHeight = this.editor.container.scrollHeight;
            var offsetHeight = this.editor.container.offsetHeight;
            var ratio = (offsetHeight - buffer * 2) / scrollHeight;
            var bar = document.createElement("DIV");
            var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            bar.style.position = "fixed";
            bar.style.top = rect.top + scrollTop + "px";
            bar.style.backgroundColor = "#333";
            bar.style.width = "20px";
            bar.style.left = (rect.right - 38) + "px";
            bar.style.height = offsetHeight + "px";
            bar.style.zIndex = 1050;
            var markers = matches.map(x => {
                var marker = document.createElement("SPAN");
                var y = ((x.startNode.offsetTop) * ratio);
                console.log({ y });
                marker.style.position = "absolute";
                marker.style.width = "100%";
                marker.style.opacity = "0.33";
                marker.style.backgroundColor = "yellow";
                marker.style.top = y + "px";
                marker.style.left = "0px";
                marker.style.height = "2px";
                return marker;
            });
            markers.forEach(x => bar.appendChild(x));
            document.body.appendChild(bar);
            // this.editor.container.appendChild(bar);
            this.editor.bar = bar;
        };
        Processor.prototype.onClose = function () {
            if (!!this.editor.bar) {
                document.body.removeChild(this.editor.bar);
                //this.editor.bar.remove();
            }
        };
        //Processor.prototype.hideScrollBar = function (editor) {
        //    if (this.editor.bar) {
        //        this.editor.bar.remove();
        //    }
        //};
        Processor.prototype.start = function () {
            this.selectTextMatches();
        };
        Processor.prototype.cloneClicked = function () {
            var property = this.editor.getPropertyAtCursor();
            if (!property) {
                return;
            }
            var matches = this.editor.data.properties.filter(function (item) {
                return item.type == property.type && item.getText() == property.getText();
            });
            matches.forEach(function (item) {
                item.className = "agent-set";
                item.value = property.value;
                item.setSpanRange();
                item.highlight();
            });
            alert(matches.length + " properties replaced.")
        };
        //Processor.prototype.selectTextMatches = function () {
        //    var text = this.text;
        //    var selectionText = this.selection.text;
        //    var sellen = selectionText.length;
        //    var upperLimit = text.length - sellen;
        //    var properties = [];
        //    for (var i = 0; i <= upperLimit; i++) {
        //        var value = text.substring(i, i + sellen);
        //        if (value == selectionText) {
        //            properties.push({ startIndex: i, endIndex: i + sellen - 1, text: selectionText, type: "agent" });
        //        }
        //    }
        //    this.editor.addProperties(properties);
        //};
        Processor.prototype.selectTextMatches = function () {
            var selectionText = this.selection.text;
            var regex = RegExp('\\b' + selectionText + '\\b', 'gi');
            var properties = [];
            var group = [];
            var len = selectionText.length;
            while (group = regex.exec(this.text) !== null) {
                var si = regex.lastIndex - len,
                    ei = regex.lastIndex - 1;
                properties.push({ startIndex: si, endIndex: ei, text: selectionText, type: "agent" });
            }
            var matches = this.editor.addProperties(properties);
            if (matches) {
                var first = matches[0];
                first.startNode.scrollIntoView();
            }
            matches.forEach(x => x.highlight());
            this.showScrollBar(matches);
        };
        Processor.prototype.submitClicked = function () {
            this.merge();
        };
        Processor.prototype.agentClicked = function () {
            this.editor.createProperty("agent");
        };
        Processor.prototype.closeClicked = function () {
            this.handler.onCancel();
        };
        Processor.prototype.merge = function () {
            var _ = this;
            var data = this.editor.unbind();
            var properties = data.properties.filter(function (item) {
                return !item.isDeleted && !!item.value;
            });
            this.handler.onMergeProperties(properties);
        };
        return Processor;
    })();

    return Processor;
}));
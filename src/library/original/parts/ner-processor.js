(function (factory) {
    define("parts/ner-processor", ["speedy/editor", "knockout", "jquery", "pubsub", "app/helpers", "modals/search-agents", "app/utils"], factory);
}(function (Editor, ko, $, pubsub, Helper, AgentModal, Utils) {

    var openModal = Helper.openModal;
    var setList = Helper.setList;
    var select = Utils.select;

    var Processor = (function () {
        function Processor(cons) {
            var _ = this;
            cons = cons || {};
            this.popup = cons.popup;
            this.text = cons.text;
            this.properties = [];
            this.handler = cons.handler;
            this.inlineAgentSelector = this.handler.inlineAgentSelector;
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
        Processor.prototype.start = function () {
            this.fetchNamedEntities();
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
            });
            alert(matches.length + " properties replaced.")
        };
        Processor.prototype.fetchNamedEntities = function () {
            var _this = this;
            $.post("/Admin/Text/NamedEntities", { text: this.text }, function (response) {
                console.log("response", response);
                if (!response.Success) {
                    return;
                }
                //var properties = response.Data.NamedEntities.map(function (item) {
                //    return {
                //        type: "agent",
                //        startIndex: item.StartIndex,
                //        endIndex: item.EndIndex,
                //        text: item.Text
                //    };
                //});
                var agents = _this.inlineAgentSelector();
                var properties = response.Data.NamedEntities.filter(function (item) {
                    return !agents.find(function (agent) { return agent.startIndex == item.StartIndex && agent.endIndex == item.EndIndex; });
                }).map(function (item) {
                    return {
                        type: "agent",
                        startIndex: item.StartIndex,
                        endIndex: item.EndIndex,
                        text: item.Text
                    };
                });
                _this.editor.addProperties(properties);
            });
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
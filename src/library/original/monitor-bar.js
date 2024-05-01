(function (factory) {
    define("speedy/monitor-bar", [], factory);
}(function () {

    var maxWhile = 10000;

    function hasProperties(obj) {
        if (!obj) {
            return false;
        }
        return Object.getOwnPropertyNames(obj).length;
    }

    function getParent(startNode, func) {
        var s = startNode, loop = true;
        var c = 0;
        while (loop) {
            if (func(s)) {
                return s;
            }
            if (s) {
                s = s.parentElement;
            } else {
                loop = false;
            }
            if (c++ > maxWhile) {
                console.log("Exceeded max iterations", { method: "monitor-bar/getParent", s });
                return s;
            }
        }
        return null;
    }

    const newSpan = (config) => {
        var el = document.createElement("SPAN");
        el.property = config.property;
        if (config.content) {
            el.innerHTML = config.content;
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
        return el;
    };

    var MonitorBar = (function () {
        function MonitorBar(cons) {
            // this.editor = cons.editor;
            this.monitorOptions = cons.monitorOptions; // Todo: rename to 'options'
            this.monitorButton = cons.monitorButton;
            this.layerAdded = cons.layerAdded; // Hack: currently copied from the Editor
            this.commentManager = cons.commentManager;
            this.updateCurrentRanges = cons.updateCurrentRanges; // Hack: currently copied from the Editor
            this.css = cons.css;
            this.active = false;
            this.monitor = cons.monitor; // HTMLElement
            this.propertyType = cons.propertyType; // Hack: property types editor accepts
            this.properties = [];
        }
        MonitorBar.prototype.newSpan = function (text) {
            var s = document.createElement("SPAN");
            s.speedy = {};
            s.style.position = "relative";
            if (text) {
                s.innerHTML = text + "&#x200d;";
            }
            s.startProperties = [];
            s.endProperties = [];
            return s;
        };
        MonitorBar.prototype.clear = function () {
            if (!this.monitor) {
                return;
            }
            this.monitor.textContent = "";
        };
        MonitorBar.prototype.update = function (data) {
            if (!this.monitor) {
                return;
            }
            var _ = this;
            var props = data.properties;
            this.properties = props;
            this.monitor.textContent = "";
            for (var i = 0; i < props.length; i++) {
                var prop = props[i];
                prop.pinHighlight = false;
                var propertyType = this.propertyType[prop.type];
                if (!propertyType) {
                    continue;
                }
                var range = this.newSpan();
                range.style.marginTop = "5px";
                range.style.display = "block";
                range.property = prop;
                var labelRenderer = propertyType.labelRenderer;
                var label = labelRenderer ? labelRenderer(prop) : prop.type;

                var checkbox = document.createElement("INPUT");
                checkbox.setAttribute("type", "checkbox");
                checkbox.style.marginRight = "5px";
                checkbox.property = prop;
                checkbox.addEventListener("change", function (e) {
                    const cb = getParent(e.target, x => !!x.property);
                    const { property } = cb;
                    property.pinHighlight = e.target.checked;
                });

                var type = this.newSpan(label);
                type.property = prop;
                if (_.monitorOptions.highlightProperties) {
                    type.addEventListener("mouseover", function (e) {
                        setTimeout(() => {
                            var span = getParent(e.target, x => !!x.property);
                            if (!span) {
                                return;
                            }
                            span.classList.add(_.css.highlight);
                            var p = span.property;
                            if (p.schema) {
                                if (p.schema.event) {
                                    if (p.schema.event.monitor) {
                                        if (p.schema.event.monitor.mouseover) {
                                            p.schema.event.monitor.mouseover(p);
                                            return;
                                        }
                                    }
                                }
                            }
                            p.highlight();
                        }, 1);
                    });
                    type.addEventListener("mouseout", function (e) {
                        setTimeout(() => {
                            var span = getParent(e.target, x => !!x.property);
                            if (!span) {
                                return;
                            }
                            var p = span.property;
                            if (p.pinHighlight) {
                                return;
                            }
                            span.classList.remove(_.css.highlight);
                            if (p.schema) {
                                if (p.schema.event) {
                                    if (p.schema.event.monitor) {
                                        if (p.schema.event.monitor.mouseout) {
                                            p.schema.event.monitor.mouseout(p);
                                            return;
                                        }
                                    }
                                }
                            }
                            p.unhighlight();
                        });
                    }, 1);
                    type.addEventListener("mouseleave", function (e) {
                        setTimeout(() => {
                            var span = getParent(e.target, x => !!x.property);
                            if (!span) {
                                return;
                            }
                            span.classList.remove(_.css.highlight);
                            var p = span.property;
                            if (p.schema) {
                                if (p.schema.event) {
                                    if (p.schema.event.monitor) {
                                        if (p.schema.event.monitor.mouseleave) {
                                            p.schema.event.monitor.mouseleave(p);
                                            return;
                                        }
                                    }
                                }
                            }
                            p.unhighlight();
                        });
                    }, 1);
                }
                if (!!prop.value) {
                    var link = newSpan({
                        content: this.monitorButton.link || "[O-O]",
                        property: prop,
                        style: {
                            marginLeft: "5px"
                        },
                        handler: {
                            click: (e) => {
                                var span = getParent(e.target, x => !!x.property);
                                if (!span) {
                                    return;
                                }
                                var p = span.property;
                                _.propertyType[p.type].propertyValueSelector(p, function (guid, name) {
                                    if (guid) {
                                        p.value = guid;
                                        p.name = name;
                                        _.updateCurrentRanges(p.startNode);
                                        if (_.onPropertyChanged) {
                                            _.onPropertyChanged(p);
                                        }
                                    }
                                });
                                _.updateCurrentRanges(p.startNode);
                            }
                        }
                    });
                }

                const load = newSpan({
                    content: this.monitorButton.load || "[=]",
                    property: prop,
                    style: {
                        marginLeft: "5px"
                    },
                    handler: {
                        click: (e) => {
                            var span = getParent(e.target, x => !!x.property);
                            if (!span) {
                                return;
                            }
                            var p = span.property;
                            var load = _.propertyType[p.type].load;
                            if (load) {
                                load(p);
                            }
                            _.updateCurrentRanges(p.startNode);
                        }
                    }
                });
                const del = newSpan({
                    content: this.monitorButton.remove || "[x]",
                    property: prop,
                    style: {
                        marginLeft: "5px"
                    },
                    handler: {
                        click: (e) => {
                            var span = getParent(e.target, x => !!x.property);
                            if (!span) {
                                return;
                            }
                            var p = span.property;
                            p.remove();
                        }
                    }
                });
                const comment = newSpan({
                    content: this.monitorButton.comment || "[.oO]",
                    property: prop,
                    style: {
                        marginLeft: "5px"
                    },
                    handler: {
                        click: (e) => {
                            var span = getParent(e.target, x => !!x.property);
                            if (!span) {
                                return;
                            }
                            var p = span.property;
                            _.commentManager(p);
                        }
                    }
                });
                const redraw = newSpan({
                    content: this.monitorButton.redraw || ">.",
                    property: prop,
                    style: {
                        marginLeft: "5px"
                    },
                    handler: {
                        click: (e) => {
                            var span = getParent(e.target, x => !!x.property);
                            if (!span) {
                                return;
                            }
                            var p = span.property;
                            var editor = data.editor;
                            var container = editor.container;
                            var temp = () => {
                                container.removeEventListener("mouseup", temp, true);
                                var sel = editor.getSelectionNodes();
                                if (sel) {
                                    p.switchTo(sel.start, sel.end);
                                }
                            };
                            container.addEventListener("mouseup", temp, true);
                        }
                    }
                });
                const shiftLeft = newSpan({
                    content: this.monitorButton.shiftLeft || "<-",
                    property: prop,
                    style: {
                        marginLeft: "5px"
                    },
                    handler: {
                        mouseover: (e) => {
                            var span = getParent(e.target, function (x) { return !!x.property; });
                            if (!span) {
                                return;
                            }
                            var p = span.property;
                            p.highlight();
                        },
                        mouseout: (e) => {
                            var span = getParent(e.target, function (x) { return !!x.property; });
                            if (!span) {
                                return;
                            }
                            var p = span.property;
                            p.unhighlight();
                        },
                        click: (e) => {
                            var span = getParent(e.target, x => !!x.property);
                            if (!span) {
                                return;
                            }
                            var p = span.property;
                            p.unhighlight();
                            if (e.shiftKey) {
                                p.shiftLeft();
                                p.expand();
                            } else {
                                p.shiftLeft();
                            }
                        }
                    }
                });
                const shiftRight = newSpan({
                    content: this.monitorButton.shiftRight || "->",
                    property: prop,
                    style: {
                        marginLeft: "5px"
                    },
                    handler: {
                        mouseover: (e) => {
                            var span = getParent(e.target, function (x) { return !!x.property; });
                            if (!span) {
                                return;
                            }
                            var p = span.property;
                            p.highlight();
                        },
                        mouseout: (e) => {
                            var span = getParent(e.target, function (x) { return !!x.property; });
                            if (!span) {
                                return;
                            }
                            var p = span.property;
                            p.unhighlight();
                        },
                        click: (e) => {
                            var span = getParent(e.target, x => !!x.property);
                            if (!span) {
                                return;
                            }
                            var p = span.property;
                            p.unhighlight();
                            if (e.shiftKey) {
                                p.shiftRight(true);
                                p.contract();
                            } else {
                                p.shiftRight();
                            }
                        }
                    }
                });
                const expand = newSpan({
                    content: this.monitorButton.expand || "[+]",
                    property: prop,
                    style: {
                        marginLeft: "5px"
                    },
                    handler: {
                        mouseover: (e) => {
                            var span = getParent(e.target, function (x) { return !!x.property; });
                            if (!span) {
                                return;
                            }
                            var p = span.property;
                            p.highlight();
                        },
                        mouseout: (e) => {
                            var span = getParent(e.target, function (x) { return !!x.property; });
                            if (!span) {
                                return;
                            }
                            var p = span.property;
                            p.unhighlight();
                        },
                        click: (e) => {
                            var span = getParent(e.target, x => !!x.property);
                            if (!span) {
                                return;
                            }
                            var p = span.property;
                            p.unhighlight();
                            p.expand();
                        }
                    }
                });
                const contract = newSpan({
                    content: this.monitorButton.contract || "[-]",
                    property: prop,
                    style: {
                        marginLeft: "5px"
                    },
                    handler: {
                        mouseover: (e) => {
                            var span = getParent(e.target, function (x) { return !!x.property; });
                            if (!span) {
                                return;
                            }
                            var p = span.property;
                            p.highlight();
                        },
                        mouseout: (e) => {
                            var span = getParent(e.target, function (x) { return !!x.property; });
                            if (!span) {
                                return;
                            }
                            var p = span.property;
                            p.unhighlight();
                        },
                        click: (e) => {
                            var span = getParent(e.target, x => !!x.property);
                            if (!span) {
                                return;
                            }
                            var p = span.property;
                            p.unhighlight();
                            p.contract();
                        }
                    }
                });
                if (prop.isZeroPoint) {
                    if (propertyType.zeroPoint) {
                        if (propertyType.zeroPoint.selector) {
                            var zeroPointLabel = newSpan({
                                content: this.monitorButton.zeroPointLabel || "[label]",
                                property: prop,
                                style: {
                                    marginLeft: "5px"
                                },
                                handler: {
                                    click: e => {
                                        var span = getParent(e.target, x => !!x.property);
                                        if (!span) {
                                            return;
                                        }
                                        var p = span.property;
                                        propertyType.zeroPoint.selector(p, label => {
                                            p.setZeroPointLabel(label);
                                        });
                                    }
                                }
                            });
                            //var zeroPointLabel = this.newSpan(this.monitorButton.zeroPointLabel || "[label]");
                            //zeroPointLabel.property = prop;
                            //zeroPointLabel.style.marginLeft = "5px";
                            //zeroPointLabel.addEventListener("click", function (e) {
                            //    var span = getParent(e.target, function (x) { return !!x.property; });
                            //    if (!span) {
                            //        return;
                            //    }
                            //    var p = span.property;
                            //    propertyType.zeroPoint.selector(p, function (label) {
                            //        p.setZeroPointLabel(label);
                            //    });
                            //});
                        }
                    }
                }
                var showConvertToZeroPoint = (propertyType.zeroPoint && propertyType.zeroPoint.offerConversion && propertyType.zeroPoint.offerConversion(prop));
                if (showConvertToZeroPoint) {
                    var toZeroPoint = this.newSpan(this.monitorButton.toZeroPoint || "[Z]");
                    toZeroPoint.property = prop;
                    toZeroPoint.style.marginLeft = "5px";
                    toZeroPoint.addEventListener("click", function (e) {
                        var span = getParent(e.target, function (x) { return !!x.property; });
                        if (!span) {
                            return;
                        }
                        var p = span.property;
                        p.convertToZeroPoint();
                    });
                }
                // range.appendChild(checkbox);
                range.appendChild(type);
                var options = document.createElement("SPAN");
                if (link) {
                    options.appendChild(link);
                }
                if (propertyType.load) {
                    options.appendChild(load);
                }
                options.appendChild(comment);
                options.appendChild(redraw);
                options.appendChild(shiftLeft);
                options.appendChild(shiftRight);
                options.appendChild(expand);
                options.appendChild(contract);
                options.appendChild(del);
                if (prop.isZeroPoint) {
                    options.appendChild(zeroPointLabel);
                }
                if (showConvertToZeroPoint) {
                    options.appendChild(toZeroPoint);
                }
                if (hasProperties(propertyType.attributes)) {
                    var attrs = [];
                    for (var key in propertyType.attributes) {
                        var attribute = propertyType.attributes[key];
                        var label = attribute.renderer(prop);
                        var attr = this.newSpan(label);
                        attr.speedy = {};
                        attr.speedy.property = prop;
                        attr.speedy.attributeName = key;
                        attr.style.marginLeft = "5px";
                        attr.addEventListener("click", function (e) {
                            var span = getParent(e.target, function (x) { return !!x.speedy && !!x.speedy.property; });
                            if (!span) {
                                return;
                            }
                            var p = span.speedy.property;
                            var name = span.speedy.attributeName;
                            _.propertyType[p.type].attributes[name].selector(p, function (value) {
                                p.attributes[name] = value;
                            });
                        });
                        attrs.push(attr);
                    }
                    attrs.forEach(function (attr) {
                        options.appendChild(attr);
                    });
                }
                options.style.display = "none";
                type.speedy = {
                    visible: false,
                    options: options
                };
                type.addEventListener("click", function (e) {
                    var _type = getParent(e.target, x => !!x.property);
                    if (!_type) {
                        return;
                    }
                    var options = _type.speedy.options;
                    _type.speedy.visible = !_type.speedy.visible;
                    if (_type.speedy.visible) {
                        options.style.display = "inline";
                    } else {
                        options.style.display = "none";
                    }
                }, 1);
                range.appendChild(options);
                this.monitor.appendChild(range);
            }
        };

        return MonitorBar;
    })();

    return MonitorBar;
}));
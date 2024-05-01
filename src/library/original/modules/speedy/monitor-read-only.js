(function (factory) {
    define("speedy/monitor-read-only", [], factory);
}(function () {

    function hasProperties(obj) {
        if (!obj) {
            return false;
        }
        return Object.getOwnPropertyNames(obj).length;
    }

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

    var Monitor = (function () {
        function Monitor(cons) {
            this.monitorOptions = cons.monitorOptions; // Todo: rename to 'options'
            this.monitorButton = cons.monitorButton;
            this.updateCurrentRanges = cons.updateCurrentRanges; // Hack: currently copied from the Editor
            this.css = cons.css;
            this.monitor = cons.monitor; // HTMLElement
            this.propertyType = cons.propertyType; // Hack: property types editor accepts
            this.properties = [];
        }
        Monitor.prototype.newSpan = function (text) {
            var s = document.createElement("SPAN");
            s.speedy = {};
            s.style.position = "relative";
            if (text) {
                s.innerHTML = text;
            }            
            return s;
        };
        Monitor.prototype.clear = function () {
            if (!this.monitor) {
                return;
            }
            this.monitor.textContent = "";
        };
        Monitor.prototype.update = function (data) {
            if (!this.monitor) {
                return;
            }
            var _ = this;
            const props = data.properties;
            this.properties = props;
            this.monitor.textContent = "";
            for (var i = 0; i < props.length; i++) {
                var prop = props[i];
                var propertyType = this.propertyType[prop.type];
                if (!propertyType) {
                    continue;
                }
                var range = this.newSpan();
                range.style.marginRight = "10px";
                var labelRenderer = propertyType.labelRenderer;
                var label = labelRenderer ? labelRenderer(prop) : prop.type;
                var type = this.newSpan(label);
                type.property = prop;
                if (_.monitorOptions.highlightProperties) {
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
                if (!!prop.value) {
                    var link = this.newSpan(this.monitorButton.link || "[O-O]");
                    link.property = prop;
                    link.style.marginLeft = "5px";
                    link.addEventListener("click", function (e) {
                        var span = getParent(e.target, function (x) { return !!x.property; });
                        if (!span) {
                            return;
                        }
                        var p = span.property;
                        _.propertyType[p.type].propertyValueSelector(p, function (guid, name) {
                            
                        });
                        _.updateCurrentRanges(p.startNode);
                    });
                }
                range.appendChild(type);
                if (link) {
                    range.appendChild(link);
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
                        attrs.push(attr);
                    }
                    attrs.forEach(function (attr) {
                        range.appendChild(attr);
                    });
                }
                this.monitor.appendChild(range);                
            }
        };

        return Monitor;
    })();

    return Monitor;
}));
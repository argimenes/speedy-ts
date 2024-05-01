(function (factory) {
    define("parts/minimap", ["app/helpers"], factory);
}(function (Helper) {

    const { div, drawClippedRectangle } = Helper;

    var Minimap = (function () {
        function Minimap(cons) {
            this.editor = cons.editor;
            this.container = cons.container;
            this.height = cons.height;
            this.buffer = cons.buffer;
            this.useGlobalCoordinates = typeof (cons.useGlobalCoordinates) != "undefined" ? cons.useGlobalCoordinates : true;
        }
        Minimap.prototype.createBar = function (settings) {
            settings = settings || {};
            var offsetHeight = this.height || this.container.offsetHeight;
            var caret = this.editor.getCaret();
            this.cursor = caret.left || caret.right;
            this.arrows = {
                left: null,
                right: null
            };
            var wrapper = div({
                style: {
                    position: "absolute",
                    top: 0,
                    right: "38px",
                }
            });
            // ref: https://stackoverflow.com/questions/6794000/fixed-position-but-relative-to-container
            const position = settings.position || "fixed";
            var bar = div({
                classList: ["noselect"],
                style: {
                    position: position,
                    backgroundColor: settings.backgroundColor || "#aaa",
                    width: "20px",
                    height: offsetHeight + "px",
                    cursor: "grab"
                }
            });
            wrapper.appendChild(bar);
            this.container.appendChild(wrapper);
            this.container.speedy.bar = bar;
            this.setupScrollHandler(wrapper);
        };
        Minimap.prototype.setupScrollHandler = function (wrapper) {
            const _this = this;
            const buffer = this.buffer || 20;
            const scrollHeight = this.container.scrollHeight;
            const offsetHeight = this.height || this.container.offsetHeight;
            const ratio = (offsetHeight - buffer * 2) / scrollHeight;
            let pos = { top: 0, y: 0 };
            const mouseDownThumbHandler = function (e) {
                pos = {
                    // The current scroll 
                    top: _this.container.scrollTop,
                    // Get the current mouse position
                    y: e.clientY,
                };
                wrapper.addEventListener('mousemove', mouseMoveHandler);
                wrapper.addEventListener('mouseup', mouseUpHandler);
            };
            const mouseMoveHandler = function (e) {
                // How far the mouse has been moved
                console.log({ clientY: e.clientY });
                const dy = e.clientY - pos.y;
                // Scroll the content
                _this.container.scrollTop = pos.top + dy / ratio;
                _this.container.style["user-select"] = "none";
                // _this.setArrowAtPosition(e.clientY * ratio);
            };
            const mouseUpHandler = function (e) {
                wrapper.removeEventListener('mousemove', mouseMoveHandler);
                wrapper.removeEventListener('mouseup', mouseUpHandler);
                _this.container.style["user-select"] = "auto";
            };
            // Attach the `mousedown` event handler
            wrapper.addEventListener('mousedown', mouseDownThumbHandler);
        };
        Minimap.prototype.remove = function () {
            this.container.speedy.bar.remove();
        };
        Minimap.prototype.hide = function () {
            this.container.speedy.bar.style.display = "none";
        };
        Minimap.prototype.show = function () {
            this.container.speedy.bar.style.display = "block";
        };
        Minimap.prototype.setArrowAt = function (node) {
            const ratio = this.getRatio();
            const field = this.useGlobalCoordinates ? "cy" : "y";
            const y = (node.speedy.offset[field] + (node.speedy.offset.h / 2)) * ratio;
            this.setArrowAtPosition(y);
        };
        Minimap.prototype.setArrowAtPosition = function (y) {
            if (!!this.arrows.left) {
                this.arrows.left.remove();
            }
            if (!!this.arrows.right) {
                this.arrows.right.remove();
            }
            const leftArrow = div({
                style: {
                    position: "absolute",
                    fontSize: "16px",
                    color: "red",
                    top: y + "px",
                    right: "-10px"
                },
                innerHTML: `<i style="width: 10px;" class="fas fa-caret-left"></i>`,
            });
            const rightArrow = div({
                style: {
                    position: "absolute",
                    fontSize: "16px",
                    color: "red",
                    top: y + "px",
                    right: "15px"
                },
                innerHTML: `<i style="width: 10px;" class="fas fa-caret-right"></i>`,
            });
            this.container.speedy.bar.appendChild(rightArrow);
            this.container.speedy.bar.appendChild(leftArrow);
            this.arrows.left = leftArrow;
            this.arrows.right = rightArrow;
        };
        Minimap.prototype.removeMarkers = function (guid) {
            var bar = this.container.speedy.bar;
            var childNodes = Array.prototype.slice.call(bar.childNodes);
            var nodes = childNodes.filter(x => x.minimap && x.minimap.guid == guid);
            nodes.forEach(n => n.remove());
        };
        Minimap.prototype.hideMarkers = function (guid) {
            var bar = this.container.speedy.bar;
            var childNodes = Array.prototype.slice.call(bar.childNodes);
            var nodes = childNodes.filter(x => x.minimap && x.minimap.guid == guid);
            nodes.forEach(n => {
                n.style.display = "none";
            });
        };
        Minimap.prototype.showMarkers = function (guid, glow) {
            var bar = this.container.speedy.bar;
            var childNodes = Array.prototype.slice.call(bar.childNodes);
            var nodes = childNodes.filter(x => x.minimap && x.minimap.guid == guid);
            nodes.forEach(n => {
                n.style.display = "block";
                if (glow) {
                    n.style.backgroundColor = "yellow";
                } else {
                    n.style.backgroundColor = n.minimap.colour;
                }
            });
        };
        Minimap.prototype.getRatio = function () {
            const buffer = 0;
            const scrollHeight = this.container.scrollHeight;
            const offsetHeight = this.height || this.container.offsetHeight;
            const ratio = (offsetHeight - buffer * 2) / scrollHeight;
            return ratio;
        };
        Minimap.prototype.addMarkers = function (properties, settings) {
            settings = settings || {};
            var _this = this;
            var bar = this.container.speedy.bar;
            const ratio = this.getRatio();
            var markers = properties.map(x => {
                var marker = document.createElement("SPAN");
                var y = _this.getY(x, ratio);
                var ph = _this.getPropertyHeight(x, ratio);
                var h = settings.usePropertyHeight ? ph : 2;
                marker.minimap = {
                    guid: x.value,
                    property: x,
                    colour: x.colour || settings.colour
                };
                marker.setAttribute("contenteditable", false);
                marker.classList.add("noselect");
                marker.style.position = "absolute";
                marker.style.width = "100%";
                marker.style.opacity = settings.opacity || "0.33";
                marker.style.backgroundColor = x.colour || settings.colour || "yellow";
                if (settings.mixBlendMode) {
                    marker.style.mixBlendMode = settings.mixBlendMode;
                }
                marker.style.top = y + "px";
                marker.style.left = "0px";
                marker.style.height = h + "px";
                marker.addEventListener("click", (e) => {
                    e.preventDefault();
                    const property = e.target.minimap.property;
                    _this.container.speedy.scrollTo({
                        left: 0,
                        top: property.startNode.offsetTop - 20,
                        behavior: "smooth"
                    });
                    const svg = drawClippedRectangle(property);
                    window.setTimeout(() => {
                        svg.remove();
                    }, 3000);
                });
                if (settings.hide) {
                    marker.style.display = "none";
                }
                return marker;
            });
            markers.forEach(x => bar.appendChild(x));
        };
        Minimap.prototype.getY = function (p, ratio) {
            const field = this.useGlobalCoordinates ? "cy" : "y";
            if (p.blockNode) {
                return ((p.blockNode.offsetTop) * ratio);
            } else {
                return ((p.startNode.speedy.offset[field]) * ratio);
            }
        };
        Minimap.prototype.getPropertyHeight = function (p, ratio) {
            const field = this.useGlobalCoordinates ? "cy" : "y";
            if (p.blockNode) {
                return (p.blockNode.offsetTop + p.blockNode.offsetHeight) * ratio;
            }
            return ((p.endNode.speedy.offset[field] + p.endNode.speedy.offset.h) - p.startNode.speedy.offset[field]) * ratio;
        };
        return Minimap;
    })();

    return Minimap;

}));
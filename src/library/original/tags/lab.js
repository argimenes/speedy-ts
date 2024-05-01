(function (factory) {
    define("speedy/tags/lab", ["jquery","app/helpers", "parts/window-manager", "jquery-ui"], factory);
}(function ($, Helper, _WindowManager) {

    const { div, openModal, newElement, updateElement, groupBy, drawUnderlineRainbow } = Helper;
    const WindowManager = _WindowManager.getWindowManager();

    const batchUpdate = (data) => {
        const { editor, properties } = data;
        const fragment = document.createDocumentFragment();
        const { container } = editor;
        const containerRect = container.getBoundingClientRect();
        const containerWidth = containerRect.width;
        const blockGroup = groupBy(properties, p => editor.getCurrentContainer(p.startNode));
        const blockRows = Array.from(blockGroup);
        blockRows.forEach(row => {
            let container = row[0];
            let blockProperties = row[1];
            blockProperties.forEach(p => {
                const { schema } = p;
                const { options } = schema.render;
                const svg = drawUnderlineRainbow(p);
                fragment.appendChild(svg);
            });
            container.appendChild(fragment);
        });
    };

    const tags = {
        "blur": {
            format: "decorate",
            className: "blurry-text",
            labelRenderer: function () {
                return "blur";
            }
        },
        gild: {
            format: "decorate",
            shortcut: "g",
            className: "gold-pressed",
            labelRenderer: function () {
                return "gild";
            }
        },
        mood: {
            format: "decorate",
            className: "mood",
            labelRenderer: function (prop) {
                return "mood: " + prop.value;
            },
            propertyValueSelector: function (prop, process) {
                var defaultValue = prop.value;
                var src = prompt("URL", defaultValue);
                process(src);
            },
            draw: (p) => {
                var panel = p.editor.container;
                panel.style["background-size"] = "cover";
                panel.style.background = "url(" + p.value + ") no-repeat center center fixed";
            },
            undraw: (p) => {
                var panel = p.editor.container;
                panel["background-size"] = "inherit";
                panel.background = "inherit";
            },
            animation: {
                init: (p) => {
                    var oldValue = window.getComputedStyle(p.editor.container, null).getPropertyValue("background");
                    p.data = {
                        background: oldValue
                    };
                },
                delete: (p) => {
                    var panel = p.editor.container;
                    panel.style["background-size"] = "unset";
                    panel.style.background = p.data.background;
                }
            },
            event: {
                property: {
                    enter: (p) => {
                        p.schema.draw(p);
                    },
                    leave: (p) => {
                        p.schema.undraw(p);
                    },
                    mouseUp: (p) => {
                        p.schema.draw(p);
                    },
                    keyDown: (p) => {
                        p.schema.draw(p);
                    },
                    delete: (p) => {

                    }
                }
            }
        },
        drag: {
            format: "block",
            labelRenderer: (p) => {
                return "dragged";
            },
            className: "dragged",
            animation: {
                init: (p) => {
                    var block = p.startNode.parentNode;

                    block.style.display = "inline-block";
                    p.select();
                    var moveAt = (pageX, pageY) => {
                        block.style.left = pageX - block.offsetWidth / 2 + 'px';
                        block.style.top = pageY - block.offsetHeight / 2 + 'px'
                    };
                    var onMouseMove = (e) => {
                        moveAt(e.pageX, e.pageY);
                    };
                    block.onmousedown = (e) => {
                        console.log(e);
                        block.style.position = "absolute";
                        block.style.zIndex = z++;
                        document.body.append(block);
                        moveAt(e.pageX, e.pageY);
                        document.addEventListener("mousemove", onMouseMove, false);
                        block.classList.add("editor-text");
                        block.ondragstart = () => {
                            return false;
                        };
                        block.onmouseup = () => {
                            document.removeEventListener("mousemove", onMouseMove, false);
                            p.editor.updateCurrentRanges();

                            block.onmouseup = null;
                        };
                        return true;
                    };
                },
                start: (p) => {

                },
                delete: (p) => {
                    console.log(p);
                    var block = p.startNode.parentNode;
                    if (!block) {
                        return;
                    }
                    block.style.top = 0;
                    block.style.left = 0;
                    block.style.position = "relative";
                }
            }
        },
        iframe: {
            format: "decorate",
            labelRenderer: function (prop) {
                return "iframe: " + prop.value;
            },
            zeroPoint: {
                className: "iframe"
            },
            propertyValueSelector: function (prop, process) {
                var defaultValue = prop.value;
                var src = prompt("URL", defaultValue);
                process(src);
            },
            attributes: {
                "width": {
                    renderer: function (prop) {
                        return "width (" + (prop.attributes.width || "none") + ")";
                    },
                    selector: function (prop, process) {
                        var value = prompt("width", prop.attributes["width"]);
                        process(value);
                    }
                },
                "height": {
                    renderer: function (prop) {
                        return "height (" + (prop.attributes.width || "none") + ")";
                    },
                    selector: function (prop, process) {
                        var value = prompt("height", prop.attributes["height"]);
                        process(value);
                    }
                }
            },
            animation: {
                init: (p) => {

                },
                start: (p) => {
                    var iframe = document.createElement("IFRAME");
                    iframe.setAttribute("width", "600");
                    iframe.setAttribute("height", "600");
                    iframe.setAttribute("src", p.value);
                    iframe.setAttribute("frameborder", "0");
                    //iframe.style["-webkit-transform"] = "scale(0.75)";
                    //iframe.style["-webkit-transform-origin"] = "0 0";
                    iframe.speedy = {
                        stream: 1
                    };
                    p.startNode.style.float = "left";
                    p.startNode.style.marginRight = "20px";
                    p.startNode.appendChild(iframe);
                },
                delete: (p) => {
                    p.startNode.remove();
                }
            }
        },
        audio: {
            format: "decorate",
            labelRenderer: function (prop) {
                return "audio: " + prop.value;
            },
            propertyValueSelector: function (prop, process) {
                var defaultValue = prop.value;
                var src = prompt("URL", defaultValue);
                process(src);
            },
            attributes: {
                "start": {
                    renderer: function (prop) {
                        return "start (" + (prop.attributes.start || "none") + ")";
                    },
                    selector: function (prop, process) {
                        var value = prompt("start", prop.attributes["start"]);
                        process(value);
                    }
                },
                "end": {
                    renderer: function (prop) {
                        return "end (" + (prop.attributes.end || "none") + ")";
                    },
                    selector: function (prop, process) {
                        var value = prompt("end", prop.attributes["end"]);
                        process(value);
                    }
                }
            },
            play: (p) => {
                var iframe = document.createElement("IFRAME");
                iframe.setAttribute("src", p.value);
                iframe.setAttribute("autoplay", "autoplay");
                if (p.attributes.start) {
                    iframe.setAttribute("start", p.attributes.start);
                }
                if (p.attributes.end) {
                    iframe.setAttribute("end", p.attributes.end);
                }
                iframe.speedy = {
                    stream: 1
                };
                iframe.setAttribute("src", p.value + '?autoplay=1');
                iframe.style.display = "none";
                p.iframe = iframe;
                p.startNode.appendChild(iframe);
            },
            stop: (p) => {

            },
            animation: {
                init: (p) => {

                },
                delete: (p) => {

                }
            },
            event: {
                property: {
                    enter: (p) => {
                        p.schema.play(p);
                    },
                    leave: (p) => {
                        p.schema.stop(p);
                    },
                    mouseUp: (p) => {
                        p.schema.play(p);
                    },
                    keyDown: (p) => {
                        p.schema.stop(p);
                    },
                    delete: (p) => {
                        console.log(p);

                    }
                }
            }
        },
        rainbow: {
            format: "decorate",
            className: "",
            labelRenderer: function () {
                return "rainbow 🌈";
            },
            render: {
                // init: (p) => {
                //     const svg = Helper.drawUnderlineRainbow(p);
                //     p.editor.container.appendChild(svg);
                // },
                // update: (p) => {
                //     const svg = Helper.drawUnderlineRainbow(p);
                //     p.editor.container.appendChild(svg);
                // },
                batchUpdate: (data) => {
                    batchUpdate(data);
                },
                destroy: (p) => {
                    if (p.svg) {
                        p.svg.remove();
                    }
                }
            }
        },
        "adjacent-image": {
            format: "decorate",
            labelRenderer: function (p) {
                return "adjacent image: " + p.value;
            },
            propertyValueSelector: function (p, process) {
                var defaultValue = p.value;
                var src = prompt("URL", defaultValue);
                process(src);
            },
            animation: {
                init: (p) => {
                    var y = p.attributes.y || 200;
                    var x = p.attributes.x || 1000;
                    var maxWidth = p.attributes.maxWidth || 800;
                    var maxHeight = p.attributes.maxHeight || 800;
                    var container = div({
                        classList: ["text-window"],
                        style: {
                            position: "absolute",
                            top: y + "px",
                            left: x + "px",
                            // backgroundColor: "#333",

                            zIndex: WindowManager.getNextIndex()
                        }
                    });
                    var img = newElement("IMG", {
                        attribute: {
                            src: p.value
                        },
                        style: {
                            maxWidth: maxWidth + "px",
                            maxHeight: maxHeight + "px",
                            height: "auto"
                        },
                        handler: {
                            load: function (e) {
                                var rect = img.getBoundingClientRect();
                                var w = rect.width,
                                    h = rect.height;
                                var viewWidth = p.attributes.viewWidth || w,
                                    viewHeight = p.attributes.viewHeight || h;
                                p.attributes = {
                                    x: rect.x,
                                    y: rect.y,
                                    width: w,
                                    height: h,
                                    viewWidth: viewWidth,
                                    viewHeight: viewHeight
                                };
                                img.style.width = viewWidth + "px";
                                img.style.height = viewHeight + "px";
                                container.style.width = viewWidth + "px";
                                container.style.height = viewHeight + "px";
                            }
                        }
                    });
                    function changeSize(op, ratio) {
                        var rect = img.getBoundingClientRect();
                        var width = rect.width, height = rect.height;
                        var w, h;
                        if (op == "+") {
                            w = width + (width * ratio);
                            h = height + (height * ratio);
                        } else {
                            w = width - (width * ratio);
                            h = height - (height * ratio);
                        }
                        img.style.width = w + "px";
                        img.style.maxWidth = w + "px";
                        img.style.height = h + "px";
                        img.style.maxHeight = h + "px";
                        p.attributes.viewWidth = w;
                        p.attributes.viewHeight = h;
                        container.style.width = w + "px";
                        container.style.height = h + "px";
                    }
                    var handle = div({
                        style: {
                            backdropFilter: "blur(2em)",
                        },
                        template: {
                            view: `
<div class="safari_buttons">
    <div data-bind="click: $data.closeClicked" class="safari_close"></div><div data-bind="click: $data.minimizeClicked" class="safari_minimize"></div><div class="safari_zoom"></div><div data-bind="click: $data.focusClicked" class="safari_focus"></div><span style="float: right; margin-right: 10px;" data-bind="click: $data.setImageUrlClicked"><i class="fas fa-cog"></i></span>
</div>`,
                            model: {
                                focusClicked: function () {
                                    this.focus = !this.focus;
                                    if (this.focus) {
                                        win.focus();
                                    } else {
                                        win.unfocus();
                                    }
                                },
                                setImageUrlClicked: () => {
                                    var url = prompt("url");
                                    if (!url) {
                                        return;
                                    }
                                    p.value = url;
                                    img.setAttribute("src", url);
                                },
                                closeClicked: () => win.close(),
                                minimizeClicked: () => win.minimize()
                            }
                        }
                    });
                    container.appendChild(handle);
                    container.appendChild(img);
                    document.body.appendChild(container);
                    $(img).on("click", function (e) {
                        if (e.ctrlKey) {
                            changeSize("+", 0.1);
                        } else {
                            changeSize("-", 0.1);
                        }
                    });
                    var win = WindowManager.addWindow({
                        type: "image",
                        draggable: {
                            node: handle,
                            stop: function (e, ui) {
                                var rect = img.getBoundingClientRect();
                                p.attributes = {
                                    x: rect.x,
                                    y: rect.y,
                                    width: rect.width,
                                    height: rect.height
                                };
                            }
                        },
                        loader: {
                            params: {
                                url: p.value
                            }
                        },
                        node: container
                    });
                    // _this.window.text.children.push(win);
                    p.editor.client.window.text.children.push(win);
                }
            }
        },
        capital: {
            format: "decorate",
            labelRenderer: function (prop) {
                return "capital: " + prop.value;
            },
            className: "capital",
            propertyValueSelector: function (prop, process) {
                process(prop.text);
            },
            render: {
                update: (p) => {
                    if (!!p.capitalNode) {
                        return;
                    }
                    const { editor } = p;
                    var img = document.createElement("IMG");
                    img.speedy = {
                        stream: 1
                    };
                    p.startNode.style.display = "none";
                    var letter = p.value.toLowerCase().trim();
                    var src = "/Images/hypnerotomachie/" + letter + ".jpg";
                    img.setAttribute("src", src);
                    img.style.top = 0;
                    img.style.left = 0;
                    img.style.float = "left";
                    img.style.marginRight = "10px";
                    const container = p.startNode.parentNode;
                    const next = p.startNode.speedy.next;
                    container.insertBefore(img, next);
                    editor.addCellToChain({ cell: img, right: p.startNode });
                    p.capitalNode = img;
                    editor.updateOffsets();
                },
                destroy: (p) => {
                    if (p.capitalNode) {
                        p.startNode.style.display = "inline-block";
                        p.editor.deleteCell(p.capitalNode);
                    }
                }
            },
            animation: {
                init: (p) => {
                    p.attributes.alignment = "left";
                    p.attributes["right-margin"] = "10px";
                },
                start: (p) => {

                },
                delete: (p) => {

                }
            }
        },
        "aligned-iframe": {
            format: "decorate",
            className: "aligned-iframe",
            labelRenderer: function (prop) {
                return "aligned iframe: " + prop.value;
            },
            propertyValueSelector: function (prop, process) {
                var url = prompt("Url?", prop.value || "");
                process(url);
            },
            animation: {
                init: (p) => { },
                start: (p) => { },
                delete: (p) => {
                    p.node.remove();
                }
            },
            onRequestAnimationFrame: (p) => {
                console.log({ p });
                if (!p.startNode || !p.endNode || p.isDeleted) {
                    return;
                }
                var exists = !!p.node;
                var iframe = p.node || document.createElement("IFRAME");
                if (!exists) {
                    iframe.style.position = "absolute";
                    iframe.style.top = p.startNode.offsetTop + "px";
                    iframe.style.right = 0;
                    iframe.setAttribute("width", "600");
                    iframe.setAttribute("height", "400");
                    iframe.setAttribute("src", p.value);
                    iframe.setAttribute("frameborder", "0");
                    iframe.speedy = {
                        role: 3,
                        stream: 1
                    };
                    //iframe.style["-webkit-transform"] = "scale(0.75)";
                    //iframe.style["-webkit-transform-origin"] = "0 0";
                    p.node = iframe;
                    p.editor.container.appendChild(iframe);
                } else {
                    iframe.style.top = p.startNode.offsetTop + "px";
                }
            }
        },
        "image-container": {
            format: "decorate",
            labelRenderer: function (prop) {
                return "image container: " + prop.value;
            },
            propertyValueSelector: function (prop, process) {
                var defaultValue = prop.value;
                var src = prompt("URL", defaultValue);
                process(src);
            },
            animation: {
                init: (prop) => {
                    var y = prop.attributes.y || 200;
                    var x = prop.attributes.x || 1000;
                    var container = div({
                        classList: ["text-window"],
                        style: {
                            position: "absolute",
                            top: y + "px",
                            left: x + "px",
                            width: "560px",
                            height: "315px",
                            zIndex: WindowManager.getNextIndex()
                        }
                    });
                    var iframe = newElement("IFRAME", {
                        attribute: {
                            width: 560,
                            height: 315,
                            src: prop.value,
                            frameborder: 0
                        }
                    });
                    var handle = div({ innerHTML: "&nbsp;", style: { height: "20px" } });
                    container.appendChild(handle);
                    container.appendChild(iframe);
                    document.body.appendChild(container);
                    $(container).draggable({ handle: handle });
                    var win = WindowManager.addWindow({
                        type: "video",
                        loader: {
                            params: {
                                url: prop.value
                            }
                        },
                        node: container
                    });
                }
            }
        },
        "adjacent-pdf": {
            format: "decorate",
            labelRenderer: function (prop) {
                return "adjacent PDF: " + prop.value;
            },
            propertyValueSelector: function (prop, process) {
                var defaultValue = prop.value;
                var src = prompt("URL", defaultValue);
                process(src);
            },
            animation: {
                init: (prop) => {
                    var y = prop.attributes.y || 200;
                    var x = prop.attributes.x || 1000;
                    var container = div({
                        classList: ["text-window"],
                        style: {
                            position: "absolute",
                            padding: 0,
                            margin: 0,
                            top: y + "px",
                            left: x + "px",
                            width: "auto",
                            backgroundColor: "#525659",
                            zIndex: WindowManager.getNextIndex()
                        }
                    });
                    var embed = el({
                        type: "EMBED",
                        attribute: {
                            width: "630px",
                            height: "800px",
                            src: prop.value,
                            type: "application/pdf"
                        }
                    });
                    var handle = div({
                        template: {
                            view: `
<div class="safari_buttons">
    <div data-bind="click: $data.closeClicked" class="safari_close"></div><div data-bind="click: $data.minimizeClicked" class="safari_minimize"></div><div class="safari_zoom"></div><div data-bind="click: $data.focusClicked" class="safari_focus"></div>
</div>`,
                            model: {
                                closeClicked: () => win.close(),
                                minimizeClicked: () => win.minimize(),
                                focusClicked: () => {
                                    focus = !focus;
                                    if (focus) {
                                        win.focus();
                                    } else {
                                        win.unfocus();
                                    }
                                }
                            }
                        }
                    });
                    container.appendChild(handle);
                    container.appendChild(embed);
                    document.body.appendChild(container);
                    var win = WindowManager.addWindow({
                        type: "pdf",
                        draggable: {
                            node: handle,
                            stop: function (e, ui) {
                                var rect = container.getBoundingClientRect();
                                prop.attributes = {
                                    x: rect.x,
                                    y: rect.y,
                                    width: rect.width,
                                    height: rect.height
                                };
                            }
                        },
                        loader: {
                            params: {
                                url: prop.value
                            }
                        },
                        node: container
                    });
                }
            }
        },
        "adjacent-video": {
            format: "decorate",
            labelRenderer: function (prop) {
                return "adjacent video: " + prop.value;
            },
            propertyValueSelector: function (prop, process) {
                var defaultValue = prop.value;
                var src = prompt("URL", defaultValue);
                process(src);
            },
            animation: {
                init: (prop) => {
                    var y = prop.attributes.y || 200;
                    var x = prop.attributes.x || 1000;
                    var container = div({
                        classList: ["text-window"],
                        style: {
                            position: "absolute",
                            top: y + "px",
                            left: x + "px",
                            width: "560px",
                            backgroundColor: "#000",
                            zIndex: WindowManager.getNextIndex()
                        }
                    });
                    var iframe = newElement("IFRAME", {
                        attribute: {
                            width: 560,
                            height: 315,
                            src: prop.value,
                            frameborder: 0
                        }
                    });
                    var focus = false;
                    var handle = div({
                        template: {
                            view: `
<div class="safari_buttons">
    <div data-bind="click: $data.closeClicked" class="safari_close"></div><div data-bind="click: $data.minimizeClicked" class="safari_minimize"></div><div class="safari_zoom"></div><div data-bind="click: $data.focusClicked" class="safari_focus"></div>
</div>`,
                            model: {
                                closeClicked: () => win.close(),
                                minimizeClicked: () => win.minimize(),
                                zoomClicked: () => win.zoom(),
                                focusClicked: () => {
                                    focus = !focus;
                                    if (focus) {
                                        win.focus();
                                    } else {
                                        win.unfocus();
                                    }
                                }
                            }
                        }
                    });
                    container.appendChild(handle);
                    container.appendChild(iframe);
                    document.body.appendChild(container);
                    var win = WindowManager.addWindow({
                        type: "video",
                        draggable: {
                            node: handle,
                            stop: function (e, ui) {
                                var rect = container.getBoundingClientRect();
                                prop.attributes = {
                                    x: rect.x,
                                    y: rect.y,
                                    width: rect.width,
                                    height: rect.height
                                };
                            }
                        },
                        loader: {
                            params: {
                                url: prop.value
                            }
                        },
                        node: container
                    });
                }
            }
        },
        drop: {
            format: "decorate",
            className: "drop",
            labelRenderer: function (p) {
                return "drop";
            },
            animation: {
                init: (p) => {
                    if (!p.startNode || !p.endNode) {
                        return;
                    }
                    p.animation = {
                        initialTop: p.startNode.offsetTop,
                        top: p.startNode.offsetTop,
                        stop: false
                    };
                },
                draw: function (p, nodes) {
                    var top = p.animation.top += 2;
                    nodes.forEach(n => {
                        n.style.top = (top - n.offsetTop) + "px";
                        n.style.position = "relative";
                    });
                },
                start: (p) => {
                    p.animation.timer = setInterval(function () {
                        if (p.startNode.offsetTop >= 2000) {
                            clearInterval(timer); // finish the animation after 2 seconds
                            return;
                        }
                        if (!p.animation.stop) {
                            var nodes = p.allInStreamNodes();
                            p.schema.animation.draw(p, nodes);
                        }
                    }, 125);
                },
                stop: (p) => {
                    p.animation.stop = true;
                },
                delete: (p) => {
                    clearInterval(p.animation.timer);
                    var nodes = p.allInStreamNodes();
                    nodes.forEach(n => {
                        n.style.top = 0;
                    });
                }
            }
        },
        scramble: {
            format: "decorate",
            labelRenderer: function (p) {
                return "scramble";
            },
            zeroPoint: {
                className: "scramble"
            },
            animation: {
                init: (p) => {
                    if (!p.startNode) {
                        return;
                    }
                    p.animation = {
                        originalCells: [],
                        cells: []
                    };
                },
                draw: function (p) {
                    var chars = p.animation.chars;
                    var c = chars[p.animation.index++];
                    if (p.animation.index >= chars.length) {
                        p.animation.index = 0;
                    }
                    p.startNode.style.fontFamily = "monospace";
                    p.startNode.innerHTML = c;
                },
                start: (p) => {
                    if (!p.startNode) {
                        return;
                    }
                    p.animation.timer = setInterval(function () {
                        if (p.animation.stop) {
                            // clearInterval(p.animation.timer);
                            return;
                        }
                        p.schema.animation.draw(p);
                    }, 250);
                },
                stop: (p) => {
                    clearInterval(p.animation.timer);
                },
                delete: (p) => {
                    clearInterval(p.animation.timer);
                }
            }
        },
        spinner: {
            format: "decorate",
            labelRenderer: function (p) {
                return "spinner";
            },
            zeroPoint: {
                className: "speedy__line"
            },
            animation: {
                init: (p) => {
                    if (!p.startNode) {
                        return;
                    }
                    p.animation = {
                        index: 0,
                        stop: false,
                        chars: ["|", "/", "&mdash;", "\\"]
                    };
                },
                draw: function (p) {
                    var chars = p.animation.chars;
                    var c = chars[p.animation.index++];
                    if (p.animation.index >= chars.length) {
                        p.animation.index = 0;
                    }
                    p.startNode.style.fontFamily = "monospace";
                    p.startNode.innerHTML = c;
                },
                start: (p) => {
                    if (!p.startNode) {
                        return;
                    }
                    p.animation.timer = setInterval(function () {
                        if (p.animation.stop) {
                            // clearInterval(p.animation.timer);
                            return;
                        }
                        p.schema.animation.draw(p);
                    }, 250);
                },
                stop: (p) => {
                    clearInterval(p.animation.timer);
                },
                delete: (p) => {
                    clearInterval(p.animation.timer);
                }
            }
        },
        counter: {
            format: "block",
            labelRenderer: function (p) {
                return "counter";
            },
            zeroPoint: {
                className: "counter"
            },
            animation: {
                init: (p) => {
                    if (!p.startNode) {
                        return;
                    }
                    p.animation = {
                        count: 0,
                        stop: false
                    };
                    p.schema.animation.draw(p);
                },
                draw: function (p) {
                    var input = document.createElement("INPUT");
                    input.speedy = {
                        role: 1
                    };
                    input.classList.add("form-control");
                    input.style.width = "40px";
                    input.style.display = "inline-block";
                    input.value = p.animation.count++;
                    p.startNode.innerHTML = null;
                    p.startNode.appendChild(input);
                },
                start: (p) => {
                    if (!p.startNode) {
                        return;
                    }
                    p.animation.timer = setInterval(function () {
                        if (p.animation.stop) {
                            // clearInterval(p.animation.timer);
                            return;
                        }
                        p.schema.animation.draw(p);
                    }, 1000);
                },
                stop: (p) => {
                    clearInterval(p.animation.timer);
                },
                delete: (p) => {
                    clearInterval(p.animation.timer);
                }
            }
        },
        peekaboo: {
            format: "block",
            labelRenderer: function (prop) {
                return "peekaboo";
            },
            className: "peekaboo",
            animation: {
                init: (p) => {
                    if (!p.startNode) {
                        return;
                    }
                    p.animation = {
                        x: 0,
                        step: 4,
                        stop: false
                    };
                    p.startNode.parentNode.style.paddingTop = "11px";
                    p.startNode.parentNode.style.top = "16px";
                    p.startNode.parentNode.style.marginTop = "-10px";
                },
                draw: function (p) {
                    var nodes = p.allInStreamNodes();
                    var width = (p.endNode.offsetLeft - p.startNode.offsetLeft) + p.endNode.offsetWidth;
                    p.animation.x += p.animation.step;
                    if (p.animation.x >= width || p.animation.x <= (0 - width)) {
                        p.animation.step = p.animation.step * -1;
                    }
                    nodes.forEach(n => {
                        n.style.left = p.animation.x + "px";
                    });
                },
                start: (p) => {
                    if (!p.startNode) {
                        return;
                    }
                    p.animation.timer = setInterval(function () {
                        if (p.animation.stop) {
                            // clearInterval(p.animation.timer);
                            return;
                        }
                        p.schema.animation.draw(p);
                    }, 65);
                },
                stop: (p) => {
                    clearInterval(p.animation.timer);
                },
                delete: (p) => {
                    clearInterval(p.animation.timer);
                }
            }
        },
        wink: {
            format: "decorate",
            labelRenderer: function (p) {
                return "wink";
            },
            zeroPoint: {
                className: "wink"
            },
            animation: {
                init: (p) => {
                    if (!p.startNode) {
                        return;
                    }
                    p.animation = {
                        index: 0,
                        stop: false,
                        chars: ["😊", "😏", "😉"]
                    };
                },
                draw: function (p) {
                    var chars = p.animation.chars;
                    var index = Math.floor(Math.random() * (chars.length));
                    var c = chars[index];
                    p.startNode.style.fontFamily = "monospace";
                    p.startNode.innerHTML = c;
                },
                start: (p) => {
                    if (!p.startNode) {
                        return;
                    }
                    const tick = function () {
                        if (p.animation.stop) {
                            // clearInterval(p.animation.timer);
                            return;
                        }
                        p.schema.animation.draw(p);
                    };
                    tick();
                    p.animation.timer = setInterval(tick, 1000);
                },
                stop: (p, editor) => {
                    clearInterval(p.animation.timer);
                },
                delete: (p, editor) => {
                    clearInterval(p.animation.timer);
                }
            }
        },
        clock: {
            format: "block",
            labelRenderer: function (p) {
                return "clock";
            },
            className: "clock",
            animation: {
                init: (p) => {
                    if (!p.startNode) {
                        return;
                    }
                    p.animation = {
                        degrees: 0,
                        element: null,
                        stop: false
                    };
                    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                    var x = p.startNode.offsetLeft;
                    var y = p.startNode.offsetTop;
                    var w = (p.endNode.offsetLeft + p.endNode.offsetWidth) - p.startNode.offsetLeft;
                    var h = p.endNode.offsetHeight;
                    console.log({
                        x, y, w, startNode: p.startNode, endNode: p.endNode
                    });
                    svg.speedy = {
                        stream: 1
                    };
                    var cr = p.editor.container.getBoundingClientRect();
                    var sr = p.startNode.getBoundingClientRect();
                    var er = p.endNode.getBoundingClientRect();
                    var w = er.x + er.width - sr.x;
                    var x = sr.x - cr.x;
                    var y = sr.y - cr.y - (w / 4);
                    svg.style.position = "absolute";
                    svg.style.left = x + "px";
                    svg.style.top = y + "px";
                    svg.style.width = w + "px";
                    svg.style.height = w + "px";
                    var svgNS = svg.namespaceURI;
                    var circle = document.createElementNS(svgNS, 'circle');
                    circle.setAttributeNS(null, 'cx', w / 2);
                    circle.setAttributeNS(null, 'cy', w / 2);
                    circle.setAttributeNS(null, 'r', w / 2);
                    circle.setAttributeNS(null, 'fill', 'transparent');
                    svg.appendChild(circle);
                    //p.editor.container.insertBefore(svg, p.startNode.parentNode);
                    p.animation.element = svg;
                },
                draw: function (p) {
                    var block = p.startNode.parentNode;
                    p.animation.degrees += 2;
                    if (p.animation.degrees >= 360) {
                        p.animation.degrees = 0;
                    }
                    block.style.transform = "rotate(" + p.animation.degrees + "deg)";
                },
                start: (p) => {
                    if (!p.startNode) {
                        return;
                    }
                    p.animation.timer = setInterval(function () {
                        if (p.animation.stop) {
                            // clearInterval(p.animation.timer);
                            return;
                        }
                        p.schema.animation.draw(p);
                    }, 125);
                },
                stop: (p) => {
                    clearInterval(p.animation.timer);
                },
                delete: (p) => {
                    clearInterval(p.animation.timer);
                }
            }
        },
        flip: {
            format: "block",
            className: "flip",
            labelRenderer: (p) => {
                return "flip";
            }
        },
        "upside-down": {
            format: "block",
            className: "upside-down",
            labelRenderer: (p) => {
                return "upside down";
            }
        },
        pulsate: {
            format: "block",
            labelRenderer: function (prop) {
                return "pulsate";
            },
            className: "pulsate",
            animation: {
                init: (p) => {
                    if (!p.startNode) {
                        return;
                    }
                    p.animation = {
                        zoom: 100,
                        step: 10,
                        stop: false
                    };
                },
                draw: function (p) {
                    var block = p.startNode.parentNode;
                    p.animation.zoom += p.animation.step;
                    if (p.animation.zoom >= 150) {
                        p.animation.step = -5;
                    }
                    if (p.animation.zoom <= 50) {
                        p.animation.step = 5;
                    }
                    block.style.zoom = p.animation.zoom + "%";
                },
                start: (p) => {
                    if (!p.startNode) {
                        return;
                    }
                    p.animation.timer = setInterval(function () {
                        if (p.animation.stop) {
                            // clearInterval(p.animation.timer);
                            return;
                        }
                        p.schema.animation.draw(p);
                    }, 125);
                },
                stop: (p) => {
                    clearInterval(p.animation.timer);
                },
                delete: (p) => {
                    clearInterval(p.animation.timer);
                }
            }
        },
    };

    return tags;

}));
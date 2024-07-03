import _ from "underscore";
import { Cell } from "./cell";
import { StandoffProperty } from "./standoff-property";
import { CellHtmlElement, ELEMENT_ROLE } from "./types";

export const createSvg = (config: any) => {
    var el = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    return updateSVGElement(el, config);
};

export const unwrapRange = (wrapper: CellHtmlElement) => {
    const frag = document.createDocumentFragment();
    const spans = Array.from(wrapper.children);
    frag.append(...spans);
    spans.forEach(s => wrapper.insertAdjacentElement("beforebegin", s));
    wrapper.remove();
}

export const wrapRange = (property: StandoffProperty, wrapper?: CellHtmlElement) => {
    const dummy = document.createElement("SPAN");
    const snp = property.start.element as HTMLSpanElement;
    const parent = snp?.parentElement as HTMLDivElement;
    parent.insertBefore(dummy, snp);
    wrapper = wrapper || document.createElement("DIV") as CellHtmlElement;
    wrapper.speedy = {
        role: ELEMENT_ROLE.INNER_STYLE_BLOCK,
        cell: property.start
    };
    const blocks = property.getCells();
    blocks.forEach(b => wrapper.appendChild(b.element as HTMLSpanElement));
    updateElement(wrapper, {
        style: {
            display: "inline-block"
        }
    });
    parent.insertBefore(wrapper, dummy);
    parent.removeChild(dummy);
    return wrapper;
}

function newElement<T extends HTMLElement> (type: string, config: any) {
    var el = document.createElement(type);
     updateElement(el, config);
     return el as T;
};

export function updateElement<T extends HTMLElement>(el: T, config: any) {
    if (config.innerHTML) {
        el.innerHTML = config.innerHTML;
    }
    var pixelFields = ["left", "top", "width", "height", "x", "y"];
    if (config.style) {
        for (let key in config.style) {
            var value = config.style[key];
            el.style[key as any] = value;
        }
    }
    if (config.children) {
        config.children.forEach((n: HTMLElement) => el.appendChild(n));
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
        config.classList.forEach((x: string) => el.classList.add(x));
    }
    if (config.parent) {
        config.parent.appendChild(el);
    }
    return el;
};


export const updateSVGElement = (el: any, config: any) => {
    if (config.property) {
        el.property = config.property;
    }
    if (config.attribute) {
        for (var key in config.attribute) {
            if (key.indexOf("xlink") < 0) {
                el.setAttributeNS(null, key, config.attribute[key]);
            } else {
                el.setAttribute(key, config.attribute[key]);
            }
        }
    }
    if (config.style) {
        for (var key in config.style) {
            var value = config.style[key];
            el.style[key] = value;
        }
    }
    if (config.children) {
        config.children.forEach(n => el.appendChild(n));
    }
    return el;
};

export type DrawUnderlineOptions = {
    offsetY: number;
    containerWidth: number;
    stroke?: string;
    strokeWidth?: string;
    strokeOpacity?: string;
}

function groupBy<T extends object> (list: T[], keyGetter: (item: T) => any){
    const map = new Map();
    list.forEach((item) => {
        const key = keyGetter(item);
        const collection = map.get(key);
        if (!collection) {
            map.set(key, [item]);
        } else {
            collection.push(item);
        }
    });
    return map;
};

export const createUnderline = (p: StandoffProperty, options: DrawUnderlineOptions) => {
    options.offsetY = typeof (options.offsetY) == "undefined" ? 3 : options.offsetY;
    if (p.cache.underline) {
        p.cache.underline.remove();
    }
    const cells = p.getCells();
    if (cells.length == 0) {
        return;
    }
    const rows = Array.from(groupBy(cells, x => x.cache.offset.y));
    const ordered = rows.sort((a, b) => a[0] > b[0] ? 1 : a[0] < b[0] ? -1 : 0);
    const last = cells.length - 1;
    const topY = cells[0].cache.offset!.y;
    const bottomY = cells[last].cache.offset!.y;
    const bottomH = cells[last].cache.offset!.h;
    const width = options.containerWidth;
    const height = bottomY + bottomH - topY + 10;
    const underline = p.cache.underline = createSvg({
        style: {
            position: "absolute",
            left: 0,
            top: topY + "px",
            // width: width + "px",
            width: "100%",
            height: height + "px",
            "pointer-events": "none"
        }
    }) as SVGElement;
    const segments = ordered.map(row => {
        const _cells = row[1] as Cell[];
        const start = _cells[0],
              end = _cells[_cells.length-1];
        const startOffset = start.cache.offset,
              endOffset = end.cache.offset;
        const x1 = startOffset.x;
        const y1 = startOffset.y + startOffset.h - topY + options.offsetY;
        const x2 = endOffset.x + endOffset.w;
        const y2 = endOffset.y + startOffset.h - topY + options.offsetY;
        var segment = createSvgLine({
            style: {
                stroke: options.stroke || "blue",
                strokeWidth: options.strokeWidth || "2"
            },
            attribute: {
                x1, y1,
                x2, y2
            }
        });
        if (options.strokeOpacity) {
            updateSVGElement(segment, {
                style: {
                    strokeOpacity: options.strokeOpacity
                }
            });
        }
        return segment;
    });
    underline.append(...segments);
    return underline;
};

export const createSvgLine = (config: any) => {
    var el = document.createElementNS("http://www.w3.org/2000/svg", "line");
    return updateSVGElement(el, config);
};
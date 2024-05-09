import _ from "underscore";
import { Cell, IStandoffProperty, StandoffProperty } from "./standoff-editor-block";

export const createSvg = (config: any) => {
    var el = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    return updateSVGElement(el, config);
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
    if (p.cache.svg) {
        p.cache.svg.remove();
    }
    const cells = p.getCells();
    if (cells.length == 0) {
        return;
    }
    const rows = Array.from(groupBy(cells, x => x.cache.offset.y));
    const ordered = rows.sort((a, b) => a[0] > b[0] ? 1 : a[0] < b[0] ? -1 : 0);
    const topY = cells[0].cache.offset!.y;
    const bottomY = cells[cells.length - 1].cache.offset!.y;
    const bottomH = cells[cells.length - 1].cache.offset!.h;
    const width = options.containerWidth;
    const height = bottomY + bottomH - topY + 10;
    const underline = p.cache.svg = createSvg({
        style: {
            position: "absolute",
            left: 0,
            top: topY + "px",
            width: width + "px",
            height: height + "px",
            "pointer-events": "none"
        }
    }) as SVGElement;
    ordered.forEach(group => {
        const _cells = group[1] as Cell[];
        const start = _cells[0],
              end = _cells[_cells.length - 1];
        const startOffset = start.cache.offset,
              endOffset = end.cache.offset;
        var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.style.stroke = options.stroke || "blue";
        line.style.strokeWidth = options.strokeWidth || "2";
        if (options.strokeOpacity) {
            line.style.strokeOpacity = options.strokeOpacity;
        }
        const x1 = startOffset.x;
        const y1 = startOffset.y + startOffset.h - topY + options.offsetY;
        const x2 = endOffset.x + endOffset.w;
        const y2 = endOffset.y + startOffset.h - topY + options.offsetY;
        line.setAttribute("x1", x1+"");
        line.setAttribute("y1", y1+"");
        line.setAttribute("x2", x2+"");
        line.setAttribute("y2", y2+"");
        underline.appendChild(line);
    });
    return underline;
};
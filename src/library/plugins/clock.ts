import { StandoffProperty } from "../standoff-property";
import { updateElement, wrapRange } from "../svg";
import { IAnimationPlugin, CellHtmlElement, ClockDirection, IClockPluginConstructor, CARET } from "../types";

export class ClockPlugin implements IAnimationPlugin {
    type: string;
    degrees: number;
    active: boolean;
    property: StandoffProperty;
    direction: ClockDirection;
    timer: any;
    steps: number;
    constructor(args: IClockPluginConstructor) {
        this.type = "animation/clock";
        this.degrees = 0;
        this.active = false;
        this.property = args.property;
        this.timer = 0;
        this.steps = 2;
        this.direction = ClockDirection.Clockwise;
    }
    serialise() {
        return {
            degrees: this.degrees
        };
    }
    createCircle() {
        const p = this.property;
        var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        var w = p.end.cache.offset.x + p.end.cache.offset.w - p.start.cache.offset.x;
        var x = p.start.cache.offset.x;
        var y = p.start.cache.offset.y - p.start.cache.offset.cy - (w / 4);
        svg.style.position = "absolute";
        svg.style.left = x + "px";
        svg.style.top = y + "px";
        svg.style.width = w + "px";
        svg.style.height = w + "px";
        var svgNS = svg.namespaceURI;
        var circle = document.createElementNS(svgNS, 'circle');
        circle.setAttributeNS(null, 'cx', (w / 2)+"");
        circle.setAttributeNS(null, 'cy', (w / 2)+"");
        circle.setAttributeNS(null, 'r', (w / 2)+"");
        circle.setAttributeNS(null, 'fill', 'transparent');
        svg.appendChild(circle);
        return svg;
    }
    wrap() {
        this.property.wrapper = wrapRange(this.property, document.createElement("DIV") as CellHtmlElement);
    }
    unwrap() {
        const wrapper = this.property.wrapper;
        const frag = document.createDocumentFragment();
        const spans = Array.from(this.property.wrapper.children);
        frag.append(...spans);
        spans.forEach(s => wrapper.insertAdjacentElement("beforebegin", s));
        this.property.wrapper.remove();
    }
    setSteps(steps: number) {
        this.steps = steps;
    }
    setClockwise() {
        this.direction = ClockDirection.Clockwise;
    }
    setAnticlockwise() {
        this.direction = ClockDirection.Anticlockwise;
    }
    update() {
        if (this.direction == ClockDirection.Clockwise) {
            this.degrees += this.steps;
            if (this.degrees > 360) {
                this.degrees = 0;
            }
        } else {
            this.degrees -= this.steps;
            if (this.degrees < 0) {
                this.degrees = 360;
            }
        }
        this.draw();
    }
    draw() {
        updateElement(this.property.wrapper, {
            style: {
                transform: `rotate(${this.degrees}deg)`
            }
        });
    }
    pause() {
        this.active = false;
    }
    unpause() {
        this.active = true;
    }
    togglePause() {
        this.active = !this.active;
    }
    start() {
        const self = this;
        const index = this.property?.start.index as number;
        this.wrap();
        // this.property.block.setCaret(index, CARET.LEFT);
        // this.property.block.setFocus();
        this.active = true;
        this.timer = setInterval(function () {
            if (!self.active) {
                return;
            }
            self.update();
        }, 125);
    }
    stop() {
        clearInterval(this.timer);
    }
    destroy() {
        this.stop();
        this.degrees = 180;
        this.draw();
        this.unwrap();
    }
}
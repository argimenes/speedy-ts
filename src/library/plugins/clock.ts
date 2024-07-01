import { CellHtmlElement } from "../cell";
import { CARET, ELEMENT_ROLE, StandoffProperty } from "../standoff-editor-block";
import { updateElement, wrapRange } from "../svg";

export interface IPlugin {
    type: string;
    property: StandoffProperty;
    destroy(): void;
    serialise(): Record<string, any>;
}
export interface IAnimationPlugin extends IPlugin {
    active: boolean;
    timer: number;
    wrapper: CellHtmlElement;
    start(): void;
    stop(): void;
    update(): void;
    pause(): void;
    unpause(): void;
}
export interface IClockPluginConstructor {
    property: StandoffProperty;
}
export enum ClockDirection {
    Clockwise,
    Anticlockwise
}
export class ClockPlugin implements IAnimationPlugin {
    type: string;
    degrees: number;
    active: boolean;
    property: StandoffProperty;
    wrapper: CellHtmlElement;
    direction: ClockDirection;
    timer: number;
    steps: number;
    constructor(args: IClockPluginConstructor) {
        this.type = "animation/clock";
        this.degrees = 0;
        this.active = false;
        this.property = args.property;
        this.wrapper = document.createElement("DIV") as CellHtmlElement;
        this.timer = 0;
        this.steps = 2;
        this.direction = ClockDirection.Clockwise;
        updateElement(this.wrapper, {
            style: {
                display: "inline-block"
            }
        });
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
        this.wrapper = this.wrapper || document.createElement("DIV") as CellHtmlElement;
        wrapRange(this.property, this.wrapper);
    }
    unwrap() {
        const wrapper = this.wrapper;
        const frag = document.createDocumentFragment();
        const spans = Array.from(this.wrapper.children);
        frag.append(...spans);
        spans.forEach(s => wrapper.insertAdjacentElement("beforebegin", s));
        this.wrapper.remove();
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
        updateElement(this.wrapper, {
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
        const selection = this.property.block.getSelection();
        const index = selection?.start.index as number;
        this.wrap();
        this.property.block.setCaret(index, CARET.LEFT);
        this.property.block.setFocus();
        // const circle = this.createCircle();
        // this.wrapper.insertAdjacentElement("beforebegin", circle);
        this.active = true;
        this.timer = setInterval(function () {
            if (!self.active) {
                // clearInterval(p.animation.timer);
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
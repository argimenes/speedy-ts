import { CellHtmlElement } from "../cell";
import { CARET, ELEMENT_ROLE, StandoffProperty } from "../standoff-editor-block";
import { updateElement } from "../svg";

export interface IPlugin {
    property: StandoffProperty;
    destroy(): void;
}
export interface IAnimationPlugin extends IPlugin {
    active: boolean;
    timer: number;
    wrapper: CellHtmlElement;
    start(): void;
    stop(): void;
    draw(): void;
    pause(): void;
    unpause(): void;
}
export interface IClockPluginConstructor {
    property: StandoffProperty;
}
export class ClockPlugin implements IAnimationPlugin {
    degrees: number;
    active: boolean;
    property: StandoffProperty;
    wrapper: CellHtmlElement;
    timer: number;
    constructor(args: IClockPluginConstructor) {
        this.degrees = 0;
        this.active = false;
        this.property = args.property;
        this.wrapper = document.createElement("DIV") as CellHtmlElement;
        this.timer = 0;
        updateElement(this.wrapper, {
            style: {
                display: "inline-block"
            }
        });
    }
    wrap() {
        const dummy = document.createElement("SPAN");
        const snp = this.property.start.element as HTMLSpanElement;
        const parent = snp?.parentElement as HTMLDivElement;
        parent.insertBefore(dummy, snp);
        const wrapper = this.wrapper;
        wrapper.speedy = {
            role: ELEMENT_ROLE.INNER_STYLE_BLOCK,
            cell: this.property.start
        };
        //wrapper.classList.add(this.propertyType[type].className);
        const blocks = this.property.getCells();
        blocks.forEach(b => wrapper.appendChild(b.element as HTMLSpanElement));
        parent.insertBefore(wrapper, dummy);
        parent.removeChild(dummy);
    }
    testwrap() {
        const startElement = this.property.start.element as HTMLSpanElement;
        const cells = this.property.getCells();
        const frag = document.createDocumentFragment();
        frag.append(...cells.map(c => c.element as HTMLSpanElement));
        this.wrapper.appendChild(frag);
        startElement.insertAdjacentElement("beforebegin", this.wrapper);
    }
    unwrap() {
        const wrapper = this.wrapper;
        const frag = document.createDocumentFragment();
        const spans = Array.from(this.wrapper.children).reverse();
        frag.append(...spans);
        spans.forEach(s => wrapper.insertAdjacentElement("beforebegin", s));
    }
    draw() {
        this.degrees += 2;
        if (this.degrees > 360) {
            this.degrees = 0;
        }
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
        this.active = true;
        this.timer = setInterval(function () {
            if (!self.active) {
                // clearInterval(p.animation.timer);
                return;
            }
            self.draw();
        }, 125);
    }
    stop() {
        clearInterval(this.timer);
    }
    destroy() {
        this.stop();
        this.unwrap();
    }
}
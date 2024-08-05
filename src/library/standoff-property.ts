import { Cell } from "./cell";
import { v4 as uuidv4 } from 'uuid';
import { unwrapRange, wrapRange } from "./svg";
import { StandoffEditorBlock } from "./standoff-editor-block";
import { GUID, IStandoffPropertySchema, IStandoffPropertyConstructor, CellHtmlElement, IPlugin } from "./types";

export class StandoffProperty {
    id: GUID;
    type: string;
    start: Cell;
    end: Cell;
    isDeleted: boolean;
    cache: Record<string, any>;
    value: string;
    metadata: Record<string, any>;
    plugin?: IPlugin;
    schema: IStandoffPropertySchema;
    block: StandoffEditorBlock; 
    bracket: { left?: HTMLElement; right?: HTMLElement };
    styled: boolean;
    wrapper?: CellHtmlElement;
    constructor({ type, start, end, block, id, schema, value, metadata }: IStandoffPropertyConstructor) {
        this.id = id || uuidv4();
        this.isDeleted = false;
        this.type = type;
        this.start = start;
        this.end = end;
        this.schema = schema;
        this.metadata = metadata || {};
        this.value = value || "";
        this.block = block;
        this.cache = {};
        this.styled = false;
        this.bracket = {
            left: undefined,
            right: undefined
        };
        this.onInit();
    }
    async onInit() {
        if (this.schema?.event?.onInit) {
            await this.schema?.event?.onInit(this);
        }
    }
    async onDestroy() {
        if (this.schema?.event?.onDestroy) {
            await this.schema?.event?.onDestroy(this);
        }
    }
    destroy() {
        this.isDeleted = true;
        this.onDestroy();
        this.removeStyling();
        this.unhighlight();
    }
    highlight() {
        this.applyCssClass("text-highlight");
    }
    unhighlight() {
        this.removeCssClassFromRange("text-highlight");
    }
    contract(suppressFlash?: boolean) {
        var previousEndCell = this.end.previous;
        if (!previousEndCell || previousEndCell == this.start) {
            return;
        }
        this.unhighlight();
        this.removeStyling();
        this.end = previousEndCell;
        this.applyStyling();
        if (!suppressFlash) {
            this.flashHighlight();
        }
    }
    render() {
        if (this.schema?.render?.update) {
            this.schema.render?.update({ block: this.block, properties: [this] });
        }
    }
    shiftLeft(suppressFlash?: boolean) {
        var previousStartCell = this.start.previous;
        var previousEndCell = this.end.previous;
        if (!previousStartCell || !previousEndCell) {
            return;
        }
        this.unhighlight();
        this.removeStyling();
        this.start = previousStartCell;
        this.end = previousEndCell;
        this.applyStyling();
        if (!suppressFlash) {
            this.flashHighlight();
        }
    }
    flashHighlight() {
        var self = this;
        this.highlight();
        setTimeout(() => self.unhighlight(), 125);
    }
    shiftRight(suppressFlash?: boolean) {
        var nextStartCell = this.start.next;
        var nextEndCell = this.end.next;
        if (!nextStartCell || !nextEndCell) {
            return;
        }
        this.unhighlight();
        this.removeStyling();
        this.start = nextStartCell;
        this.end = nextEndCell;
        this.applyStyling();
        if (!suppressFlash) {
            this.flashHighlight();
        }
    }
    expand(suppressFlash?: boolean) {
        var nextEndCell = this.end.next as Cell;
        if (!nextEndCell) {
            return;
        }
        this.unhighlight();
        this.removeStyling();
        this.end = nextEndCell;
        this.applyStyling();
        if (!suppressFlash) {
            this.flashHighlight();
        }
    }
    hasOffsetChanged() {
        let spoff = this.start.cache.previousOffset;
        let soff = this.start.cache.offset;
        if (!soff || !spoff) {
            return true;
        }
        let startSame = spoff.x == soff.x && spoff.y == soff.y;
        if (!startSame) {
            return true;
        }
        let epoff = this.end.cache.previousOffset;
        let eoff = this.end.cache.offset;
        if (!epoff || !eoff) {
            return true;
        }
        let endSame = epoff.x == eoff.x && epoff.y == eoff.y;
        if (!endSame) {
            return true;
        }
        return false;
    }
    scrollTo() {
        this.start.element?.scrollIntoView();
    }
    applyStyling() {
        if (this.schema?.decorate?.cssClass) {
            this.applyCssClass(this.schema.decorate.cssClass);
            this.styled = true;
        }
        if (this.schema?.wrap?.cssClass) {
            const wrapper = this.wrapper = wrapRange(this);
            wrapper.classList.add(this.schema?.wrap?.cssClass);
            this.styled = true;
        }
        if (this.schema?.render) {
            this.render();
        }
    }
    removeStyling() {
        if (this.schema?.decorate?.cssClass) {
            this.detachCssClass(this.schema.decorate.cssClass);
            this.styled = false;
        }
        if (this.schema?.wrap?.cssClass) {
            unwrapRange(this.wrapper as CellHtmlElement);
            this.styled = false;
        }
    }
    applyCssClass(className: string) {
        if (this.isDeleted) return;
        const cells = this.getCells();
        cells.forEach(x => x.element?.classList.add(className));
    }
    detachCssClass(className: string) {
        const cells = this.getCells();
        cells.forEach(x => x.element?.classList.remove(className));
    }
    removeCssClassFromRange(className: string) {
        if (this.isDeleted) return;
        const cells = this.getCells();
        cells.forEach(x => x.element?.classList.remove(className));
    }
    getCells() {
        const cells: Cell[] = [];
        let cell = this.start;
        let looping = true;
        if (this.start == this.end) {
            cells.push(this.start);
            return cells;
        }
        while (looping && !!cell) {
            cells.push(cell);
            let next = cell.next;
            if (!next) {
                looping = false;
            }
            if (next == this.end) {
                cells.push(next);
                looping = false;
            }
            cell = next as Cell;
        }
        return cells;
    }
    serialize() {
        return {
            id: this.id,
            type: this.type,
            start: this.start.index,
            end: this.end.index,
            value: this.value,
            metadata: this.metadata,
            plugin: this.plugin ? this.plugin.serialise() : null,
            isDeleted: this.isDeleted
        }
    }
    showBrackets() {
        if (this.bracket.left) this.bracket.left.style.display = "inline";
        if (this.bracket.right) this.bracket.right.style.display = "inline";
    }
    hideBrackets() {
        if (this.bracket.left) this.bracket.left.style.display = "none";
        if (this.bracket.right) this.bracket.right.style.display = "none";
    }
}
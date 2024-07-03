import { Cell } from "./cell";
import { IPlugin } from "./plugins/clock";
import { v4 as uuidv4 } from 'uuid';
import { wrapRange } from "./svg";
import { StandoffEditorBlock } from "./standoff-editor-block";
import { GUID, IStandoffPropertySchema, IStandoffPropertyConstructor } from "./types";

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
    constructor({ type, start, end, block, id, schema }: IStandoffPropertyConstructor) {
        this.id = id || uuidv4();
        this.isDeleted = false;
        this.type = type;
        this.start = start;
        this.end = end;
        this.schema = schema;
        this.metadata = {};
        this.value = "";
        this.block = block;
        this.cache = {};
        this.bracket = {
            left: undefined,
            right: undefined
        };
        this.onInit();
    }
    onInit() {
        if (this.schema?.event?.onInit) {
            this.schema?.event?.onInit(this);
        }
    }
    onDestroy() {
        if (this.schema?.event?.onDestroy) {
            this.schema?.event?.onDestroy(this);
        }
    }
    destroy() {
        this.isDeleted = true;
        this.onDestroy();
        if (this.schema.decorate?.cssClass) {
            this.detachCssClass(this.schema.decorate?.cssClass);
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
        }
        if (this.schema?.wrap?.cssClass) {
            const wrapper = wrapRange(this);
            wrapper.classList.add(this.schema?.wrap?.cssClass);
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
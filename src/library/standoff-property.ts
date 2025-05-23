import { Cell } from "./cell";
import { v4 as uuidv4 } from 'uuid';
import { unwrapRange, wrapRange } from "./svg";
import { StandoffEditorBlock } from "../blocks/standoff-editor-block";
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
    clientOnly?: boolean;
    wrapper?: CellHtmlElement;
    constructor({ type, start, end, block, id, schema, value, metadata, clientOnly }: IStandoffPropertyConstructor) {
        this.id = id || uuidv4();
        this.isDeleted = false;
        this.type = type;
        this.start = start;
        this.end = end;
        this.schema = schema;
        this.metadata = metadata || { };
        this.value = value || "";
        this.block = block;
        this.cache = {
            offsetY: -1
        };
        this.clientOnly = clientOnly;
        this.styled = false;
        this.bracket = {
            left: undefined,
            right: undefined
        };
        this.onInit();
    }
    async onInit() {
        // if (this.schema?.event?.onInit) {
        //     await this.schema?.event?.onInit(this);
        // }
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
        if (!previousEndCell) {
            return;
        }
        this.resetOffset();
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
    shiftLeftOneWord() {
        const word = this.block.getWordAtIndex(this.start.index);
        if (!word) return;
        if (!word.previous) return;
        const cells = this.block.cells;
        const previousWordStartCell = cells[word.previous.start];
        const previousWordEndCell = cells[word.previous.end];
        if (!previousWordStartCell || !previousWordEndCell) {
            return;
        }
        this.resetOffset();
        this.unhighlight();
        this.removeStyling();
        this.start = previousWordStartCell;
        this.end = previousWordEndCell;
        this.applyStyling();
    }
    resetOffset() {
        this.cache.offsetY = -1;
    }
    shiftLeft(suppressFlash?: boolean) {
        var previousStartCell = this.start.previous;
        var previousEndCell = this.end.previous;
        if (!previousStartCell || !previousEndCell) {
            return;
        }
        this.resetOffset();
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
    shiftRightOneWord() {
        const word = this.block.getWordAtIndex(this.start.index);
        if (!word) return;
        if (!word.next) return;
        const cells = this.block.cells;
        var nextWordStartCell = cells[word.next.start];
        var nextWordEndCell = cells[word.next.end];
        if (!nextWordStartCell || !nextWordEndCell) {
            return;
        }
        this.resetOffset();
        this.unhighlight();
        this.removeStyling();
        this.start = nextWordStartCell;
        this.end = nextWordEndCell;
        this.applyStyling();
    }
    shiftRight(suppressFlash?: boolean) {
        var nextStartCell = this.start.next;
        var nextEndCell = this.end.next;
        if (!nextStartCell || !nextEndCell) {
            return;
        }
        this.resetOffset();
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
        this.resetOffset();
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
    async applyStyling() {
        if (this.schema?.decorate?.cssClass) {
            this.applyCssClass(this.schema.decorate.cssClass);
            this.styled = true;
        }
        if (this.schema?.wrap?.cssClass) {
            const wrapper = this.wrapper = wrapRange(this);
            if (!wrapper) return;
            wrapper.classList.add(this.schema?.wrap?.cssClass);
            this.styled = true;
        }
        if (this.schema?.render) {
            this.render();
        }
        if (this.schema?.event?.onInit) {
            await this.schema?.event?.onInit(this);
        }
    }
    removeStyling() {
        if (this.schema?.event?.onDestroy) {
            this.schema.event.onDestroy(this);
            this.styled = false;
        }
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
        const text = this.block.getText();
        return {
            id: this.id,
            type: this.type,
            start: this.start.index,
            end: this.end.index,
            value: this.value,
            text: text.substring(this.start.index, this.end.index),
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
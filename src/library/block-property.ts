import { v4 as uuidv4 } from 'uuid';
import { GUID, IBlockPropertySchema, BlockBindingHandler, IBlock, IBlockPropertyConstructor } from "./abstract-block";

export class BlockProperty {
    id: GUID;
    type: string;
    schema: IBlockPropertySchema;
    event?: Record<string, BlockBindingHandler>;
    block: IBlock;
    value?: string;
    constructor({ id, type, block, schema, value, event }: IBlockPropertyConstructor) {
        this.id = id || uuidv4();
        this.type = type;
        this.schema = schema;
        this.event = event;
        this.block = block;
        this.value = value;
        this.onInit();
    }
    onInit() {
        if (this.schema?.event?.onInit) {
            this.schema?.event?.onInit(this);
        }
    }
    serialize() {
        return {
            id: this.id,
            type: this.type,
            value: this.value
        }
    }
    applyStyling() {
        const schema = this.schema;
        if (schema?.decorate?.blockClass) {
            this.block.container.classList.add(schema.decorate.blockClass);
        }
    }
    removeStyling() {
        const schema = this.schema;
        if (schema?.decorate?.blockClass) {
            this.block.container.classList.remove(schema.decorate.blockClass);
        }
    }
}
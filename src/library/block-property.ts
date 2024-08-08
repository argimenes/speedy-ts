import { v4 as uuidv4 } from 'uuid';
import { GUID, IBlockPropertySchema, BlockBindingHandler, IBlock, IBlockPropertyConstructor } from './types';

export class BlockProperty {
    id: GUID;
    type: string;
    schema: IBlockPropertySchema;
    event?: Record<string, BlockBindingHandler>;
    block: IBlock;
    value?: string;
    styled: boolean;
    metadata: Record<string, any>;
    isDeleted: boolean;
    constructor({ id, type, block, schema, value, event, metadata }: IBlockPropertyConstructor) {
        this.id = id || uuidv4();
        this.type = type;
        this.schema = schema;
        this.event = event;
        this.block = block;
        this.value = value;
        this.styled = false;
        this.isDeleted = false;
        this.metadata = metadata || {};
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
            value: this.value,
            metadata: this.metadata
        }
    }
    applyStyling() {
        const schema = this.schema;
        if (!this.styled && schema?.decorate?.blockClass) {
            this.block.container.classList.add(schema.decorate.blockClass);
            this.styled = true;
        }
    }
    removeStyling() {
        const schema = this.schema;
        if (schema?.decorate?.blockClass) {
            this.block.container.classList.remove(schema.decorate.blockClass);
            this.styled = false;
        }
    }
    destroy() {
        this.block && this.block.removeBlockProperty(this);
    }
}
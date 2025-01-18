import { IAbstractBlockConstructor, IBlock, IBlockDto } from "../library/types";
import { UniverseBlock } from "../universe-block";
import { AbstractBlock } from "./abstract-block";

export interface IUnknownBlockConstructor extends IAbstractBlockConstructor {}

export class UnknownBlock extends AbstractBlock {
    constructor(args: IUnknownBlockConstructor) {
        super(args);
    }
    static getBlockBuilder() {
        return {
            type: "",
            builder: async (container: HTMLElement, dto: IBlockDto, manager: UniverseBlock) => {
                const block = new UnknownBlock({
                    ...dto, manager
                });
                await manager.buildChildren(block, dto);
                container.appendChild(block.container);
                return block;
            }
        };
    }
    serialize(): IBlockDto {
        return {
            id: this.id,
            type: this.type,
            metadata: this.metadata,
            blockProperties: this.blockProperties
        }
    }
    deserialize(json: any | any[]): IBlock {
        return this;
    }    
}
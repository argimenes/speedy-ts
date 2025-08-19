import { v4 as uuidv4 } from 'uuid';
import { updateElement } from "../library/svg";
import { AbstractBlock } from './abstract-block';
import { IAbstractBlockConstructor, BlockType, IBlockDto, IBlock } from '../library/types';
import { UniverseBlock } from '../universe-block';
import { BlockPropertySchemas } from '../properties/block-properties';

export class BookBlock extends AbstractBlock {
    constructor(args: IAbstractBlockConstructor) {
        super(args);
        this.type = BlockType.BookBlock;
        this.inputEvents = this.getInputEvents();
        this.setBlockSchemas(this.getBlockSchemas());
    }
    getBlockSchemas() {
        return [
            BlockPropertySchemas.blockPosition,
            BlockPropertySchemas.blockSize
        ]
    }
    static getBlockBuilder() {
        return {
            type: BlockType.BookBlock,
            builder: async (container: HTMLElement, dto: IBlockDto, manager: UniverseBlock) => {
                const block = new BookBlock({ manager, ...dto });
                if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
                block.applyBlockPropertyStyling();
                block.build();
                await manager.buildChildren(block, dto);
                container.appendChild(block.container);
                return block;
            }
        };
    }
    getInputEvents() {
        return [
            
        ];
    }
    build() {
        updateElement(this.container, { classList: ["book-block"] });
        this.update();
    }
    update() {
        
    }
    bind(data: IBlockDto) {
        this.id = data.id || uuidv4();
        if (data.blockProperties) {
            this.addBlockProperties(data.blockProperties);
            this.applyBlockPropertyStyling();
        }
    }
    serialize() {
        return {
            id: this.id,
            type: this.type,
            metadata: this.metadata,
            blockProperties: this.blockProperties?.map(x => x.serialize()) || [],
            children: this.blocks?.map(x => x.serialize()) || []
        } as IBlockDto;
    }
    deserialize(json: any): IBlock {
        throw new Error("Method not implemented.");
    }    
}

enum Verso {
    "Left" = "Left",
    "Right" = "Right"
}
interface IVersoBlockConstructor extends IAbstractBlockConstructor {
    page?: string;
    verso?: Verso;
}

export class VersoBlock extends AbstractBlock {
    verso: Verso;
    page: string;
    constructor(args: IVersoBlockConstructor) {
        super(args);
        this.type = BlockType.VersoBlock;
        this.page = args.page;
        this.verso = args.verso || Verso.Left;
        this.inputEvents = this.getInputEvents();
        this.setBlockSchemas(this.getBlockSchemas());
    }
    getBlockSchemas() {
        return [
            BlockPropertySchemas.blockPosition,
            BlockPropertySchemas.blockSize
        ]
    }
    static getBlockBuilder() {
        return {
            type: BlockType.VersoBlock,
            builder: async (container: HTMLElement, dto: IBlockDto, manager: UniverseBlock) => {
                const block = new VersoBlock({ manager, ...dto });
                if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
                block.applyBlockPropertyStyling();
                block.build();
                await manager.buildChildren(block, dto);
                container.appendChild(block.container);
                return block;
            }
        };
    }
    getInputEvents() {
        return [
            
        ];
    }
    build() {
        updateElement(this.container, { classList: ["verso-block"] });
        this.update();
    }
    update() {
        
    }
    bind(data: IBlockDto) {
        this.id = data.id || uuidv4();
        if (data.blockProperties) {
            this.addBlockProperties(data.blockProperties);
            this.applyBlockPropertyStyling();
        }
    }
    serialize() {
        return {
            id: this.id,
            type: this.type,
            metadata: this.metadata,
            blockProperties: this.blockProperties?.map(x => x.serialize()) || [],
            children: this.blocks?.map(x => x.serialize()) || []
        } as IBlockDto;
    }
    deserialize(json: any): IBlock {
        throw new Error("Method not implemented.");
    }    
}
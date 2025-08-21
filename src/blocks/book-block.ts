import { v4 as uuidv4 } from 'uuid';
import { setElement } from "../library/svg";
import { AbstractBlock } from './abstract-block';
import { IAbstractBlockConstructor, BlockType, IBlockDto, IBlock } from '../library/types';
import { UniverseBlock } from '../universe-block';
import { BlockPropertySchemas } from '../properties/block-properties';

interface IActiveVerso {
    left: VersoBlock;
    right: VersoBlock;
}
export class BookBlock extends AbstractBlock {
    leftNav: HTMLDivElement;
    rightNav: HTMLDivElement;
    active: IActiveVerso;
    constructor(args: IAbstractBlockConstructor) {
        super(args);
        this.type = BlockType.BookBlock;
        this.inputEvents = this.getInputEvents();
        this.setBlockSchemas(this.getBlockSchemas());
        this.leftNav = document.createElement("DIV") as HTMLDivElement;
        this.rightNav = document.createElement("DIV") as HTMLDivElement;
        this.setupNavigationControls();
        this.active = {} as any;
    }
    loadPreviousVersos() {
        const i = this.blocks.findIndex(x=> x.id == this.active.left.id);
        if (i < 2) return;
        this.active.left.setInactive();
        this.active.right.setInactive();
        this.active.left = this.active.left.relation.previous.relation.previous as VersoBlock;
        this.active.right = this.active.right.relation.previous.relation.previous as VersoBlock;
        this.active.left.setActive();
        this.active.right.setActive();
    }
    loadNextVersos() {
        const len = this.blocks.length - 1;
        const i = this.blocks.findIndex(x=> x.id == this.active.left.id);
        if (len < 2) return;
        this.active.left.setInactive();
        this.active.right.setInactive();
        this.active.left = this.active.left.relation.next.relation.next as VersoBlock;
        this.active.right = this.active.right.relation.next.relation.next as VersoBlock;
        this.active.left.setActive();
        this.active.right.setActive();
    }
    setupNavigationControls() {
        const self = this;
        setElement(this.leftNav, {
            classList: ["book-nav-control", "left"],
            innerHTML: "‹",
            handler: {
                "click": (e: Event) => {
                    e.preventDefault();
                    self.loadPreviousVersos();
                }
            }
        });
        setElement(this.rightNav, {
            classList: ["book-nav-control", "right"],
            innerHTML: "›",
            handler: {
                "click": (e: Event) => {
                    e.preventDefault();
                    self.loadNextVersos();
                }
            }
        });
        this.container.append(...[this.leftNav, this.rightNav]);
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
                const book = new BookBlock({ manager, ...dto });
                if (dto?.blockProperties) book.addBlockProperties(dto.blockProperties);
                book.applyBlockPropertyStyling();
                book.build();
                await manager.buildChildren(book, dto);
                container.appendChild(book.container);
                if (book.blocks.length >= 2) {
                    book.active.left = book.blocks[0] as VersoBlock;
                    book.active.right = book.blocks[1] as VersoBlock;
                    book.active.left.setActive();
                    book.active.right.setActive();
                }
                return book;
            }
        };
    }
    
    getInputEvents() {
        return [
            
        ];
    }
    build() {
        setElement(this.container, { classList: ["book-block"] });
        this.update();
    }
    update() {
        this.active.left?.update();
        this.active.right?.update();
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
        setElement(this.container, { classList: ["verso-block"] });
        this.update();
    }
    update() {
        const active = this.metadata.active;
        setElement(this.container, {
            style: {
                "display": active ? "inline-block" : "none"
            }
        });
    }
    setActive() {
        this.metadata.active = true;
        this.update();
    }
    setInactive() {
        this.metadata.active = false;
        this.update();
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
import { v4 as uuidv4 } from 'uuid';
import { setElement } from "../library/svg";
import { AbstractBlock } from './abstract-block';
import { IAbstractBlockConstructor, BlockType, IBlockDto, IBlock } from '../library/types';
import { UniverseBlock } from '../universe-block';
import { BlockPropertySchemas } from '../properties/block-properties';

export class BookBlock extends AbstractBlock {
    leftNav: HTMLDivElement;
    rightNav: HTMLDivElement;
    leftPage: FixedSizePageBlock;
    rightPage: FixedSizePageBlock;
    constructor(args: IAbstractBlockConstructor) {
        super(args);
        this.type = BlockType.BookBlock;
        this.inputEvents = this.getInputEvents();
        this.setBlockSchemas(this.getBlockSchemas());
        this.leftNav = document.createElement("DIV") as HTMLDivElement;
        this.rightNav = document.createElement("DIV") as HTMLDivElement;
        this.setupNavigationControls();
    }
    getLastPage() {
        const maxIndex = this.blocks.length - 1;
        if (maxIndex < 0) {
            return null;
        }
        return this.blocks[maxIndex] as FixedSizePageBlock;
    }
    setAllPagesInactive() {
        this.blocks.forEach((b: FixedSizePageBlock) => b.setInactive());
    }
    loadPreviousPageset() {
        const leftIndex = this.blocks.findIndex(x=> x.id == this.leftPage.id);
        if (leftIndex == 0) return;
        this.leftPage.setInactive();
        this.rightPage.setInactive();
        this.leftPage = this.leftPage.relation.previous.relation.previous as FixedSizePageBlock;
        this.rightPage = this.rightPage.relation.previous.relation.previous as FixedSizePageBlock;
        this.leftPage.setActive();
        this.rightPage.setActive();
    }
    loadNextPageset() {
        const maxIndex = this.blocks.length - 1;
        const rightIndex = this.blocks.findIndex(x=> x.id == this.rightPage.id);
        if (rightIndex == maxIndex) return;
        this.leftPage.setInactive();
        this.rightPage.setInactive();
        this.leftPage = this.leftPage.relation.next.relation.next as FixedSizePageBlock;
        this.rightPage = this.rightPage.relation.next.relation.next as FixedSizePageBlock;
        this.leftPage.setActive();
        this.rightPage.setActive();
    }
    setupNavigationControls() {
        const self = this;
        setElement(this.leftNav, {
            classList: ["book-nav-control", "left", "drag-handle"],
            innerHTML: "‹",
            handler: {
                "click": (e: Event) => {
                    e.preventDefault();
                    self.loadPreviousPageset();
                }
            }
        });
        setElement(this.rightNav, {
            classList: ["book-nav-control", "right", "drag-handle"],
            innerHTML: "›",
            handler: {
                "click": (e: Event) => {
                    e.preventDefault();
                    self.loadNextPageset();
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
                    book.leftPage = book.blocks[0] as FixedSizePageBlock;
                    book.rightPage = book.blocks[1] as FixedSizePageBlock;
                    book.leftPage.setActive();
                    book.rightPage.setActive();
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
        this.leftPage?.update();
        this.rightPage?.update();
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

enum Page {
    "Left" = "Left",
    "Right" = "Right"
}
interface IVersoBlockConstructor extends IAbstractBlockConstructor {
    label?: string;
    page?: Page;
}

export class FixedSizePageBlock extends AbstractBlock {
    page: Page;
    label: string;
    constructor(args: IVersoBlockConstructor) {
        super(args);
        this.type = BlockType.FixedSizePageBlock;
        this.label = args.label;
        this.page = args.page || Page.Left;
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
            type: BlockType.FixedSizePageBlock,
            builder: async (container: HTMLElement, dto: IBlockDto, manager: UniverseBlock) => {
                const block = new FixedSizePageBlock({ manager, ...dto });
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
        const page = this.metadata.page as string;
        const pageCss = page.toLowerCase() == "left" ? "left" : "right";
        setElement(this.container, { classList: ["fixed-size-page-block", pageCss] });
        this.update();
    }
    update() {
        const active = this.metadata.active;
        setElement(this.container, {
            style: {
                "display": active ? "block" : "none"
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
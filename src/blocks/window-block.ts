import { uniqueId } from 'underscore';
import { IAbstractBlockConstructor, BlockType, IBlockDto, IBlock, IBindingHandlerArgs, InputEventSource } from '../library/types';
import { AbstractBlock } from './abstract-block';
import { updateElement } from '../library/svg';
import { UniverseBlock } from '../universe-block';
import { ContextMenuBlock } from './context-menu-block';

type WindowBlockMetadata =  {
    title: string;
    position: {
        x: number;
        y: number;
    }
    size: {
        h: number;
        w: number;
    }
    state: "normal" | "minimized" | "maximised";
    zIndex: number;
}

export interface IWindowBlockConstructor extends IAbstractBlockConstructor {
    onMaximize?: (win: WindowBlock) => Promise<void>;
    onMinimize?: (win: WindowBlock) => Promise<void>;
    onClose?: (win: WindowBlock) => Promise<void>;
}

export class WindowBlock extends AbstractBlock {
    declare metadata: WindowBlockMetadata;
    isDragging: boolean;
    mouseOffsetX: number;
    mouseOffsetY: number;
    header: HTMLDivElement;
    state: "normal" | "minimized" | "maximised";
    onMaximize?: (win: WindowBlock) => Promise<void>;
    onMinimize?: (win: WindowBlock) => Promise<void>;
    onClose?: (win: WindowBlock) => Promise<void>;
    title: HTMLSpanElement;
    constructor(args: IWindowBlockConstructor) {
        super(args);
        this.type = BlockType.WindowBlock;
        this.metadata = args?.metadata || {
            title: "Untitled",
            position: {
                x: "20px",
                y: "20px"
            },
            size: {
                w: "840px",
                h: "620px"
            },
            zIndex: this.manager.getHighestZIndex(),
            state: "normal"
        } as any;
        this.onMaximize = args.onMaximize;
        this.onMinimize = args.onMinimize;
        this.onClose = args.onClose;
        this.isDragging = false;
        this.header = document.createElement("DIV") as HTMLDivElement;
        this.header.setAttribute("id", uniqueId());
        this.header.classList.add("window-block-header");
        const controls = this.createControls();
        this.header.appendChild(controls);
        this.container.appendChild(this.header);
        this.container.classList.add("window-block");
        this.state = "normal";
        this.blockSchemas = this.getBlockSchemas();
        this.setupEventHandlers();
        this.updatePosition();
    }
    static getBlockBuilder() {
        return {
            type: BlockType.WindowBlock,
            builder: async (container: HTMLElement, dto: IBlockDto, manager: UniverseBlock) => {
                const block = new WindowBlock({ manager, ...dto });
                block.addBlockProperties(dto.blockProperties);
                await manager.buildChildren(block, dto, (child) => {
                    block.container.appendChild(child.container);
                });
                block.applyBlockPropertyStyling();
                container.appendChild(block.container);
                return block;
            }
        };
    }
    destroy() {
        super.destroy();        
    }
    updatePosition() {
        const pos = this.metadata.position;
        this.container.style.transform = `translate(${pos.x}px,${pos.y}px)`;
        updateElement(this.container, {
            style: {
                width: this.metadata.size.w,
                height: this.metadata.size.h,
                "z-index": this.metadata.zIndex
            }
        })
    }
    getBlockSchemas() {
        return [
            {
                type: "block/theme/glass",
                name: "Glass window",
                decorate: {
                    blockClass: "block_theme_glass"
                }
            },
            {
                type: "block/theme/paper",
                name: "Paper window",
                decorate: {
                    blockClass: "block_theme_paper"
                }
            }
        ]
    }
    async onContextMenu(e: MouseEvent) {
        const manager = this.manager;
        e.preventDefault();
        const rect = this.container.getBoundingClientRect();
        console.log("onContextMenu", { e, rect });
        const dto = {
            type: BlockType.ContextMenuBlock,
            metadata: {
                size: { 
                    w: 200
                },
                position: {
                    x: e.clientX, y: e.clientY
                }
            }
        } as any;
        const menu = await manager.recursivelyBuildBlock(document.body, dto) as ContextMenuBlock;
        menu.source = this;
        manager.registerBlock(menu);
        document.body.appendChild(menu.container);
        manager.setBlockFocus(menu);
    }
    setupEventHandlers() {
        const self = this;
        const manager = self.manager;
        const win = this.container;
        const handle = this.header;
        this.inputEvents = [
            {
                mode: 'default',
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: 'ArrowDown'
                },
                action: {
                    name: 'Move window down by 10 pixels',
                    description: '',
                    handler: async (args: IBindingHandlerArgs) => {
                        const block = args.block as WindowBlock;
                        if (!block.isDragging) return;
                        const pos = block.metadata.position;
                        pos.y += 10;
                        win.style.transform = `translate(${pos.x}px,${pos.y}px)`;
                    }
                }
            },
            {
                mode: 'default',
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: 'ArrowUp'
                },
                action: {
                    name: 'Move window down by 10 pixels',
                    description: '',
                    handler: async (args: IBindingHandlerArgs) => {
                        const block = args.block as WindowBlock;
                        if (!block.isDragging) return;
                        const pos = block.metadata.position;
                        pos.y -= 10;
                        win.style.transform = `translate(${pos.x}px,${pos.y}px)`;
                    }
                }
            },
            {
                mode: 'default',
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: 'ArrowLeft'
                },
                action: {
                    name: 'Move window left by 10 pixels',
                    description: '',
                    handler: async (args: IBindingHandlerArgs) => {
                        const block = args.block as WindowBlock;
                        if (!block.isDragging) return;
                        const pos = block.metadata.position;
                        pos.x -= 10;
                        win.style.transform = `translate(${pos.x}px,${pos.y}px)`;
                    }
                }
            },
            {
                mode: 'default',
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: 'ArrowRight'
                },
                action: {
                    name: 'Move window rihgt by 10 pixels',
                    description: '',
                    handler: async (args: IBindingHandlerArgs) => {
                        const block = args.block as WindowBlock;
                        if (!block.isDragging) return;
                        const pos = block.metadata.position;
                        pos.x += 10;
                        win.style.transform = `translate(${pos.x}px,${pos.y}px)`;
                    }
                }
            }
        ];
        [handle].forEach(x => x.addEventListener("contextmenu", this.onContextMenu.bind(this)));
        [handle].forEach(x => x.addEventListener('mousedown', (e) => {
            if ((e.target as HTMLElement).contains(win.childNodes[1])) {
                console.log("click inside window");
                return;
            }
            manager.setBlockFocus(self);
            self.isDragging = true;
            const pos = self.metadata.position;
            const size = self.metadata.size;
            const rect = win.getBoundingClientRect();
            pos.x = rect.left;
            pos.y = rect.top;
            size.h = rect.height;
            size.w = rect.width;
            self.mouseOffsetX = e.clientX - rect.left;
            self.mouseOffsetY = e.clientY - rect.top;
            e.preventDefault();
        }));
        [win].forEach(x => x.addEventListener('mouseover', (e) => {
            console.log("mouseover", { e });
            if (!self.isDragging) {
                console.log("not dragging");
                return;
            }
            if (!win.contains(e.target as HTMLElement)) {
                self.isDragging = false;
                return;
            }
            const x = e.clientX - self.mouseOffsetX,
                  y = e.clientY - self.mouseOffsetY;
            const pos = self.metadata.position;
            pos.x = x;
            pos.y = y;
            win.style.transform = `translate(${x}px,${y}px)`;
            console.log({ x, y });
        }));
        [win].forEach(x => x.addEventListener('mouseup', (e) => {
            console.log("mouseup", { e });
            self.isDragging = false
        }));
        [win].forEach(x => x.addEventListener('mouseleave', (e) => { 
            console.log("mouseleave", { e });
            if ((e.target as HTMLElement).contains(win.childNodes[1])) {
                return;
            }
            self.isDragging = false
        }));
    }
    private createControls() {
        const win = this.container;
        const self = this;
        const controls = document.createElement('div');
        controls.className = 'window-controls';
        controls.style.cssText = 'display: flex; gap: 5px;';

        let previousState = {
            top: 0, left: 0, width: 0, height: 0
        }

        const minimizeBtn = this.createWindowButton('−', () => {
            if (self.state == "minimized") {
                return;
            }
            if (self.state == "maximised") {
                self.state = "normal";
                updateElement(win, {
                    style: {
                        top: previousState.top + "px",
                        left: previousState.left + "px",
                        width: previousState.width + "px",
                        height: previousState.height + "px"
                    }
                });
            } else {
                self.state = "minimized";
                updateElement(win, {
                    style: {
                        bottom: 0,
                        right: 0,
                        width: "100px"
                    }
                });
                updateElement(win.children[1] as HTMLElement , {
                    style: {
                        display: "none"
                    }
                });
            }
            const rect = win.getBoundingClientRect();
            previousState = {
                top: rect.top,
                left: rect.top,
                width: rect.width,
                height: rect.height
            };
            self.state = "minimized";
        });
        
        const maximizeBtn = this.createWindowButton('□', () => { 
            if (self.state == "maximised") {
                return;
            }
            if (self.state == "minimized") {
                self.state = "normal";
                updateElement(win, {
                    style: {
                        top: previousState.top + "px",
                        left: previousState.left + "px",
                        width: previousState.width + "px",
                        height: previousState.height + "px"
                    }
                });
                updateElement(win.children[1] as HTMLElement , {
                    style: {
                        display: "block"
                    }
                });
            } else {
                self.state = "maximised";
                const rect = win.getBoundingClientRect();
                previousState = {
                    top: rect.top,
                    left: rect.top,
                    width: rect.width,
                    height: rect.height
                };
                updateElement(win, {
                    style: {
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%"
                    }
                });
            }
        });
        
        const closeBtn = this.createWindowButton('×', async () => { 
            if (self.onClose) {
                await self.onClose(self);
                return;
            }
            self.destroy();
        });
        closeBtn.style.color = '#ff0000';

        const title = document.createElement("SPAN") as HTMLSpanElement;
        title.style.fontSize = "0.5rem";
        title.textContent = this.metadata.title;
        this.title = title;

        controls.append(minimizeBtn, maximizeBtn, closeBtn, title);
        return controls;
    }
    setTitle(title: string) {
        this.title.textContent = title;
    }
    private createWindowButton(text: string, onClick: () => void): HTMLElement {
        const button = document.createElement('div');
        button.className = 'window-control-button';
        button.textContent = text;
        button.style.cssText = `
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 3px;
          cursor: pointer;
        `;
        button.addEventListener('click', onClick);
        button.addEventListener('mouseenter', () => button.style.background = '#e0e0e0');
        button.addEventListener('mouseleave', () => button.style.background = 'transparent');
        return button;
    }
    serialize() {
        return {
            id: this.id,
            type: this.type,
            metadata: this.metadata,
            blockProperties: this.blockProperties?.map(x => x.serialize()) || [],
            children: this.blocks?.map(x => x.serialize())
        } as IBlockDto;
    }
    deserialize(json: any): IBlock {
        return null;
    }    
}
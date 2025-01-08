import { IAbstractBlockConstructor, BlockType, IBlockDto, IBlock } from '../library/types';
import { AbstractBlock } from './abstract-block';

type WindowBlockMetadata = {} & {
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

export class WindowBlock extends AbstractBlock {
    declare metadata: WindowBlockMetadata;
    isDragging: boolean;
    mouseOffsetX: number;
    mouseOffsetY: number;
    header: HTMLDivElement;
    constructor(args: IAbstractBlockConstructor) {
        super(args);
        this.type = BlockType.WindowBlock;
        this.metadata = {
            title: args?.metadata?.title || "Untitled",
            position: { x: 0, y: 0 },
            size: { h: 0, w: 0 },
            state: "normal",
            zIndex: 0
        };
        this.isDragging = false;
        this.header = document.createElement("DIV") as HTMLDivElement;
        this.header.classList.add("window-block-header");
        const controls = this.createControls();
        this.header.appendChild(controls);
        this.container.appendChild(this.header);
        this.container.classList.add("window-block");
        this.setupEventHandlers();
    }
    setupEventHandlers() {
        const self = this;
        const win = self.container;
        this.header.addEventListener('mousedown', (e) => {
            self.isDragging = true;
            const rect = win.getBoundingClientRect();
            console.log({ win, rect });
            self.metadata.position.x = rect.left;
            self.metadata.position.y = rect.top;
            self.metadata.size.h = rect.height;
            self.metadata.size.w = rect.width;
            self.mouseOffsetX = e.clientX;// - rect.left;
            self.mouseOffsetY = e.clientY;// - rect.top;
            // win.style.top = "0";
            // win.style.left = "0";
            e.preventDefault();
        });
        document.addEventListener('mousemove', (e) => {
            if (!self.isDragging) return;
            const x = e.clientX - self.mouseOffsetX, y = e.clientY - self.mouseOffsetY;
            self.metadata.position.x = x;
            self.metadata.position.y = y;
            win.style.transform = `translate(${x}px,${y}px)`;
        });
        document.addEventListener('mouseup', () => {
            self.isDragging = false;
        });
        document.addEventListener('mouseleave', () => {
            self.isDragging = false;
        });
    }
    private createControls() {
        const controls = document.createElement('div');
        controls.className = 'window-controls';
        controls.style.cssText = 'display: flex; gap: 5px;';

        // Minimize button
        const minimizeBtn = this.createWindowButton('−', () => { /*this.minimizeWindow(state.id)*/ });
        
        // Maximize/Restore button
        const maximizeBtn = this.createWindowButton('□', () => { /*this.toggleMaximize(state.id)*/ });
        
        // Close button
        const closeBtn = this.createWindowButton('×', () => { /*this.closeWindow(state.id)*/ });
        closeBtn.style.color = '#ff0000';

        const title = document.createElement("SPAN") as HTMLSpanElement;
        title.textContent = this.metadata.title;

        controls.append(minimizeBtn, maximizeBtn, closeBtn, title);
        return controls;
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
            children: this.blocks?.map(x => {
                const dto = x.serialize();
                return {
                    id: dto.id,
                    type: dto.type
                }
            }) as IBlockDto[] || []
        } as IBlockDto;
    }
    deserialize(json: any): IBlock {
        return null;
    }
    destroy(): void {
        if (this.container) this.container.remove();
    }
}
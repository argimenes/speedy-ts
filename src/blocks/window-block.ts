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
    currentX: number;
    currentY: number;
    initialX: number;
    initialY: number;
    header: HTMLDivElement;
    constructor(args: IAbstractBlockConstructor) {
        super(args);
        this.type = BlockType.WindowBlock;
        this.metadata = {
            title: "",
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
        // Store the window's position relative to the mouse when dragging starts
        this.header.addEventListener('mousedown', (e) => {
            self.isDragging = true;
            
            // Get the current mouse coordinates
            self.initialX = e.clientX;
            self.initialY = e.clientY;
            
            // Get the current window position
            const rect = this.container.getBoundingClientRect();
            self.currentX = rect.left;
            self.currentY = rect.top;
        });

        // Update the window position as the mouse moves
        document.addEventListener('mousemove', (e) => {
            if (!self.isDragging) return;
            
            // Calculate the distance moved
            const dx = e.clientX - self.initialX;
            const dy = e.clientY - self.initialY;
            
            // Update the window position
            self.container.style.left = `${self.currentX + dx}px`;
            self.container.style.top = `${self.currentY + dy}px`;
        });

        // Stop dragging when the mouse is released
        document.addEventListener('mouseup', () => {
            self.isDragging = false;
        });
        
        // Prevent the window from getting stuck if the mouse leaves the window
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

        controls.append(minimizeBtn, maximizeBtn, closeBtn);
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
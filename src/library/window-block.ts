import { AbstractBlock } from './abstract-block';
import { DragDropManager } from './drag-manager';
import { IAbstractBlockConstructor, BlockType, IMainListBlockDto as IDocumentBlockDto, IBlockDto, IBlock } from './types';

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
    dragManager: DragDropManager;
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
        const controls = this.createControls();
        this.container.appendChild(controls);
        this.dragManager = new DragDropManager({
            onDragStart: (e) => {

            },
            onDrop: (e) => {

            }
        });
        this.dragManager.makeDraggable(this.container);
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
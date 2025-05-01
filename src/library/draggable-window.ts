interface DraggableWindowOptions {
  onDragStart?: () => void;
  onDragMove?: (x: number, y: number) => void;
  onDragEnd?: () => void;
  enableResize?: boolean;
  resizeHandleClass?: string;
}

export class DraggableWindow {
  private windowEl: HTMLElement;
  private handleEl: HTMLElement;
  private resizeHandleEl?: HTMLElement;
  private options: DraggableWindowOptions;

  private isDragging = false;
  private isResizing = false;
  private offsetX = 0;
  private offsetY = 0;
  private lastX = 0;
  private lastY = 0;
  private originalWidth = 0;
  private originalHeight = 0;

  private minimized = false;
  private preMinimizedTransform = '';

  constructor(
    windowEl: HTMLElement,
    handleEl: HTMLElement,
    options: DraggableWindowOptions = {}
  ) {
    this.windowEl = windowEl;
    this.handleEl = handleEl;
    this.options = options;

    this.init();
  }

  private init() {
    this.handleEl.style.cursor = 'grab';
    this.handleEl.addEventListener('pointerdown', this.onPointerDown);

    if (this.options.enableResize) {
      this.addResizeHandle();
    }
  }

  private onPointerDown = (e: PointerEvent) => {
    if (this.minimized) return;

    this.isDragging = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;

    this.options.onDragStart?.();
    document.body.style.userSelect = 'none';

    document.addEventListener('pointermove', this.onPointerMove);
    document.addEventListener('pointerup', this.onPointerUp);
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.isDragging) return;

    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;

    this.offsetX += dx;
    this.offsetY += dy;

    this.windowEl.style.transform = `translate(${this.offsetX}px, ${this.offsetY}px)`;
    this.options.onDragMove?.(this.offsetX, this.offsetY);

    this.lastX = e.clientX;
    this.lastY = e.clientY;
  };

  private onPointerUp = () => {
    if (!this.isDragging) return;

    this.isDragging = false;
    document.body.style.userSelect = '';

    document.removeEventListener('pointermove', this.onPointerMove);
    document.removeEventListener('pointerup', this.onPointerUp);

    this.options.onDragEnd?.();
  };

  private addResizeHandle() {
    this.resizeHandleEl = document.createElement('div');
    this.resizeHandleEl.className =
      this.options.resizeHandleClass || 'resize-handle';
    Object.assign(this.resizeHandleEl.style, {
      position: 'absolute',
      width: '12px',
      height: '12px',
      right: '0',
      bottom: '0',
      cursor: 'nwse-resize',
      zIndex: '10',
    });
    this.windowEl.appendChild(this.resizeHandleEl);
    this.resizeHandleEl.addEventListener('pointerdown', this.onResizeStart);
  }

  private onResizeStart = (e: PointerEvent) => {
    if (this.minimized) return;

    e.stopPropagation();
    this.isResizing = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;

    this.originalWidth = this.windowEl.offsetWidth;
    this.originalHeight = this.windowEl.offsetHeight;

    document.addEventListener('pointermove', this.onResizeMove);
    document.addEventListener('pointerup', this.onResizeEnd);
  };

  // private onResizeMove = (e: PointerEvent) => {
  //   if (!this.isResizing) return;

  //   const dx = e.clientX - this.lastX;
  //   const dy = e.clientY - this.lastY;

  //   const newWidth = Math.max(100, this.originalWidth + dx);
  //   const newHeight = Math.max(100, this.originalHeight + dy);

  //   this.windowEl.style.width = `${newWidth}px`;
  //   this.windowEl.style.height = `${newHeight}px`;
  // };

  private onResizeMove = (e: PointerEvent) => {
    if (!this.isResizing) return;
  
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
  
    const newWidth = Math.max(100, this.originalWidth + dx);
    const newHeight = Math.max(100, this.originalHeight + dy);
  
    this.windowEl.style.width = `${newWidth}px`;
    this.windowEl.style.height = `${newHeight}px`;
  
    // If you have a specific content area to resize:
    const content = this.windowEl.querySelector('.document-container') as HTMLElement;
    if (content) {
      content.style.height = `${newHeight - this.windowEl.querySelector('.window-block-header')!.clientHeight}px`;
    }
  };
  

  private onResizeEnd = () => {
    this.isResizing = false;
    document.removeEventListener('pointermove', this.onResizeMove);
    document.removeEventListener('pointerup', this.onResizeEnd);
  };

  public toggleMinimize() {
    if (this.minimized) {
      this.windowEl.style.transform = this.preMinimizedTransform;
      this.windowEl.style.display = '';
      this.minimized = false;
    } else {
      this.preMinimizedTransform = this.windowEl.style.transform;
      this.windowEl.style.display = 'none';
      this.minimized = true;
    }
  }

  public destroy() {
    this.handleEl.removeEventListener('pointerdown', this.onPointerDown);
    this.resizeHandleEl?.removeEventListener('pointerdown', this.onResizeStart);
    this.resizeHandleEl?.remove();
    document.removeEventListener('pointermove', this.onPointerMove);
    document.removeEventListener('pointerup', this.onPointerUp);
  }
}

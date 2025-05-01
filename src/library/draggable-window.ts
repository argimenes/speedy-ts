interface DraggableWindowOptions {
  onDragStart?: () => void;
  onDragMove?: (x: number, y: number) => void;
  onDragEnd?: () => void;
  enableResize?: boolean;
  resizeHandleClass?: string;
  minimizeDuration?: number;
  minimizeIconClass?: string;  // Optional: Custom class for minimize icon
}

export class DraggableWindow {
  private windowEl: HTMLElement;
  private handleEl: HTMLElement;
  private resizeHandleEl?: HTMLElement;
  private minimizeIconEl?: HTMLElement;  // The minimized window icon
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
    this.handleEl.addEventListener('dblclick', this.toggleMinimize);

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

  private onResizeMove = (e: PointerEvent) => {
    if (!this.isResizing) return;

    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;

    const newWidth = Math.max(100, this.originalWidth + dx);
    const newHeight = Math.max(100, this.originalHeight + dy);

    this.windowEl.style.width = `${newWidth}px`;
    this.windowEl.style.height = `${newHeight}px`;

    const content = this.windowEl.querySelector('.window-block-content') as HTMLElement;
    if (content) {
      content.style.height = `${newHeight - this.windowEl.querySelector('.window-block-header')!.clientHeight}px`;
    }
  };

  private onResizeEnd = () => {
    this.isResizing = false;
    document.removeEventListener('pointermove', this.onResizeMove);
    document.removeEventListener('pointerup', this.onResizeEnd);
  };

  public toggleMinimize = () => {
    if (this.minimized) {
      this.restoreWindow();
    } else {
      this.minimizeWindow();
    }
  };

  private minimizeWindow() {
    if (this.minimized) return;
  
    this.minimized = true;
  
    // Store the current state of the window for later restoration
    this.preMinimizedTransform = this.windowEl.style.transform;
  
    // Inline SVG for the minimized icon
    this.minimizeIconEl = document.createElement('div');
    this.minimizeIconEl.className = this.options.minimizeIconClass || 'minimized-icon';
    this.minimizeIconEl.style.position = 'absolute';
    this.minimizeIconEl.style.top = `${this.offsetY + 20}px`;
    this.minimizeIconEl.style.left = `${this.offsetX + 20}px`;
    this.minimizeIconEl.style.cursor = 'pointer';
    // this.minimizeIconEl.innerHTML = `
    //   <svg width="50" height="50" xmlns="http://www.w3.org/2000/svg">
    //     <rect x="0" y="0" width="50" height="50" rx="10" fill="gray"/>
    //     <text x="25" y="25" font-size="14" text-anchor="middle" alignment-baseline="middle" fill="white">Min</text>
    //   </svg>
    // `;
    document.body.appendChild(this.minimizeIconEl);
  
    // When clicked, restore the window
    this.minimizeIconEl.addEventListener('click', this.restoreWindow);
  
    // Hide the original window
    this.windowEl.style.visibility = 'hidden';
  }
  

  // private minimizeWindow() {
  //   if (this.minimized) return;

  //   this.minimized = true;

  //   // Store the current state of the window for later restoration
  //   this.preMinimizedTransform = this.windowEl.style.transform;
    
  //   // Create the minimized icon (you can customize this further)
  //   this.minimizeIconEl = document.createElement('div');
  //   this.minimizeIconEl.className = this.options.minimizeIconClass || 'minimized-icon';
  //   this.minimizeIconEl.textContent = 'Minimized Window';
  //   this.minimizeIconEl.style.position = 'absolute';
  //   this.minimizeIconEl.style.top = `${this.offsetY + 20}px`;
  //   this.minimizeIconEl.style.left = `${this.offsetX + 20}px`;
  //   this.minimizeIconEl.style.cursor = 'pointer';
  //   document.body.appendChild(this.minimizeIconEl);

  //   // When clicked, restore the window
  //   this.minimizeIconEl.addEventListener('click', this.restoreWindow);

  //   // Hide the original window
  //   this.windowEl.style.visibility = 'hidden';
  // }

  private restoreWindow = () => {
    if (!this.minimized) return;

    this.windowEl.style.transition = 'transform 300ms ease-out';
    this.windowEl.style.transform = this.preMinimizedTransform;

    // Show the window again and remove the minimized icon
    this.windowEl.style.visibility = 'visible';
    if (this.minimizeIconEl) {
      this.minimizeIconEl.remove();
    }

    this.minimized = false;
  };

  public destroy() {
    this.handleEl.removeEventListener('pointerdown', this.onPointerDown);
    this.handleEl.removeEventListener('dblclick', this.toggleMinimize);
    this.resizeHandleEl?.removeEventListener('pointerdown', this.onResizeStart);
    this.resizeHandleEl?.remove();
    document.removeEventListener('pointermove', this.onPointerMove);
    document.removeEventListener('pointerup', this.onPointerUp);

    if (this.minimizeIconEl) {
      this.minimizeIconEl.removeEventListener('click', this.restoreWindow);
      this.minimizeIconEl.remove();
    }
  }
}

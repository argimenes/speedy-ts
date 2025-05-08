export class InfiniteCanvas {
    private viewport: HTMLElement;
    private canvas: HTMLElement;
    private addBoxBtn: HTMLElement;
    private minimap: HTMLCanvasElement;
    private minimapCtx: CanvasRenderingContext2D;
    private translateX = 0;
    private translateY = 0;
    private scale = 1;
  
    private isPanning = false;
    private startPan = { x: 0, y: 0 };
  
    private isDraggingMinimap = false;
  
    private selectedBoxes = new Set<HTMLElement>();
    private selectionBox: HTMLDivElement;
    private selectionStart: { x: number; y: number } | null = null;
  
    constructor(viewport: HTMLDivElement, canvas: HTMLDivElement) {
      this.viewport = viewport;
      this.canvas = canvas;
      this.minimap = document.getElementById('minimap') as HTMLCanvasElement;
      this.minimapCtx = this.minimap.getContext('2d')!;
  
      this.selectionBox = document.createElement('div');
      this.selectionBox.style.position = 'absolute';
      this.selectionBox.style.border = '1px dashed red';
      this.selectionBox.style.pointerEvents = 'none';
      this.selectionBox.style.zIndex = '1000';
      this.selectionBox.style.display = 'none';
      this.viewport.appendChild(this.selectionBox);
  
      this.viewport.addEventListener('mousedown', this.onMouseDown);
      window.addEventListener('mousemove', this.onMouseMove);
      window.addEventListener('mouseup', this.onMouseUp);
      this.viewport.addEventListener('wheel', this.onWheel, { passive: false });
  
      this.minimap.addEventListener('mousedown', this.onMinimapDown);
      this.minimap.addEventListener('mousemove', this.onMinimapMove);
      this.minimap.addEventListener('mouseup', () => this.isDraggingMinimap = false);
      this.minimap.addEventListener('mouseleave', () => this.isDraggingMinimap = false);
  
      this.updateTransform();
    }
  
    public zoomIn() {
      this.applyZoom(1.1);
    }
  
    public zoomOut() {
      this.applyZoom(1 / 1.1);
    }
  
    private applyZoom(factor: number) {
      const rect = this.viewport.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const worldX = (centerX - this.translateX) / this.scale;
      const worldY = (centerY - this.translateY) / this.scale;
  
      this.scale *= factor;
      this.translateX = centerX - worldX * this.scale;
      this.translateY = centerY - worldY * this.scale;
  
      this.updateTransform();
    }
  
    private updateTransform = () => {
      this.canvas.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
      this.renderMinimap();
    };
  
    private onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const zoomFactor = 1.1;
      const rect = this.viewport.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;
      const worldX = (offsetX - this.translateX) / this.scale;
      const worldY = (offsetY - this.translateY) / this.scale;
  
      this.scale *= e.deltaY < 0 ? zoomFactor : 1 / zoomFactor;
      this.translateX = offsetX - worldX * this.scale;
      this.translateY = offsetY - worldY * this.scale;
  
      this.updateTransform();
    };
  
    private onMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
  
      if (target.classList.contains('box')) {
        if (e.ctrlKey || e.metaKey || e.shiftKey) {
          // Toggle selection
          if (this.selectedBoxes.has(target)) {
            this.selectedBoxes.delete(target);
            target.classList.remove('selected');
          } else {
            this.selectedBoxes.add(target);
            target.classList.add('selected');
          }
        } else {
          if (!this.selectedBoxes.has(target)) {
            this.clearSelection();
            this.selectedBoxes.add(target);
            target.classList.add('selected');
          }
        }
        this.startDragSelected(e);
        return;
      }
  
      // Start canvas drag or selection rectangle
      if (e.button === 0) {
        this.clearSelection();
        this.selectionStart = { x: e.clientX, y: e.clientY };
        this.selectionBox.style.display = 'block';
        this.selectionBox.style.left = `${e.clientX}px`;
        this.selectionBox.style.top = `${e.clientY}px`;
        this.selectionBox.style.width = '0px';
        this.selectionBox.style.height = '0px';
      }
    };
  
    private onMouseMove = (e: MouseEvent) => {
      // Handle selection box
      if (this.selectionStart) {
        const sx = this.selectionStart.x;
        const sy = this.selectionStart.y;
        const ex = e.clientX;
        const ey = e.clientY;
  
        const left = Math.min(sx, ex);
        const top = Math.min(sy, ey);
        const width = Math.abs(ex - sx);
        const height = Math.abs(ey - sy);
  
        Object.assign(this.selectionBox.style, {
          left: `${left}px`,
          top: `${top}px`,
          width: `${width}px`,
          height: `${height}px`,
        });
      }
    };
  
    private onMouseUp = (e: MouseEvent) => {
      if (this.selectionStart) {
        const rect = this.viewport.getBoundingClientRect();
        const x1 = (this.selectionStart.x - rect.left - this.translateX) / this.scale;
        const y1 = (this.selectionStart.y - rect.top - this.translateY) / this.scale;
        const x2 = (e.clientX - rect.left - this.translateX) / this.scale;
        const y2 = (e.clientY - rect.top - this.translateY) / this.scale;
  
        const minX = Math.min(x1, x2);
        const minY = Math.min(y1, y2);
        const maxX = Math.max(x1, x2);
        const maxY = Math.max(y1, y2);
  
        this.clearSelection();
  
        const boxes = Array.from(this.canvas.querySelectorAll('.box')) as HTMLElement[];
        for (const box of boxes) {
          const bx = parseFloat(box.style.left);
          const by = parseFloat(box.style.top);
          const bw = box.offsetWidth;
          const bh = box.offsetHeight;
  
          if (
            bx < maxX &&
            bx + bw > minX &&
            by < maxY &&
            by + bh > minY
          ) {
            this.selectedBoxes.add(box);
            box.classList.add('selected');
          }
        }
  
        this.selectionBox.style.display = 'none';
        this.selectionStart = null;
      }
  
      this.stopDragSelected();
    };
  
    private clearSelection() {
      for (const el of this.selectedBoxes) {
        el.classList.remove('selected');
      }
      this.selectedBoxes.clear();
    }
  
   addBox() {
      const id = `box-${Date.now()}`;
      const box = document.createElement('div');
      box.className = 'box';
      box.textContent = 'Drag Me!';
      box.setAttribute('data-id', id);
  
      const x = Math.random() * 1000;
      const y = Math.random() * 1000;
      box.style.left = `${x}px`;
      box.style.top = `${y}px`;
  
      this.makeDraggable(box);
      this.canvas.appendChild(box);
      this.renderMinimap();
    }
  
    private makeDraggable(el: HTMLElement) {
  
      el.addEventListener('mousedown', (e) => {
        if (!this.selectedBoxes.has(el)) {
          this.clearSelection();
          this.selectedBoxes.add(el);
          el.classList.add('selected');
        }
        this.startDragSelected(e);
      });
    }
  
    private startDragSelected(e: MouseEvent) {
      e.stopPropagation();
      const startX = e.clientX;
      const startY = e.clientY;
      const selected = Array.from(this.selectedBoxes);
      const startPositions = selected.map((el) => ({
        el,
        x: parseFloat(el.style.left),
        y: parseFloat(el.style.top),
      }));
  
      const onMove = (ev: MouseEvent) => {
        const dx = (ev.clientX - startX) / this.scale;
        const dy = (ev.clientY - startY) / this.scale;
  
        for (const item of startPositions) {
          item.el.style.left = `${item.x + dx}px`;
          item.el.style.top = `${item.y + dy}px`;
        }
  
        this.renderMinimap();
      };
  
      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
  
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    }
  
    private stopDragSelected() {
      // Currently managed inline in `startDragSelected`
    }
  
    private renderMinimap() {
      const ctx = this.minimapCtx;
      const w = this.minimap.width;
      const h = this.minimap.height;
      ctx.clearRect(0, 0, w, h);
  
      const scaleFactor = 0.05;
      const viewWidth = this.viewport.clientWidth / this.scale;
      const viewHeight = this.viewport.clientHeight / this.scale;
  
      for (const box of this.canvas.querySelectorAll('.box')) {
        const x = parseFloat((box as HTMLElement).style.left);
        const y = parseFloat((box as HTMLElement).style.top);
        ctx.fillStyle = '#4a90e2';
        ctx.fillRect(x * scaleFactor, y * scaleFactor, 4, 4);
      }
  
      const viewX = -this.translateX / this.scale;
      const viewY = -this.translateY / this.scale;
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 1;
      ctx.strokeRect(
        viewX * scaleFactor,
        viewY * scaleFactor,
        viewWidth * scaleFactor,
        viewHeight * scaleFactor
      );
    }
  
    private onMinimapDown = (e: MouseEvent) => {
      this.isDraggingMinimap = true;
      this.onMinimapMove(e);
    };
  
    private onMinimapMove = (e: MouseEvent) => {
      if (!this.isDraggingMinimap) return;
  
      const scaleFactor = 0.05;
      const rect = this.minimap.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
  
      const worldX = x / scaleFactor;
      const worldY = y / scaleFactor;
  
      this.translateX = this.viewport.clientWidth / 2 - worldX * this.scale;
      this.translateY = this.viewport.clientHeight / 2 - worldY * this.scale;
      this.updateTransform();
    };
  }
  
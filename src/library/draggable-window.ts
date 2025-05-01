export class DraggableWindow {
    private windowEl: HTMLElement;
    private handleEl: HTMLElement;
  
    private isDragging = false;
    private offsetX = 0;
    private offsetY = 0;
  
    private lastX = 0;
    private lastY = 0;
    private velocityX = 0;
    private velocityY = 0;
  
    private animationFrame: number | null = null;
  
    constructor(windowEl: HTMLElement, handleEl: HTMLElement) {
      this.windowEl = windowEl;
      this.handleEl = handleEl;
  
      this.init();
    }
  
    private init() {
      this.handleEl.style.cursor = 'grab';
      this.handleEl.addEventListener('pointerdown', this.onPointerDown);
    }
  
    private onPointerDown = (e: PointerEvent) => {
      this.isDragging = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
  
      if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
  
      document.body.style.userSelect = 'none';
  
      document.addEventListener('pointermove', this.onPointerMove);
      document.addEventListener('pointerup', this.onPointerUp);
    };
  
    private onPointerMove = (e: PointerEvent) => {
      if (!this.isDragging) return;
  
      const dx = e.clientX - this.lastX;
      const dy = e.clientY - this.lastY;
  
      this.velocityX = dx;
      this.velocityY = dy;
  
      this.offsetX += dx;
      this.offsetY += dy;
  
      this.lastX = e.clientX;
      this.lastY = e.clientY;
  
      this.updateTransform();
    };
  
    private onPointerUp = () => {
      this.isDragging = false;
      document.body.style.userSelect = '';
  
      document.removeEventListener('pointermove', this.onPointerMove);
      document.removeEventListener('pointerup', this.onPointerUp);
  
      this.applyMomentum();
    };
  
    private applyMomentum() {
      const friction = 0.95;
      const stopThreshold = 0.5;
  
      const step = () => {
        this.velocityX *= friction;
        this.velocityY *= friction;
  
        this.offsetX += this.velocityX;
        this.offsetY += this.velocityY;
  
        this.updateTransform();
  
        if (
          Math.abs(this.velocityX) > stopThreshold ||
          Math.abs(this.velocityY) > stopThreshold
        ) {
          this.animationFrame = requestAnimationFrame(step);
        }
      };
  
      this.animationFrame = requestAnimationFrame(step);
    }
  
    private updateTransform() {
      this.windowEl.style.transform = `translate(${this.offsetX}px, ${this.offsetY}px)`;
    }
  
    public destroy() {
      this.handleEl.removeEventListener('pointerdown', this.onPointerDown);
      document.removeEventListener('pointermove', this.onPointerMove);
      document.removeEventListener('pointerup', this.onPointerUp);
      if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    }
  }
  
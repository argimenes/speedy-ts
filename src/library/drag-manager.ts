export interface DragDropOptions {
    onDragStart?: (event: DragEvent) => void;
    onDragOver?: (event: DragEvent) => void;
    onDrop?: (event: DragEvent, droppedId: string) => void;
    getDragData?: (element: HTMLElement) => any;
  }
  
  export class DragDropManager {
    private options: DragDropOptions;
  
    constructor(options: DragDropOptions = {}) {
      this.options = options;
    }
  
    /**
     * Make an element draggable
     */
    makeDraggable(element: HTMLElement, dragData?: any) {
      element.setAttribute('draggable', 'true');
      
      element.addEventListener('dragstart', (e) => {
        const event = e as DragEvent;
        if (!event.dataTransfer) return;
  
        // Set data that will be available on drop
        const data = dragData || this.options.getDragData?.(element) || element.id;
        event.dataTransfer.setData('text/plain', JSON.stringify(data));
        
        // Add dragging class
        element.classList.add('dragging');
        
        this.options.onDragStart?.(event);
      });
  
      element.addEventListener('dragend', () => {
        element.classList.remove('dragging');
      });
    }
  
    /**
     * Make an element a valid drop target
     */
    makeDroppable(element: HTMLElement) {
      element.addEventListener('dragover', (e) => {
        const event = e as DragEvent;
        // Prevent default to allow drop
        event.preventDefault();
        
        this.options.onDragOver?.(event);
      });
  
      element.addEventListener('drop', (e) => {
        const event = e as DragEvent;
        event.preventDefault();
        
        if (!event.dataTransfer) return;
  
        try {
          const droppedId = event.dataTransfer.getData('text/plain');
          this.options.onDrop?.(event, JSON.parse(droppedId));
        } catch (error) {
          console.error('Error processing drop:', error);
        }
      });
    }
  }
  
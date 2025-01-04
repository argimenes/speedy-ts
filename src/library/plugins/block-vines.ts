import { StandoffEditorBlock } from "../../blocks/standoff-editor-block";

interface IPoint {
    x: number;
    y: number;
    growing: boolean;
    angle: number;
}
interface IVine {
    path: SVGElement;
    points: IPoint[];
    wiggleFrequency: number;
    wiggleAmplitude: number;
    growthRate: number;
}

class BlockVines {
    block: StandoffEditorBlock;
    vines: IVine[];
    frame: any;
    svgNS: string;
    svg: SVGElement;
    seedPoints: IPoint[];
    constructor(block) {
      this.block = block;
      this.vines = [];
      this.frame = null;
      this.svgNS = "http://www.w3.org/2000/svg";
      
      // Create SVG overlay for the block
      this.svg = document.createElementNS(this.svgNS, "svg") as SVGElement;
      this.svg.style.position = "absolute";
      this.svg.style.pointerEvents = "none";
      this.svg.style.zIndex = "1";

      this.seedPoints = [];
    }
  
    generateSeedPoints() {
      const offset = this.block.cache.offset;
      const points = [];
      const numPoints = 5; // Number of vines
      
      // Generate points along the left and right edges
      for (let i = 0; i < numPoints; i++) {
        const y = offset.y + (offset.h * Math.random());
        // Left edge
        points.push({
          x: offset.x,
          y,
          angle: -Math.PI / 2 + (Math.random() * Math.PI / 4),
          growing: true
        });
        // Right edge
        points.push({
          x: offset.w,
          y,
          angle: Math.PI / 2 + (Math.random() * Math.PI / 4),
          growing: true
        });
      }
      
      return points;
    }
  
    createVine(startPoint: IPoint): IVine {
      const vine: IVine = {
        points: [startPoint],
        path: document.createElementNS(this.svgNS, "path") as SVGElement,
        growthRate: 1 + Math.random(),
        wiggleFrequency: 0.1 + (Math.random() * 0.1),
        wiggleAmplitude: 2 + (Math.random() * 2)
      };
      
      vine.path.setAttribute("stroke", "rgba(34, 139, 34, 0.6)");
      vine.path.setAttribute("stroke-width", "2");
      vine.path.setAttribute("fill", "none");
      this.svg.appendChild(vine.path);
      
      return vine;
    }
  
    growVines() {
      const offset = this.block.cache.offset;
      
      this.vines.forEach(vine => {
        const lastPoint = vine.points[vine.points.length - 1];
        if (!lastPoint.growing) return;
        
        // Calculate new point
        const angle = lastPoint.angle + 
          (Math.sin(Date.now() * vine.wiggleFrequency) * vine.wiggleAmplitude * Math.PI / 180);
        
        const newPoint = {
          x: lastPoint.x + Math.cos(angle) * vine.growthRate,
          y: lastPoint.y + Math.sin(angle) * vine.growthRate,
          angle: angle,
          growing: true
        };
        
        // Stop growing if we hit the edges
        if (newPoint.x < offset.x - 20 || newPoint.x > offset.w + 20 ||
            newPoint.y < offset.y - 20 || newPoint.y > offset.h + 20) {
          lastPoint.growing = false;
          return;
        }
        
        vine.points.push(newPoint);
        
        // Update path
        const pathData = vine.points.reduce((acc, point, index) => {
          return acc + (index === 0 ? 'M' : 'L') + `${point.x} ${point.y}`;
        }, '');
        
        vine.path.setAttribute('d', pathData);
      });
    }
  
    update() {
      const offset = this.block.cache.offset;
      
      // Initialize if needed
      if (this.vines.length === 0) {
        this.seedPoints = this.generateSeedPoints();
        this.seedPoints.forEach(point => {
          this.vines.push(this.createVine(point));
        });
        this.block.container.appendChild(this.svg);
      }
  
      // Update SVG dimensions and position
      this.svg.style.left = `${offset.x - 20}px`;
      this.svg.style.top = `${offset.y - 20}px`;
      this.svg.style.width = `${offset.w + 40}px`;
      this.svg.style.height = `${offset.h + 40}px`;
      
      // Animate vines
      this.growVines();
    }
  
    destroy() {
      if (this.svg.parentNode) {
        this.svg.parentNode.removeChild(this.svg);
      }
      this.vines = [];
      if (this.frame) {
        cancelAnimationFrame(this.frame);
      }
    }
  }
  
  export default BlockVines;
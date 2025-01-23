import { updateElement } from "../library/svg";
import { BlockType, IAbstractBlockConstructor, IBlock, IBlockDto } from "../library/types";
import { UniverseBlock } from "../universe-block";
import { AbstractBlock } from "./abstract-block";
import { ShaderMount, meshGradientFragmentShader } from '@paper-design/shaders';

export interface ICanvasBackgroundBlockConstructor extends IAbstractBlockConstructor {

}

export class CanvasBackgroundBlock extends AbstractBlock {
    canvas: HTMLCanvasElement;
    constructor(args: ICanvasBackgroundBlockConstructor ) {
        super(args);
        this.type = BlockType.CanvasBackgroundBlock;
        this.canvas = document.createElement("CANVAS") as HTMLCanvasElement;
        this.canvas.width = window.screen.width;
        this.canvas.height = window.screen.height;
        this.canvas.style.width = `${window.screen.width}px`;
        this.canvas.style.height = `${window.screen.height}px`;
        this.container.appendChild(this.canvas);
        this.createGradient();
        updateElement(this.container, {
            classList: ["fullscreen-background"]
        });
    }
    createGradient() {
        const shaderParams = {
            u_color1: [255, 192, 203], // pink
            u_color2: [255, 255, 255], // white
            u_color3: [0, 0, 255],     // blue
            u_color4: [128, 0, 128],   // purple
            u_speed: 0.25,
        };
        const meshGradient = new ShaderMount(this.canvas, meshGradientFragmentShader, shaderParams);        
        console.log('meshGradient:', meshGradient);
        console.log('Shader Fragment:', meshGradientFragmentShader);
        console.log('Canvas Element:', this.canvas);
        console.log('webgl:', this.canvas.getContext('webgl'));
    }
    static getBlockBuilder() {
        return {
            type: BlockType.CanvasBackgroundBlock,
            builder: async (container: HTMLElement, dto: IBlockDto, manager: UniverseBlock) => {
                const bg = new CanvasBackgroundBlock({ manager, ...dto });
                await manager.buildChildren(bg, dto, (child) => {
                    bg.container.appendChild(child.container);
                });
                container.appendChild(bg.container);
                return bg;
            }
        };
    }
    serialize(): IBlockDto {
        return {
            id: this.id,
            type: this.type,
            blockProperties: this.blockProperties,
            children: this.blocks.map(b => b.serialize()),
            metadata: this.metadata
        } as IBlockDto;
    }
    deserialize(json: any | any[]): IBlock {
        return this;
    }
}
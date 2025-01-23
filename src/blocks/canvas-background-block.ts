import { updateElement } from "../library/svg";
import { BlockType, IAbstractBlockConstructor, IBlock, IBlockDto } from "../library/types";
import { UniverseBlock } from "../universe-block";
import { AbstractBlock } from "./abstract-block";
import { ShaderMount, getShaderColorFromString, meshGradientFragmentShader } from '@paper-design/shaders';

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
            u_color1: getShaderColorFromString("#283BFC"),
            u_color2: getShaderColorFromString("#FF2828"),
            u_color3: getShaderColorFromString("#dddddd"),
            u_color4: getShaderColorFromString("#800080"),
          };
          
          const meshGradient = new ShaderMount(
            this.canvas,
            meshGradientFragmentShader,
            shaderParams,
            undefined,
            0.25
          );
          
          meshGradient.setUniforms(shaderParams);
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
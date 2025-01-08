import { BlockType } from "../library/types";
import { IWindowBlockConstructor, WindowBlock } from "./window-block";

export interface IDocumentWindowBlockConstructor extends IWindowBlockConstructor {
    
}

export class DocumentWindowBlock extends WindowBlock
{
    constructor(args: IDocumentWindowBlockConstructor)
    {
        args = {
            ...args,
            onClose: async (b) => {
                b.destroy();
            }
        };
        super(args);
        this.type = BlockType.DocumentWindowBlock;
    }
}
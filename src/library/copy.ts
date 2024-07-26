import { v4 as uuidv4 } from 'uuid';
import { GUID, IBlockDto } from "./types";

type TextAnchor = {
    blockId: GUID;
    index: number;
}
type TextSelection = {
    start: TextAnchor;
    end: TextAnchor;
}

export class Copy {
    id: GUID;
    blocks: IBlockDto[];
    textSelection?: TextSelection;
    constructor() {
        this.id = uuidv4();
        this.blocks = [];
        
    }
}
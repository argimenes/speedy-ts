import { BlockType } from "./types";

export const Template = {
    EmptyDocument: {
        type: BlockType.DocumentBlock,
        children: [
            {
                type: BlockType.PageBlock,
                metadata: {
                    name: "Main Page"
                },
                children: [{ type: BlockType.StandoffEditorBlock }],
                blockProperties: [ { type: "block/alignment/left "} ]
            }
        ]
    }
};
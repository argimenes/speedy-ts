import { BlockType } from "./types";

export const Template = {
    EmptyDocument: {
        type: BlockType.DocumentBlock,
        children: [
            {
                type: BlockType.StandoffEditorBlock,
                text: "",
                standoffProperties: [],
                blockProperties: []       
            }
        ],
        blockProperties: [
            { type: "block/alignment/left "}
        ]
    }
};
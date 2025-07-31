import { BlockType } from "./types";

export const Template = {
    EmptyDocument: {
        type: BlockType.MembraneBlock,
        children: [
            {
                type: BlockType.PageBlock,
                children: [
                    {
                        type: BlockType.StandoffEditorBlock
                    }
                ],
                blockProperties: [
                    { type: "block/alignment/left "}
                ]
            }
        ]
    }
};
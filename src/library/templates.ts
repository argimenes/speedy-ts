import { BlockType } from "./types";

export const Template = {
    EmptyDocument: {
        type: BlockType.DocumentBlock,
        metadata: {
            name: "New Document",
            filename: "New Document.json"
        },
        children: [
            {
                type: BlockType.DocumentTabRowBlock,
                children: [
                    {
                        type: BlockType.DocumentTabBlock,
                        children: [
                            {
                                type: BlockType.PageBlock,
                                children: [{ type: BlockType.StandoffEditorBlock }],
                                blockProperties: [ { type: "block/alignment/left "} ]
                            }
                        ]
                    }
                ]
            }
        ]
    }
};
import { Component } from "solid-js"
import { BlockManager, RelationType } from "../library/block-manager"
import { BlockType, IBlockDto, IMainListBlockDto, IStandoffEditorBlockDto, StandoffEditorBlockDto } from "../library/standoff-editor-block"
import { v4 as uuidv4 } from 'uuid';

type Props = {
    
}
export const BlockManagerWindow : Component<Props> = (props) => {
    const initialise = (el: HTMLDivElement) => {
        const testDoc: StandoffEditorBlockDto = {
            text: "Once upon a midnight dreary ...",
            standoffProperties: [
                { type: "style/italics", start: 5, end: 12 },
                { type: "style/bold", start: 7, end: 14 },
                { type: "animation/spinner", start: 10, end: 12 },
                { type: "codex/entity-reference", start: 10, end: 18, value: "abd-def-ghi-123" },
                { type: "codex/block-reference", start: 5, end: 14, value: "abd-def-ghi-321" }
            ],
            blockProperties: [
                { type: "block/alignment/left" }
            ]
        };
        const nextDoc: IBlockDto = {
            type: BlockType.MainListBlock,
            children: [
                {
                    type: BlockType.StandoffEditorBlock,
                    text: "Once upon a midnight dreary ...",
                    standoffProperties: [
                        { type: "style/italics", start: 5, end: 12 },
                        { type: "style/bold", start: 7, end: 14 },
                        { type: "animation/spinner", start: 10, end: 12 },
                        { type: "codex/entity-reference", start: 10, end: 18, value: "abd-def-ghi-123" },
                        { type: "codex/block-reference", start: 5, end: 14, value: "abd-def-ghi-321" }
                    ],
                    blockProperties: [
                        { type: "block/alignment/left" }
                    ],
                    relation: {
                        leftMargin: {
                            type: BlockType.MarginBlock,
                            children: [
                                {
                                    type: BlockType.StandoffEditorBlock,
                                    text: "Left margin - line 1 ...",
                                    blockProperties: [ { type: "block/alignment/left" }]
                                } as IStandoffEditorBlockDto,
                                {
                                    type: BlockType.StandoffEditorBlock,
                                    text: "Left margin - line 2 ...",
                                    blockProperties: [ { type: "block/alignment/left" }]
                                } as IStandoffEditorBlockDto
                            ]
                        }
                    }
                } as IStandoffEditorBlockDto,
                {
                    type: BlockType.StandoffEditorBlock,
                    text: "While I pondered weak and weary ...",
                    standoffProperties: [
                        { type: "style/italics", start: 7, end: 12 },
                        { type: "style/bold", start: 10, end: 16 }
                    ],
                    blockProperties: [
                        { type: "block/alignment/right" }
                    ]
                } as IStandoffEditorBlockDto,
                {
                    type: BlockType.IndentedListBlock,
                    children: [
                        {
                            type: BlockType.StandoffEditorBlock,
                            text: "List item 1.1",
                            blockProperties: [ { type: "block/alignment/left" }],
                            children: [
                                {
                                    type: BlockType.IndentedListBlock,
                                    children: [
                                        {
                                            type: BlockType.StandoffEditorBlock,
                                            text: "List item 1.1.1",
                                            blockProperties: [ { type: "block/alignment/left" }]
                                        } as IStandoffEditorBlockDto,
                                        {
                                            type: BlockType.StandoffEditorBlock,
                                            text: "List item 1.1.2",
                                            blockProperties: [ { type: "block/alignment/left" }]
                                        } as IStandoffEditorBlockDto
                                    ]
                                }
                            ]
                        } as IStandoffEditorBlockDto,
                        {
                            type: BlockType.StandoffEditorBlock,
                            text: "List item 2",
                            blockProperties: [ { type: "block/alignment/left" }]
                        } as IStandoffEditorBlockDto
                    ]
                }
            ]
        } as IMainListBlockDto;
        const manager = new BlockManager();
        manager.container = el;
        manager.testLoadDocument(nextDoc);
        // manager.loadDocument(testDoc);
        console.log({ manager, block: manager.blocks[0] })
    }
    return (
        <>
            <div ref={initialise} class="block-window" />
        </>
    )
}
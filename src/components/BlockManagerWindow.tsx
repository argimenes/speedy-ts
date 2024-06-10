import { Component } from "solid-js"
import { BlockManager, RelationType } from "../library/block-manager"
import { BlockType, IBlockDto, StandoffEditorBlockDto } from "../library/standoff-editor-block"
import { v4 as uuidv4 } from 'uuid';
import { first } from "underscore";

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
        const documentId = uuidv4();
        const mainListBlockId = uuidv4();
        const firstTextBlockId = uuidv4();
        const secondTextBlockId = uuidv4();
        const marginBlockId = uuidv4();
        const marginFirstTextBlockId = uuidv4();
        const nextDoc: IBlockDto = {
            id: documentId,
            type: BlockType.RootBlock,
            blocks: [
                {
                    id: mainListBlockId,
                    type: BlockType.MainListBlock,
                    relations: [
                        { sourceId: mainListBlockId, name: RelationType.has_first_child, targetId: firstTextBlockId }
                    ],
                    blocks: [
                        {
                            id: firstTextBlockId,
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
                            relations: [
                                { sourceId: firstTextBlockId, name: RelationType.has_next, targetId: secondTextBlockId },
                                { sourceId: firstTextBlockId, name: RelationType.has_parent, targetId: mainListBlockId }  
                            ],
                            blocks: [
                                {
                                    id: marginBlockId,
                                    type: BlockType.MarginBlock,
                                    relations: [
                                        { sourceId: marginBlockId, name: RelationType.has_left_margin_parent, targetId: firstTextBlockId },
                                        { sourceId: marginBlockId, name: RelationType.has_first_child, targetId: marginFirstTextBlockId }
                                    ],
                                    blocks: [
                                        {
                                            id: marginFirstTextBlockId,
                                            type: BlockType.StandoffEditorBlock,
                                            text: "Left marginalia ...",
                                            standoffProperties: [
                                                { type: "style/italics", start: 7, end: 12 }
                                            ],
                                            blockProperties: [
                                                { type: "block/alignment/left" }
                                            ],
                                            relations: [
                                                { sourceId: marginFirstTextBlockId, name: RelationType.has_parent, targetId: marginBlockId }
                                            ]
                                        } as any
                                    ]
                                }
                            ]
                        } as any,
                        {
                            id: secondTextBlockId,
                            type: BlockType.StandoffEditorBlock,
                            text: "While I pondered weak and weary ...",
                            standoffProperties: [
                                { type: "style/italics", start: 7, end: 12 },
                                { type: "style/bold", start: 10, end: 16 }

                            ],
                            blockProperties: [
                                { type: "block/alignment/right" }
                            ],
                            relations: {
                                [RelationType.has_previous]: { sourceId: secondTextBlockId, name: RelationType.has_previous, targetId: firstTextBlockId },
                            }
                        } as any
                    ]
                } as any
            ]
        };
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
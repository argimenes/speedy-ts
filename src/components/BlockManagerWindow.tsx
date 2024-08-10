import { Component } from "solid-js"
import { BlockManager } from "../library/block-manager"
import { IBlockDto, BlockType, IStandoffEditorBlockDto, IMainListBlockDto, IPlainTextBlockDto, IEmbedDocumentBlockDto, IBlock } from "../library/types";
import { StandoffEditorBlock } from "../library/standoff-editor-block";

type Props = {
    getInstance: (inst: BlockManager) => void;
}
export const BlockManagerWindow : Component<Props> = (props) => {
    const initialise = (el: HTMLDivElement) => {
        /**
         * left: 180px;
        top: 160px;
        width: 590px;
        height: 820px;
         */
        const template: IBlockDto = {
            type: BlockType.MainListBlock,
            children: [
                {
                    type: BlockType.ImageBlock,
                    metadata: {
                        url: "/uploads/medieval-template.jpg"
                    },
                    blockProperties: [
                        {
                            type: "block/size", 
                            metadata: {
                                width: 914, height: 1252
                            }
                        }
                    ],
                    children: [
                        {
                            type: BlockType.GridBlock,
                            blockProperties: [
                                {
                                    type: "block/size", 
                                    metadata: {
                                        width: 590, height: 820,
                                        "overflow-y": "scroll",
                                        "overflow-x": "hidden"
                                    }
                                },
                                {
                                    type: "block/position", 
                                    metadata: {
                                        x: 195, y: 180, position: "absolute"
                                    }
                                }
                            ],
                            children: [
                                {
                                    type: BlockType.GridRowBlock,
                                    children: [
                                        {
                                            type: BlockType.GridCellBlock,
                                            blockProperties: [
                                                {
                                                    type: "block/size", 
                                                    metadata: {
                                                        position: "relative",
                                                        width: "100%"
                                                    }
                                                }
                                            ],
                                            children: [
                                                {
                                                    type: BlockType.StandoffEditorBlock,
                                                    text: "HELL",
                                                    blockProperties: []
                                                } as IStandoffEditorBlockDto
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }                        
                    ]
                }
            ]
        };
        const nextDoc: IBlockDto = {
            type: BlockType.MainListBlock,
            children: [
                {
                    type: BlockType.StandoffEditorBlock,
                    text: "Once upon a midnight dreary ... [left aligned]",
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
                            type: BlockType.LeftMarginBlock,
                            children: [
                                {
                                    type: BlockType.StandoffEditorBlock,
                                    text: "Left margin note 1.",
                                    blockProperties: [ { type: "block/alignment/left" }, { type: "block/font-size/three-quarters" }]
                                } as IStandoffEditorBlockDto
                            ]
                        }
                    }
                } as IStandoffEditorBlockDto,
                {
                    type: BlockType.StandoffEditorBlock,
                    text: "... while I pondered weak and weary [right aligned]",
                    standoffProperties: [
                        { type: "style/italics", start: 7, end: 12 },
                        { type: "style/bold", start: 10, end: 16 }
                    ],
                    blockProperties: [
                        { type: "block/alignment/right" }
                    ],
                    relation: {
                        rightMargin: {
                            type: BlockType.RightMarginBlock,
                            children: [
                                {
                                    type: BlockType.StandoffEditorBlock,
                                    text: "Right margin note 2a.",
                                    blockProperties: [ { type: "block/alignment/left" }, { type: "block/font-size/three-quarters" }]
                                } as IStandoffEditorBlockDto,
                                {
                                    type: BlockType.StandoffEditorBlock,
                                    text: "Right margin note 2b.",
                                    blockProperties: [ { type: "block/alignment/left" }, { type: "block/font-size/three-quarters" }]
                                } as IStandoffEditorBlockDto
                            ]
                        }
                    }
                } as IStandoffEditorBlockDto,
                {
                    type: BlockType.PlainTextBlock,
                    text: "... and this is just a plain text block ..."
                } as IPlainTextBlockDto,
                {
                    type: BlockType.IndentedListBlock,
                    children: [
                        {
                            type: BlockType.StandoffEditorBlock,
                            text: "List item 1",
                            blockProperties: [ { type: "block/alignment/left" }],
                            children: [
                                {
                                    type: BlockType.IndentedListBlock,
                                    children: [
                                        {
                                            type: BlockType.StandoffEditorBlock,
                                            text: "List item 1.1",
                                            blockProperties: [ { type: "block/alignment/left" }]
                                        } as IStandoffEditorBlockDto,
                                        {
                                            type: BlockType.StandoffEditorBlock,
                                            text: "List item 1.2",
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
                },
                {
                    type: BlockType.StandoffEditorBlock,
                    text: "... and back to a regular text block [centre aligned]",
                    standoffProperties: [
                        { type: "codex/entity-reference", start: 5, end: 18, value: "abd-def-ghi-123" },
                        { type: "codex/block-reference", start: 10, end: 28, value: "abd-def-ghi-321" }
                    ],
                    blockProperties: [
                        { type: "block/alignment/centre" }
                    ]
                } as IStandoffEditorBlockDto,
                {
                    type: BlockType.TabRowBlock,
                    children: [
                        {
                            type: BlockType.TabBlock,
                            metadata: {
                                name: "A"
                            },
                            children: [
                                {
                                    type: BlockType.StandoffEditorBlock,
                                    text: "Line 1",
                                    blockProperties: [
                                        { type: "block/alignment/left" }
                                    ]
                                } as IStandoffEditorBlockDto,
                                {
                                    type: BlockType.StandoffEditorBlock,
                                    text: "Line 2",
                                    blockProperties: [
                                        { type: "block/alignment/left" }
                                    ]
                                } as IStandoffEditorBlockDto
                            ]
                        },
                        {
                            type: BlockType.TabBlock,
                            metadata: {
                                name: "B"
                            },
                            children: [
                                {
                                    type: BlockType.StandoffEditorBlock,
                                    text: "Line 3",
                                    blockProperties: [
                                        { type: "block/alignment/left" }
                                    ]
                                } as IStandoffEditorBlockDto,
                                {
                                    type: BlockType.StandoffEditorBlock,
                                    text: "Line 4",
                                    blockProperties: [
                                        { type: "block/alignment/left" }
                                    ]
                                } as IStandoffEditorBlockDto
                            ]
                        },
                        {
                            type: BlockType.TabBlock,
                            metadata: {
                                name: "C"
                            },
                            children: [
                                {
                                    type: BlockType.ImageBlock,
                                    metadata: {
                                        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Leonardo_da_Vinci_%281452-1519%29_-_The_Last_Supper_%281495-1498%29.jpg/1024px-Leonardo_da_Vinci_%281452-1519%29_-_The_Last_Supper_%281495-1498%29.jpg"
                                    }
                                },
                                {
                                    type: BlockType.StandoffEditorBlock,
                                    text: "Line 5",
                                    blockProperties: [
                                        { type: "block/alignment/left" }
                                    ]
                                } as IStandoffEditorBlockDto,
                                {
                                    type: BlockType.StandoffEditorBlock,
                                    text: "Line 6",
                                    blockProperties: [
                                        { type: "block/alignment/left" }
                                    ]
                                } as IStandoffEditorBlockDto
                            ]
                        }
                    ]
                },
                {
                    type: BlockType.GridBlock,
                    children: [
                        {
                            type: BlockType.GridRowBlock,
                            children: [
                                {
                                    type: BlockType.GridCellBlock,
                                    metadata: {
                                        width: "30%"
                                    },
                                    children: [
                                        {
                                            type: BlockType.StandoffEditorBlock,
                                            text: "Row 1 - Cell 1"
                                        }
                                    ]
                                },
                                {
                                    type: BlockType.GridCellBlock,
                                    metadata: {
                                        width: "30%"
                                    },
                                    children: [
                                        {
                                            type: BlockType.StandoffEditorBlock,
                                            text: "Row 1 - Cell 2"
                                        }
                                    ]
                                },
                                {
                                    type: BlockType.GridCellBlock,
                                    metadata: {
                                        width: "30%"
                                    },
                                    children: [
                                        {
                                            type: BlockType.StandoffEditorBlock,
                                            text: "Row 1 - Cell 3"
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            type: BlockType.GridRowBlock,
                            children: [
                                {
                                    type: BlockType.GridCellBlock,
                                    metadata: {
                                        width: "22.5%"
                                    },
                                    children: [
                                        {
                                            type: BlockType.StandoffEditorBlock,
                                            text: "Row 2 - Cell 1"   
                                        }
                                    ]
                                },
                                {
                                    type: BlockType.GridCellBlock,
                                    metadata: {
                                        width: "49%"
                                    },
                                    children: [
                                        {
                                            type: BlockType.StandoffEditorBlock,
                                            text: "Row 2 - Cell 2"
                                        },
                                        {
                                            type: BlockType.IFrameBlock,
                                            metadata: {
                                                url: "https://en.wikipedia.org/wiki/Leonardo_da_Vinci"
                                            }
                                        }
                                    ]
                                },
                                {
                                    type: BlockType.GridCellBlock,
                                    metadata: {
                                        width: "22.5%"
                                    },
                                    children: [
                                        {
                                            type: BlockType.StandoffEditorBlock,
                                            text: "Row 2 - Cell 3"
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        } as IMainListBlockDto;
        const manager = new BlockManager();
        manager.container = el;
        manager.loadDocument(nextDoc);
        const standoff = manager.blocks.find(x => x.type == BlockType.StandoffEditorBlock) as StandoffEditorBlock;
        manager.setBlockFocus(standoff);
        standoff.moveCaretStart();
        props.getInstance(manager);
        console.log("== GLOBAL ==", { manager, block: manager.blocks[0] })
    }
    return (
        <>
            <div ref={initialise} class="block-window" style="margin: 0 auto;" />
        </>
    )
}
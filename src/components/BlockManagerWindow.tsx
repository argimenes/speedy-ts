import { Component } from "solid-js"
import { WorkspaceBlock } from "../workspace-block"
import { IBlockDto, BlockType, IStandoffEditorBlockDto, IMainListBlockDto, IPlainTextBlockDto, ICheckBlockDto } from "../library/types";
import { uniqueId } from "underscore";

type Props = {
    getInstance: (inst: WorkspaceBlock) => void;
}
export const BlockManagerWindow : Component<Props> = (props) => {
    const initialise = (el: HTMLDivElement) => {
        const doc: IBlockDto = {
            type: BlockType.DocumentBlock,
            children: [
                {
                    type: BlockType.StandoffEditorBlock,
                    text: "Standoff Property Text Editor",
                    blockProperties: [ { type: "block/font/size/h3" }],
                    standoffProperties: [
                        { type: "style/rainbow", start: 18, end: 21 },
                        { type: "style/highlighter", start: 5, end: 12 },
                        { type: "style/spiky", start: 15, end: 28 },
                    ]
                },
                {
                    type: BlockType.StandoffEditorBlock,
                    text: "Once upon a midnight dreary ... [left aligned]",
                    standoffProperties: [
                        { type: "style/italics", start: 5, end: 12 },
                        { type: "style/bold", start: 7, end: 14 },
                        { type: "animation/spinner", start: 10, end: 12 },
                        { type: "codex/entity-reference", start: 10, end: 18, value: "abd-def-ghi-123" },
                        { type: "codex/block-reference", start: 5, end: 14, value: "abd-def-ghi-321" },
                        { type: "codex/time-reference", start: 15, end: 22, value: "abd-def-ghi-432" },
                        { type: "style/rectangle", start: 20, end: 32 },
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
                                    blockProperties: [ { type: "block/alignment/left" }, { type: "block/font/size/three-quarters" }]
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
                                    blockProperties: [ { type: "block/alignment/right" }, { type: "block/font/size/three-quarters" }]
                                } as IStandoffEditorBlockDto,
                                {
                                    type: BlockType.StandoffEditorBlock,
                                    text: "Right margin note 2b.",
                                    blockProperties: [ { type: "block/alignment/right" }, { type: "block/font/size/three-quarters" }]
                                } as IStandoffEditorBlockDto
                            ]
                        }
                    }
                } as IStandoffEditorBlockDto,
                {
                    type: BlockType.StandoffEditorBlock,
                    text: "Video",
                    blockProperties: [ { type: "block/font/size/h3" }, { type: "block/margin/top/40px" }]
                },
                {
                    type: BlockType.VideoBlock,
                    metadata: {
                        url: "https://www.youtube.com/watch?v=fJemjesBMVE"
                    }
                },
                {
                    type: BlockType.StandoffEditorBlock,
                    text: "Other Text Editors",
                    blockProperties: [ { type: "block/font/size/h3" }, { type: "block/margin/top/40px" }]
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
                                        width: "48%"
                                    },
                                    children: [
                                        {
                                            type: BlockType.PlainTextBlock,
                                            text: "... and this is just a plain text block ..."
                                        } as IPlainTextBlockDto
                                    ]
                                },
                                {
                                    type: BlockType.GridCellBlock,
                                    metadata: {
                                        width: "48%"
                                    },
                                    children: [
                                        {
                                            type: BlockType.CodeMirrorBlock,
                                            text:
`// And this is a Javascript function in Code Mirror
const foo = (bar) => {
    alert("Hello, " + bar);
}`
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                },
                {
                    type: BlockType.StandoffEditorBlock,
                    text: "Nested Lists",
                    blockProperties: [ { type: "block/font/size/h3" }, { type: "block/margin/top/40px" }]
                },
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
                        } as IStandoffEditorBlockDto,
                        {
                            type: BlockType.CheckboxBlock,
                            checked: true,
                            children: [
                                {
                                    type: BlockType.StandoffEditorBlock,
                                    text: "Checkbox list item 1"
                                } as IStandoffEditorBlockDto
                            ]
                        } as ICheckBlockDto,
                    ]
                },
                {
                    type: BlockType.CheckboxBlock,
                    checked: false,
                    children: [
                        {
                            type: BlockType.StandoffEditorBlock,
                            text: "Checkbox list item 2"
                        } as IStandoffEditorBlockDto
                    ]
                } as ICheckBlockDto,
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
                    type: BlockType.StandoffEditorBlock,
                    text: "Tabs",
                    blockProperties: [ { type: "block/font/size/h3" }, { type: "block/margin/top/40px" }]
                },
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
                    type: BlockType.StandoffEditorBlock,
                    text: "Grids",
                    blockProperties: [ { type: "block/font/size/h3" }, { type: "block/margin/top/40px" }]
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
                },
                {
                    type: BlockType.StandoffEditorBlock,
                    text: "Tables",
                    blockProperties: [ { type: "block/font/size/h3" }, { type: "block/margin/top/40px" }]
                },
                {
                    type: BlockType.TableBlock,
                    children: [
                        {
                            type: BlockType.TableRowBlock,
                            children: [
                                {
                                    type: BlockType.TableCellBlock,
                                    children: [
                                        {
                                            type: BlockType.StandoffEditorBlock,
                                            text: "Table Cell 01/01"
                                        }
                                    ]
                                },
                                {
                                    type: BlockType.TableCellBlock,
                                    children: [
                                        {
                                            type: BlockType.StandoffEditorBlock,
                                            text: "Table Cell 01/02"
                                        }
                                    ]
                                },
                                {
                                    type: BlockType.TableCellBlock,
                                    children: [
                                        {
                                            type: BlockType.StandoffEditorBlock,
                                            text: "Table Cell 01/03"
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            type: BlockType.TableRowBlock,
                            children: [
                                {
                                    type: BlockType.TableCellBlock,
                                    children: [
                                        {
                                            type: BlockType.StandoffEditorBlock,
                                            text: "Table Cell 02/01"
                                        }
                                    ]
                                },
                                {
                                    type: BlockType.TableCellBlock,
                                    children: [
                                        {
                                            type: BlockType.StandoffEditorBlock,
                                            text: "Table Cell 02/02"
                                        }
                                    ]
                                },
                                {
                                    type: BlockType.TableCellBlock,
                                    children: [
                                        {
                                            type: BlockType.StandoffEditorBlock,
                                            text: "Table Cell 02/03"
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        } as IMainListBlockDto;
        const workspace = new WorkspaceBlock();
        workspace.container = el;
        workspace.loadDocument(doc);
        workspace.takeSnapshot(doc);
        //(manager.setupControlPanel()).then(() => {});
        
        props.getInstance(workspace);
        console.log("== GLOBAL ==", { manager: workspace, block: workspace.blocks[0] })
    }
    
    return (
        <>
            <div ref={initialise}
                class="block-window"
                style="top: 10px; margin: 0 auto;" />
        </>
    )
}
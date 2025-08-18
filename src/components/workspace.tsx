import { Component } from "solid-js"
import { UniverseBlock } from "../universe-block"
import { IBlockDto, BlockType, IStandoffEditorBlockDto, IMainListBlockDto, IPlainTextBlockDto, ICheckBlockDto } from "../library/types";
import { WorkspaceBlock } from "../blocks/workspace-block";
import { VideoBackgroundBlock } from "../blocks/video-background-block";
import { ImageBackgroundBlock } from "../blocks/image-background-block";
import { DocumentWindowBlock } from "../blocks/document-window-block";
import { WindowBlock } from "../blocks/window-block";
import { CheckboxBlock } from "../blocks/checkbox-block";
import { StandoffEditorBlock } from "../blocks/standoff-editor-block";
import { TableBlock, TableCellBlock, TableRowBlock } from "../blocks/tables-blocks";
import { GridBlock, GridCellBlock, GridRowBlock } from "../blocks/grid-block";
import { IframeBlock } from "../blocks/iframe-block";
import { PlainTextBlock } from "../blocks/plain-text-block";
import { CodeMirrorBlock } from "../blocks/code-mirror-block";
import { IndentedListBlock } from "../blocks/indented-list-block";
import { ImageBlock } from "../blocks/image-block";
import { YouTubeVideoBlock } from "../blocks/youtube-video-block";
import { EmbedDocumentBlock } from "../blocks/embed-document-block";
import { TabBlock, TabRowBlock } from "../blocks/tabs-block";
import { ContextMenuBlock } from "../blocks/context-menu-block";
import { CanvasBackgroundBlock } from "../blocks/canvas-background-block";
import { YouTubeVideoBackgroundBlock } from "../blocks/youtube-video-background-block";
import { CanvasBlock } from "../blocks/canvas-block";
import { DocumentTabRowBlock, DocumentTabBlock } from "../blocks/document-tabs-block";
import { ContainerBlock } from "../blocks/container-block";
import { StickyTabBlock, StickyTabRowBlock } from "../blocks/sticky-tab-block";
import { PageBlock } from "../blocks/page-block";
import { DocumentBlock } from "../blocks/document-block";
import { SideBlock, SurfaceBlock } from "../blocks/surface-block";

type Props = {
    getInstance: (inst: UniverseBlock) => void;
}
export const BlockManagerWindow : Component<Props> = (props) => {
    const initialise = (el: HTMLDivElement) => {
        const doc2: IBlockDto = {
            type: BlockType.DocumentBlock,
            children: [
                {
                    type: BlockType.StickyTabRowBlock,
                    children: [
                        {
                            type: BlockType.StickyTabBlock,
                            metadata: {
                                text: "Sticky tag #1"
                            },
                            children: [
                                {
                                    type: BlockType.StandoffEditorBlock,
                                    text: "Test text for Sticky Tag #1 ..."
                                }
                            ]
                        },
                        {
                            type: BlockType.StickyTabBlock,
                            metadata: {
                                backgroundColor: "cyan",
                                text: "Sticky tag #2"
                            },
                            children: [
                                {
                                    type: BlockType.StandoffEditorBlock,
                                    text: "Test text for Sticky Tag #2 ..."
                                }
                            ]
                        }
                    ]
                },
                {
                    type: BlockType.DocumentTabRowBlock,
                    children: [
                        {
                            type: BlockType.DocumentTabBlock,
                            children: [
                                {
                                    type: BlockType.PageBlock,
                                    children: [
                                        {
                                            type: BlockType.StandoffEditorBlock,
                                            text: "Standoff Property Text Editor",
                                            blockProperties: [ { type: "block/font/size", value: "h3" }],
                                            standoffProperties: [
                                                { type: "style/rainbow", start: 18, end: 21 },
                                                { type: "style/highlighter", start: 5, end: 12 },
                                                { type: "style/spiky", start: 15, end: 28 },
                                            ],
                                            metadata: {
                                                
                                            }
                                        } as IStandoffEditorBlockDto,
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
                                                { type: "block/alignment", value: "left" }
                                            ],
                                            relation: {
                                                leftMargin: {
                                                    type: BlockType.LeftMarginBlock,
                                                    children: [
                                                        {
                                                            type: BlockType.StandoffEditorBlock,
                                                            text: "Left margin note 1.",
                                                            blockProperties: [ { type: "block/alignment", value: "left" }, { type: "block/font/size", value: "three-quarters" }]
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
                                                { type: "block/alignment", value: "right" }
                                            ],
                                            relation: {
                                                rightMargin: {
                                                    type: BlockType.RightMarginBlock,
                                                    children: [
                                                        {
                                                            type: BlockType.StandoffEditorBlock,
                                                            text: "Right margin note 2a.",
                                                            blockProperties: [ { type: "block/alignment", value: "right" }, { type: "block/font/size", value: "three-quarters" }]
                                                        } as IStandoffEditorBlockDto,
                                                        {
                                                            type: BlockType.StandoffEditorBlock,
                                                            text: "Right margin note 2b.",
                                                            blockProperties: [ { type: "block/alignment", value: "right" }, { type: "block/font/size", value: "three-quarters" }]
                                                        } as IStandoffEditorBlockDto
                                                    ]
                                                }
                                            }
                                        } as IStandoffEditorBlockDto,
                                        {
                                            type: BlockType.StandoffEditorBlock,
                                            text: "Canvas",
                                            blockProperties: [ { type: "block/font/size", value: "h3" }, { type: "block/margin/top/40px" }]
                                        } as IStandoffEditorBlockDto,
                                        {
                                            type: BlockType.CanvasBlock
                                        },
                                        {
                                            type: BlockType.StandoffEditorBlock,
                                            text: "Video",
                                            blockProperties: [ { type: "block/font/size", value: "h3" }, { type: "block/margin/top/40px" }]
                                        } as IStandoffEditorBlockDto,
                                        {
                                            type: BlockType.YouTubeVideoBlock,
                                            metadata: {
                                                url: "https://www.youtube.com/watch?v=fJemjesBMVE"
                                            }
                                        },
                                        {
                                            type: BlockType.StandoffEditorBlock,
                                            text: "Other Text Editors",
                                            blockProperties: [ { type: "block/font/size", value: "h3" }, { type: "block/margin/top/40px" }]
                                        } as IStandoffEditorBlockDto,
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
                                            blockProperties: [ { type: "block/font/size", value: "h3" }, { type: "block/margin/top/40px" }]
                                        } as IStandoffEditorBlockDto,
                                        {
                                            type: BlockType.IndentedListBlock,
                                            children: [
                                                {
                                                    type: BlockType.StandoffEditorBlock,
                                                    text: "List item 1",
                                                    blockProperties: [ { type: "block/alignment", value: "left" }],
                                                    children: [
                                                        {
                                                            type: BlockType.IndentedListBlock,
                                                            children: [
                                                                {
                                                                    type: BlockType.StandoffEditorBlock,
                                                                    text: "List item 1.1",
                                                                    blockProperties: [ { type: "block/alignment", value: "left" }]
                                                                } as IStandoffEditorBlockDto,
                                                                {
                                                                    type: BlockType.StandoffEditorBlock,
                                                                    text: "List item 1.2",
                                                                    blockProperties: [ { type: "block/alignment", value: "left" }]
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
                                                { type: "block/alignment", value: "center" }
                                            ]
                                        } as IStandoffEditorBlockDto,
                                        {
                                            type: BlockType.StandoffEditorBlock,
                                            text: "Tabs",
                                            blockProperties: [ { type: "block/font/size", value: "h3" }, { type: "block/margin/top/40px" }]
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
                                                                { type: "block/alignment", value: "left" }
                                                            ]
                                                        } as IStandoffEditorBlockDto,
                                                        {
                                                            type: BlockType.StandoffEditorBlock,
                                                            text: "Line 2",
                                                            blockProperties: [
                                                                { type: "block/alignment", value: "left" }
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
                                                                { type: "block/alignment", value: "left" }
                                                            ]
                                                        } as IStandoffEditorBlockDto,
                                                        {
                                                            type: BlockType.StandoffEditorBlock,
                                                            text: "Line 4",
                                                            blockProperties: [
                                                                { type: "block/alignment", value: "left" }
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
                                                            type: BlockType.SurfaceBlock,
                                                            children: [
                                                                {
                                                                    type: BlockType.SideBlock,
                                                                    metadata: {
                                                                        active: true
                                                                    },
                                                                    children: [
                                                                        {
                                                                            type: BlockType.ImageBlock,
                                                                            metadata: {
                                                                                url: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Leonardo_da_Vinci_%281452-1519%29_-_The_Last_Supper_%281495-1498%29.jpg/1024px-Leonardo_da_Vinci_%281452-1519%29_-_The_Last_Supper_%281495-1498%29.jpg"
                                                                            }
                                                                        }
                                                                    ]
                                                                },
                                                                {
                                                                    type: BlockType.SideBlock,
                                                                    metadata: {
                                                                        active: false
                                                                    },
                                                                    children: [
                                                                        {
                                                                            type: BlockType.StandoffEditorBlock,
                                                                            text: "Text behind the image ..."
                                                                        } as IStandoffEditorBlockDto
                                                                    ]
                                                                }
                                                            ]
                                                        },
                                                        {
                                                            type: BlockType.StandoffEditorBlock,
                                                            text: "Line 5",
                                                            blockProperties: [
                                                                { type: "block/alignment", value: "left" }
                                                            ]
                                                        } as IStandoffEditorBlockDto,
                                                        {
                                                            type: BlockType.StandoffEditorBlock,
                                                            text: "Line 6",
                                                            blockProperties: [
                                                                { type: "block/alignment", value: "left" }
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
                                        } as IStandoffEditorBlockDto,
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
                                                                } as IStandoffEditorBlockDto
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
                                                                } as IStandoffEditorBlockDto,
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
                                            blockProperties: [ { type: "block/font/size", value: "h3" }, { type: "block/margin/top/40px" }]
                                        } as IStandoffEditorBlockDto,
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
                                                                } as IStandoffEditorBlockDto
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
                                }
                            ],
                            metadata: {
                                name: "Page 1"
                            }
                        },
                        {
                            type: BlockType.DocumentTabBlock,
                            children: [
                                {
                                    type: BlockType.PageBlock,
                                    children: [
                                        {
                                            type: BlockType.StandoffEditorBlock,
                                            text: "Text on Page 2 ..."
                                        } as IStandoffEditorBlockDto
                                    ],
                                    metadata: {
                                        name: "Page 2"
                                    }
                                }
                            ]
                        }
                    ]
                }
            ]
        };

        const doc: IBlockDto = {
            type: BlockType.DocumentBlock,
            children: [                
                {
                    type: BlockType.StandoffEditorBlock,
                    text: "Standoff Property Text Editor",
                    blockProperties: [ { type: "block/font/size", value: "h3" }],
                    standoffProperties: [
                        { type: "style/rainbow", start: 18, end: 21 },
                        { type: "style/highlighter", start: 5, end: 12 },
                        { type: "style/spiky", start: 15, end: 28 },
                    ],
                    metadata: {
                        
                    }
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
                        { type: "block/alignment", value: "left" }
                    ],
                    relation: {
                        leftMargin: {
                            type: BlockType.LeftMarginBlock,
                            children: [
                                {
                                    type: BlockType.StandoffEditorBlock,
                                    text: "Left margin note 1.",
                                    blockProperties: [ { type: "block/alignment", value: "left" }, { type: "block/font/size", value: "three-quarters" }]
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
                        { type: "block/alignment", value: "right" }
                    ],
                    relation: {
                        rightMargin: {
                            type: BlockType.RightMarginBlock,
                            children: [
                                {
                                    type: BlockType.StandoffEditorBlock,
                                    text: "Right margin note 2a.",
                                    blockProperties: [ { type: "block/alignment", value: "right" }, { type: "block/font/size", value: "three-quarters" }]
                                } as IStandoffEditorBlockDto,
                                {
                                    type: BlockType.StandoffEditorBlock,
                                    text: "Right margin note 2b.",
                                    blockProperties: [ { type: "block/alignment", value: "right" }, { type: "block/font/size", value: "three-quarters" }]
                                } as IStandoffEditorBlockDto
                            ]
                        }
                    }
                } as IStandoffEditorBlockDto,
                {
                    type: BlockType.StandoffEditorBlock,
                    text: "Canvas",
                    blockProperties: [ { type: "block/font/size", value: "h3" }, { type: "block/margin/top/40px" }]
                },
                {
                    type: BlockType.CanvasBlock
                },
                {
                    type: BlockType.StandoffEditorBlock,
                    text: "Video",
                    blockProperties: [ { type: "block/font/size", value: "h3" }, { type: "block/margin/top/40px" }]
                },
                {
                    type: BlockType.YouTubeVideoBlock,
                    metadata: {
                        url: "https://www.youtube.com/watch?v=fJemjesBMVE"
                    }
                },
                {
                    type: BlockType.StandoffEditorBlock,
                    text: "Other Text Editors",
                    blockProperties: [ { type: "block/font/size", value: "h3" }, { type: "block/margin/top/40px" }]
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
                    blockProperties: [ { type: "block/font/size", value: "h3" }, { type: "block/margin/top/40px" }]
                },
                {
                    type: BlockType.IndentedListBlock,
                    children: [
                        {
                            type: BlockType.StandoffEditorBlock,
                            text: "List item 1",
                            blockProperties: [ { type: "block/alignment", value: "left" }],
                            children: [
                                {
                                    type: BlockType.IndentedListBlock,
                                    children: [
                                        {
                                            type: BlockType.StandoffEditorBlock,
                                            text: "List item 1.1",
                                            blockProperties: [ { type: "block/alignment", value: "left" }]
                                        } as IStandoffEditorBlockDto,
                                        {
                                            type: BlockType.StandoffEditorBlock,
                                            text: "List item 1.2",
                                            blockProperties: [ { type: "block/alignment", value: "left" }]
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
                        { type: "block/alignment", value: "center" }
                    ]
                } as IStandoffEditorBlockDto,
                {
                    type: BlockType.StandoffEditorBlock,
                    text: "Tabs",
                    blockProperties: [ { type: "block/font/size", value: "h3" }, { type: "block/margin/top/40px" }]
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
                                        { type: "block/alignment", value: "left" }
                                    ]
                                } as IStandoffEditorBlockDto,
                                {
                                    type: BlockType.StandoffEditorBlock,
                                    text: "Line 2",
                                    blockProperties: [
                                        { type: "block/alignment", value: "left" }
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
                                        { type: "block/alignment", value: "left" }
                                    ]
                                } as IStandoffEditorBlockDto,
                                {
                                    type: BlockType.StandoffEditorBlock,
                                    text: "Line 4",
                                    blockProperties: [
                                        { type: "block/alignment", value: "left" }
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
                                        { type: "block/alignment", value: "left" }
                                    ]
                                } as IStandoffEditorBlockDto,
                                {
                                    type: BlockType.StandoffEditorBlock,
                                    text: "Line 6",
                                    blockProperties: [
                                        { type: "block/alignment", value: "left" }
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
                    blockProperties: [ { type: "block/font/size", value: "h3" }, { type: "block/margin/top/40px" }]
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
        const workspace = new UniverseBlock();
        workspace.container = el;
        workspace.addBlockBuilders([
            CanvasBlock.getBlockBuilder(),
            ContextMenuBlock.getBlockBuilder(),
            CheckboxBlock.getBlockBuilder(),
            StandoffEditorBlock.getBlockBuilder(),
            CodeMirrorBlock.getBlockBuilder(),
            PlainTextBlock.getBlockBuilder(),
            IframeBlock.getBlockBuilder(),
            IndentedListBlock.getBlockBuilder(),
            ImageBlock.getBlockBuilder(),
            YouTubeVideoBlock.getBlockBuilder(),
            EmbedDocumentBlock.getBlockBuilder(),
            TabRowBlock.getBlockBuilder(),
            TabBlock.getBlockBuilder(),
            DocumentTabRowBlock.getBlockBuilder(),
            DocumentTabBlock.getBlockBuilder(),
            TableBlock.getBlockBuilder(),
            TableRowBlock.getBlockBuilder(),
            TableCellBlock.getBlockBuilder(),
            GridBlock.getBlockBuilder(),
            GridRowBlock.getBlockBuilder(),
            GridCellBlock.getBlockBuilder(),
            DocumentBlock.getBlockBuilder(),
            DocumentBlock.getLeftMarginBlockBuilder(),
            DocumentBlock.getRightMarginBlockBuilder(),
            WindowBlock.getBlockBuilder(),
            DocumentWindowBlock.getBlockBuilder(),
            CanvasBackgroundBlock.getBlockBuilder(),
            YouTubeVideoBackgroundBlock.getBlockBuilder(),
            VideoBackgroundBlock.getBlockBuilder(),
            ImageBackgroundBlock.getBlockBuilder(),
            WorkspaceBlock.getBlockBuilder(),
            PageBlock.getBlockBuilder(),
            ContainerBlock.getBlockBuilder(),
            StickyTabBlock.getBlockBuilder(),
            StickyTabRowBlock.getBlockBuilder(),
            SurfaceBlock.getBlockBuilder(),
            SideBlock.getBlockBuilder(),
        ]);
        workspace.createImageWorkspace();
        workspace.createDocumentWithWindow(doc2).then();
        props.getInstance(workspace);
        console.log("== GLOBAL ==", { manager: workspace, block: workspace.blocks[0] })
    }
    
    return (
        <>
            <div ref={initialise} />
        </>
    )
}
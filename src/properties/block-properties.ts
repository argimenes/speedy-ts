import { BlockProperty } from "../library/block-property";
import { setElement } from "../library/svg";
import { isStr } from "../library/types";

export const BlockPropertySchemas = {
    getDocumentBlockProperties() {
        return [
            BlockPropertySchemas.blockRotate,
            BlockPropertySchemas.blockIndent,
            BlockPropertySchemas.blockAlignment,
            BlockPropertySchemas.blockPosition,
            BlockPropertySchemas.blockSize,
            BlockPropertySchemas.blockFontSize,
            BlockPropertySchemas.blockFontSizeHalf,
            BlockPropertySchemas.blockFontSizeThreeQuarters
        ];
    },
    getStandoffBlockProperties() {
        return [
            BlockPropertySchemas.blockRotate,
            BlockPropertySchemas.blockIndent,
            BlockPropertySchemas.blockAlignment,
            BlockPropertySchemas.blockPosition,
            BlockPropertySchemas.blockSize,
            BlockPropertySchemas.blockFontSize,
            BlockPropertySchemas.blockFontSizeHalf,
            BlockPropertySchemas.blockFontSizeThreeQuarters
        ];
    },
    blockRotate: {
        type: "block/rotate",
        name: "Block Rotation",
        description: "Rotate block.",
        render: {
            destroy: async (p: BlockProperty) => {
                setElement(p.block.container, {
                    style: {
                        "transform": `rotate(0)`,
                        "transform-origin": "unset"
                    }
                });
            },
            update: async (p: BlockProperty) => {
                const value = p.value || "0";
                setElement(p.block.container, {
                    style: {
                        "transform": `rotate(${value}deg)`,
                        "transform-origin": "center"
                    }
                });
            }
        }
    },
    blockAlignment: {
        type: "block/alignment",
        name: "Block Alignment",
        description: "Align text to: left; right; center; justify.",
        render: {
            destroy: async (p: BlockProperty) => {
                setElement(p.block.container, {
                    style: {
                        "text-align": "unset"
                    }
                });
            },
            update: async (p: BlockProperty) => {
                const value = p.value || "left";
                setElement(p.block.container, {
                    style: {
                        "text-align": value
                    }
                });
            }
        }
    },
    blockFontSize: {
        type: "block/font/size",
        name: "Specified font size",
        library: {
            toSize: ( value: string ) => {
                if (value == "h1") return "3.5rem";
                if (value == "h2") return "3rem";
                if (value == "h3") return "2.5rem";
                if (value == "h4") return "2rem";
                if (value == "normal") return "1rem";
                if (value == "three-quarters") return "0.75rem";
                if (value == "half") return "0.5rem";
                return "1rem";
            }
        },
        render: {
            destroy: async (p: BlockProperty) => {
                setElement(p.block.container, {
                    style: {
                        "font-size": "unset",
                        "line-height": "unset"
                    }
                });
            },
            update: async (p: BlockProperty) => {
                const value = p.schema.library.toSize(p.value);
                setElement(p.block.container, {
                    style: {
                        "font-size": value,
                        "line-height": value
                    }
                });
            }
        }
    },
    blockIndent: {
        type: "block/indent",
        render: {
            destroy: async (p: BlockProperty) => {
                p.block.container.style.marginLeft = "unset";
            },
            update: async (p: BlockProperty) => {
                p.block.container.style.marginLeft = (parseInt(p.value) * 20) + "px";
            }
        }
    },
    blockFontSizeThreeQuarters: {
        type: "block/font/size/three-quarters",
        name: "3/4 the regular font size",
        decorate: {
            blockClass: "block_font-size_three-quarters"
        }
    },
    blockFontSizeHalf: {
        type: "block/font/size/half",
        name: "Half-sized font",
        decorate: {
            blockClass: "font_size_half"
        }
    },
    blockSize: {
        type: "block/size",
        name: "Block dimensions",
        event: {
            onInit: (p: BlockProperty) => {
                const container = p.block.container;
                const {width, height} = p.metadata;
                setElement(container, {
                    style: {
                        height: isStr(height) ? height : height + "px",
                        width: isStr(width) ? width : width + "px",
                        "overflow-y": "auto",
                        "overflow-x": "hidden"
                    }
                });
                const minWidth = p.metadata["min-width"];
                if (minWidth) {
                    setElement(container, {
                    style: {
                        "min-width": minWidth + "px"
                    }
                });
                }
            }
        }
    },
    blockPosition: {
        type: "block/position",
        name: "Block position",
        event: {
            onInit: (p: BlockProperty) => {
                const manager = p.block.manager;
                const container = p.block.container;
                const {x, y, position } = p.metadata;
                setElement(container, {
                    style: {
                        position: position || "absolute",
                        left: x + "px",
                        top: y + "px",
                        "z-index": manager.getHighestZIndex()
                    }
                });
            }
        }
    }
}
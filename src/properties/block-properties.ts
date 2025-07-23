import { BlockProperty } from "../library/block-property";
import { updateElement } from "../library/svg";
import { isStr } from "../library/types";

export const BlockPropertySchemas = {
    getDocumentBlockProperties() {
        return [
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
            BlockPropertySchemas.blockIndent,
            BlockPropertySchemas.blockAlignment,
            BlockPropertySchemas.blockPosition,
            BlockPropertySchemas.blockSize,
            BlockPropertySchemas.blockFontSize,
            BlockPropertySchemas.blockFontSizeHalf,
            BlockPropertySchemas.blockFontSizeThreeQuarters
        ];
    },
    blockAlignment: {
        type: "block/alignment",
        name: "Block Alignment",
        description: "Align text to: left; right; center; justify.",
        event: {
            onInit: async (p: BlockProperty) => {
                const value = p.value || "unset";
                updateElement(p.block.container, {
                    style: {
                        "text-align": value
                    }
                });
            }
        },
        render: {
            destroy: async (p: BlockProperty) => {
                updateElement(p.block.container, {
                    style: {
                        "text-align": "unset"
                    }
                });
            },
            update: async (p: BlockProperty) => {
                const value = p.value || "left";
                updateElement(p.block.container, {
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
        event: {
            onInit: async (p: BlockProperty) => {
                const value = p.schema.library.toSize(p.value);
                updateElement(p.block.container, {
                    style: {
                        "font-size": value
                    }
                });
            }
        },
        render: {
            destroy: async (p: BlockProperty) => {
                updateElement(p.block.container, {
                    style: {
                        "font-size": "unset"
                    }
                });
            },
            update: async (p: BlockProperty) => {
                const value = p.schema.library.toSize(p.value);
                updateElement(p.block.container, {
                    style: {
                        "font-size": value
                    }
                });
            }
        }
    },
    blockIndent: {
        type: "block/indent",
        event: {
            onInit: async (p: BlockProperty) => {
                p.block.container.style.marginLeft = (parseInt(p.value) * 20) + "px";
            }
        },
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
                updateElement(container, {
                    style: {
                        height: isStr(height) ? height : height + "px",
                        width: isStr(width) ? width : width + "px",
                        "overflow-y": "auto",
                        "overflow-x": "hidden"
                    }
                });
                const minWidth = p.metadata["min-width"];
                if (minWidth) {
                    updateElement(container, {
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
                updateElement(container, {
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
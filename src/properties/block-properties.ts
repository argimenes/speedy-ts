import { BlockProperty } from "../library/block-property";
import { updateElement } from "../library/svg";
import { isStr } from "../library/types";

export const BlockPropertySchemas = {
    getDocumentBlockProperties() {
        return [
            BlockPropertySchemas.blockPosition,
            BlockPropertySchemas.blockSize,
            BlockPropertySchemas.blockFontSize,
            BlockPropertySchemas.blockFontSizeHalf,
            BlockPropertySchemas.blockFontSizeThreeQuarters
        ];
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
    blockFontSize: {
        type: "block/font/size",
        name: "Specified size",
        event: {
            onInit: (p: BlockProperty) => {
                updateElement(p.block.container, {
                    style: {
                        "font-size": p.value
                    }
                });
            }
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
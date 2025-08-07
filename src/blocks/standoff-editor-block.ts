import _ from "underscore";
import { createRainbow, createUnderline, drawAnimatedSelection, drawClippedRectangle, drawSpikySelection, updateElement } from "../library/svg";
import { BlockProperty } from "../library/block-property";
import { StandoffProperty } from "../library/standoff-property";
import { AbstractBlock } from "./abstract-block";
import { Cell, Row } from "../library/cell";
import { KEYS } from "../library/keyboard";
import { BlockType, ICoordOffsets, IInput, InputEvent, IStandoffPropertySchema, ISelection, IStandoffEditorBlockConstructor, ModeTrigger, InputAction, Commit, Word, InputEventSource, Caret, CellHtmlElement, IBindingHandlerArgs, CellNode, ELEMENT_ROLE, BLOCK_POSITION, IRange, TPlatformKey, Platform, CARET, IStandoffEditorBlockDto, IBlockPropertySchema, RowPosition, IStandoffProperty, StandoffPropertyDto, IStandoffEditorBlockMonitor, IArrowNavigation, FindMatch, isStr, IBlockDto } from "../library/types";
import { PageBlock } from "./page-block";
import { TabBlock, TabRowBlock } from "./tabs-block";
import BlockVines from "../library/plugins/block-vines";
import { UniverseBlock } from "../universe-block";
import { ClockPlugin } from "../library/plugins/clock";
import { BlockPropertySchemas } from "../properties/block-properties";
import { DocumentBlock } from "./document-block";

function groupBy<T extends object> (list: T[], keyGetter: (item: T) => any){
    const map = new Map();
    list.forEach((item) => {
        const key = keyGetter(item);
        const collection = map.get(key);
        if (!collection) {
            map.set(key, [item]);
        } else {
            collection.push(item);
        }
    });
    return map;
};

export class StandoffEditorBlock extends AbstractBlock {
    //type: BlockType;
    cells: Cell[];
    rows: Row[];
    cache: {
        previousOffset: ICoordOffsets,
        offset: ICoordOffsets,
        caret: {
            x: number|null;
        },
        containerWidth: number;
        marker?: HTMLSpanElement;
        monitor?: HTMLDivElement;
    };
    text: string;
    standoffProperties: StandoffProperty[];
    schemas: IStandoffPropertySchema[];
    /**
     * Not unlike a StandoffProperty, a Selection denotes a highlighted range of text. Unlike a StandoffProperty,
     * it is not intended to be committed to the document, but represents a transient intention.
     * 
     * A Selection could be a background-color highlight that is applied as a CSS style to each cell in the
     * range, or it could be a collection of one or more SVG lines generated to match the shape of the text range.
     */
    selections: ISelection[];
    /**
     * An Overlay is a named DIV container for storing generated elements - such as SVG underlines - which are meant
     * to be overlaid (like a layer) on top of the text underneath. An Overlay 'container' should be absolutely
     * positioned to be aligned to the top-left of the Block 'container' element, and generated elements inside the Overlay
     * 'container' should be absolutely positioned. Such generated elements will be drawn/undrawn when the StandoffProperty
     * is rendered, and when anything affects the alignment of cells in those properties, such as adding or removing text.
     */
    lastCaret: {
        index: number,
        offset: CARET;
    };
    wrapper: HTMLDivElement;
    monitors: IStandoffEditorBlockMonitor[];
    constructor(args: IStandoffEditorBlockConstructor) {
        super(args);
        this.type = BlockType.StandoffEditorBlock;
        this.relation = {};
        this.wrapper = document.createElement("DIV") as HTMLDivElement;
        updateElement(this.wrapper, {
            attribute: {
                contenteditable: "true"
            },
            classList: ["standoff-editor-block"]
        });
        this.text = "";
        this.container.appendChild(this.wrapper);
        this.lastCaret = { index: 0, offset: CARET.LEFT };
        this.cache = {
            previousOffset: {
                x: 0, y: 0, h: 0, w: 0
            },
            offset: {
                x: 0, y: 0, h: 0, w: 0
            },
            caret: {
                x: 0
            },
            containerWidth: 0
        };
        this.cells = [];
        this.rows = [];
        this.schemas = [];
        this.monitors = [];
        this.standoffProperties = [];
        this.selections = [];
        this.inputEvents = [
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "Enter"
                },
                action: {
                    name: "Create a new text block. Move text to the right of the caret into the new block.",
                    description: `
                        
                    `,
                    handler: async (args: IBindingHandlerArgs) => {
                        const block = args.block;
                        const manager = block.manager;
                        const page = manager.registeredBlocks.find(x => x.type == BlockType.PageBlock) as PageBlock;
                        page && await page.handleEnterKey(args);
                    }
                }
            }
        ];
        this.setSchemas(this.getStandoffSchemas());
        this.setBlockSchemas(this.getBlockSchemas());
    }
    getStandoffSchemas() {
        const self = this;
        return [
            {
                type: "text/background-colour",
                event: {
                    onInit: async (p: StandoffProperty) => {
                        const cells = p.getCells();
                        cells.forEach(c => c.element.style.backgroundColor = p.value);
                    }
                },
                render: {
                    destroy: ({ properties }) => {
                        properties.forEach(p => {
                            const cells = p.getCells();
                            cells.forEach(c => c.element.style.backgroundColor = "unset");
                        });
                    },
                    update: ({ properties }) => {
                        properties.forEach(p => {
                            const cells = p.getCells();
                            cells.forEach(c => c.element.style.backgroundColor = p.value);
                        });
                    }
                }
            },
            {
                type: "text/colour",
                event: {
                    onInit: async (p: StandoffProperty) => {
                        const cells = p.getCells();
                        cells.forEach(c => c.element.style.color = p.value);
                    },
                    onUpdate: async (p: StandoffProperty) => {
                        const cells = p.getCells();
                        cells.forEach(c => c.element.style.color = p.value);
                    },
                    onDestroy: async (p: StandoffProperty) => {
                        const cells = p.getCells();
                        cells.forEach(c => c.element.style.color = "unset");
                    }
                },
                render: {
                    destroy: ({ properties }) => {
                        properties.forEach(p => {
                            const cells = p.getCells();
                            cells.forEach(c => c.element.style.color = "unset");
                        });
                    },
                    update: ({ properties }) => {
                        properties.forEach(p => {
                            const cells = p.getCells();
                            cells.forEach(c => c.element.style.color = p.value);
                        });
                    }
                }
            },
            {
                type: "cell/micro-document",
                name: "Cell-sized document",
                description: "",
                event: {
                    onInit: async (p:StandoffProperty) => {
                        const manager = new UniverseBlock();
                        const container = p.start.element as HTMLSpanElement;
                        updateElement(container, {
                            style: {
                                display: "inline-block",
                                zoom: 0.08
                            }
                        });
                        await manager.loadServerDocument(p.value);
                        container.innerHTML = "";
                        updateElement(manager.container, {
                            style: {
                                maxWidth: p.start.cache.offset.w,
                                maxHeight: p.start.cache.offset.h,
                                "overflow": "hidden"
                            }
                        });
                        container.appendChild(manager.container);
                    },
                    onDestroy: (p: StandoffProperty) => {
                        const span = p.start.element as HTMLSpanElement;
                        updateElement(span, {
                            display: "inline",
                            zoom: 1
                        });
                        span.innerHTML = p.start.text;
                    }
                }
            },
            {
                type: "animation/clock",
                name: "Clock",
                description: "",
                event: {
                    onInit: (p: StandoffProperty) => {
                        const clock = new ClockPlugin({ property: p });
                        p.plugin = clock;
                        self.plugins?.push(clock);
                        clock.start();
                    },
                    onDestroy: (p: StandoffProperty) => {
                        p.plugin?.destroy();
                        const i = self.plugins.findIndex(x => x == p.plugin);
                        self.plugins.splice(i, 1);
                    }
                }
            },
            {
                type: "style/blur",
                name: "Blur",
                wrap: {
                    cssClass: "style_blur"
                }
            },
            {
                type: "style/flip",
                name: "Flip",
                wrap: {
                    cssClass: "style_flipY"
                }
            },
            {
                type: "style/mirror",
                name: "Mirror",
                wrap: {
                    cssClass: "style_flipX"
                }
            },
            {
                type: "style/superscript",
                name: "Superscript",
                decorate: {
                    cssClass: "style_superscript"
                }
            },
            {
                type: "style/subscript",
                name: "Subscript",
                decorate: {
                    cssClass: "style_subscript"
                }
            },
            {
                type: "style/uppercase",
                name: "Uppercase",
                decorate: {
                    cssClass: "style_uppercase"
                }
            },
            {
                type: "style/italics",
                name: "Italics",
                decorate: {
                    cssClass: "style_italics"
                }
            },
            {
                type: "style/strikethrough",
                name: "Strikethrough",
                decorate: {
                    cssClass: "style_strikethrough"
                }
            },
            {
                type: "style/highlight",
                name: "Highlight",
                decorate: {
                    cssClass: "style_highlight"
                }
            },
            {
                type: "style/bold",
                name: "Bold",
                decorate: {
                    cssClass: "style_bold"
                }
            },
            {
                type: "style/underline",
                name: "Underline",
                decorate: {
                    cssClass: "style_underline"
                }
            },
            {
                type: "reference/url",
                name: "URL",
                decorate: {
                    cssClass: "reference_url"
                },
                event: {
                    onDoubleClick: async (args: any) => {
                        const url = args.property.metadata.url;
                        window.open(url, '_blank')?.focus();
                    }
                }
            },
            {
                type: "codex/search/highlight",
                name: "Find text highlight",
                decorate: {
                    cssClass: "codex-search-highlight"
                }
            },
            {
                type: "codex/block-reference",
                name: "Block reference",
                event: {
                    beforeStyling: async (args: any) => {
                        // TBC : will show some interface where a block can be retrieved
                    }
                },
                render: {
                    destroy: ({ properties }) => {
                        properties.forEach(p => p.cache.underline?.remove())
                    },
                    update: (args) => {
                        const owner = args.block.manager as UniverseBlock;
                        self.renderUnderlines("codex/block-reference", args.properties, args.block, "green", 3);
                    }
                }
            },
            {
                type: "codex/trait-reference",
                name: "Trait reference",
                event: {
                    onDoubleClick: async (args: any) => {
                        const prop = args.property;
                        alert(prop.value);
                    }
                },
                render: {
                    destroy: ({ properties }) => {
                        properties.forEach(p => p.cache.underline?.remove())
                    },
                    update: (args) => {
                        self.renderUnderlines("codex/trait-reference", args.properties, args.block, "blue", 3);
                    }
                }
            },
            {
                type: "codex/claim-reference",
                name: "Claim reference",
                event: {
                    onDoubleClick: async (args: any) => {
                        const prop = args.property;
                        alert(prop.value);
                    }
                },
                render: {
                    destroy: ({ properties }) => {
                        properties.forEach(p => p.cache.underline?.remove())
                    },
                    update: (args) => {
                        const owner = args.block.manager as UniverseBlock;
                        self.renderUnderlines("codex/claim-reference", args.properties, args.block, "red", 1);
                    }
                }
            },
            {
                type: "codex/meta-relation-reference",
                name: "Meta-Relation reference",
                event: {
                    onDoubleClick: async (args: any) => {
                        const prop = args.property;
                        alert(prop.value);
                    }
                },
                render: {
                    destroy: ({ properties }) => {
                        properties.forEach(p => p.cache.underline?.remove())
                    },
                    update: (args) => {
                        const owner = args.block.manager as UniverseBlock;
                        self.renderUnderlines("codex/meta-relation-reference", args.properties, args.block, "orange", 3);
                    }
                }
            },
            {
                type: "codex/time-reference",
                name: "Time reference",
                event: {
                    onDoubleClick: async (args: any) => {
                        const prop = args.property;
                        alert(prop.value);
                    }
                },
                render: {
                    destroy: ({ properties }) => {
                        properties.forEach(p => p.cache.underline?.remove())
                    },
                    update: (args) => {
                        const owner = args.block.manager as UniverseBlock;
                        self.renderUnderlines("codex/time-reference", args.properties, args.block, "cyan", 3);
                    }
                }
            },
            {
                type: "codex/entity-reference",
                name: "Entity reference",
                event: {
                    beforeStyling: async (args: any) => {
                        // TBC : will show a panel where the entity can be searched for
                    },
                    onDoubleClick: async (args: any) => {
                        const prop = args.property;
                        alert(prop.value);
                    }
                },
                render: {
                    destroy: ({ properties }) => {
                        properties.forEach(p => p.cache.underline?.remove())
                    },
                    update: (args) => {
                        const manager = args.block.manager as UniverseBlock;
                        self.renderUnderlines("codex/entity-reference", args.properties, args.block, "purple", 1);
                    }
                }
            },
            {
                type: "style/highlighter",
                name: "Highlighter",
                render: {
                    destroy: ({ properties }) => {
                        properties.forEach(p => p.cache.highlight?.remove())
                    },
                    update: (args) => {
                        self.renderHighlight(args.properties, args.block, "yellow");
                    }
                }
            },
            {
                type: "style/rainbow",
                name: "Rainbow",
                render: {
                    destroy: ({ properties }) => {
                        properties.forEach(p => p.cache.underline?.remove())
                    },
                    update: (args) => {
                        self.renderRainbow("style/rainbow", args.properties, args.block);
                    }
                }
            },
            {
                type: "style/rectangle",
                name: "Rectangle",
                render: {
                    destroy: ({ properties }) => {
                        properties.forEach(p => p.cache.svg?.remove())
                    },
                    update: (args) => {
                        self.renderRectangle(args.properties, args.block, "red");
                    }
                }
            },
            {
                type: "style/spiky",
                name: "Spiky",
                render: {
                    destroy: ({ properties }) => {
                        properties.forEach(p => p.cache.svg?.remove())
                    },
                    update: (args) => {
                        self.renderSpiky(args.properties, args.block, "red");
                    }
                }
            }
        ] as IStandoffPropertySchema[];
    }
    static getBlockBuilder() {
        return {
            type: BlockType.StandoffEditorBlock,
            builder: async (container: HTMLElement, dto: IBlockDto, manager: UniverseBlock) => {
                const block = new StandoffEditorBlock({ manager, ...dto });
                if (dto?.metadata) block.metadata = dto.metadata;
                if (dto?.blockProperties) block.addBlockProperties(dto.blockProperties);
                block.applyBlockPropertyStyling();
                block.bind(dto as IStandoffEditorBlockDto);
                await manager.buildChildren(block, dto);
                container.appendChild(block.container);
                return block;
            }
        };
    }
    renderHighlight(properties: StandoffProperty[], block: StandoffEditorBlock, colour: string) {
        const highlights = properties.map(p => {
            return drawClippedRectangle(p, {
                fill: colour || "yellow"
            });
        }) as SVGElement[];
        const frag = document.createDocumentFragment();
        frag.append(...highlights);
        block.wrapper.appendChild(frag);
    }
    renderRectangle(properties: StandoffProperty[], block: StandoffEditorBlock, colour: string) {
        const highlights = properties.map(p => {
            return drawAnimatedSelection(p, {
                stroke: colour || "red",
                strokeWidth: "3"
            });
        }) as SVGElement[];
        const frag = document.createDocumentFragment();
        frag.append(...highlights);
        block.wrapper.appendChild(frag);
    }
    renderSpiky(properties: StandoffProperty[], block: StandoffEditorBlock, colour: string) {
        const highlights = properties.map(p => {
            return drawSpikySelection(p, {
                stroke: colour || "red",
                strokeWidth: "3"
            });
        }) as SVGElement[];
        const frag = document.createDocumentFragment();
        frag.append(...highlights);
        block.wrapper.appendChild(frag);
    }
    getBlockSchemas() {
        const manager = this.manager;
        return [
            ...BlockPropertySchemas.getStandoffBlockProperties(),
            {
                type: "block/vines",
                name: "Block vines",
                event: {
                    onInit: (p: BlockProperty) => {
                        const vines = new BlockVines(p.block);
                        vines.update();
                    }
                }
            },
            {
                type: "block/position",
                name: "Block position",
                event: {
                    onInit: (p: BlockProperty) => {
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
            },
            {
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
            {
                type: "block/margin/top/20px",
                name: "Top margin - 20",
                decorate: {
                    blockClass: "block_margin_top_20px"
                }
            },
            {
                type: "block/margin/top/40px",
                name: "Top margin - 40",
                decorate: {
                    blockClass: "block_margin_top_40px"
                }
            },
            {
                type: "block/font/size/h1",
                name: "H1",
                decorate: {
                    blockClass: "block_font-size_h1"
                }
            },
            {
                type: "block/font/size/h2",
                name: "H2",
                decorate: {
                    blockClass: "block_font-size_h2"
                }
            },
            {
                type: "block/font/size/h3",
                name: "H3",
                decorate: {
                    blockClass: "block_font-size_h3"
                }
            },
            {
                type: "block/font/size/h4",
                name: "h4",
                decorate: {
                    blockClass: "block_font-size_h4"
                }
            },
            {
                type: "block/marginalia/left",
                name: "Left margin block",
                description: "Handles the alignment of a left margin block to the one to its right.",
                decorate: {
                    blockClass: "block_marginalia_left"
                }
            },
            {
                type: "block/marginalia/right",
                name: "Right margin block",
                description: "Handles the alignment of a right margin block to the one to its left.",
                decorate: {
                    blockClass: "block_marginalia_right"
                }
            },
            {
                type: "block/alignment/right",
                name: "Right Alignment",
                description: "Align text in the block to the right.",
                decorate: {
                    blockClass: "block_alignment_right"
                }
            },
            {
                type: "block/alignment/center",
                name: "Centre Alignment",
                description: "Align text in the block to the middle.",
                decorate: {
                    blockClass: "block_alignment_centre"
                }
            },
            {
                type: "block/alignment/left",
                name: "Left Alignment",
                description: "Align text in the block to the left",
                decorate: {
                    blockClass: "block_alignment_left"
                }
            },
            {
                type: "block/alignment/justify",
                name: "Justified Alignment",
                description: "Justifies the alignment of the text.",
                decorate: {
                    blockClass: "block_alignment_justify"
                }
            },
            {
                type: "block/animation/sine-wave",
                name: "Sine Wave",
                description: "Animates the paragraph as a text sine wave.",
                event: {
                    onInit: (p: BlockProperty) => {
                        const manager = p.block.manager as UniverseBlock;
                        manager.animateSineWave(p);
                    }
                }
            },
            {
                type: "block/blue-and-white",
                name: "Blue and White",
                decorate: {
                    blockClass: "block_blue_and_white"
                }
            },
            {
                type: "block/background/image",
                name: "Set background image",
                event: {
                    onInit: (p: BlockProperty) => {
                        const url = p.value || (p.value = prompt("Background image url: ") || "");
                        if (!url) return;
                        const panel = p.block.container;
                        updateElement(panel, {
                            style: {
                                "background-size": "cover",
                                "background": "url(" + url + ") no-repeat center center fixed"
                            }
                        });
                    }
                }
            },
            {
                type: "block/background/colour",
                name: "Set background colour",
                event: {
                    onInit: (p: BlockProperty) => {
                        updateElement(p.block.container, {
                            style: {
                                "background-color": p.value
                            }
                        });
                    }
                }
            },
            {
                type: "block/font/colour",
                name: "Set font colour",
                event: {
                    onInit: (p: BlockProperty) => {
                        updateElement(p.block.container, {
                            style: {
                                "color": p.value
                            }
                        });
                    }
                }
            }
        ]
    }
    addMode(mode: string) {
        this.modes.push(mode);
    }
    replace(match: FindMatch, replaceText: string) {
        const sLen = match.end - match.start + 1;
        const rLen = replaceText.length;
        this.removeCellsAtIndex(match.start, sLen);
        this.insertTextAtIndex(replaceText, match.start);
        // for (let i = 1; i <= rLen; i++) {
        //     let c = replaceText[i-1];
        //     if (i <= sLen) {
        //         let cell = this.cells[match.start + i - 1];
        //         cell.setText(c);
        //     } else {
        //         this.insertTextAtIndex(c, match.start + i - 1);
        //     }
        // }
        this.setCaret(match.start + replaceText.length - 1, CARET.LEFT);
    }
    getMapOfActiveInputEvents() {
        /**
         * Events should be grouped by modes. The modes at the top of the modes array are higher in priority.
         * If the same event trigger appears in the list more than once, the mode with the highest priority takes precedence
         * and the event is dispatched to THAT handler.
         */
        const map = new Map<ModeTrigger, InputAction>();
        for (let i = this.modes.length - 1; i >= 0; i--) {
            let mode = this.modes[i];
            const triggers = this.inputEvents.filter(x => x.mode == mode);
            triggers.forEach(x => {
                if (map.has(x as ModeTrigger)) return;
                map.set(x as ModeTrigger, x.action);
            });
        }
        const modeGroups = _.groupBy(this.inputEvents, x=> x.mode);
        
        return map;
    }
    removeMode(mode: string) {
        if (mode == "default") return;
        const index = this.modes.findIndex(x => x == mode);
        if (index < 0) return;
        this.modes.splice(index, 1);
    }
    setSchemas(schemas: IStandoffPropertySchema[]) {
        this.schemas.push(...schemas);
    }
    removeFocus() {
        this.container.blur();
    }
    selectFontColour(colour: string) {
        const selection = this.getSelection();
        const type = {
            type: "text/colour",
            value: colour,
            start: selection.start.index,
            end: selection.end.index
        } as StandoffPropertyDto;
        this.addStandoffPropertiesDto([type]);
        this.applyStandoffPropertyStyling();
    }
    selectBackgroundColour(colour: string) {
        const selection = this.getSelection();
        const type = {
            type: "text/background-colour",
            value: colour,
            start: selection.start.index,
            end: selection.end.index
        } as StandoffPropertyDto;
        this.addStandoffPropertiesDto([type]);
        this.applyStandoffPropertyStyling();
    }
    getWordsFromText(text: string) {
        const re = new RegExp(/\b[^\s]+\b/, "g");
        const words: Word[] = [];
        let match;
        while ((match = re.exec(text)) != null) {
            let span = match[0];
            words.push({ start: match.index, end: match.index + span.length - 1, text: span });
        }
        const lastIndex = words.length-1;
        for (let i = 0; i <= lastIndex; i++) {
            let word = words[i];
            if (lastIndex == 1) {
                continue;
            }
            if (i > 0) {
                word.previous = words[i-1];
            }
            if (i < lastIndex) {
                word.next = words[i + 1];
            }
            words.push(word);
        }
        return words;
    }
    getWordAtIndex(i: number) {
        const text = this.getText();
        const words = this.getWordsFromText(text);
        const word = words.find(x => x.start <= i && i <= x.end);
        return word;
    }
    getSentencesFromText(text: string) {
        const re = new RegExp(/[^.?!\r]+[.!?\r]+[\])'"`’”]*|.+/, "g");
        const results = [];
        let  match;
        while ((match = re.exec(text)) != null) {
            let span = match[0];
            results.push({ start: match.index, end: match.index + span.length - 1, text: span });
        }
        return results;
    }
    unsetMarker() {
        if (this.cache.marker) {
            this.cache.marker.remove();
            this.cache.marker = undefined;
        }
    }
    renderUnderlines(type: string, properties: StandoffProperty[], block: StandoffEditorBlock, colour: string, offsetY: number) {
        const cw = block.cache?.offset?.w || block.container.offsetWidth;
        const underlines = properties.map(p => {
            if (p.cache.offsetY == -1) {
                const overlaps = block.getEnclosingPropertiesBetweenIndexes(p.start.index, p.end.index);
                const existingLines = overlaps
                    .filter(x => x.id != p.id && typeof x.cache?.offsetY != "undefined");
                const highestY = (_.max(existingLines, x => x.cache.offsetY) as StandoffProperty).cache?.offsetY;
                if (existingLines.length == 0) {
                    p.cache.offsetY = 0;
                } else {
                    p.cache.offsetY = highestY >= 0 ? highestY + 2 : 0;
                }
            }
            return createUnderline(p, {
                stroke: colour,
                containerWidth: cw,
                offsetY: p.cache.offsetY
            });
        }) as SVGElement[];
        const frag = document.createDocumentFragment();
        frag.append(...underlines);
        block.wrapper.appendChild(frag);
    }
    renderRainbow(type: string, properties: StandoffProperty[], block: StandoffEditorBlock) {
        const cw = block.cache?.offset?.w || block.container.offsetWidth;
        const underlines = properties.map(p => {
            if (p.cache.offsetY == -1) {
                const overlaps = block.getEnclosingPropertiesBetweenIndexes(p.start.index, p.end.index);
                const existingLines = overlaps
                    .filter(x => x.id != p.id && typeof x.cache?.offsetY != "undefined");
                const highestY = (_.max(existingLines, x => x.cache.offsetY) as StandoffProperty).cache?.offsetY;
                if (existingLines.length == 0) {
                    p.cache.offsetY = 0;
                } else {
                    p.cache.offsetY = highestY >= 0 ? highestY + 2 : 0;
                }
            }
            return createRainbow(p, {
                containerWidth: cw,
                offsetY: p.cache.offsetY
            });
        }) as SVGElement[];
        const frag = document.createDocumentFragment();
        frag.append(...underlines);
        block.wrapper.appendChild(frag);
    }
    setMarker(anchor: Cell, container?: HTMLElement) {
        const cache = anchor.cache;
        if (this.cache.marker) {
            this.cache.marker.remove();
            this.cache.marker = undefined;
        }
        let top = cache.offset.y + cache.offset.h + 18;
        let left = cache.offset.x + cache.offset.w + 13;
        const marker = this.cache.marker = document.createElement("SPAN") as HTMLSpanElement;
        updateElement(marker, {
            style: {
                position: "absolute",
                top: top + "px",
                left: left + "px",
                color: "red",
                margin: 0,
                padding: 0,
                "font-weight": 600
            },
            innerHTML: "&Hat;",
            parent: container || this.container
        });
    }
    getLastCell() {
        const len = this.cells.length;
        return this.cells[len-1];
    }              
    createEmptyBlock() {
        const linebreak = this.createLineBreakCell();
        this.wrapper.innerHTML = "";
        this.cells = [linebreak];
        const frag = document.createDocumentFragment();
        this.cells.forEach(c => frag.append(c.element as HTMLElement));
        this.wrapper.appendChild(frag);
    }
    getAllTextMatches(search: string) {
        const len = search.length;
        const text = this.getText();
        const matches: FindMatch[] = [];
        let match;
        const regex = new RegExp(search, 'gi');
        while ((match = regex.exec(text)) !== null) {
            matches.push({ block: this, match: match[0], start: match.index, end: match.index + len - 1 });
        }
        return matches;
    }
    createLineBreakCell() {
        const code = this.getKeyCode("ENTER");
        const EOL = String.fromCharCode(code);
        const cell = new Cell({ text: EOL, block: this });
        cell.element?.classList.add("line-break");
        return cell;
    }
    addToInputBuffer(key: IInput) {
        if (this.inputBuffer.length <= 1) {
            this.inputBuffer.push(key);
            return;
        }
        this.inputBuffer.splice(0, 1);
        this.addToInputBuffer(key);
    }
    getCellFromNode(node: CellNode) {
        let current = node;
        while (current) {
            if (current.speedy?.role == ELEMENT_ROLE.CELL) {
                return this.cells.find(x => x.element == current);
            }
            current = current.parentElement as CellHtmlElement;
        }
        return undefined;
    }
    getBlockPosition(left: Cell, right: Cell) {
        if (right?.isEOL) {
            if (left == null) return BLOCK_POSITION.EmptyLine;
            return BLOCK_POSITION.End;
        }
        if (left == null) return BLOCK_POSITION.Start;
        return BLOCK_POSITION.Inside;
    }
    getCaret() {
        const len = this.cells.length;
        if (len == 1) {
            return { right: this.cells[0], blockPosition: BLOCK_POSITION.EmptyLine };
        }
        const sel = window.getSelection() as Selection;
        const { anchorNode } = sel;
        const anchor = this.getCellFromNode(anchorNode as CellNode);
        if (!anchor) return null;
        const offset = sel.anchorOffset;
        const toTheLeft = offset == 0;
        const left = (toTheLeft ? anchor.previous : anchor) as Cell;
        const right = (toTheLeft ? anchor : anchor.next) as Cell;
        const blockPosition = this.getBlockPosition(left, right);
        return { left, right, blockPosition } as Caret;
    }
    getEnclosingProperties(cell: Cell) {
        /**
         * Rename to: getEnclosingProperties
         */
        if (!cell) return [];
        return this.getEnclosingPropertiesByIndex(cell.index);
    }
    getEnclosingPropertiesByIndex(i: number) {
        const props = this.standoffProperties.filter(prop => {
            if (prop.isDeleted) return false;
            const si = prop.start.index;
            const ei = prop.end.index;
            return si <= i && i <= ei;
        });
        return props;
    }
    getEnclosingPropertiesBetweenIndexes(start: number, end: number) {
        const props = this.standoffProperties.filter(prop => {
            if (prop.isDeleted) return false;
            const si = prop.start.index;
            const ei = prop.end.index;
            return start <= ei && end >= si;
        });
        return props;
    }
    // clearSelectionMode(selection: ISelection) {
    //     selection.start = null;
    //     selection.end = null;
    //     selection.direction = null;
    // }
    clearSelection() {
        // ref: https://stackoverflow.com/questions/3169786/clear-text-selection-with-javascript
        const seletion = window.getSelection();
        if (seletion) {
            if (seletion.empty) {  // Chrome
                seletion.empty();
            } else if (seletion.removeAllRanges) {  // Firefox
                seletion.removeAllRanges();
            }
        }
        // else if (document.selection) {  // IE?
        //     document.selection.empty();
        // }
        //this.clearSelectionMode();
    }
    isEmpty() {
        const len = this.cells.length;
        if (len != 1) return false;
        return this.cells[0].isEOL;
    }
    getSelection() {
        const range = window.getSelection()?.getRangeAt(0);
        if (range?.collapsed) return undefined;
        const start = this.getCellFromNode(range?.startContainer as CellNode);
        const end = this.getCellFromNode(range?.endContainer as CellNode);
        return { start, end } as IRange;
    }
    insertCharacterAtCaret(input: IInput) {
        const caret = this.getCaret();
        if (!caret) return;
        const selection = this.getSelection();
        if (selection) {
            this.triggerBeforeChange();
            this.clearSelection();
            const len = (selection.end.index - selection.start.index) + 1;
            this.removeCellsAtIndex(selection.start.index, len);
        }
        this.insertTextAtIndex(input.key, caret.right.index);
    }
    addStandoffProperties(props: StandoffProperty[]) {
        
    }
    applyStylingAndRenderingToNewCells(anchor: Cell, cells: Cell[]) {
        const enclosing = this.getEnclosingProperties(anchor);
        cells.forEach(c => {
            enclosing.forEach(e => {
                if (!e?.schema?.decorate?.cssClass) return;
                c.element?.classList.add(e.schema.decorate.cssClass);
            });
        });
        this.renderProperties(enclosing);
    }
    renderProperties(props: StandoffProperty[]) {
        const propertiesGroupedByType = _.groupBy(props, x=> x.type);
        for (let typeName in propertiesGroupedByType) {
            const props = propertiesGroupedByType[typeName];
            let schema = this.schemas.find(x => x.type == typeName);
            if (schema?.render?.update) {
                schema.render?.update({ block: this, properties: props });
            }
        }
    }
    private getPlatformKey(codes: TPlatformKey[]) {
        return codes.find(x=> x.platform == Platform.Windows);
    }
    addEOL() {
        const charCode = this.getPlatformKey(KEYS.ENTER)!.code;
        if (this.cells.length > 0) {
            return;
        }
        const eol = new Cell({ text: String.fromCharCode(charCode), block: this });
        this.cells = [eol];
        eol.isEOL = true;
        this.reindexCells();
        this.wrapper.append(eol.element as HTMLSpanElement);
        this.updateView();
        this.setCaret(0, CARET.LEFT);
    }
    triggerBeforeChange() {
        const doc = this.manager.getParentOfType(this, BlockType.PageBlock) as AbstractBlock;
        if (!doc) return;
        doc.publish("beforeChange");
    }
    insertTextAtIndex(text: string, index: number): Cell[] {
        this.triggerBeforeChange();
        const len = this.cells.length;
        if (len == 0) {
            this.addEOL();
            return this.insertTextAtIndex(text, index);
        }
        const right = this.cells[index];
        const left = right.previous;
        const anchor = left || right;
        const cells = [...text].map(c => new Cell({ text: c, block: this }));
        this.applyStylingAndRenderingToNewCells(anchor, cells);
        this.knitCells(left, cells, right);
        this.insertIntoCellArrayBefore(index, cells);
        this.reindexCells();
        this.insertElementsBefore(right.element as HTMLElement, cells.map(c => c.element as HTMLElement));
        this.updateView();
        this.setCaret(index + 1);
        this.updateText();
        this.publishOnTextChanged();
        this.commit({
            redo: {
                id: this.id,
                name: "insertTextAtIndex",
                value: { text, index }
            },
            undo: {
                id: this.id,
                name: "removeCellsAtIndex",
                value: { index, length: text.length }
            }
        });
        return cells;
    }
    publishOnTextChanged() {
        const event = this.inputEvents.find(x => x.trigger.match == "onTextChanged");
        if (!event) return;
        const caret = this.getCaret() as Caret;
        event.action.handler({ block: this, caret });
    }
    private insertElementsBefore(anchor: HTMLElement, elements: HTMLElement[]) {
        const frag = document.createDocumentFragment();
        frag.append(...elements);
        requestAnimationFrame(() => anchor.parentNode.insertBefore(frag, anchor));
    }
     reindexCells() {
        this.cells.forEach((cell, index) => cell.index = index);
    }
    private insertIntoCellArrayBefore(index: number, cells: Cell[]) {
        this.cells.splice(index, 0, ...cells);
        this.reindexCells();
    }
    private knitCells(left: Cell|undefined, middle: Cell[], right: Cell) {
        const len = middle.length;
        if (len == 0) return;
        for (let i = 0; i < len; i++) {
            let current = middle[i];
            let previous = (i > 0) ? middle[i-1] : left;
            let next = (i < len - 1) ? middle[i+1] : right;
            if (previous) {
                previous.next = current;
                current.previous = previous;
            }
            current.next = next;
            next.previous = current;
        }
    }
    unbind() {
        this.cells = [];
        this.standoffProperties = [];
        this.blockProperties = [];
        this.wrapper.innerHTML = "";
    }
    serialize() {
        const relation: Record<string,any> = {

        };
        if (this.relation.leftMargin) {
            relation.leftMargin = this.relation.leftMargin.serialize();
        }
        if (this.relation.rightMargin) {
            relation.rightMargin = this.relation.rightMargin.serialize();
        }
        return {
            id: this.id,
            type: this.type,
            text: this.text,
            standoffProperties: this.standoffProperties?.filter(x => !x.clientOnly).map(x => x.serialize()) || [],
            blockProperties: this.blockProperties?.map(x => x.serialize()) || [],
            children: this.blocks?.map(x => x.serialize()) || [],
            metadata: this.metadata,
            relation: relation
        } as IStandoffEditorBlockDto;
    }
    updateText() {
        this.text = this.getText();
    }
    getText() {
        return this.cells.map(c => c.text).join("");
    }
    applyStandoffPropertyStyling() {
        this.standoffProperties.forEach(p => {
            p.applyStyling();
        });
    }
    deserialize(json: any) {
        this.bind(json as IStandoffEditorBlockDto);
        return this;
    }
    addMonitor(monitor: IStandoffEditorBlockMonitor) {
        this.monitors.push(monitor);
    }
    updateMonitors() {
        if (!this.monitors?.length) return;
        const caret = this.getCaret() as Caret;
        const cell = caret.left || caret.right;
        const properties = this.getEnclosingProperties(cell);
        const block = this;
        this.monitors.forEach(m => m.update({ caret, block, properties }));
    }
    addStandoffPropertiesDto(props: StandoffPropertyDto[], cells?: Cell[]) {
        this.triggerBeforeChange();
        cells = cells || this.cells;
        const self = this;
        const properties = props.map(p => {
            const start = cells[p.start];
            const end = cells[p.end];
            const schema = this.schemas.find(x => x.type == p.type) as IStandoffPropertySchema;
            if (!schema) {
                console.log("Schema not found for the standoff property type.", { p });
                // Need to handle this properly ... can't just return early in a map().
            }
            const sproc = new StandoffProperty({ type: p.type, block: self, start, end, schema, value: p.value, metadata: p.metadata, clientOnly: p.clientOnly });
            return sproc;
        });
        this.standoffProperties.push(...properties);
    }
    bind(block: IStandoffEditorBlockDto) {
        const self = this;
        if (this.wrapper) this.wrapper.innerHTML = "";
        const cells = this.cells = this.toCells(block.text);
        this.reindexCells();
        const len = cells.length;
        if (len == 0 || cells[len-1].text != String.fromCharCode(KEYS.ENTER[0].code)) {
            const eol = new Cell({ text: String.fromCharCode(KEYS.ENTER[0].code), block: this });
            eol.isEOL = true;
            cells.push(eol);
        }
        if (block.standoffProperties) {
            this.standoffProperties = block.standoffProperties.map(p => {
                const start = cells[p.start];
                const end = cells[p.end];
                const schema = this.schemas.find(x => x.type == p.type) as IStandoffPropertySchema;
                if (!schema) {
                    console.log("Schema not found for the standoff property type.", { p });
                    // Need to handle this properly ... can't just return early in a map().
                }
                const sproc = new StandoffProperty({ type: p.type, block: self, start, end, schema, value: p.value });
                return sproc;
            });
        }
        this.blockProperties = block.blockProperties?.map(p => {
            const schema = this.blockSchemas.find(x => x.type == p.type) as IBlockPropertySchema;
            if (!schema) {
                console.log("Schema not found for the standoff property type.", { p });
                // Need to handle this properly ... can't just return early in a map().
            }
            const prop = new BlockProperty({ type: p.type, block: self, schema, value: p.value });
            return prop;
        }) as BlockProperty[];
        this.applyBlockPropertyStyling();
        const frag = document.createDocumentFragment();
        cells.forEach(c => frag.append(c.element as HTMLElement));
        this.applyStandoffPropertyStyling();
        /**
         * May want to check for a line-break character here?
         */
        this.wrapper.innerHTML = "";
        this.wrapper.appendChild(frag);
        this.updateView();
        this.updateText();
        this.commit({
            redo: {
                id: this.id,
                name: "bind",
                value: { block }
            },
            undo: {
                id: this.id,
                name: "unbind"
            }
        });
    }
    getCellAtIndex(index: number, cells: Cell[]) {
        const max = cells.length - 1;
        if (index > max) return undefined;
        if (index < 0) return undefined;
        return cells[index];
    }
    chainCellsTogether(cells: Cell[]) {
        const max = cells.length - 1;
        const many = max > 1;
        for (let i = 0; i <= max; i ++) {
            let cell = cells[i];
            let hasPrevious = many && i > 0;
            let hasNext = many && i < max;
            if (hasPrevious) {
                cells[i - 1].next = cell;
                cell.previous = cells[i - 1];
            }
            if (hasNext) {
                cell.next = cells[i + 1];
                cells[i + 1].previous = cell;
            }
        }
    }
    private toCells(text: string) {
        if (!text) return [] as Cell[];
        const chars = [...text];
        const len = chars.length;
        const cells: Cell[] = [];
        for (let i = 0; i < len; i ++) {
            let cell = new Cell({ text: chars[i], block: this });
            cells.push(cell);
        }
        const lastChar = chars[len-1];
        const lastCode = lastChar.charCodeAt(0);
        if (lastCode != 13) {
            const eol = new Cell({ text: String.fromCharCode(13), block: this });
            eol.isEOL = true;
            cells.push(eol);
        }
        this.chainCellsTogether(cells);
        return cells;
    }
    handleArrowUp(args: IArrowNavigation): void {
        const self = this;
        const caret = this.getCaret() as Caret;
        const match = this.getCellAbove(caret.right);
        if (match) {
            this.setCaret(match.cell.index, CARET.LEFT);
            return;
        }
        const manager = args.manager;
        const root = manager.getParentOfType(this, BlockType.PageBlock) as PageBlock;
        const index = root.index;
        const ci = index.findIndex(x => x.block.id == self.id);
        if (ci <= 0) return;
        this.clearSelection();
        const previousIndex = index[ci-1];
        const previous = previousIndex.block as StandoffEditorBlock;
        if (previous.relation.parent.type == BlockType.TabBlock) {
            let tab = previous.relation.parent as TabBlock;
            let row = tab.relation.parent as TabRowBlock;
            row.setTabActive(tab);
        }
        args.manager.setBlockFocus(previous);
        previous.moveCaretStart();
        const previousRect = previous.container.getBoundingClientRect();
        const h = window.innerHeight;
        //console.log("handleArrowUp", { previousRectBottom: previousRect.bottom, h });
        const diff = previousRect.bottom - args.manager.container.scrollTop;
        if (diff < 50) {
            window.scrollBy(0, -1 * (previousRect.bottom + 25));
        }
    }
    handleArrowDown(args: IArrowNavigation) {
        const self = this;
        const caret = this.getCaret() as Caret;
        const match = this.getCellBelow(caret.right);
        if (match) {
            this.setCaret(match.cell.index, CARET.LEFT);
            return;
        }
        const manager = args.manager;
        const root = manager.getParentOfType(this, BlockType.PageBlock) as PageBlock;
        const index = root.index;
        const ci = index.findIndex(x => x.block.id == self.id);
        if (ci == -1) {
            console.log("handleArrowDown", { msg: "Next item not found.", root, block: self })
            return;
        }
        if (ci == index.length - 1) {
            return;
        }
        this.clearSelection();
        const nextIndex = index[ci+1];
        const next = nextIndex.block as StandoffEditorBlock;
        if (next.relation.parent.type == BlockType.TabBlock) {
            let tab = next.relation.parent as TabBlock;
            let row = tab.relation.parent as TabRowBlock;
            row.setTabActive(tab);
        }
        args.manager.setBlockFocus(next);
        next.moveCaretStart();
        const nextRect = next.container.getBoundingClientRect();
        const h = window.innerHeight;
        //console.log("handleArrowDown", { nextRectTop: nextRect.top, h });
        const diff = h - nextRect.y;
        if (diff < 50) {
            window.scrollBy(0, nextRect.top - h + 50);
        }
    }
    handleArrowRight(args: IArrowNavigation) {
        const caret = this.getCaret() as Caret;
        this.cache.caret.x = null;
        const sel = this.getSelection() as IRange;
        const len = this.cells.length;
        if (sel) this.clearSelection();
        const ri = sel ? sel.end.index : caret.right.index;
        if (ri < len - 1) {
            this.setCaret(ri + 1);
            return;
        }
        this.handleArrowDown(args);
    }
    handleArrowLeft(args: IArrowNavigation) {
        const caret = this.getCaret() as Caret;
        this.cache.caret.x = null;
        const sel = this.getSelection() as IRange;
        if (sel) this.clearSelection();
        if (caret.left) {
            this.setCaret(caret.left.index);
            return;
        }
        this.handleArrowUp(args);
    }
    getCellAbove(cell: Cell) {
        const x = cell.cache.offset.x;
        const cri = cell.row?.index as number;
        if (cri > 0) {
            const row = this.rows[cri - 1]; 
            return row.findNearestCell(x);
        }
        return null;
    }
    getCellBelow(cell: Cell) {
        const x = cell.cache.offset.x;
        const rLen = this.rows.length;
        const cri = cell.row?.index as number;
        if (cri < rLen - 1) {
            const row = this.rows[cri + 1]; 
            return row.findNearestCell(x);
        }
        return null;
    }
    moveCaretStart() {
        this.setCaret(0, CARET.LEFT);
    }
    moveCaretEnd() {
        const len = this.cells.length;
        this.setCaret(len - 1, CARET.LEFT);
    }
    setCaret(index: number, offset?: CARET) {
        /**
         * Might want to investigate setting the caret by absolutely positioning an SVG ...
         */
        //console.log("setCaret", { index, offset });
        offset = offset || CARET.LEFT;
        this.lastCaret = { index, offset: offset };
        const cell = this.cells[index];
        const textNode = cell.getTextNode();
        const selection = document.getSelection() as Selection;
        const range = document.createRange();
        range.setStart(textNode, 1);
        range.collapse(true);
        if (selection.setBaseAndExtent) {
            var startOffset = offset;    // range.startOffset;
            var endOffset = offset;      // range.endOffset;
            selection.setBaseAndExtent(range.startContainer, startOffset, range.endContainer, endOffset);
        } else {
            selection.removeAllRanges();
            selection.addRange(range);
        }
        this.commit({
            redo: {
                id: this.id,
                name: "setCaret",
                value: { index, offset }
            }
        });
    }
    private shiftPropertyBoundaries(cell: Cell) {
        this.shiftPropertyStartNodesRight(cell);
        this.shiftPropertyEndNodesLeft(cell);
    }
    private shiftPropertyEndNodesLeft(cell: Cell) {
        const previousCell = cell.previous;
        const properties = this.standoffProperties;
        const singles = properties.filter(p => p.start == p.end && p.start == cell);
        if (singles) {
            singles.forEach(p => p.isDeleted = true);
        }
        const endProperties = properties.filter(p => p.end == cell && p.start != cell);
        if (endProperties.length) {
            if (!previousCell) {
                endProperties.forEach(p => p.isDeleted = true);
            } else {
                endProperties.forEach(p => p.end = previousCell);
            }
        }
        const props = singles.concat(endProperties);
        this.renderProperties(props);
    }
    private shiftPropertyStartNodesRight(cell: Cell) {
        const nextCell = cell.next;
        const properties = this.standoffProperties.filter(p => !p.isDeleted);
        const singles = properties.filter(p => p.start == p.end && p.start == cell);
        if (singles.length) {
            singles.forEach(p => p.isDeleted = true);
        }
        const startProperties = properties.filter(p => p.start == cell && p.end != cell);
        if (startProperties.length) {
            if (!nextCell) {
                startProperties.forEach(p => p.isDeleted = true);
            } else {
                startProperties.forEach(p => p.start = nextCell);
            }
        }
        const props = singles.concat(startProperties);
        this.renderProperties(props);
    }
    private unknit(cell: Cell) {
        const left = cell.previous;
        const right = cell.next as Cell;
        if (left) left.next = right;
        right.previous = left;
    }
    updateView() {
        const block = this;
        requestAnimationFrame(() => {
            block.calculateCellOffsets();
            block.cache.caret.x = null;
            block.updateRenderers();
            block.calculateRows();
        });
    }
    updateRenderers() {
        const block = this;
        const toUpdate = this.standoffProperties
            .filter(p => !p.isDeleted && p.schema?.render?.update && p.hasOffsetChanged())
            ;
        this.batch(toUpdate, (schema, props) => schema.render?.update({ block, properties: props }));
        const toDelete = this.standoffProperties
            .filter(p => p.isDeleted && p.schema?.render?.destroy)
            ;
        this.batch(toDelete, (schema, props) => schema.render?.destroy({ block, properties: props }));
        //console.log("updateRenderers", { block, toUpdate, toDelete })
    }
    batch(properties: StandoffProperty[], action: (schema: IStandoffPropertySchema, props: StandoffProperty[]) => void) {
        const block = this;
        const groups = _.groupBy(properties, p => p.type);
        for (let key in groups) {
            const typeName = key;
            const props = groups[typeName];
            const schema = block.schemas.find(x => x.type == typeName);
            if (!schema) continue;
            action(schema, props);
        }
    }
    calculateCellOffsets() {
        const block = this;
        const container = this.container;
        const offset = this.cache.offset;
        this.cache.previousOffset = { ...offset };
        this.cache.offset = {
            y: container.offsetTop,
            x: container.offsetLeft,
            w: container.offsetWidth,
            h: container.offsetHeight
        };
        this.cells.forEach(cell => {
            const offset = cell.cache.offset;
            const cy = block.cache.offset.y;
            if (offset) {
                cell.cache.previousOffset = {
                    ...offset
                };
            }
            const span = cell.element as HTMLElement;
            if (!span) return;
            const top = span.offsetTop || 0;
            cell.cache.offset = {
                y: top,
                cy: cy + top,
                x: span.offsetLeft,
                w: span.offsetWidth,
                h: span.offsetHeight
            };
        });
    }
    destroy() {
        this.cells = [];
        this.standoffProperties = [];
        this.blockProperties = [];
        this.inputBuffer = [];
        this.schemas =[];
        this.blockSchemas = [];
        this.overlays = [];
        super.destroy();
    }
    removeStandoffPropertiesByType(type: string) {
        this.triggerBeforeChange();
        const props = this.standoffProperties.filter(x => x.type == type);
        props.forEach(p => p.destroy());
    }
    removeCellsAtIndex(index: number, length: number, updateCaret?: boolean) {
        this.triggerBeforeChange();
        for (let i = 1; i <= length; i++) {
            this.removeCellAtIndex(index, false);
        }
        this.updateView();
        this.updateText();
    }
    calculateRows() {
        const rows = this.getRows();
        const len = rows.length;
        this.rows = [];
        for (let i = 0; i < len; i++) {
            let group = rows[i];
            const cells = group[1] as Cell[];
            let row = new Row({ index: i, cells: cells });
            cells.forEach(c => c.row = row);
            this.rows.push(row);
        }
        for (let i = 0 ; i < len; i++) {
            let row = this.rows[i];
            if (i > 0) {
                row.previous = this.rows[i - 1];
            }
            if (0 < i && i < len - 1) {
                row.next = this.rows[i + 1];
            }
        }
    }
    getRows() {
        const cells = this.cells;
        const rowGroups = Array.from(groupBy(cells, x => x.cache.offset.y));
        const rows = rowGroups.sort((a, b) => a[0] > b[0] ? 1 : a[0] < b[0] ? -1 : 0);
        return rows;
    }
    getClosestRowOfCellsByOffset(args: any) {
        const { x, y, verticalOffset } = args;
        const nextRowOffsetY = y + verticalOffset;
        if (nextRowOffsetY < 0) {
            return [];
        }
        const nextCells = this.cells
            .filter(x => verticalOffset > 0 ? x.cache.offset.cy >= nextRowOffsetY : x.cache.offset.cy <= nextRowOffsetY);
        if (nextCells.length == 0) {
            return [];
        }
        const rows = Array.from(groupBy(nextCells, x => x.cache.offset.cy));
        const ordered = rows.sort((a, b) => a[0] > b[0] ? 1 : a[0] < b[0] ? -1 : 0);
        const group = verticalOffset > 0 ? ordered[0] : ordered[ordered.length - 1];
        return group[1] as Cell[];
    }
    getCellClosestByOffsetX(args: any) {
        const { x, cells } = args;
        const leftMatches = cells.filter((c:Cell) => c.cache.offset.x < x);
        const rightMatches = cells.filter((c:Cell) => c.cache.offset.x >= x);
        if (leftMatches.length) {
            return leftMatches[leftMatches.length - 1];
        }
        if (rightMatches.length) {
            return rightMatches[0];
        }
        return null;
    }
    getCellInRow(anchor: Cell, row: RowPosition) {
        const offset = anchor.cache.offset;
        const lineHeight = offset.h || 14;
        const x = this.cache.caret.x || offset.x;
        const y = offset.cy;
        const verticalOffset = row == RowPosition.Previous ? -Math.abs(lineHeight) : lineHeight;
        const cells = this.getClosestRowOfCellsByOffset({ x, y, verticalOffset });
        if (cells.length == 0 ){
            return null;
        }
        const leftMatches = cells.filter(c => c.cache.offset.x < x) as Cell[];
        const lenL = leftMatches.length;
        if (lenL) {
            if (lenL == 2) {
                return { cell: leftMatches[lenL - 2], caret: CARET.RIGHT };
            } else {
                return { cell: leftMatches[lenL - 1], caret: CARET.LEFT };
            }
        }
        const rightMatches = cells.filter(c => c.cache.offset.x >= x) as Cell[];
        const lenR = rightMatches.length;
        if (lenR) {
            return { cell:rightMatches[0], caret: CARET.LEFT};
        }
        return null;
    }
    setCarotByOffsetX(args: any) {
        const { x, verticalPosition } = args;
        const rows = this.getRows();
        const len = rows.length;
        const rowCells = (verticalPosition == "TOP") ? rows[0] : rows[len - 1];
        const closestCell = this.getCellClosestByOffsetX({ x, cells: rowCells[1] }) as Cell;
        if (closestCell) {
            this.setCaret(closestCell.index, CARET.LEFT);
        }
    }
    removeEOL() {
        const len = this.cells.length;
        if (len == 1) return;
        const eol = this.cells[len - 1];
        const previous = eol.previous;
        
    }
    removeCellAtIndex(index: number, updateCaret?: boolean) {
        this.triggerBeforeChange();
        const cell = this.cells[index];
        if (!cell) {
            console.log("Cell not found at the index.", { index, updateCaret });
            return;
        }
        const text = cell.text;
        updateCaret = !!updateCaret;
        if (cell.isEOL) {
            /**
             * Shouldn't be here.
             */
            return;
        }
        this.unknit(cell);
        this.shiftPropertyBoundaries(cell);
        cell.removeElement();
        this.cells.splice(index, 1);
        this.reindexCells();
        if (updateCaret) {
            this.updateView();
            this.setCaret(index);
            this.updateText();
        }
        this.publishOnTextChanged();
        this.commit({
            redo: {
                id: this.id,
                name: "removeCellAtIndex",
                value: { index, updateCaret }
            },
            undo: {
                id: this.id,
                name: "insertTextAtIndex",
                value: { text, index }
            }
        });
    }
    getCells(range: IRange) {
        const cells: Cell[] = [];
        let cell = range.start;
        while (cell) {
            cells.push(cell);
            if (cell.next && !cell.isEOL) {
                cell = cell.next;
            }
            break;
        }
        return cells;
    }
    styleProperty(p: StandoffProperty) {
        p.applyStyling();
    }
    getTextNode(cell: Cell): ChildNode {
        // Get the first TEXT NODE of the element
        var node = cell.element?.firstChild as ChildNode;
        if (!node) {
            return cell.element as ChildNode;
        }
        while (node?.nodeType != 3) {
            node = node?.firstChild as ChildNode;
        }
        return node;
    }
    setSelection(_range: IRange) {
        var selection = document.getSelection() as Selection;
        var range = document.createRange();
        range.setStart(this.getTextNode(_range.start), 1);
        range.setEnd(this.getTextNode(_range.end), 1)
        if (selection.setBaseAndExtent) {
            var startOffset = 0;    // range.startOffset;
            var endOffset = 1;      // range.endOfAfset;
            selection.setBaseAndExtent(range.startContainer, startOffset, range.endContainer, endOffset);
        } else {
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }
    toggleStandoffPropertyMode(type: string) {

    }
    createStandoffProperty(type: string, range: IRange) {
        this.triggerBeforeChange();
        const schema = this.schemas.find(x => x.type == type) as IStandoffPropertySchema;
        if (!schema) {
            return log(`StandoffProperty schema '${type}' was not found.`, { block: this, type, range });
        }
        const prop = new StandoffProperty({ type, block: this, ...range, schema });
        prop.schema = schema;
        prop.applyStyling();
        this.standoffProperties.push(prop);
        if (schema.render?.update) {
            schema.render?.update({ block: this, properties: [prop] });
        }
        return prop;
    }
    createBlockProperty(type: string) {
        this.triggerBeforeChange();
        const schema = this.blockSchemas.find(x => x.type == type) as IBlockPropertySchema;
        if (!schema) {
            log(`BlockProperty schema '${type}' was not found.`, { block: this, type });
            return undefined;
        }
        const prop = new BlockProperty({ type, block: this, schema });
        this.blockProperties.push(prop);
        prop.applyStyling();
        return prop;
    }
    syncPropertyEndToText() {

    }
    unsynchPropertyEndToText() {

    }
}

const logs: { msg: string, data: Record<string,any>}[] = [];
const log = (msg: string, data: Record<string,any>) => {
    logs.push({ msg, data });
    console.log(msg, data);
}

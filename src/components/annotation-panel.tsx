import { AbstractBlock } from "../library/abstract-block";
import { renderToNode } from "../library/common";
import { StandoffEditorBlock } from "../library/standoff-editor-block";
import { IBlockDto, IBlock, IAbstractBlockConstructor, ISelection, InputEventSource } from "../library/types";


export interface IAnnotationPanelBlockConstructor extends IAbstractBlockConstructor {
    source: AbstractBlock;
    selection?: ISelection;
    events: {
        onClose: () => void;
    }
}

export class AnnotationPanelBlock extends AbstractBlock {
    source: AbstractBlock;
    selection?: ISelection;
    node: HTMLElement;
    events: {
        onClose: () => void;
    }
    constructor(props: IAnnotationPanelBlockConstructor) {
        super(props);
        this.source = props.source;
        this.selection = props.selection;
        this.node = document.createElement("DIV") as HTMLDivElement;
        this.events = props.events;
    }
    render() {
        const self = this;
        const block = this.source as StandoffEditorBlock;
        this.setEvents([
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Mouse,
                    match: "click"
                },
                action: {
                    name: "Close the panel.",
                    description: `
                        
                    `,
                    handler: async (args) => {
                        const target = args.e.target as HTMLElement;
                        if (!self.node.contains(target)) {
                            self.destroy();
                            self.events.onClose();
                        }
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "Escape"
                },
                action: {
                    name: "Close the panel.",
                    description: `
                        
                    `,
                    handler: async (args) => {
                        self.destroy();
                        self.events.onClose();
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "i"
                },
                action: {
                    name: "Apply italics.",
                    description: `
                        
                    `,
                    handler: async (args) => {
                        applyAnnotation("style/italics");
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "b"
                },
                action: {
                    name: "Apply bold.",
                    description: `
                        
                    `,
                    handler: async (args) => {
                        applyAnnotation("style/bold");
                    }
                }
            },
            {
                mode: "default",
                trigger: {
                    source: InputEventSource.Keyboard,
                    match: "u"
                },
                action: {
                    name: "Apply underline.",
                    description: `
                        
                    `,
                    handler: async (args) => {
                        applyAnnotation("style/underline");
                    }
                }
            }
        ]);
        const annotate = (e: MouseEvent) => {
            e.preventDefault();
            const button = e.currentTarget as HTMLButtonElement;
            const type = button.dataset.type;
            applyAnnotation(type);
        };
        const applyAnnotation = (type: string) => {
            const start = self.selection?.start.index;
            const end = self.selection?.end.index;
            const dto = {
                type,
                start,
                end
            };
            block.clearSelection();
            block.addStandoffPropertiesDto([dto]);
            block.applyStandoffPropertyStyling();
        }
        function Panel (props: any) {
            return (
                <>
                    <div>
                        {/* Add entity link
                        Add web link
                        -------------
                        Format
                            - Bold
                            - Italic
                            - Strikethrough
                            - Highlight
                            ----------------
                            - Code
                            - Math (Tex?)
                            ----------------
                            - Clear formatting
                        Paragraph
                            - Bullet list
                            - Numbered list
                            - Task list
                        Insert
                        -------------
                        Cut
                        Copy
                        <greyed-out>
                        Paste
                        Paste as plain text
                        </greyed-out>
                        Select all
                        Search for "<selected-text/>" */}
                        <button type="button" data-type="style/bold" onClick={annotate}><b>B</b></button>
                        <button type="button" data-type="style/italics" onClick={annotate}><em>I</em></button>
                        <button type="button" data-type="style/underline" onClick={annotate}><span class="text-decoration: underline;">U</span></button>
                    </div>
                </>
            )
        }
        this.node = renderToNode(Panel(null));
        return this.node;
    }
    serialize(): IBlockDto {
        return null;
    }
    deserialize(json: any | any[]): IBlock {
        return null;
    }
    destroy(): void {
        this.node.remove();
    }
    
}
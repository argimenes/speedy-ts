import { AbstractBlock } from "../library/abstract-block";
import { renderToNode } from "../library/common";
import { StandoffEditorBlock } from "../library/standoff-editor-block";
import { IBlockDto, IBlock, IAbstractBlockConstructor, ISelection, InputEventSource } from "../library/types";


export interface IAnnotationPanelBlockConstructor extends IAbstractBlockConstructor {
    block: AbstractBlock;
    selection?: ISelection;
    events: {
        onClose: () => void;
    }
}

export class AnnotationPanelBlock extends AbstractBlock {
    block: AbstractBlock;
    selection?: ISelection;
    node: HTMLElement;
    events: {
        onClose: () => void;
    }
    constructor(props: IAnnotationPanelBlockConstructor) {
        super(props);
        this.block = props.block;
        this.selection = props.selection;
        this.node = document.createElement("DIV") as HTMLDivElement;
        this.events = props.events;
    }
    render() {
        const self = this;
        const block = this.block as StandoffEditorBlock;
        this.setEvents([
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
            }
        ]);
        const annotate = (e: MouseEvent) => {
            e.preventDefault();
            const button = e.currentTarget as HTMLButtonElement;
            const type = button.dataset.type;
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
        };
        function Panel (props: any) {
            return (
                <>
                    <div>
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
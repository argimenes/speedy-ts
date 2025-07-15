import { Component } from "solid-js";
import { AbstractBlock } from "../blocks/abstract-block";
import { renderToNode } from "../library/common";
import { IAbstractBlockConstructor, IBlockDto, IBlock } from "../library/types";
import { DocumentBlock } from "../blocks/document-block";

export interface IStyleBarBlockConstructor extends IAbstractBlockConstructor {
    document: DocumentBlock;
}

type Props = {
    block: StyleBarBlock;
}
export const StyleBar : Component<Props> = (props) => {
    const onBoldClicked = (e: Event) => {
        e.preventDefault();
        props.block.applyStyle("style/bold");
    };
    const onItalicsClicked = (e: Event) => {
        e.preventDefault();
        props.block.applyStyle("style/italics");
    };
    return (
        <>
            <div>
                <button onClick={onBoldClicked} class="btn btn-default btn-sm"><strong>B</strong></button>
                <button onClick={onItalicsClicked} class="btn btn-default btn-sm"><em>i</em></button>
            </div>
        </>
    );
};

export class StyleBarBlock extends AbstractBlock {
    document: DocumentBlock;
    constructor(args: IStyleBarBlockConstructor) {
        super(args);
        this.document = args.document;
        this.render();
    }
    applyStyle(name: string) {
        this.document.applyStyle(name);
    }
    render() {
        const node = renderToNode(StyleBar({ block: this }));
        this.container.appendChild(node);
    }
    serialize(): IBlockDto {
        throw new Error('Method not implemented.');
    }
    deserialize(json: any | any[]): IBlock {
        throw new Error('Method not implemented.');
    }
}
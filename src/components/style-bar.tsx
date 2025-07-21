import { Component } from "solid-js";
import { AbstractBlock } from "../blocks/abstract-block";
import { renderToNode } from "../library/common";
import { IAbstractBlockConstructor, IBlockDto, IBlock } from "../library/types";
import { DocumentBlock } from "../blocks/document-block";
import { IconAlignCenter, IconAlignJustified, IconAlignLeft, IconAlignRight, IconBold, IconItalic } from "@tabler/icons-solidjs";

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
    const onAlignLeftClicked = (e: Event) => {
        e.preventDefault();
        props.block.applyBlockStyle("block/alignment/left", ["block/alignment/right","block/alignment/center","block/alignment/justify"]);
    };
    const onAlignRightClicked = (e: Event) => {
        e.preventDefault();
        props.block.applyBlockStyle("block/alignment/right", ["block/alignment/left","block/alignment/center","block/alignment/justify"]);
    };
    const onAlignCenterClicked = (e: Event) => {
        e.preventDefault();
        props.block.applyBlockStyle("block/alignment/center", ["block/alignment/left","block/alignment/right","block/alignment/justify"]);
    };
    const onAlignJustifyClicked = (e: Event) => {
        e.preventDefault();
        props.block.applyBlockStyle("block/alignment/justify", ["block/alignment/left","block/alignment/right","block/alignment/center"]);
    };
    return (
        <>
            <div class="stylebar_block">
                <button onClick={onBoldClicked} class="btn btn-default btn-sm"><IconBold /></button>
                <button onClick={onItalicsClicked} class="btn btn-default btn-sm"><IconItalic /></button>
                <button onClick={onAlignLeftClicked} class="btn btn-default btn-sm"><IconAlignLeft /></button>
                <button onClick={onAlignCenterClicked} class="btn btn-default btn-sm"><IconAlignCenter /></button>
                <button onClick={onAlignRightClicked} class="btn btn-default btn-sm"><IconAlignRight /></button>
                <button onClick={onAlignJustifyClicked} class="btn btn-default btn-sm"><IconAlignJustified /></button>
            </div>
        </>
    );
};

export class StyleBarBlock extends AbstractBlock {
    document: DocumentBlock;
    constructor(args: IStyleBarBlockConstructor) {
        super(args);
        this.suppressEventHandlers = true;
        this.document = args.document;
        this.render();
        this.manager.registerBlock(this);
    }
    applyStyle(name: string) {
        this.document.applyStyle(name);
    }
    applyBlockStyle(name: string, remove?: string[]) {
        this.document.applyBlockStyle(name, remove);
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
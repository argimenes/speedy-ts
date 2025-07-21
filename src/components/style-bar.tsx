import { Component } from "solid-js";
import { AbstractBlock } from "../blocks/abstract-block";
import { renderToNode } from "../library/common";
import { IAbstractBlockConstructor, IBlockDto, IBlock } from "../library/types";
import { DocumentBlock } from "../blocks/document-block";
import { IconAlignCenter, IconAlignJustified, IconAlignLeft, IconAlignRight, IconBold, IconClearFormatting, IconColorPicker, IconH1, IconH2, IconH3, IconH4, IconItalic, IconSeparatorVertical } from "@tabler/icons-solidjs";

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
    const onH1Clicked = (e: Event) => {
        e.preventDefault();
        props.block.applyBlockStyle("block/text-size/h1");
    };
    const onH2Clicked = (e: Event) => {
        e.preventDefault();
        props.block.applyBlockStyle("block/text-size/h2");
    };
    const onH3Clicked = (e: Event) => {
        e.preventDefault();
        props.block.applyBlockStyle("block/text-size/h3");
    };
    const onH4Clicked = (e: Event) => {
        e.preventDefault();
        props.block.applyBlockStyle("block/text-size/h4");
    };
    const onClearFormattingClicked = (e: Event) => {
        e.preventDefault();
        props.block.clearFormatting();
    };
    const onFontColourClicked = (e: Event) => {
        e.preventDefault();
        props.block.selectFontColour();
    }
    const onBackgroundColourClicked = (e: Event) => {
        e.preventDefault();
        props.block.selectBackgroundColour();
    }
    return (
        <>
            <div class="style-bar_block">
                <button onClick={onBoldClicked} class="btn btn-default btn-sm"><IconBold /></button>
                <button onClick={onItalicsClicked} class="btn btn-default btn-sm"><IconItalic /></button>
                <span style="margin: 0 10;">|</span>
                <button onClick={onAlignLeftClicked} class="btn btn-default btn-sm"><IconAlignLeft /></button>
                <button onClick={onAlignCenterClicked} class="btn btn-default btn-sm"><IconAlignCenter /></button>
                <button onClick={onAlignRightClicked} class="btn btn-default btn-sm"><IconAlignRight /></button>
                <button onClick={onAlignJustifyClicked} class="btn btn-default btn-sm"><IconAlignJustified /></button>
                <span style="margin: 0 10;">|</span>
                <button onClick={onH1Clicked} class="btn btn-default btn-sm"><IconH1 /></button>
                <button onClick={onH2Clicked} class="btn btn-default btn-sm"><IconH2 /></button>
                <button onClick={onH3Clicked} class="btn btn-default btn-sm"><IconH3 /></button>
                <button onClick={onH4Clicked} class="btn btn-default btn-sm"><IconH4 /></button>
                <span style="margin: 0 10;">|</span>
                <button onClick={onFontColourClicked} class="btn btn-default btn-sm">Font</button>
                <button onClick={onBackgroundColourClicked} class="btn btn-default btn-sm">Background</button>
                <button onClick={onClearFormattingClicked} class="btn btn-default btn-sm"><IconClearFormatting /></button>
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
    selectBackgroundColour() {
        this.document.selectBackgroundColour();
    }
    selectFontColour() {
        this.document.selectFontColour();
    }
    applyStyle(name: string) {
        this.document.applyStyle(name);
    }
    applyBlockStyle(name: string, remove?: string[]) {
        this.document.applyBlockStyle(name, remove);
    }
    clearFormatting() {
        this.document.clearFormatting();
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
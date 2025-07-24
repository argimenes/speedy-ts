import { Component } from "solid-js";
import { AbstractBlock } from "../blocks/abstract-block";
import { renderToNode } from "../library/common";
import { IAbstractBlockConstructor, IBlockDto, IBlock } from "../library/types";
import { DocumentBlock } from "../blocks/document-block";
import { IconAlignCenter, IconAlignJustified, IconAlignLeft, IconAlignRight, IconBold, IconClearFormatting, IconColorPicker, IconH1, IconH2, IconH3, IconH4, IconIndentDecrease, IconIndentIncrease, IconItalic, IconSeparatorVertical } from "@tabler/icons-solidjs";

export interface IStyleBarBlockConstructor extends IAbstractBlockConstructor {
    document?: DocumentBlock;
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
        props.block.addOrEditBlockStyle("block/alignment", "left");
    };
    const onAlignRightClicked = (e: Event) => {
        e.preventDefault();
        props.block.addOrEditBlockStyle("block/alignment", "right");
    };
    const onAlignCenterClicked = (e: Event) => {
        e.preventDefault();
        props.block.addOrEditBlockStyle("block/alignment", "center");
    };
    const onAlignJustifyClicked = (e: Event) => {
        e.preventDefault();
        props.block.addOrEditBlockStyle("block/alignment", "justify");
    };
    const onH1Clicked = (e: Event) => {
        e.preventDefault();
        props.block.addOrEditBlockStyle("block/font/size", "h1");
    };
    const onH2Clicked = (e: Event) => {
        e.preventDefault();
        props.block.addOrEditBlockStyle("block/font/size", "h2");
    };
    const onH3Clicked = (e: Event) => {
        e.preventDefault();
        props.block.addOrEditBlockStyle("block/font/size", "h3");
    };
    const onH4Clicked = (e: Event) => {
        e.preventDefault();
        props.block.addOrEditBlockStyle("block/font/size", "h4");
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
    const onAddOrIncreaseIndentClicked = (e: Event) => {
        e.preventDefault();
        props.block.addOrIncreaseIndent();
    }
    const onAddOrDecreaseIndentClicked = (e: Event) => {
        e.preventDefault();
        props.block.addOrDecreaseIndent();
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
                <button onClick={onAddOrIncreaseIndentClicked} class="btn btn-default btn-sm"><IconIndentIncrease /></button>
                <button onClick={onAddOrDecreaseIndentClicked} class="btn btn-default btn-sm"><IconIndentDecrease /></button>
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
    addOrDecreaseIndent() {
        this.document.addOrDecreaseIndentBlockProperty();
    }
    addOrIncreaseIndent() {
        this.document.addOrIncreaseIndentBlockProperty();
    }
    applyStyle(name: string) {
        this.document.applyStyle(name);
    }
    addOrEditBlockStyle(name: string, value?: string) {
        this.document.addOrEditBlockStyle(name, value);
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
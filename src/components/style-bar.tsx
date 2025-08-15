import { Component } from "solid-js";
import { AbstractBlock } from "../blocks/abstract-block";
import { renderToNode } from "../library/common";
import { IAbstractBlockConstructor, IBlockDto, IBlock, BlockType } from "../library/types";
import { IconAlignCenter, IconAlignJustified, IconAlignLeft, IconAlignRight, IconBackground, IconBold, IconClearFormatting, IconColorPicker, IconH1, IconH2, IconH3, IconH4, IconIndentDecrease, IconIndentIncrease, IconItalic, IconRotateClockwise, IconRotateClockwise2, IconSeparatorVertical } from "@tabler/icons-solidjs";
import { StandoffEditorBlock } from "../blocks/standoff-editor-block";
import { DocumentBlock } from "../blocks/document-block";

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
    const onRotateRightClicked = (e: Event) => {
        e.preventDefault();
        props.block.rotateRight();
    }
    const onRotateLeftClicked = (e: Event) => {
        e.preventDefault();
        props.block.rotateLeft();
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
                <button onClick={onFontColourClicked} class="btn btn-default btn-sm"><IconColorPicker /></button>
                <button onClick={onBackgroundColourClicked} class="btn btn-default btn-sm"><IconBackground /></button>
                <span style="margin: 0 10;">|</span>
                <button onClick={onAddOrIncreaseIndentClicked} class="btn btn-default btn-sm"><IconIndentIncrease /></button>
                <button onClick={onAddOrDecreaseIndentClicked} class="btn btn-default btn-sm"><IconIndentDecrease /></button>
                <span style="margin: 0 10;">|</span>
                <button onClick={onRotateRightClicked} class="btn btn-default btn-sm"><IconRotateClockwise /></button>
                <button onClick={onRotateLeftClicked} class="btn btn-default btn-sm"><IconRotateClockwise2 /></button>
                <span style="margin: 0 10;">|</span>
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
        const block = this.manager.getBlockInFocus() as StandoffEditorBlock;
        if (block.type != BlockType.StandoffEditorBlock) return;
        const colour = prompt("Colour?");
        block.selectBackgroundColour(colour);
    }
    selectFontColour() {
        const block = this.manager.getBlockInFocus() as StandoffEditorBlock;
        if (block.type != BlockType.StandoffEditorBlock) return;
        const colour = prompt("Colour?");
        block.selectFontColour(colour);
    }
    rotateRight() {
        this.manager.turnRightRotateBlockProperty();
    }
    rotateLeft() {
        this.manager.turnLeftRotateBlockProperty();
    }
    addOrDecreaseIndent() {
        this.manager.addOrDecreaseIndentBlockProperty();
    }
    addOrIncreaseIndent() {
        this.manager.addOrIncreaseIndentBlockProperty();
    }
    applyStyle(name: string) {
        this.manager.applyStyle(name);
    }
    addOrEditBlockStyle(name: string, value?: string) {
        this.manager.addOrEditBlockStyle(name, value);
    }
    clearFormatting() {
        this.manager.clearFormatting();
    }
    render() {
        const node = renderToNode(StyleBar({ block: this }));
        this.container.appendChild(node);
        this.container.dataset.blockType = "style-bar-block";
    }
    serialize(): IBlockDto {
        throw new Error('Method not implemented.');
    }
    deserialize(json: any | any[]): IBlock {
        throw new Error('Method not implemented.');
    }
}
import { IconFileText, IconImageInPicture, IconVideo, IconHtml, IconRectangle, IconTrash, IconGrid3x3, IconRectangleVertical, IconPlus } from "@tabler/icons-solidjs";
import { Component, onMount } from "solid-js";
import { AbstractBlock } from "../blocks/abstract-block";
import { IBlockDto, IBlock, BlockType, IAbstractBlockConstructor } from "../library/types";
import { renderToNode } from "../library/common";
import { DocumentBlock } from "../blocks/document-block";
import { ContextMenu, ContextMenuItem } from "./context-menu";
import { StandoffEditorBlock } from "../blocks/standoff-editor-block";
import { GridBlock, GridCellBlock, GridRowBlock } from "../blocks/grid-block";

type Props = {
    items: ContextMenuItem[];
    visible: boolean;
    coords: { x: number; y: number };
    onClose: () => void;
    source: IBlock;
}

const BlockMenu : Component<Props> = (props) => {
  return (
    <>
     <ContextMenu
      position={props.coords}
      onClose={props.onClose}
      visible={props.visible}
      items={props.items} />
  </>
  );
}

interface IBlockMenuBlockConstructor extends IAbstractBlockConstructor {
  source: IBlock;
  contextMenuEvent: MouseEvent;
}

export class BlockMenuBlock extends AbstractBlock {
    contextMenuEvent: MouseEvent;
    source: IBlock;
    doc: DocumentBlock;
    node: HTMLElement;
    constructor(args: IBlockMenuBlockConstructor){
        super(args);
        this.manager = args.manager;
        this.type = BlockType.BlockMenu;
        this.contextMenuEvent = args.contextMenuEvent;
        this.suppressEventHandlers = true;
        this.source = args.source;
        this.node = document.createElement("DIV") as HTMLElement;
        this.doc = this.manager.getParentOfType(this.source, BlockType.DocumentBlock) as DocumentBlock;
    }
    serialize(): IBlockDto {
        return null;
    }
    deserialize(json: any | any[]): IBlock {
        return null
    }
    deleteBlock() {
      this.doc.deleteBlock(this.source.id);
    }
    addHtmlBlock() {
      const cm = this.doc.addCodeMirrorBlock(this.source);
      this.manager.setBlockFocus(cm);
    }
    addImageBlock() {
        console.log("addImageBlock");
        const url = prompt("Url");
        const v = this.doc.addImageBlock(this.source, url);
        this.manager.setBlockFocus(v);
    }
    addVideoBlock() {
        const url = prompt("Url");
        const v = this.doc.addVideoBlock(this.source, url);
        this.manager.setBlockFocus(v);
    }
    addCanvasBlock() {
      this.doc.addCanvasBlock(this.source);
    }
    addGridBlock(rows: number, cells: number) {
        const grid = this.doc.createGrid(rows, cells) as GridBlock;
        this.doc.addBlockAfter(grid, this.source);
        const firstRow = grid.blocks[0] as GridRowBlock;
        const firstCell = firstRow.blocks[0] as GridCellBlock;
        const firstTextBlock = firstCell.blocks[0] as StandoffEditorBlock;
        this.manager.setBlockFocus(firstTextBlock);
        firstTextBlock.moveCaretStart();
    }
    render() {
      const self = this;
      const items = [];
      items.push({
          type: "item", 
          label: "Add Block",
          icon: <IconPlus />,
          children: [
              {
                type:"item",
                icon: <IconFileText/>,
                label: "Text",
                onClick: self.addHtmlBlock
              },
              { type:"item", label: "Video", icon: <IconVideo />, onClick: self.addVideoBlock },
              { type:"item", label: "Image", icon: <IconImageInPicture />, onClick: self.addImageBlock },
              { type:"item", label: "Canvas", icon: <IconRectangleVertical />, onClick: self.addCanvasBlock },
              {
                type: "item", label: "Add Grid",
                icon: <IconGrid3x3 />,
                children: [
                  { type: "item", label: "1 x 1", onClick: () => { self.addGridBlock(1, 1) } },
                  { type: "item", label: "1 x 2", onClick: () => { self.addGridBlock(1, 2) } },
                  { type: "item", label: "1 x 3", onClick: () => { self.addGridBlock(1, 3) } },
                  { type: "item", label: "2 x 1", onClick: () => { self.addGridBlock(2, 1) } },
                  { type: "item", label: "2 x 2", onClick: () => { self.addGridBlock(2, 2) } },
                  { type: "item", label: "2 x 3", onClick: () => { self.addGridBlock(2, 3) } },
                ]
              }
            ]
        },
        {
            type: "item", 
            label: "Delete Block",
            icon: <IconTrash />,
            onClick: self.deleteBlock
        });
      const jsx = BlockMenu({
          items: items,
          visible: true,
          coords: { x: 0, y: 0 },
          onClose: () => {
            console.log("onClose");
            self.destroy();
          },
          source: this.source
        });
        const node = this.node = renderToNode(jsx);
        return node;
    }
    destroy() {
        this.node.remove();
    }
}
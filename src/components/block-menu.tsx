import { IconFileText, IconImageInPicture, IconVideo, IconHtml, IconRectangle, IconTrash, IconGrid3x3, IconRectangleVertical, IconPlus } from "@tabler/icons-solidjs";
import { Component, onMount } from "solid-js";
import { AbstractBlock } from "../blocks/abstract-block";
import { IBlockDto, IBlock, BlockType, IAbstractBlockConstructor } from "../library/types";
import { renderToNode } from "../library/common";
import { DocumentBlock } from "../blocks/document-block";
import { ContextMenu } from "./context-menu";
import { StandoffEditorBlock } from "../blocks/standoff-editor-block";
import { GridBlock, GridCellBlock, GridRowBlock } from "../blocks/grid-block";

type Props = {
    visible: boolean;
    coords: { x: number; y: number };
    onClose: () => void;
    source: IBlock;
    deleteBlock: () => void;
    addVideoBlock: () => void;
    addImageBlock: () => void;
    addHtmlBlock: () => void;
    addCanvasBlock: () => void;
    addGridBlock: (rows: number, cells: number) => void;
}

const BlockMenu : Component<Props> = (props) => {
  
  return (
    <>
     <ContextMenu
      position={props.coords}
      onClose={props.onClose}
      visible={props.visible}
      items={[
      {
        type: "item", 
        label: "Add Block",
        icon: <IconPlus />,
        children: [
          {
            type:"item",
            icon: <IconFileText/>,
            label: "Text",
            onClick: () => {
              console.log("item.onClick - Text");
              props.addHtmlBlock();
            }
          },
          {
            type:"item", label: "Video", icon: <IconVideo />, onClick: () => {
              console.log("item.onClick - Video");
              props.addVideoBlock();
           }
          },
          { type:"item", label: "Image", icon: <IconImageInPicture />, onClick: () => { props.addImageBlock() } },
          { type:"item", label: "Canvas", icon: <IconRectangleVertical />, onClick: () => { props.addCanvasBlock() } },
          {
            type: "item", label: "Add Grid",
            icon: <IconGrid3x3 />,
            children: [
              { type: "item", label: "1 x 1", onClick: () => { props.addGridBlock(1, 1) } },
              { type: "item", label: "1 x 2", onClick: () => { props.addGridBlock(1, 2) } },
              { type: "item", label: "1 x 3", onClick: () => { props.addGridBlock(1, 3) } },
              { type: "item", label: "2 x 1", onClick: () => { props.addGridBlock(2, 1) } },
              { type: "item", label: "2 x 2", onClick: () => { props.addGridBlock(2, 2) } },
              { type: "item", label: "2 x 3", onClick: () => { props.addGridBlock(2, 3) } },
            ]
          }
        ]
      },
      {
        type: "item", 
        label: "Delete Block",
        icon: <IconTrash />,
        onClick: () => { props.deleteBlock() }
      }
     ]} />
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
    constructor(args: IBlockMenuBlockConstructor){
        super(args);
        this.manager = args.manager;
        this.type = BlockType.BlockMenu;
        this.contextMenuEvent = args.contextMenuEvent;
        this.suppressEventHandlers = true;
        this.source = args.source;
        this.node = document.createElement("DIV") as HTMLElement;
    }
    serialize(): IBlockDto {
        return null;
    }
    deserialize(json: any | any[]): IBlock {
        return null
    }
    node: HTMLElement;
    render() {
      const self = this;
      const manager = this.manager;
      const source = this.source;
      const doc = manager.getParentOfType(source, BlockType.DocumentBlock) as DocumentBlock;
      const jsx = BlockMenu({
          visible: true,
          coords: { x: 0, y: 0 },
          onClose: () => {
            console.log("onClose");
            self.destroy();
          },
          source: this.source,
            deleteBlock: () => {
              doc.deleteBlock(source.id);
            },
            addHtmlBlock: () => {
              console.log("addHtmlBlock");
              const cm = doc.addCodeMirrorBlock(source);
              manager.setBlockFocus(cm);
            },
            addImageBlock: () => {
               console.log("addImageBlock");
                const url = prompt("Url");
                const v = doc.addImageBlock(source, url);
                manager.setBlockFocus(v);
            },
            addVideoBlock: () => {
              console.log("addVideoBlock");
                const url = prompt("Url");
                const v = doc.addVideoBlock(source, url);
                manager.setBlockFocus(v);
            },
            addCanvasBlock: () => {
              doc.addCanvasBlock(source);
            },
            addGridBlock: (rows: number, cells: number) => {
              const grid = doc.createGrid(rows, cells) as GridBlock;
              doc.addBlockAfter(grid, source);
              const firstRow = grid.blocks[0] as GridRowBlock;
              const firstCell = firstRow.blocks[0] as GridCellBlock;
              const firstTextBlock = firstCell.blocks[0] as StandoffEditorBlock;
              manager.setBlockFocus(firstTextBlock);
              firstTextBlock.moveCaretStart();
            }
        });
        const node = this.node = renderToNode(jsx);
        return node;
    }
    destroy() {
        this.node.remove();
    }
}
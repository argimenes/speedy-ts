import { IconFileText, IconImageInPicture, IconVideo, IconHtml, IconRectangle, IconTrash } from "@tabler/icons-solidjs";
import { Component, onMount } from "solid-js";
import { AbstractBlock } from "../blocks/abstract-block";
import { IBlockDto, IBlock, BlockType, IAbstractBlockConstructor } from "../library/types";
import { renderToNode } from "../library/common";
import { DocumentBlock } from "../blocks/document-block";
import "../assets/context-menu.css";
import { ContextMenu, ContextMenuAPI } from "./context-menu";


type Props = {
    contextMenuEvent: MouseEvent;
    source: IBlock;
    addVideoBlock: () => void;
    addHtmlBlock: () => void;
    addCanvasBlock: () => void;
    addGridBlock: (rows: number, cells: number) => void;
}

const BlockMenu : Component<Props> = (props) => {
  
  onMount(() => {
    const items = [
      {
        label: "Add Block",
        children: [
          { label: "Text", onClick: () => alert("New text") },
          { label: "Video", onClick: () => alert("New video") },
          { label: "Image", onClick: () => alert("New image") },
          { label: "Canvas", onClick: () => alert("New canvas") },
          {
            label: "Add Grid",
            icon: "",
            children: [
              { label: "1 x 1", onClick: () => alert("1 x 1") },
              { label: "1 x 2", onClick: () => alert("1 x 2") },
              { label: "1 x 3", onClick: () => alert("1 x 3") },
              { label: "2 x 1", onClick: () => alert("2 x 1") },
              { label: "2 x 2", onClick: () => alert("2 x 2") },
              { label: "2 x 3", onClick: () => alert("2 x 3") },
            ]
          }
        ]
      },
      {
        label: "Delete Block",
        icon: "",
        onClick: () => alert("Delete block")
      }
     ];
      ContextMenuAPI.show(props.contextMenuEvent.clientX, props.contextMenuEvent.clientY);
  })
  return (
    <>
     <ContextMenu items={[
      {
        label: "Add Block",
        children: [
          { label: "Text", onClick: () => alert("New text") },
          { label: "Video", onClick: () => alert("New video") },
          { label: "Image", onClick: () => alert("New image") },
          { label: "Canvas", onClick: () => alert("New canvas") },
          {
            label: "Add Grid",
            icon: "",
            children: [
              { label: "1 x 1", onClick: () => alert("1 x 1") },
              { label: "1 x 2", onClick: () => alert("1 x 2") },
              { label: "1 x 3", onClick: () => alert("1 x 3") },
              { label: "2 x 1", onClick: () => alert("2 x 1") },
              { label: "2 x 2", onClick: () => alert("2 x 2") },
              { label: "2 x 3", onClick: () => alert("2 x 3") },
            ]
          }
        ]
      },
      {
        label: "Delete Block",
        icon: "",
        onClick: () => alert("Delete block")
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
      const manager = this.manager;
      const source = this.source;
      const doc = manager.getParentOfType(source, BlockType.DocumentBlock) as DocumentBlock;
        const jsx = BlockMenu({
          contextMenuEvent: this.contextMenuEvent,
          source: this.source,
            addHtmlBlock: () => {
              const cm = doc.addCodeMirrorBlock(source);
              manager.setBlockFocus(cm);
            },
            addVideoBlock: () => {
                const url = prompt("Url");
                const v = doc.addVideoBlock(source, url);
                manager.setBlockFocus(v);
            },
            addCanvasBlock: () => {
                console.log("BlockMenuBlock.addCanvasBlock")
            },
            addGridBlock: (cells: number, rows: number) => {
              const grid = doc.createGrid(rows, cells);
              manager.insertBlockAfter(source, grid);
              manager.setBlockFocus(grid.blocks[0].blocks[0]);
            }
        });
        const node = this.node = renderToNode(jsx);
        return node;
    }
    destroy() {
        this.node.remove();
    }
}
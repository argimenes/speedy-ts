import { IconFileText, IconImageInPicture, IconVideo, IconHtml, IconRectangle, IconTrash } from "@tabler/icons-solidjs";
import { Component, onMount } from "solid-js";
import { AbstractBlock } from "../blocks/abstract-block";
import { IBlockDto, IBlock, BlockType, IAbstractBlockConstructor } from "../library/types";
import { renderToNode } from "../library/common";
import { DocumentBlock } from "../blocks/document-block";
import { Menu, useContextMenu, Item, Separator, Submenu } from "solid-contextmenu";
import "../assets/context-menu.css";

type Props = {
    contextMenuEvent: MouseEvent;
    source: IBlock;
    addVideoBlock: () => void;
    addHtmlBlock: () => void;
    addCanvasBlock: () => void;
    addGridBlock: (rows: number, cells: number) => void;
}

const BlockMenu : Component<Props> = (props) => {
  const menuId = "context-menu-" + props.source.id;
  const { show } = useContextMenu({ id: menuId });
  onMount(() => {
    show(props.contextMenuEvent);
  });
  return (
    <>
      <Menu id={menuId}>
        <Submenu label="Add Block">
          <Item onClick={() => alert("Add Text")}><IconFileText /> Text</Item>
          <Item onClick={props.addHtmlBlock}><IconHtml /> HTML</Item>
          <Item onClick={() => alert("Add Image")}><IconImageInPicture /> Image</Item>
          <Item onClick={props.addVideoBlock}><IconVideo/> Video</Item>
          <Item onClick={props.addCanvasBlock}><IconRectangle/> Canvas</Item>
          <Separator />
          <Submenu label="Add Grid">
            <Item onClick={() => props.addGridBlock(1, 2)}>
                <IconFileText /> 1 x 2
            </Item>
            <Item onClick={() => props.addGridBlock(1, 3)}>
                <IconFileText /> 1 x 3
            </Item>
            <Item onClick={() => props.addGridBlock(2, 2)}>
                <IconFileText /> 2 x 2
            </Item>
            <Item onClick={() => props.addGridBlock(2, 3)}>
                <IconFileText /> 2 x 3
            </Item>
          </Submenu>
        </Submenu>
        <Separator />
        <Item onClick={() => alert("Delete Block")}><IconTrash /> Delete Block</Item>
      </Menu>
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
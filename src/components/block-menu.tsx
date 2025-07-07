import { IconFileText, IconImageInPicture, IconVideo, IconHtml, IconRectangle, IconTrash, IconGrid3x3, IconRectangleVertical, IconPlus, IconCode, IconArrowsSplit, IconSwipeLeft, IconSwipeRight, IconGitMerge, IconStackPop, IconEdit } from "@tabler/icons-solidjs";
import { Component, onCleanup, onMount } from "solid-js";
import { AbstractBlock } from "../blocks/abstract-block";
import { IBlockDto, IBlock, BlockType, IAbstractBlockConstructor } from "../library/types";
import { renderToNode } from "../library/common";
import { DocumentBlock } from "../blocks/document-block";
import { ContextMenu, ContextMenuItem } from "./context-menu";
import { StandoffEditorBlock } from "../blocks/standoff-editor-block";
import { GridBlock, GridCellBlock, GridRowBlock } from "../blocks/grid-block";
import { TabBlock, TabRowBlock } from "../blocks/tabs-block";

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
    destructureGrid() {
      const grid = this.manager.getParentOfType(this.source, BlockType.GridBlock) as GridBlock;
      grid.destructure();
    }
    destructureTabs() {
      const tabRow = this.manager.getParentOfType(this.source, BlockType.TabRowBlock) as TabRowBlock;
      tabRow.destructure();
    }
    convertToGrid() {
      const parent = this.source.relation.parent as AbstractBlock;
      const grid = this.doc.createGrid(1, 2) as GridBlock;
      this.doc.addBlockAfter(grid, this.source);
      const firstCell = grid.blocks[0].blocks[0] as GridCellBlock;
      const firstCellText = firstCell.blocks[0] as StandoffEditorBlock;
      firstCellText.replaceWith(this.source as AbstractBlock);
      this.manager.generateParentSiblingRelations(parent);
      this.doc.generateIndex();
    }
    convertToTab() {
      this.doc.convertBlockToTab(this.source.id);
    }
    mergeLeft() {
      const cell = this.manager.getParentOfType(this.source, BlockType.GridCellBlock) as GridCellBlock;
      cell.mergeLeft();
    }
    mergeRight() {
      const cell = this.manager.getParentOfType(this.source, BlockType.GridCellBlock) as GridCellBlock;
      cell.mergeRight();
    }
    moveCellLeft() {
        const cell = this.manager.getParentOfType(this.source, BlockType.GridCellBlock) as GridCellBlock;
        cell.moveCellLeft();
    }
    async addTab() {
      const row = this.manager.getParentOfType(this.source, BlockType.TabRowBlock) as TabRowBlock;
      await row.appendTab();
    }
    renameTab() {
      const tab = this.manager.getParentOfType(this.source, BlockType.TabBlock) as TabBlock;
      const name = prompt("Name: ");
      tab.setName(name);
    }
    addGridRow() {
      const row = this.manager.getParentOfType(this.source, BlockType.GridRowBlock) as GridRowBlock;
      row.insertRowAfter();
    }
    moveCellRight() {
      const cell = this.manager.getParentOfType(this.source, BlockType.GridCellBlock) as GridCellBlock;
      cell.moveCellRight();
    }
    moveTabLeft() {
      const tab = this.manager.getParentOfType(this.source, BlockType.TabBlock) as TabBlock;
      tab.moveLeft();
    }
    moveTabRight() {
      const tab = this.manager.getParentOfType(this.source, BlockType.TabBlock) as TabBlock;
      tab.moveRight();
    }
    render() {
      const self = this;
      const items = [];
      const itemDeleteBlock= {
          type: "item", 
          label: "Delete Block",
          icon: <IconTrash />,
          onClick: () => self.deleteBlock()
      };
      const itemAdd = {
          type: "item", 
          label: "Add Block",
          icon: <IconPlus />,
          children: [
              { type:"item", icon: <IconCode/>, label: "Code", onClick: () => self.addHtmlBlock() },
              { type:"item", label: "Video", icon: <IconVideo />, onClick: () => self.addVideoBlock() },
              { type:"item", label: "Image", icon: <IconImageInPicture />, onClick: () => self.addImageBlock() },
              { type:"item", label: "Canvas", icon: <IconRectangleVertical />, onClick: () => self.addCanvasBlock() },
              {
                type: "item", label: "Add Grid", icon: <IconGrid3x3 />,
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
      };
      const itemConvertToGrid = {
            label: "Convert to grid (1 x 2)",
            icon: <IconArrowsSplit />,
            onClick: () => self.convertToGrid()
      };
      const itemConvertToTab = {
            label: "Convert to tab",
            icon: <IconArrowsSplit />,
            onClick: () => self.convertToTab()
      };
      const itemDestructureGrid= {
            label: "Destructure grid",
            icon: <IconStackPop />,
            onClick: () => self.destructureGrid()
      };
      const itemDestructureTabs= {
            label: "Destructure tabs",
            icon: <IconStackPop />,
            onClick: () => self.destructureTabs()
      };
      const itemMergeCellLeft = {
            label: "Merge cell left",
            icon: <IconGitMerge />,
            onClick: () => self.mergeLeft()
      };
      const itemMergeCellRight = {
            label: "Merge cell right",
            icon: <IconGitMerge />,
            onClick: () => self.mergeRight()
      };
      const itemMoveCellLeft = {
            label: "Move cell left",
            icon: <IconSwipeLeft />,
            onClick: () => self.moveCellLeft()
      };
      const itemMoveCellRight = {
            label: "Move cell right",
            icon: <IconSwipeRight />,
            onClick: () => self.moveCellRight()
      };
      const hr = { type: "separator" };
      const itemMergeTabLeft = {
            label: "Merge tab left",
            icon: <IconGitMerge />,
            onClick: () => self.mergeLeft()
      };
      const itemMergeTabRight = {
            label: "Merge tab right",
            icon: <IconGitMerge />,
            onClick: () => self.mergeRight()
      };
      const itemMoveTabLeft = {
            label: "Move tab left",
            icon: <IconSwipeLeft />,
            onClick: () => self.moveCellLeft()
      };
      const itemMoveTabRight = {
            label: "Move tab right",
            icon: <IconSwipeRight />,
            onClick: () => self.moveCellRight()
      };
      const itemRenameTab = {
            label: "Rename tab",
            icon: <IconEdit />,
            onClick: () => self.renameTab()
      };
      const itemAddTabBlock = {
            label: "Add tab",
            icon: <IconPlus />,
            onClick: () => self.addTab()
      };
      const itemAddGridRow = {
            label: "Add row",
            icon: <IconPlus />,
            onClick: () => self.addGridRow()
      };
      const itemGridsMenu = {
        type: "item",
        label: "Grids",
        children: [
          itemAddGridRow, itemDestructureGrid, hr,
          itemMergeCellLeft, itemMergeCellRight, hr,
          itemMoveCellLeft, itemMoveCellRight
        ]
      };
      const itemTabsMenu = {
        type: "item",
        label: "Tabs",
        children: [
          itemAddTabBlock, itemRenameTab, itemDestructureTabs, hr,
          itemMergeTabLeft, itemMergeTabRight, hr,
          itemMoveTabLeft, itemMoveTabRight
        ]
      };
      const insideCellBlock = !!this.manager.getParentOfType(this.source, BlockType.GridCellBlock);
      const insideTabBlock = !!this.manager.getParentOfType(this.source, BlockType.TabBlock);
      items.push(itemAdd);
      if (!insideTabBlock) {
        items.push(itemConvertToTab);
      } else {
        items.push(itemTabsMenu)
      }
      if (!insideCellBlock) {
        items.push(itemConvertToGrid);
      } else {
          items.push(itemGridsMenu);
      }
      items.push(itemDeleteBlock);
      
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
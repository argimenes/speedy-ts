import { IconFileText, IconImageInPicture, IconVideo, IconHtml, IconRectangle, IconTrash, IconGrid3x3, IconRectangleVertical, IconPlus, IconCode, IconArrowsSplit, IconSwipeLeft, IconSwipeRight, IconGitMerge, IconStackPop, IconEdit, IconList, IconHomeDown, IconHomeUp, IconWindow, IconBackground, IconBrandYoutube, Icon3dRotate, IconDisc, IconPencil, IconCopy } from "@tabler/icons-solidjs";
import { Component, onCleanup, onMount } from "solid-js";
import { AbstractBlock } from "../blocks/abstract-block";
import { IBlockDto, IBlock, BlockType, IAbstractBlockConstructor } from "../library/types";
import { renderToNode } from "../library/common";
import { DocumentBlock } from "../blocks/document-block";
import { ContextMenu, ContextMenuItem } from "./context-menu";
import { StandoffEditorBlock } from "../blocks/standoff-editor-block";
import { GridBlock, GridCellBlock, GridRowBlock } from "../blocks/grid-block";
import { TabBlock, TabRowBlock } from "../blocks/tabs-block";
import { IndentedListBlock } from "../blocks/indented-list-block";
import { DocumentWindowBlock } from "../blocks/document-window-block";
import { updateElement } from "../library/svg";
import { DocumentTabBlock, DocumentTabRowBlock } from "../blocks/document-tabs-block";

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
    destructureList() {
      const listItem = this.manager.getParentOfType(this.source, BlockType.IndentedListBlock) as IndentedListBlock;
      listItem.destructure();
    }
    convertToGrid() {
      const parent = this.source.relation.parent as AbstractBlock;
      const grid = this.doc.createGrid(1, 2) as GridBlock;
      this.doc.addBlockAfter(grid, this.source);
      const firstCell = grid.blocks[0].blocks[0] as GridCellBlock;
      const firstCellText = firstCell.blocks[0] as StandoffEditorBlock;
      firstCellText.replaceWith(this.source as AbstractBlock);
      this.manager.generateParentSiblingRelations(parent);
      this.manager.reindexAncestorDocument(parent);
    }
    async convertToList() {
      await this.doc.indentBlock({ block: this.source })
    }
    convertToPage() {
      const page = this.doc.convertToDocumentTab(this.source.id);
      page.container.classList.add("document-row");
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
    moveCellUp() {
        const cell = this.manager.getParentOfType(this.source, BlockType.GridCellBlock) as GridCellBlock;
        cell.moveCellUp();
    }
    moveCellDown() {
        const cell = this.manager.getParentOfType(this.source, BlockType.GridCellBlock) as GridCellBlock;
        cell.moveCellDown();
    }
    moveCellLeft() {
        const cell = this.manager.getParentOfType(this.source, BlockType.GridCellBlock) as GridCellBlock;
        cell.moveCellLeft();
    }
    deletePage() {
      const tab = this.manager.getParentOfType(this.source, BlockType.DocumentTabBlock) as DocumentTabBlock;
      tab.deleteTab();
    }
    async addPage() {
      const row = this.manager.getParentOfType(this.source, BlockType.DocumentTabRowBlock) as DocumentTabRowBlock;
      await row.appendTab();
    }
    renamePage() {
      const tab = this.manager.getParentOfType(this.source, BlockType.DocumentTabBlock) as DocumentTabBlock;
      const name = prompt("Title?");
      tab.setName(name);
    }
    deleteTab() {
      const tab = this.manager.getParentOfType(this.source, BlockType.TabBlock) as TabBlock;
      tab.deleteTab();
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
    async saveDocument() {
      let filename = this.doc.metadata.filename;
      let folder = this.doc.metadata.folder;
      if (!filename) filename = prompt("Filename?");
      const win = this.manager.getParentOfType(this.source, BlockType.DocumentWindowBlock);
      const block = win.blocks[0];
      await this.manager.saveServerDocument(block.id, filename, "uploads")
    }
    async renameDocument() {
      alert("Rename is not implemented");
    }
    duplicateDocument() {
      const win = this.manager.getParentOfType(this.source, BlockType.DocumentWindowBlock);
      const block = win.blocks[0];
      const dto = block.serialize();
      this.manager.addDocumentToWorkspace(dto);
    }
    addGridRow() {
      const row = this.manager.getParentOfType(this.source, BlockType.GridRowBlock) as GridRowBlock;
      row.insertRowAfter();
    }
    moveCellRight() {
      const cell = this.manager.getParentOfType(this.source, BlockType.GridCellBlock) as GridCellBlock;
      cell.moveCellRight();
    }
    movePageRight() {
      const tab = this.manager.getParentOfType(this.source, BlockType.DocumentTabBlock) as DocumentTabBlock;
      tab.moveRight();
    }
    movePageLeft() {
      const tab = this.manager.getParentOfType(this.source, BlockType.DocumentTabBlock) as DocumentTabBlock;
      tab.moveLeft();
    }
    moveTabLeft() {
      const tab = this.manager.getParentOfType(this.source, BlockType.TabBlock) as TabBlock;
      tab.moveLeft();
    }
    switchThemeTo(theme: string) {
        const win = this.manager.getParentOfType(this.source, BlockType.DocumentWindowBlock) as DocumentWindowBlock;
        if (theme == "normal") {
            const glass = win.blockProperties.find(x => x.type == "block/theme/glass");
            if (glass) win.removeBlockProperty(glass);
            win.addBlockProperties([{ type: "block/theme/paper" }]);
            win.applyBlockPropertyStyling();
        } else if (theme == "glass") {
            const paper = win.blockProperties.find(x => x.type == "block/theme/paper");
            if (paper) win.removeBlockProperty(paper);
            win.addBlockProperties([{ type: "block/theme/glass" }]);
            win.applyBlockPropertyStyling();
        } else {
            // do nothing
        }
    }
    setWindowThemeToGlass() {
      this.switchThemeTo("glass");
    }
    setWindowThemeToDefault() {
      this.switchThemeTo("normal");
    }
    moveTabRight() {
      const tab = this.manager.getParentOfType(this.source, BlockType.TabBlock) as TabBlock;
      tab.moveRight();
    }
    setBackgroundImage(url: string) {
      this.manager.switchToImageBackground();
    }
    setBackgroundVideo(url: string) {
      this.manager.switchToVideoBackground();
    }
    setBackgroundYouTubeVideo(url: string) {
      this.manager.switchToYouTubeVideoBackground();
    }
    setBackgroundWebGLComponent(component: string) {
      this.manager.switchToWebGLBackground();
    }
    render() {
      const self = this;
      const items = [];
      const hr = { type: "separator" };
      
      const insideGrid = !!this.manager.getParentOfType(this.source, BlockType.GridCellBlock);
      const insideTabs = !!this.manager.getParentOfType(this.source, BlockType.TabBlock);
      const insidePage = !!this.manager.getParentOfType(this.source, BlockType.DocumentTabBlock);
      const insideIndentedList = !!this.manager.getParentOfType(this.source, BlockType.IndentedListBlock);
      const isBackground = this.source.type.toLowerCase().indexOf("background") >= 0;
      const insideDocument = !!this.manager.getParentOfType(this.source, BlockType.DocumentBlock);

      if (insideDocument) {
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
        const itemSetWindowThemeToGlass = {
              label: "Glass",
              onClick: () => self.setWindowThemeToGlass()
        };
        const itemSetWindowThemeToDefault = {
              label: "Default",
              onClick: () => self.setWindowThemeToDefault()
        };
        const itemConvertToGrid = {
              label: "Convert to grid (1 x 2)",
              icon: <IconArrowsSplit />,
              onClick: () => self.convertToGrid()
        };
        const itemConvertToPage = {
              label: "Convert to page",
              icon: <IconArrowsSplit />,
              onClick: () => self.convertToPage()
        };
        const itemConvertToTab = {
              label: "Convert to tab",
              icon: <IconArrowsSplit />,
              onClick: () => self.convertToTab()
        };
        const itemConvertToIndentedList = {
              label: "Convert to list",
              icon: <IconList />,
              onClick: () => self.convertToList()
        };
        const itemDestructureGrid = {
              label: "Destructure grid",
              icon: <IconStackPop />,
              onClick: () => self.destructureGrid()
        };
        const itemDestructureTabs= {
              label: "Destructure tabs",
              icon: <IconStackPop />,
              onClick: () => self.destructureTabs()
        };
        const itemDestructureIndentedList = {
              label: "Destructure list",
              icon: <IconStackPop />,
              onClick: () => self.destructureList()
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
        const itemMoveCellDown = {
              label: "Move cell down",
              icon: <IconHomeDown />,
              onClick: () => self.moveCellDown()
        };
        const itemMoveCellUp = {
              label: "Move cell up",
              icon: <IconHomeUp />,
              onClick: () => self.moveCellUp()
        };
        const itemMoveCellRight = {
              label: "Move cell right",
              icon: <IconSwipeRight />,
              onClick: () => self.moveCellRight()
        };
        
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
        const itemDeleteTab = {
              label: "Delete tab",
              icon: <IconTrash />,
              onClick: () => self.deleteTab()
        };
        /**
         * Document Tabs (Pages)
         */
        const itemMovePageLeft = {
              label: "Move page left",
              icon: <IconSwipeLeft />,
              onClick: () => self.movePageLeft()
        };
        const itemMovePageRight = {
              label: "Move page right",
              icon: <IconSwipeRight />,
              onClick: () => self.movePageRight()
        };
        const itemRenamePage = {
              label: "Rename page",
              icon: <IconEdit />,
              onClick: () => self.renamePage()
        };
        const itemAddPage = {
              label: "Add page",
              icon: <IconPlus />,
              onClick: () => self.addPage()
        };
        const itemDeletePage = {
              label: "Delete page",
              icon: <IconTrash />,
              onClick: () => self.deletePage()
        };
        /**
         * Grids
         */
        const itemAddGridRow = {
              label: "Add row",
              icon: <IconPlus />,
              onClick: () => self.addGridRow()
        };
        /**
         * File
         */
        const itemSave = {
              label: "Save",
              icon: <IconDisc />,
              onClick: () => self.saveDocument()
        };
        const itemRename = {
              label: "Rename",
              icon: <IconPencil />,
              onClick: () => self.renameDocument()
        };
        const itemDuplicate = {
              label: "Duplicate",
              icon: <IconCopy />,
              onClick: () => self.duplicateDocument()
        };
        const itemWindowThemesMenu = {
              label: "Themes",
              icon: <IconWindow />,
              children: [
                itemSetWindowThemeToGlass,
                itemSetWindowThemeToDefault
              ]
        };
        const itemFileMenu = {
          type: "item",
          label: "File",
          children: [
            itemSave, itemDuplicate, itemRename
          ]
        };
        const itemGridsMenu = {
          type: "item",
          label: "Grids",
          children: [
            itemAddGridRow, itemDestructureGrid, hr,
            itemMergeCellLeft, itemMergeCellRight, hr,
            itemMoveCellLeft, itemMoveCellRight,
            itemMoveCellUp, itemMoveCellDown,
          ]
        };
        const itemTabsMenu = {
          type: "item",
          label: "Tabs",
          children: [
            itemAddTabBlock, itemRenameTab, itemDestructureTabs, hr,
            itemMergeTabLeft, itemMergeTabRight, hr,
            itemMoveTabLeft, itemMoveTabRight, hr,
            itemDeleteTab
          ]
        };
        const itemPagesMenu = {
          type: "item",
          label: "Pages",
          children: [
            itemAddPage, itemRenamePage, hr,
            itemMovePageLeft, itemMovePageRight, hr,
            itemDeletePage
          ]
        };
        const itemIndentedListMenu = {
          type: "item",
          label: "List",
          children: [
            itemDestructureIndentedList
          ]
        };
        items.push(itemAdd);
        items.push(itemFileMenu);
        /**
         * Tabs
         */
        if (!insideTabs) {
          items.push(itemConvertToTab);
        } else {
          items.push(itemTabsMenu)
        }
        /**
         * Pages
         */
        if (!insidePage) {
          items.push(itemConvertToPage);
        } else {
          items.push(itemPagesMenu)
        }
        if (!insideGrid) {
          items.push(itemConvertToGrid);
        } else {
            items.push(itemGridsMenu);
        }
        if (!insideIndentedList) {
          items.push(itemConvertToIndentedList);
        } else {
          items.push(itemIndentedListMenu);
        }
        items.push(itemDeleteBlock);
        items.push(itemWindowThemesMenu);
      }

      if (isBackground) {
        const itemBackgroundMenu = {
              type: "item",
              label: "Background",
              icon: <IconBackground />,
              children: [
                {
                      type: "item",
                      label: "Image",
                      icon: <IconImageInPicture />,
                      onClick: () => self.setBackgroundImage("")
                },
                {
                      type: "item",
                      label: "Video",
                      icon: <IconVideo />,
                      onClick: () => self.setBackgroundVideo("rain.mp4")
                },
                {
                    type: "item",
                      label: "YouTube",
                      icon: <IconBrandYoutube />,
                      onClick: () => self.setBackgroundYouTubeVideo("Scottish Mountain Stream")
                },
                {
                  type: "item",
                      label: "WebGL",
                      icon: <Icon3dRotate />,
                      onClick: () => self.setBackgroundWebGLComponent("Colour Cycling")
                }
              ]
        };
        items.push(itemBackgroundMenu);
      }

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
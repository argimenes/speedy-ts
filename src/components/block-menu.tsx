import { Menubar } from "@kobalte/core/menubar";
import { IconChevronRight, IconMenu, IconFileText, IconImageInPicture, IconVideo, IconHtml, IconRectangle, IconTrash } from "@tabler/icons-solidjs";
import { Component } from "solid-js";
import { AbstractBlock } from "../blocks/abstract-block";
import { IBlockDto, IBlock, BlockType, IAbstractBlockConstructor } from "../library/types";
import { renderToNode } from "../library/common";
import "../assets/kobalte.css";
import { StandoffEditorBlock } from "../blocks/standoff-editor-block";
import { DocumentBlock } from "../blocks/document-block";

type Props = {
    source: IBlock;
    addVideoBlock: () => void;
    addHtmlBlock: () => void;
    addCanvasBlock: () => void;
    addTableBlock: (rows: number, cells: number) => void;
}

const BlockMenu : Component<Props> = (props) => {
  const addImageBlock = () => {
    console.log("addVideoBlock")
  }
  const addTable = (rows: number, cells: number) => {
    console.log("addTable", { rows, cells });
  }
  return (
      <Menubar class="menubar__root">
        <Menubar.Menu>
          <Menubar.Trigger class="menubar__trigger">
            <IconMenu />
          </Menubar.Trigger>
          <Menubar.Portal>
            <Menubar.Content class="menubar__content">
              <Menubar.Sub overlap gutter={4} shift={-8}>
                <Menubar.SubTrigger class="menubar__sub-trigger">
                  Add Block
                  <div class="menubar__item-right-slot">
                    <IconChevronRight width={20} height={20} />
                  </div>
                </Menubar.SubTrigger>
                <Menubar.Portal>
                  <Menubar.SubContent class="menubar__sub-content">
                    <Menubar.Item class="menubar__item">
                      <IconFileText /> Text
                    </Menubar.Item>
                    <Menubar.Item class="menubar__item" onClick={props.addHtmlBlock}>
                      <IconHtml /> HTML
                    </Menubar.Item>
                    <Menubar.Item class="menubar__item" onClick={addImageBlock}>
                      <IconImageInPicture /> Image
                    </Menubar.Item>
                    <Menubar.Item class="menubar__item" onClick={props.addVideoBlock}>
                        <IconVideo/> Video
                    </Menubar.Item>
                    <Menubar.Item class="menubar__item" onClick={props.addCanvasBlock}>
                        <IconRectangle/> Canvas
                    </Menubar.Item>
                    <Menubar.Separator class="menubar__separator" />
                    <Menubar.Sub overlap gutter={4} shift={-8}>
                        <Menubar.SubTrigger class="menubar__sub-trigger">
                            Table
                            <div class="menubar__item-right-slot">
                                <IconChevronRight width={20} height={20} />
                            </div>
                        </Menubar.SubTrigger>
                        <Menubar.Portal>
                            <Menubar.SubContent class="menubar__sub-content">
                                <Menubar.Item class="menubar__item" onClick={() => props.addTableBlock(1, 2)}>
                                    <IconFileText /> 1 x 2
                                </Menubar.Item>
                                <Menubar.Item class="menubar__item" onClick={() => props.addTableBlock(1, 3)}>
                                    <IconFileText /> 1 x 3
                                </Menubar.Item>
                                <Menubar.Item class="menubar__item" onClick={() => props.addTableBlock(2, 2)}>
                                    <IconFileText /> 2 x 2
                                </Menubar.Item>
                                <Menubar.Item class="menubar__item" onClick={() => props.addTableBlock(2, 3)}>
                                    <IconFileText /> 2 x 3
                                </Menubar.Item>
                            </Menubar.SubContent>
                        </Menubar.Portal>
                    </Menubar.Sub>
                  </Menubar.SubContent>
                </Menubar.Portal>
              </Menubar.Sub>
              <Menubar.Separator class="menubar__separator" />
              <Menubar.Item class="menubar__item">
                <IconTrash /> Delete Block
            </Menubar.Item>
        </Menubar.Content>
      </Menubar.Portal>
    </Menubar.Menu>
  </Menubar>
  );
}

interface IBlockMenuBlockConstructor extends IAbstractBlockConstructor {
  source: IBlock;
}

export class BlockMenuBlock extends AbstractBlock {
  source: IBlock;
    constructor(args: IBlockMenuBlockConstructor){
        super(args);
        this.manager = args.manager;
        this.type = BlockType.BlockMenu;
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
            addTableBlock: (cells: number, rows: number) => {
              const table = doc.createTable(rows, cells);
              manager.insertBlockAfter(source, table);
              manager.setBlockFocus(table.blocks[0].blocks[0]);
            }
        });
        const node = this.node = renderToNode(jsx);
        return node;
    }
    destroy() {
        this.node.remove();
    }
}
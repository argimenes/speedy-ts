import { Menubar } from "@kobalte/core/menubar";
import { IconChevronRight, IconMenu, IconFileText, IconImageInPicture, IconVideo, IconHtml, IconRectangle, IconTrash } from "@tabler/icons-solidjs";
import { Component } from "solid-js";
import { AbstractBlock } from "../blocks/abstract-block";
import { IBlockDto, IBlock, BlockType, IAbstractBlockConstructor } from "../library/types";
import { renderToNode } from "../library/common";

type Props = {
    addVideoBlock: () => void;
    addCanvasBlock: () => void;
}

const BlockMenu : Component<Props> = (props) => {
  const addImageBlock = () => {
    console.log("addVideoBlock")
  }
  const addHtmlBlock = () => {
    console.log("addHtmlBlock")
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
                    <Menubar.Item class="menubar__item" onChange={addHtmlBlock}>
                      <IconHtml /> HTML
                    </Menubar.Item>
                    <Menubar.Item class="menubar__item" onChange={addImageBlock}>
                      <IconImageInPicture /> Image
                    </Menubar.Item>
                    <Menubar.Item class="menubar__item" onChange={props.addVideoBlock}>
                        <IconVideo/> Video
                    </Menubar.Item>
                    <Menubar.Item class="menubar__item" onChange={props.addCanvasBlock}>
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
                                <Menubar.Item class="menubar__item" onChange={() => addTable(1, 2)}>
                                    <IconFileText /> 1 x 2
                                </Menubar.Item>
                                <Menubar.Item class="menubar__item" onChange={() => addTable(1, 3)}>
                                    <IconFileText /> 1 x 3
                                </Menubar.Item>
                                <Menubar.Item class="menubar__item" onChange={() => addTable(2, 2)}>
                                    <IconFileText /> 2 x 2
                                </Menubar.Item>
                                <Menubar.Item class="menubar__item" onChange={() => addTable(2, 3)}>
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
    constructor(args: IBlockMenuBlockConstructor){
        super(args);
        this.type = BlockType.BlockMenu;
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
        const jsx = BlockMenu({
            addVideoBlock: () => {
                console.log("BlockMenuBlock.addVideoBlock")
            },
            addCanvasBlock: () => {
                console.log("BlockMenuBlock.addCanvasBlock")
            }
        });
        const node = this.node = renderToNode(jsx);
        return node;
    }
    destroy() {
        this.node.remove();
    }
}
// BlockRenderer.tsx
import { For, Component } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { Block } from './types';

export interface BlockComponents {
  [key: string]: Component<{ 
    block: Block;
  }>;
}

interface BlockRendererProps {
  blocks: Block[];
  components: BlockComponents;
}

export const BlockRenderer: Component<BlockRendererProps> = (props) => {
  return (
    <For each={props.blocks}>
      {(block) => (
        <>
          <div id={block.id} data-type={block.type} data-metadata={JSON.stringify(block.metadata || {})}>
            <Dynamic
              component={props.components[block.type]}
              block={block}
            />
            {block.children && (
              <BlockRenderer
                blocks={block.children}
                components={props.components}
              />
            )}
          </div>
        </>
      )}
    </For>
  );
};
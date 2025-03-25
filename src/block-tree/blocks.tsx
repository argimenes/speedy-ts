// Example usage - App.tsx
import { Component, createSignal } from 'solid-js';
import { useBlockActions } from './context';
import { Block } from './types';

interface BlockProps {
  block: Block;
}

export const ImageBlock : Component<BlockProps> = (props) => {
  const actions = useBlockActions();
  return (
    <>
      <img src={props.block.metadata.url} />
    </>
  );
}

export const CheckboxTextBlock: Component<BlockProps> = ({ block }) => {
  const actions = useBlockActions();
  const toggleCheckboxClicked = () => {
    actions.updateBlock(block.id, { metadata: { value: !block.metadata.value } });
  }
  return (
    <div>
      <div style="display: inline-block;"> 
        <CheckboxBlock block={block} />
      </div>
      <div style="display: inline-block;"> 
        <TextBlock block={block} />
      </div>
    </div>
  );
};

export const CheckboxBlock: Component<BlockProps> = ({ block }) => {
  const actions = useBlockActions();
  const toggleCheckboxClicked = () => {
    actions.updateBlock(block.id, { metadata: { value: !block.metadata.value } });
  }
  return (
    <div class="checkbox-block">
      <input type="checkbox" checked={block.metadata.value} onInput={() => toggleCheckboxClicked} />
    </div>
  );
};

export const TextBlock: Component<BlockProps> = (props) => {
  const actions = useBlockActions();
  
  return (
    <div class="text-block">
      <p>{props.block.content}</p>
      <button onClick={() => actions.addBlockBefore(props.block.id, { 
        type: 'text', 
        content: 'New text before' 
      })}>
        Add Text Before
      </button>
      <button onClick={() => actions.addBlockAfter(props.block.id, { 
        type: 'text', 
        content: 'New text after' 
      })}>
        Add Text After
      </button>
      <button onClick={() => actions.replaceBlock(props.block.id, { 
        type: 'heading', 
        content: props.block.content 
      })}>
        Convert to Heading
      </button>
      <button onClick={() => actions.deleteBlock(props.block.id)}>
        Delete
      </button>
    </div>
  );
};

export const HeadingBlock: Component<BlockProps> = (props) => {
  const actions = useBlockActions();
  
  return (
    <div class="heading-block">
      <h2>{props.block.content}</h2>
      <button onClick={() => actions.replaceBlock(props.block.id, { 
        type: 'text', 
        content: props.block.content 
      })}>
        Convert to Text
      </button>
    </div>
  );
};
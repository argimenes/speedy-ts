// Example usage - App.tsx
import { Component } from 'solid-js';
import { useBlockActions } from './context';
import { Block } from './types';

interface BlockProps {
  block: Block;
}

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
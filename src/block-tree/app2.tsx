import { Component } from "solid-js";
import { createDocumentStore } from "./store";
import { HeadingBlock, TextBlock } from "./blocks";
import { BlockRenderer } from "./block-renderer";
import { BlockProvider } from "./context";

const App2: Component = () => {
  const [blocks, actions] = createDocumentStore([
    { id: '1', type: 'text', content: 'Hello world' },
    { 
      id: '2', 
      type: 'heading', 
      content: 'Section 1',
      children: [
        { id: '3', type: 'text', content: 'Nested content' }
      ]
    }
  ]);

  const components = {
    text: TextBlock,
    heading: HeadingBlock,
  };

  return (
    <BlockProvider actions={actions}>
      <BlockRenderer
        blocks={blocks}
        components={components}
      />
    </BlockProvider>
  );
};

export default App2;
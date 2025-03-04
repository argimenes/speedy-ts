import { Component } from "solid-js";
import { createDocumentStore } from "./store";
import { HeadingBlock, ImageBlock, TextBlock } from "./blocks";
import { BlockRenderer } from "./block-renderer";
import { BlockProvider } from "./context";

const App2: Component = () => {
  const [blocks, actions] = createDocumentStore([
    {
      id: '1', type: 'text', content: 'Hello world',
      children: [
        {
            id: "1.1", type: "image",
            metadata: {
              url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Francesco_Melzi_-_Portrait_of_Leonardo.png/440px-Francesco_Melzi_-_Portrait_of_Leonardo.png"
            }
        },
        { id: '1.2', type: 'text', content: 'Picture of Leonardo da Vinci' }
      ]
     },
    { 
      id: '2', 
      type: 'heading', 
      content: 'Section 1',
      children: [
        { id: '2.1', type: 'text', content: 'Nested content' }
      ]
    }
  ]);

  const components = {
    text: TextBlock,
    heading: HeadingBlock,
    image: ImageBlock
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

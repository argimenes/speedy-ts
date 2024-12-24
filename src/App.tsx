import { Component, Show } from 'solid-js';
import { BlockManagerWindow } from './components/BlockManagerWindow';
import { BlockManager } from './library/block-manager';
import { createStore } from 'solid-js/store';

type Model = {
  manager: BlockManager;
}
const App: Component = () => {
  const [model, setModel] = createStore<Model>({} as Model);
  const initControlPanel = async (el: HTMLDivElement) => {
    await model.manager.setupControlPanel();
    // const panel = new ControlPanelBlock({
    //   manager: model.manager
    // });
    // panel.container = el;
    // const node = await panel.render();
    // el.appendChild(node);
}
  return (
    <div class="App">
      <div class="workspace">
        <Show when={!!model.manager}>
          <div ref={initControlPanel} />
        </Show>
        <BlockManagerWindow getInstance={(inst) => { setModel("manager", inst) }} />

      </div>
    </div>
  );
};

export default App;

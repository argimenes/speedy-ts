import { Component, Show } from 'solid-js';
import { BlockManagerWindow } from './components/workspace';
import { UniverseBlock } from './universe-block';
import { createStore } from 'solid-js/store';

type Model = {
  manager: UniverseBlock;
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
        <BlockManagerWindow getInstance={(inst) => { setModel("manager", inst) }} />
        <Show when={!!model.manager}>
          <div ref={initControlPanel} />
        </Show>
      </div>
    </div>
  );
};

export default App;

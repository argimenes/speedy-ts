import { Show, type Component } from 'solid-js';
import { BlockManagerWindow } from './components/BlockManagerWindow';
import { BlockManager } from './library/block-manager';
import { ControlPanel } from './components/control-panel';
import { createStore } from 'solid-js/store';
type Model = {
  manager: BlockManager;
}
const App: Component = () => {
  const [model, setModel] = createStore<Model>({} as Model);
  return (
    <div class="App">
      <div class="control-panel">
        <Show when={model.manager}>
          <ControlPanel manager={model.manager} />
        </Show>
      </div>
      <div class="workspace">
        <BlockManagerWindow getInstance={(inst) => { setModel("manager", inst) }} />
      </div>
    </div>
  );
};

export default App;

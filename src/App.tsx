import { Component } from 'solid-js';
import { BlockManagerWindow } from './components/BlockManagerWindow';
import { BlockManager } from './library/block-manager';
import { createStore } from 'solid-js/store';
import { ControlPanelBlock } from './components/control-panel';
type Model = {
  manager: BlockManager;
}
const App: Component = () => {
  const [model, setModel] = createStore<Model>({} as Model);
  return (
    <div class="App">
      <div class="workspace">
        <BlockManagerWindow getInstance={(inst) => { setModel("manager", inst) }} />
      </div>
    </div>
  );
};

export default App;

import type { Component } from 'solid-js';
import styles from './App.module.css';
import { BlockManagerWindow } from './components/BlockManagerWindow';

const App: Component = () => {
  return (
    <div class={styles.App}>
      <BlockManagerWindow />
    </div>
  );
};

export default App;

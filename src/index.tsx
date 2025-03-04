/* @refresh reload */
import { render } from 'solid-js/web';
import './assets/reset.css'
import './index.css';
import './assets/codex.css'
//import App from './App';
import App2 from './block-tree/app2';

const root = document.getElementById('root');

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    'Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?',
  );
}

render(() => <App2 />, root!);

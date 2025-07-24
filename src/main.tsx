import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { registerServiceWorker } from './utils/pwa';

const container = document.getElementById('root')!;
const root = createRoot(container);
root.render(<App />);

if (import.meta.env.PROD) {
  registerServiceWorker();
}

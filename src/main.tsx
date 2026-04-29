import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { registerServiceWorker } from './utils/pwa';
import { eventBus } from './utils/eventBus';
import { playSuccessAnimation } from './utils/interactions';

eventBus.on('TIMER_COMPLETE', (data) => {
  if (data.sessionType === 'focus') void playSuccessAnimation();
});

const container = document.getElementById('root');
if (!container) throw new Error('Root container #root not found');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if (import.meta.env.PROD) {
  void registerServiceWorker();
}

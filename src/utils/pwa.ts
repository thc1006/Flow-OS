export const registerServiceWorker = async (): Promise<void> => {
  if (!('serviceWorker' in navigator)) return;

  try {
    const swUrl = `${import.meta.env.BASE_URL}sw.js`;
    const registration = await navigator.serviceWorker.register(swUrl, {
      scope: import.meta.env.BASE_URL,
    });

    // First-load: controller is null → page goes from "no SW" to "owned by SW".
    // We must NOT reload in that case (no stale assets to flush, and we'd
    // interrupt the very first paint). Only reload when an *existing* SW is
    // being replaced by a newer one — which is exactly when the user clicked
    // the update banner and we sent SKIP_WAITING to the waiting worker.
    const hadController = !!navigator.serviceWorker.controller;
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController) return; // first install, ignore
      if (reloading) return;
      reloading = true;
      window.location.reload();
    });

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New version is parked; show the banner and offer to apply.
          showUpdateNotification(newWorker);
        }
      });
    });
  } catch (error) {
    console.error('Service Worker registration failed:', error);
  }
};

const showUpdateNotification = (newWorker: ServiceWorker): void => {
  const banner = document.createElement('div');
  banner.className =
    'fixed bottom-4 left-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50 flex justify-between items-center';
  banner.setAttribute('role', 'status');
  banner.setAttribute('aria-live', 'polite');

  const text = document.createElement('span');
  text.textContent = '有新版本可用！';

  const button = document.createElement('button');
  button.textContent = '更新';
  button.className =
    'bg-white text-blue-600 px-3 py-1 rounded text-sm font-semibold hover:bg-blue-50';
  button.addEventListener('click', () => {
    // Tell the waiting worker to take over; controllerchange listener will reload.
    newWorker.postMessage({ type: 'SKIP_WAITING' });
  });

  banner.appendChild(text);
  banner.appendChild(button);
  document.body.appendChild(banner);

  window.setTimeout(() => banner.remove(), 10_000);
};

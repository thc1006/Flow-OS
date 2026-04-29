export const registerServiceWorker = async (): Promise<void> => {
  if (!('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateNotification();
        }
      });
    });
  } catch (error) {
    console.error('Service Worker registration failed:', error);
  }
};

const showUpdateNotification = (): void => {
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
    window.location.reload();
  });

  banner.appendChild(text);
  banner.appendChild(button);
  document.body.appendChild(banner);

  window.setTimeout(() => banner.remove(), 10_000);
};

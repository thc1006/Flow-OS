export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdateNotification();
            }
          });
        }
      });
      
      console.log('Service Worker registered successfully');
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
};

export const showUpdateNotification = () => {
  const updateBanner = document.createElement('div');
  updateBanner.className = 'fixed bottom-4 left-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50 flex justify-between items-center';
  updateBanner.innerHTML = `
    <span>有新版本可用！</span>
    <button onclick="window.location.reload()" class="bg-white text-blue-600 px-3 py-1 rounded text-sm font-semibold">
      更新
    </button>
  `;
  document.body.appendChild(updateBanner);
  
  setTimeout(() => {
    updateBanner.remove();
  }, 10000);
};

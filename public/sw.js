const CACHE_NAME = 'flow-os-v1.0.0';
const STATIC_CACHE = 'flow-os-static-v1';
const RUNTIME_CACHE = 'flow-os-runtime-v1';

// 需要快取的靜態資源
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/favicon.ico'
];

// 需要快取的運行時資源模式
const RUNTIME_CACHE_PATTERNS = [
  /^https:\/\/fonts\.googleapis\.com/,
  /^https:\/\/fonts\.gstatic\.com/,
  /^https:\/\/cdn\.jsdelivr\.net/,
  /^https:\/\/unpkg\.com/
];

// Service Worker 安裝事件
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// Service Worker 啟動事件
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // 刪除舊版本的快取
              return cacheName.startsWith('flow-os-') &&
                     cacheName !== STATIC_CACHE &&
                     cacheName !== RUNTIME_CACHE;
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[SW] Old caches cleaned up');
        return self.clients.claim();
      })
      .catch((error) => {
        console.error('[SW] Failed to activate service worker:', error);
      })
  );
});

// 網路請求攔截
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  
  // 跳過非 GET 請求
  if (request.method !== 'GET') {
    return;
  }
  
  // 跳過 Chrome extension 請求
  if (url.protocol === 'chrome-extension:') {
    return;
  }
  
  // 跳過開發工具請求
  if (url.pathname.startsWith('/_vite') || url.pathname.startsWith('/@vite')) {
    return;
  }

  event.respondWith(handleRequest(request));
});

// 處理請求的主要邏輯
async function handleRequest(request) {
  const url = new URL(request.url);
  
  try {
    // 靜態資源使用 Cache First 策略
    if (isStaticAsset(url.pathname)) {
      return await cacheFirst(request);
    }
    
    // CDN 資源使用 Stale While Revalidate 策略
    if (isCDNResource(url.href)) {
      return await staleWhileRevalidate(request);
    }
    
    // API 請求使用 Network First 策略
    if (url.pathname.startsWith('/api/')) {
      return await networkFirst(request);
    }
    
    // 其他請求使用 Network First 策略
    return await networkFirst(request);
    
  } catch (error) {
    console.error('[SW] Request handling failed:', error);
    
    // 嘗試從快取中獲取
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // 如果是 HTML 請求且快取中沒有，返回 offline 頁面
    if (request.headers.get('accept')?.includes('text/html')) {
      const offlineResponse = await caches.match('/index.html');
      if (offlineResponse) {
        return offlineResponse;
      }
    }
    
    // 最後回退到網路錯誤
    throw error;
  }
}

// Cache First 策略
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  const networkResponse = await fetch(request);
  
  // 只快取成功的回應
  if (networkResponse.ok) {
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, networkResponse.clone());
  }
  
  return networkResponse;
}

// Network First 策略
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    // 快取成功的回應
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // 網路失敗時從快取中獲取
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Stale While Revalidate 策略
async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cachedResponse = await cache.match(request);
  
  // 在背景中更新快取
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch((error) => {
    console.warn('[SW] Background fetch failed:', error);
  });
  
  // 如果有快取就立即返回，否則等待網路回應
  return cachedResponse || fetchPromise;
}

// 檢查是否為靜態資源
function isStaticAsset(pathname) {
  return STATIC_ASSETS.includes(pathname) ||
         pathname.endsWith('.js') ||
         pathname.endsWith('.css') ||
         pathname.endsWith('.png') ||
         pathname.endsWith('.jpg') ||
         pathname.endsWith('.jpeg') ||
         pathname.endsWith('.gif') ||
         pathname.endsWith('.svg') ||
         pathname.endsWith('.ico') ||
         pathname.endsWith('.woff') ||
         pathname.endsWith('.woff2');
}

// 檢查是否為 CDN 資源
function isCDNResource(url) {
  return RUNTIME_CACHE_PATTERNS.some(pattern => pattern.test(url));
}

// 處理推送通知
self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }
  
  const data = event.data.json();
  const options = {
    body: data.body || '您有新的通知',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: data.tag || 'flow-os-notification',
    renotify: true,
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [],
    data: data.data || {}
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Flow-OS', options)
  );
});

// 處理通知點擊
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const action = event.action;
  const data = event.notification.data;
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // 嘗試找到已開啟的 Flow-OS 視窗
        for (const client of clientList) {
          if (client.url.includes('flow-os') && 'focus' in client) {
            if (action === 'start_timer') {
              client.postMessage({ type: 'START_TIMER' });
            }
            return client.focus();
          }
        }
        
        // 如果沒有找到，開啟新視窗
        let url = '/';
        if (action === 'start_timer') {
          url += '?auto-start=true';
        }
        
        return clients.openWindow(url);
      })
  );
});

// 處理來自主程式的訊息
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CLAIM_CLIENTS':
      self.clients.claim();
      break;
      
    case 'CACHE_RESOURCES':
      event.waitUntil(
        caches.open(RUNTIME_CACHE)
          .then(cache => cache.addAll(data.urls))
      );
      break;
      
    case 'CLEAR_CACHE':
      event.waitUntil(
        caches.delete(data.cacheName || RUNTIME_CACHE)
      );
      break;
      
    default:
      console.log('[SW] Unknown message type:', type);
  }
});

// 處理同步事件（背景同步）
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// 背景同步邏輯
async function doBackgroundSync() {
  try {
    console.log('[SW] Performing background sync...');
    
    // 獲取待同步的資料（這裡可以從 IndexedDB 獲取）
    const clients = await self.clients.matchAll();
    
    // 向所有客戶端發送同步請求
    clients.forEach(client => {
      client.postMessage({
        type: 'BACKGROUND_SYNC',
        timestamp: Date.now()
      });
    });
    
    console.log('[SW] Background sync completed');
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// 錯誤處理
self.addEventListener('error', (event) => {
  console.error('[SW] Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled promise rejection:', event.reason);
  event.preventDefault();
});

console.log('[SW] Service Worker script loaded');

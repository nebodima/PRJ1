// Service Worker для PWA
const CACHE_NAME = 'helpdesk-v1.0.2';
const urlsToCache = [
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Обработка запросов - Network First для HTML, Cache First для остального
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Игнорируем chrome-extension и другие протоколы
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  // Игнорируем API запросы - всегда идём в сеть
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Для HTML - всегда сеть, кеш как fallback
  if (request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  // Для остального - кеш, потом сеть
  event.respondWith(
    caches.match(request).then((response) => {
      if (response) {
        return response;
      }

      return fetch(request).then((response) => {
        if (response && response.status === 200 && request.method === 'GET') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      });
    })
  );
});

// Обработка push уведомлений
self.addEventListener('push', (event) => {
  let data = {
    title: 'HelpDesk',
    body: 'Новое уведомление',
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png'
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192x192.png',
    badge: data.badge || '/icon-72x72.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'helpdesk-notification',
    requireInteraction: data.requireInteraction || false,
    data: data.data || {},
    actions: data.actions || []
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'HelpDesk', options)
  );
});

// Обработка клика по уведомлению
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const data = event.notification.data || {};
  let url = '/';
  
  // Если есть taskId, открываем задачу
  if (data.taskId) {
    url = `/?taskId=${data.taskId}`;
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Если есть открытое окно, фокусируемся на нём
      for (let client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            data: data
          });
          return;
        }
      }
      // Иначе открываем новое окно
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Синхронизация в фоне
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-tasks') {
    event.waitUntil(syncTasks());
  }
});

async function syncTasks() {
  try {
    const response = await fetch('/api/tasks');
    const tasks = await response.json();
    console.log('Background sync: Tasks synced', tasks.length);
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}


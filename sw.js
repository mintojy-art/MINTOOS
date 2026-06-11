const CACHE_NAME = 'minto-os-v3';
const ASSETS = [
  './index.html',
  './639d7715983578b450da3fae_mintopng.png.png',
  './manifest.json'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});

// Show a notification on demand (posted from main thread)
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, screen } = event.data;
    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon: './639d7715983578b450da3fae_mintopng.png.png',
        badge: './639d7715983578b450da3fae_mintopng.png.png',
        data: { screen },
        requireInteraction: true,
        vibrate: [200, 100, 200]
      })
    );
  }
});

// When user taps a notification, focus or open the app
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const screen = event.notification.data?.screen || 'DASHBOARD';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if ('focus' in client) {
          client.postMessage({ type: 'NAVIGATE', screen });
          return client.focus();
        }
      }
      return self.clients.openWindow('/index.html?screen=' + screen);
    })
  );
});

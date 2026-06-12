// OneSignal push notification handling
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

// Offline caching (merged from sw.js so only one service worker runs)
const CACHE_NAME = 'minto-os-v5';
const ASSETS = [
  './index.html',
  './639d7715983578b450da3fae_mintopng.png.png',
  './manifest.json'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});

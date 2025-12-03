const CACHE_NAME = 'minto-os-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/639d7715983578b450da3fae_mintopng.png',
  '/manifest.json'
];

// Install Event: Cache Assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching app shell');
        return cache.addAll(ASSETS);
      })
  );
});

// Fetch Event: Serve from Cache if Offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cache if found, otherwise fetch from network
        return response || fetch(event.request);
      })
  );
});
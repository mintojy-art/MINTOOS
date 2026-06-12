// Offline caching
const CACHE_NAME = 'minto-os-v6';
const ASSETS = [
  './index.html',
  './639d7715983578b450da3fae_mintopng.png.png',
  './manifest.json'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS).catch(() => {})));
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

// Firebase Cloud Messaging — handles push when app is in background/closed
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAds-oPZv686w9sqHz3NGfV2mafNCGwR8w",
  authDomain: "minto-os.firebaseapp.com",
  projectId: "minto-os",
  storageBucket: "minto-os.firebasestorage.app",
  messagingSenderId: "683735878462",
  appId: "1:683735878462:web:2a3d7bd761bd9a30c67a6f"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  const title = payload.notification?.title || 'Minto OS';
  const body  = payload.notification?.body  || '';
  self.registration.showNotification(title, {
    body,
    icon: './639d7715983578b450da3fae_mintopng.png.png',
    badge: './639d7715983578b450da3fae_mintopng.png.png',
    data: { url: 'https://mintojy-art.github.io/MINTOOS/?screen=SIGNAL' }
  });
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || 'https://mintojy-art.github.io/MINTOOS/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      if (list.length) return list[0].focus();
      return self.clients.openWindow(url);
    })
  );
});

// Nursing Career BD service worker.
// Kept deliberately small: it does NOT cache pages or data (so users always see fresh
// questions and results). It only shows a friendly offline page when there is no internet.
const CACHE = 'ncbd-offline-v3';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll([OFFLINE_URL, '/icons/icon-192.png'])));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return; // everything else goes straight to the network
  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)));
});

// ---- Notifications (weekly free test, new circulars, announcements) ----
self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { title: event.data && event.data.text() }; }
  const title = d.title || 'Nursing Career BD';
  event.waitUntil(self.registration.showNotification(title, {
    body: d.body || '', icon: '/icons/icon-192.png', badge: '/icons/icon-192.png',
    tag: d.tag || 'ncbd', data: { url: d.url || '/' }, lang: 'bn',
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) { if (c.url.startsWith(self.location.origin) && 'focus' in c) { c.navigate(url); return c.focus(); } }
    return clients.openWindow(url);
  }));
});

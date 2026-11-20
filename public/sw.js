// Prosty service worker: pozwala zainstalować OFFLIMITS jak aplikację. Wszystko idzie z sieci.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});

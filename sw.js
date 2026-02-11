// Service Worker for Connecta PWA
const CACHE_NAME = 'connecta-v1';
const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './icon.svg',
    './css/style.css',
    './js/main.js',
    './js/game.js',
    './js/ui.js',
    './js/levels.js',
    './js/shapes.js',
    './js/audio.js',
    './js/i18n.js',
];

// Install: cache all assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Fetch: serve from cache, fallback to network
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(cached => cached || fetch(event.request))
    );
});

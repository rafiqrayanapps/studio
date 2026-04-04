// --- Service Worker for رفيق المصمم ---

const CACHE_NAME = 'rafiq-designer-cache-v4'; // Increment version to force update
const OFFLINE_URL = 'offline.html';

// On install, cache the offline page.
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install');
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // Caching the offline page with a network-first strategy during install.
      // This ensures we always get the latest version of the offline page.
      console.log(`[Service Worker] Caching asset: ${OFFLINE_URL}`);
      // By creating a new Request with 'reload', we bypass the browser's HTTP cache.
      const offlinePageRequest = new Request(OFFLINE_URL, { cache: 'reload' });
      await cache.add(offlinePageRequest);
    })()
  );
  // Force the waiting service worker to become the active service worker.
  self.skipWaiting();
});

// On activate, clean up old caches.
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate');
  event.waitUntil(
    (async () => {
      // Enable navigation preload if it's supported.
      if ('navigationPreload' in self.registration) {
        await self.registration.navigationPreload.enable();
      }
      // Delete old caches.
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })()
  );
  // Tell the active service worker to take control of the page immediately.
  self.clients.claim();
});

// The fetch handler decides how to respond to network requests.
self.addEventListener('fetch', (event) => {
  // We only want to handle navigation requests (i.e., for HTML pages).
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Use navigation preload if available.
          const preloadResponse = await event.preloadResponse;
          if (preloadResponse) {
            return preloadResponse;
          }

          // Always try to fetch from the network first.
          const networkResponse = await fetch(event.request);
          return networkResponse;
        } catch (error) {
          // If the network request fails, it means we are offline.
          console.log('[Service Worker] Fetch failed; returning offline page.');
          const cache = await caches.open(CACHE_NAME);
          const cachedResponse = await cache.match(OFFLINE_URL);
          return cachedResponse;
        }
      })()
    );
  }
  // For non-navigation requests, we don't do anything special.
  // The browser will handle them as usual.
});

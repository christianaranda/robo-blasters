// Service Worker for Robo Blasters PWA
const CACHE_NAME = 'robo-blasters-v3';
const RUNTIME_CACHE = 'robo-blasters-runtime-v3';

// Assets to cache on install
// Note: index.html is NOT precached - it uses network-first strategy to always get latest version
const PRECACHE_ASSETS = [
  '/src/main.js',
  '/src/player.js',
  '/src/weapon.js',
  '/src/weaponManager.js',
  '/src/weaponAttachment.js',
  '/src/target.js',
  '/src/audioManager.js',
  '/src/soundEffectManager.js',
  '/src/visualEffects.js',
  '/src/powerup.js',
  '/src/minimap.js',
  '/src/utils.js',
  '/manifest.json'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching assets');
        return cache.addAll(PRECACHE_ASSETS).catch((err) => {
          console.warn('[Service Worker] Failed to cache some assets:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Use network-first strategy for HTML documents and JS files to ensure latest version
  // This includes page navigations, HTML files, and JavaScript modules
  if (event.request.mode === 'navigate' ||
      event.request.destination === 'document' || 
      event.request.url.endsWith('.html') ||
      event.request.url.endsWith('.js') ||
      event.request.url === self.location.origin + '/' ||
      event.request.url === self.location.origin + '/index.html') {
    event.respondWith(
      // Use 'reload' cache option to bypass browser HTTP cache but allow runtime caching
      fetch(event.request, { cache: 'reload' })
        .then((response) => {
          // Cache the fresh response
          if (response && response.status === 200 && response.type === 'basic') {
            const responseToCache = response.clone();
            caches.open(RUNTIME_CACHE)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
          }
          return response;
        })
        .catch((error) => {
          console.error('[Service Worker] Network fetch failed, trying cache:', error);
          // Fallback to cache if network fails
          return caches.match(event.request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Last resort: try index.html
              return caches.match('/index.html');
            });
        })
    );
    return;
  }

  // Use cache-first strategy for other assets
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          return cachedResponse;
        }

        // Otherwise fetch from network
        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response for caching
            const responseToCache = response.clone();

            // Cache the response
            caches.open(RUNTIME_CACHE)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch((error) => {
            console.error('[Service Worker] Fetch failed:', error);
            throw error;
          });
      })
  );
});


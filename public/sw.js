// Golf Practice OS - Lightweight Service Worker
// Provides basic offline shell + future push notification foundation.
// Keep this file small and fast.

const CACHE_NAME = "golf-practice-os-v1";
const OFFLINE_URLS = [
  "/",
  "/practice",
  "/history",
  "/calendar",
  // Add more critical shell routes as the app grows
];

// Install: Pre-cache the app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS))
  );
  self.skipWaiting();
});

// Activate: Clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: Serve from cache when offline, otherwise network first for freshness
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== "GET") return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Optionally cache successful responses for future offline use
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseClone);
        });
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
  );
});

// Placeholder for future push notifications (e.g. "Time for your weekly review")
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title || "Golf Practice OS", {
      body: data.body || "Ready for deliberate practice?",
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      data: data.url ? { url: data.url } : undefined,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    // @ts-expect-error clients is available in SW scope
    self.clients.openWindow(url)
  );
});

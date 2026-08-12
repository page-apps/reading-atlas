const cacheName = "reading-atlas-shell-v1";

function scopeUrl(path = "./") {
  return new URL(path, self.registration.scope).toString();
}

const appShell = [
  scopeUrl(),
  scopeUrl("manifest.webmanifest"),
  scopeUrl("favicon.svg"),
  scopeUrl("icons/icon-192.png"),
  scopeUrl("icons/icon-512.png")
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(appShell)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("reading-atlas-") && key !== cacheName).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) caches.open(cacheName).then((cache) => cache.put(scopeUrl(), response.clone()));
          return response;
        })
        .catch(() => caches.match(scopeUrl()))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((response) => {
        if (response.ok) caches.open(cacheName).then((cache) => cache.put(request, response.clone()));
        return response;
      });
      return cached ?? network;
    })
  );
});

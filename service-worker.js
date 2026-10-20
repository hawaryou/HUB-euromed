/* EuroMed HUB — cache hors connexion v1 */
const CACHE_NAME = "euromed-hub-offline-v1";
const BASE = self.registration.scope;
const CORE_FILES = [
  BASE,
  BASE + "index.html",
  BASE + "signaler-anomalie.html",
  BASE + "style.css",
  BASE + "manifest.json",
  BASE + "assets/euromed-logo.png",
  BASE + "assets/chibi-euromed.png"
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    for (const url of CORE_FILES) {
      try { await cache.add(url); } catch (error) {
        // Une ressource optionnelle manquante ne doit pas empêcher l'installation.
        console.warn("Ressource hors ligne non mise en cache :", url);
      }
    }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith("euromed-hub-offline-") && name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || !url.href.startsWith(BASE)) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, response.clone()).catch(() => {});
        }
        return response;
      } catch (error) {
        const cached = await caches.match(request);
        if (cached) return cached;
        const path = url.pathname.endsWith("/signaler-anomalie.html") ? "signaler-anomalie.html" : "index.html";
        return (await caches.match(BASE + path)) || new Response("Cette page n'a pas encore été préparée pour le mode hors connexion. Reconnectez-vous et ouvrez-la une fois.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) {
      fetch(request).then(response => {
        if (response && response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response));
      }).catch(() => {});
      return cached;
    }
    try {
      const response = await fetch(request);
      if (response && response.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    } catch (error) {
      return new Response("", { status: 503, statusText: "Offline" });
    }
  })());
});

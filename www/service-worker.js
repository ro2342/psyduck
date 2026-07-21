// service-worker.js — cache-first pra same-origin, network-first só pro
// version.json (quando existir, a partir da versão com update-checker),
// nunca cacheia cross-origin (Firestore/OAuth, a partir da v0.2) —
// mesma regra crítica aprendida no theartistsway: cachear resposta de
// sync faz o app achar que sincronizou pra sempre com o primeiro pull.

const CACHE_NAME = "psyduck-v15";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/data.js",
  "./js/db.js",
  "./js/gamification.js",
  "./js/mascot.js",
  "./js/theme.js",
  "./js/notifications.js",
  "./js/methods.js",
  "./js/weather.js",
  "./js/obsidian.js",
  "./js/auth.js",
  "./js/sync.js",
  "./js/app.js",
  "./icons/icon.svg",
  "./icons/icon-maskable.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Nunca intercepta requisição de outra origem.
  if (url.origin !== self.location.origin) return;

  if (url.pathname.endsWith("/app/version.json")) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return res;
        })
        .catch(() => cached);
    })
  );
});

const CACHE_NAME = "maxchess-shell-v44";
const SHELL = [
  "./",
  "./index.html",
  "./maxchess-universe.html",
  "./manifest.webmanifest",
  "./icon.svg",
  "./404.html",
  "./offline.html",
  "./newsletter.html",
  "./newsletter-maker.html",
  "./owner-control.html",
  "./homepage-designs.html",
  "./team.html",
  "./team-workspace.html",
  "./training-planner.html",
  "./chess-clock.html",
  "./dgt-hub.html",
  "./players.html",
  "./maxchess-top-100.html",
  "./maxchess-world.html",
  "./tournament-broadcast.html",
  "./tournament-desk.html",
  "./notation-sheet-session.html",
  "./workbench.html",
  "./workspace.html",
  "./mail-connect.html",
  "./sso-connect.html",
  "./owner-setup.html",
  "./privacy.html",
  "./terms.html",
  "./maxchess-clock-bridge.js",
  "./owner-newsletter-booklet.js"
];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("maxchess-") && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin === self.location.origin && request.mode === "navigate") {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) { const copy = response.clone(); caches.open(CACHE_NAME).then(cache => cache.put(request, copy)); }
      return response;
    }).catch(() => caches.match(request).then(cachedPage => cachedPage || caches.match("./offline.html") || caches.match("./index.html"))));
    return;
  }
  const staticExternal = url.hostname === "cdn.jsdelivr.net" || url.hostname === "cdnjs.cloudflare.com" || url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  const staticLocal = url.origin === self.location.origin && /\.(?:svg|png|jpg|jpeg|webp|css|js|woff2?)$/i.test(url.pathname);
  if (!staticExternal && !staticLocal) return;
  event.respondWith(caches.match(request).then(cached => {
    return fetch(request).then(response => {
      if (response && (response.ok || response.type === "opaque")) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      }
      return response;
    }).catch(() => cached || caches.match(request));
  }));
});
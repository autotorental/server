// KILL SWITCH: this service worker removes itself and clears all caches so the
// admin never serves a stale build again.
self.addEventListener("install", () => { self.skipWaiting() })
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    try { const keys = await caches.keys(); await Promise.all(keys.map((k) => caches.delete(k))) } catch (_) {}
    try { await self.registration.unregister() } catch (_) {}
    try { const cs = await self.clients.matchAll({ type: "window" }); cs.forEach((c) => c.navigate(c.url)) } catch (_) {}
  })())
})
// Pass everything straight to the network — no caching.
self.addEventListener("fetch", () => {})

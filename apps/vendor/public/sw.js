const CACHE = "atr-vendor-v5"
self.addEventListener("install", (e) => { self.skipWaiting() })
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    await self.clients.claim()
    const tabs = await self.clients.matchAll({ type: "window" })
    for (const c of tabs) { try { c.navigate(c.url) } catch (e) {} }
  })())
})
self.addEventListener("fetch", (e) => {
  const req = e.request
  if (req.method !== "GET") return
  const url = new URL(req.url)
  if (url.hostname === "api.autotorental.com") return
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).catch(() => caches.match("/rental/")))
    return
  }
  if (/\.(js|css|woff2?|png|svg|jpg|jpeg|webp|ico)$/i.test(url.pathname)) {
    // Network-first: always try to fetch the latest asset, fall back to cache
    // only when offline. Prevents serving a stale build (which caused the
    // dashboard redirect loop).
    e.respondWith(
      caches.open(CACHE).then(cache =>
        fetch(req)
          .then(res => { cache.put(req, res.clone()); return res })
          .catch(() => cache.match(req))
      )
    )
  }
})

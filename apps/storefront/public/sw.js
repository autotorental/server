/* Auto to Rental — service worker (minimal, NO asset caching).
 *
 * Previous versions cached navigation HTML + /_next/static chunks under a fixed
 * CACHE_VERSION that never changed. That served returning visitors a STALE app
 * shell referencing content-hashed chunk filenames that 404 after a deploy
 * (ChunkLoadError -> the global "Something went wrong" screen, with no recovery).
 *
 * This SW now caches NOTHING. It exists only so the PWA install prompt keeps
 * working. The browser's HTTP cache already caches immutable /_next/static
 * assets (Cache-Control: public, max-age=31536000, immutable), and dynamic HTML
 * is always fetched fresh from the network — so a stale shell can never again
 * reference a dead chunk. On activate it purges ALL previously-cached entries,
 * which heals every visitor who still has a poisoned cache from the old SW.
 */
const CACHE_VERSION = "atr-v4-nocache"

self.addEventListener("install", () => {
  self.skipWaiting()
})

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

// Intentionally a pass-through: we never call respondWith, so every request goes
// straight to the network (with normal HTTP caching). The handler exists only to
// satisfy PWA installability criteria.
self.addEventListener("fetch", () => {})

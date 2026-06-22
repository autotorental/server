"use client"

// Matches the family of errors thrown when a client requests a JS/CSS chunk or a
// dynamically-imported module that no longer exists on the server (typical right
// after a deploy, when the browser still holds the old HTML/asset manifest).
const CHUNK_RE =
  /Loading chunk [\d]+ failed|Loading chunk failed|Failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|Loading CSS chunk|ChunkLoadError/i

export function isChunkError(err: unknown): boolean {
  if (!err) return false
  const name = (err as any)?.name
  if (typeof name === "string" && name.indexOf("ChunkLoadError") !== -1) return true
  const message = (err as any)?.message
  if (typeof message === "string" && CHUNK_RE.test(message)) return true
  if (typeof err === "string" && CHUNK_RE.test(err)) return true
  try {
    return CHUNK_RE.test(String(err))
  } catch {
    return false
  }
}

const KEY = "atr_chunk_reloaded"
const WINDOW_MS = 30_000 // allow at most one auto-reload per 30s per tab

// Returns true if it triggered a reload, false if a reload already happened
// within the window (caller should then show the manual error UI instead).
export function maybeReloadOnce(): boolean {
  try {
    const now = Date.now()
    const prev = Number(sessionStorage.getItem(KEY) || 0)
    if (prev && now - prev < WINDOW_MS) {
      // Already reloaded recently and we're STILL erroring -> reload did not fix it.
      return false
    }
    sessionStorage.setItem(KEY, String(now))
  } catch {
    if (typeof window === "undefined") return false
  }
  if (typeof window !== "undefined") {
    window.location.reload()
    return true
  }
  return false
}

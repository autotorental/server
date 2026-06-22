"use client"
import * as Sentry from "@sentry/nextjs"
import { useEffect, useState } from "react"
import { isChunkError, maybeReloadOnce } from "@/lib/chunk-error"

// Route-level error boundary. Lives INSIDE the root layout, so it must NOT render
// <html>/<body>. A stale-chunk error here triggers the same guarded reload as
// global-error; any other client error shows a small localized retry card that
// calls reset(), so a single route error no longer nukes the whole app.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [reloading, setReloading] = useState(false)

  useEffect(() => {
    Sentry.captureException(error)
    if (isChunkError(error) && maybeReloadOnce()) setReloading(true)
  }, [error])

  if (reloading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", fontFamily: "sans-serif", color: "#1753b0", fontSize: 14 }}>
        Loading…
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", fontFamily: "sans-serif", gap: 16, padding: 24, textAlign: "center" }}>
      <h2 style={{ fontSize: 20, fontWeight: 700 }}>Couldn’t load this page</h2>
      <button onClick={() => reset()} style={{ padding: "10px 24px", background: "#1753b0", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
        Try again
      </button>
    </div>
  )
}

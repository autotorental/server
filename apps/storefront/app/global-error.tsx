"use client"
import * as Sentry from "@sentry/nextjs"
import { useEffect, useState } from "react"
import { isChunkError, maybeReloadOnce } from "@/lib/chunk-error"

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // If true, a stale-chunk reload is in progress — render a blank body, not the error UI.
  const [reloading, setReloading] = useState(false)

  useEffect(() => {
    Sentry.captureException(error)
    // Stale client chunks after a deploy: hard-reload ONCE (guarded) instead of
    // leaving the user stuck on "Something went wrong".
    if (isChunkError(error) && maybeReloadOnce()) {
      setReloading(true)
    }
  }, [error])

  return (
    <html>
      <body>
        {reloading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "sans-serif", color: "#1753b0", fontSize: 14 }}>
            Loading…
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "sans-serif", gap: 16 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>Something went wrong</h2>
            <button onClick={reset} style={{ padding: "10px 24px", background: "#1753b0", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
              Try again
            </button>
          </div>
        )}
      </body>
    </html>
  )
}

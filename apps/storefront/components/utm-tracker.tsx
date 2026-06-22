"use client"
import { useEffect } from "react"

// Captures UTM parameters on landing, saves to localStorage + cookie (28 days)
// so they can be attached to every conversion event, even if the user
// browses around before contacting a rental company.
export default function UtmTracker() {
  useEffect(() => {
    try {
      const u = new URLSearchParams(window.location.search)
      const captured = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid", "ttclid"]
      const found: Record<string, string> = {}
      for (const k of captured) {
        const v = u.get(k)
        if (v) found[k] = v
      }
      if (Object.keys(found).length === 0) return
      // Save for 28 days
      const data = { ...found, captured_at: Date.now(), landing: window.location.pathname + window.location.search }
      localStorage.setItem("utm", JSON.stringify(data))
      // Also cookie so it survives in environments where localStorage is blocked
      document.cookie = `utm=${encodeURIComponent(JSON.stringify(data))}; path=/; max-age=${28 * 86400}; SameSite=Lax`
    } catch {}
  }, [])
  return null
}

// Helper for other components to read the saved attribution
export function getUtm(): Record<string, string> {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem("utm")
    if (!raw) return {}
    return JSON.parse(raw)
  } catch { return {} }
}

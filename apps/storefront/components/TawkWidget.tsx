"use client"
import { useEffect } from "react"

// Official Tawk.to live-chat widget. Loads only when NEXT_PUBLIC_TAWK_ID is set
// (format: "<propertyId>/<widgetId>", from your Tawk.to dashboard → Admin →
// Channels → Chat Widget). Free, unlimited agents, native mobile apps to reply.
export function TawkWidget() {
  useEffect(() => {
    const id = process.env.NEXT_PUBLIC_TAWK_ID
    if (!id || typeof window === "undefined") return
    if (document.getElementById("tawkto-embed")) return
    const s = document.createElement("script")
    s.id = "tawkto-embed"
    s.async = true
    s.src = `https://embed.tawk.to/${id}`
    s.charset = "UTF-8"
    s.setAttribute("crossorigin", "*")
    document.body.appendChild(s)
  }, [])
  return null
}

export default TawkWidget

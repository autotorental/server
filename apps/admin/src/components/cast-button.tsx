import { useState } from "react"
import { Button, toast } from "@medusajs/ui"

// Cast / share the current dashboard page to a TV or external screen.
// • Chrome / Edge  → Presentation API opens the Google Cast picker (Chromecast + many smart TVs).
// • Anything else  → goes fullscreen so the owner can mirror via the OS:
//     macOS AirPlay (Control Center → Screen Mirroring) · Windows Miracast (Win+K).
export default function CastButton() {
  const [busy, setBusy] = useState(false)

  const cast = async () => {
    const url = window.location.href
    const PR = (window as any).PresentationRequest
    if (PR) {
      try {
        setBusy(true)
        const req = new PR([url])
        await req.start() // shows the Cast device picker
        setBusy(false)
        toast.success("Casting", { description: "This page is now showing on your TV." })
        return
      } catch {
        setBusy(false)
        // user dismissed the picker, or no cast devices found — fall through to fullscreen
      }
    }
    try { await document.documentElement.requestFullscreen() } catch {}
    toast.info("Mirror to a TV", {
      description: "Chrome: ⋮ menu → Cast. Mac: Control Center → Screen Mirroring (AirPlay). Windows: Win+K (Miracast). Page is fullscreen for a clean display.",
      duration: 9000,
    })
  }

  return (
    <Button variant="secondary" size="small" onClick={cast} disabled={busy} title="Cast or share this page to a TV / external screen">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 16.1A5 5 0 0 1 5.9 20M2 12.05A9 9 0 0 1 9.95 20M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6" />
        <line x1="2" y1="20" x2="2.01" y2="20" />
      </svg>
      {busy ? "Connecting…" : "Cast to TV"}
    </Button>
  )
}

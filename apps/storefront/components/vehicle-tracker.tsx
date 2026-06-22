"use client"
import { useEffect } from "react"
import { trackEvent } from "./tracking"
import { getUtm } from "./utm-tracker"

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.autotorental.com"
const KEY = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || ""

type Props = {
  vehicleId: string
  sellerId: string
  brandName?: string
  modelName?: string
  cityName?: string
  price?: number
}

export default function VehicleTracker(props: Props) {
  useEffect(() => {
    const params = {
      content_type: "vehicle",
      content_ids: [props.vehicleId],
      content_name: [props.brandName, props.modelName].filter(Boolean).join(" "),
      value: props.price,
      currency: "AED",
      city: props.cityName,
    }
    trackEvent("vehicle_view", params)

    // Track recent views in localStorage (last 20)
    try {
      const prev = JSON.parse(localStorage.getItem("recent_views") || "[]") as string[]
      const next = [props.vehicleId, ...prev.filter(x => x !== props.vehicleId)].slice(0, 20)
      localStorage.setItem("recent_views", JSON.stringify(next))
    } catch {}

    const utm = getUtm()

    // Server-side analytics record (your existing /store/analytics/track)
    fetch(`${API}/store/analytics/track`, {
      method: "POST",
      headers: { "x-publishable-api-key": KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ event_type: "view", product_id: props.vehicleId, seller_id: props.sellerId, utm }),
    }).catch(() => {})

    // Attach click trackers to contact CTAs
    const handler = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.("a") as HTMLAnchorElement | null
      if (!a) return
      const href = a.getAttribute("href") || ""
      let type: string | null = null
      if (href.includes("wa.me") || href.includes("api.whatsapp.com")) type = "whatsapp"
      else if (href.startsWith("tel:")) type = "call"
      else if (href.includes("livekit.autotorental.com")) type = "webrtc"
      if (!type) return

      const eventName = `contact_${type}`
      trackEvent(eventName, { vehicle_id: props.vehicleId, seller_id: props.sellerId, value: props.price, currency: "AED", ...utm })
      fetch(`${API}/store/analytics/track`, {
        method: "POST",
        headers: { "x-publishable-api-key": KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ event_type: type, product_id: props.vehicleId, seller_id: props.sellerId, utm }),
        keepalive: true,
      }).catch(() => {})
    }
    document.addEventListener("click", handler, { capture: true })
    return () => document.removeEventListener("click", handler, { capture: true } as any)
  }, [props.vehicleId])

  return null
}

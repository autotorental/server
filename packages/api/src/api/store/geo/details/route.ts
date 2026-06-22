import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getSetting } from "../../../../lib/settings"

// GET /store/geo/details?place_id=...
// Resolves a Google Places Autocomplete prediction to real coordinates +
// formatted address. Used right after the vendor taps a suggestion.
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const placeId = String((req.query as any).place_id || (req.query as any).id || "").trim()
  if (!placeId) return res.status(400).json({ message: "place_id required" })

  const key = (await getSetting(req.scope, "google_maps_api_key")) || process.env.GOOGLE_MAPS_API_KEY || ""
  if (!key) return res.status(503).json({ message: "maps unavailable" })

  try {
    const p = new URLSearchParams({
      place_id: placeId,
      key,
      fields: "geometry,name,formatted_address",
      language: "en",
    })
    const r = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?${p.toString()}`)
    const j: any = await r.json()
    const loc = j.result?.geometry?.location
    if (j.status !== "OK" || !loc) return res.status(404).json({ message: j.status || "not found" })
    return res.json({
      latitude: Number(loc.lat),
      longitude: Number(loc.lng),
      label: [j.result?.name, j.result?.formatted_address].filter(Boolean).join(" — "),
      name: j.result?.name || "",
      city: (j.result?.formatted_address || "").split(",")[0]?.trim() || j.result?.name || "",
      formatted_address: j.result?.formatted_address || "",
    })
  } catch {
    return res.status(502).json({ message: "lookup failed" })
  }
}

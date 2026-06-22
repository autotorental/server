import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getSetting } from "../../../../lib/settings"

// GET /store/geo/search?q=...&country=ae
// Type-ahead place search for the vendor "company location" picker.
// Primary: Google Places AUTOCOMPLETE (best for partial business-name matching
// as the vendor types). Predictions carry a place_id but no coordinates — the
// app resolves coordinates on select via /store/geo/details. Falls back to
// Google Text Search (coords inline) then OpenStreetMap Nominatim.
type Suggestion = { id: string; label: string; city: string; latitude: number; longitude: number }

const UA = "AutoToRental/1.0 (https://autotorental.com; support@autotorental.com)"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const q = String((req.query as any).q || "").trim()
  const country = String((req.query as any).country || "").trim().toLowerCase()
  if (q.length < 2) return res.json({ suggestions: [], source: "none" })

  const key = (await getSetting(req.scope, "google_maps_api_key")) || process.env.GOOGLE_MAPS_API_KEY || ""

  if (key) {
    // ---- 1) Places Autocomplete (type-ahead, finds businesses by partial name) ----
    try {
      const p = new URLSearchParams({ input: q, key, language: "en" })
      if (country) p.set("components", `country:${country}`)
      const r = await fetch(`https://maps.googleapis.com/maps/api/place/autocomplete/json?${p.toString()}`)
      const j: any = await r.json()
      if (j.status === "OK" && Array.isArray(j.predictions) && j.predictions.length) {
        const suggestions: Suggestion[] = j.predictions.slice(0, 8).map((pr: any) => ({
          id: String(pr.place_id),
          label: pr.description || pr.structured_formatting?.main_text || "",
          city: pr.structured_formatting?.main_text || (pr.description || "").split(",")[0]?.trim() || "",
          latitude: NaN,  // resolved on select via /store/geo/details
          longitude: NaN,
        }))
        return res.json({ suggestions, source: "google_autocomplete" })
      }
      // ZERO_RESULTS / REQUEST_DENIED → fall through
    } catch { /* fall through */ }

    // ---- 2) Places Text Search (coords inline) ----
    try {
      const params = new URLSearchParams({ query: q, key })
      if (country) params.set("region", country)
      const r = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?${params.toString()}`)
      const j: any = await r.json()
      if (j.status === "OK" || j.status === "ZERO_RESULTS") {
        const suggestions: Suggestion[] = (j.results || []).slice(0, 8).map((pl: any) => ({
          id: String(pl.place_id),
          label: [pl.name, pl.formatted_address].filter(Boolean).join(" — "),
          city: (pl.formatted_address || "").split(",")[0]?.trim() || pl.name || "",
          latitude: Number(pl.geometry?.location?.lat),
          longitude: Number(pl.geometry?.location?.lng),
        })).filter((s: Suggestion) => Number.isFinite(s.latitude) && Number.isFinite(s.longitude))
        if (suggestions.length) return res.json({ suggestions, source: "google_text" })
      }
    } catch { /* fall through */ }
  }

  // ---- 3) Nominatim (OpenStreetMap) fallback ----
  try {
    const params = new URLSearchParams({ format: "json", addressdetails: "1", limit: "8", q })
    if (country) params.set("countrycodes", country)
    const r = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: { Accept: "application/json", "User-Agent": UA },
    })
    const arr: any[] = r.ok ? await r.json() : []
    const suggestions: Suggestion[] = arr.map((h) => {
      const a = h.address || {}
      return {
        id: String(h.place_id),
        label: h.display_name,
        city: a.city || a.town || a.village || a.state || (h.display_name || "").split(",")[0]?.trim() || "",
        latitude: Number(h.lat),
        longitude: Number(h.lon),
      }
    }).filter((s) => Number.isFinite(s.latitude) && Number.isFinite(s.longitude))
    return res.json({ suggestions, source: "osm" })
  } catch {
    return res.json({ suggestions: [], source: "error" })
  }
}

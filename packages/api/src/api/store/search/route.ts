import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { meili, VEHICLES_INDEX } from "../../../lib/meili"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const m = await meili()
  if (!m) return res.status(503).json({ message: "Search not available" })
  const q = (req.query.q as string) || ""
  const limit = parseInt((req.query.limit as string) || "20", 10)
  const country = req.query.country as string
  const filter: string[] = ["status = active"]
  const esc = (v: any) => String(v).replace(/"/g, '\\"')
  if (country) filter.push(`country_code = "${esc(country.toLowerCase())}"`)
  if (req.query.brand) filter.push(`brand_id = "${esc(req.query.brand)}"`)
  if (req.query.city) filter.push(`city_id = "${esc(req.query.city)}"`)
  if (req.query.body) filter.push(`body_type_id = "${esc(req.query.body)}"`)
  if (req.query.transmission) filter.push(`transmission = "${esc(req.query.transmission)}"`)
  if (req.query.fuel) filter.push(`fuel_type = "${esc(req.query.fuel)}"`)
  if (req.query.year) { const y = parseInt(String(req.query.year),10); if (Number.isFinite(y)) filter.push(`year = ${y}`) }
  try {
    const r = await m.index(VEHICLES_INDEX).search(q, {
      limit,
      filter,
      attributesToHighlight: ["title", "description", "brand_name", "model_name"],
      sort: ["is_featured:desc", "created_at:desc"],
    })
    res.json({ hits: r.hits, total: r.estimatedTotalHits, took_ms: r.processingTimeMs })
  } catch (e: any) {
    res.status(500).json({ message: "search failed", error: e.message })
  }
}

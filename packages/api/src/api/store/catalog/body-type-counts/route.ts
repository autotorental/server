import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// GET /store/catalog/body-type-counts?country=ae
// Returns { counts: { [body_type_id]: number } } — published cars per body type,
// optionally filtered by country (via the city the car belongs to).
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const country = String((req.query as any).country || "").toLowerCase()
  try {
    let q = pg("vehicle as v").whereNull("v.deleted_at").whereNotNull("v.body_type_id")
    try { q = q.where("v.status", "published") } catch { /* status optional */ }
    if (country) {
      q = q.join("city as c", "c.id", "v.city_id").where("c.country_code", country)
    }
    const rows = await q.select("v.body_type_id").count("* as n").groupBy("v.body_type_id")
    const counts: Record<string, number> = {}
    for (const r of rows) counts[r.body_type_id] = Number(r.n || 0)
    res.json({ counts })
  } catch (e: any) {
    res.json({ counts: {} })
  }
}

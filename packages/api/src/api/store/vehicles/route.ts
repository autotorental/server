import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CATALOG_MODULE } from "../../../modules/catalog"
import { LOCATIONS_MODULE } from "../../../modules/locations"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const cat: any = req.scope.resolve(CATALOG_MODULE)
  const loc: any = req.scope.resolve(LOCATIONS_MODULE)
  const seller: any = req.scope.resolve("seller")
  const q = req.query as any
  const filters: any = { status: "active" }

  for (const k of ["brand_id","model_id","body_type_id","city_id","seller_id","fuel_type","transmission","color"]) {
    if (q[k]) filters[k] = q[k]
  }
  if (q.year) filters.year = parseInt(q.year, 10)
  if (q.seats) filters.seats = parseInt(q.seats, 10)
  if (q.is_featured === "true") filters.is_featured = true

  if (q.country && !q.city_id) {
    try {
      const cities = await loc.listCities({ country_code: q.country.toLowerCase() }, { take: 500 })
      const ids = cities.map((c: any) => c.id)
      if (ids.length) filters.city_id = ids
      else { res.json({ vehicles: [], limit: parseInt(q.limit,10)||20, offset: parseInt(q.offset,10)||0 }); return }
    } catch {}
  }

  const limit = parseInt(q.limit, 10) || 20
  const offset = parseInt(q.offset, 10) || 0
  let vehicles = await cat.listVehicles(filters, {
    order: { is_featured: "DESC", created_at: "DESC" },
    take: limit, skip: offset,
  })

  // Filter out vehicles from sellers with expired subscriptions
  try {
    const sellerIds = [...new Set(vehicles.map((v: any) => v.seller_id))]
    if (sellerIds.length > 0) {
      const sellers = await seller.listSellers({ id: sellerIds }, { take: 500 })
      const now = new Date()
      const activeSellers = new Set<string>()
      for (const s of sellers) {
        const trialEnd = s.trial_ends_at ? new Date(s.trial_ends_at) : null
        const subEnd = s.subscription_ends_at ? new Date(s.subscription_ends_at) : null
        let status = s.subscription_status || "trial"
        if (status === "active" && subEnd && subEnd < now) status = "expired"
        if (status === "trial" && trialEnd && trialEnd < now) status = "expired"
        if (status === "trial" || status === "active") activeSellers.add(s.id)
      }
      vehicles = vehicles.filter((v: any) => activeSellers.has(v.seller_id))
    }
  } catch (e) { /* fail open */ }

  res.json({ vehicles, limit, offset })
}

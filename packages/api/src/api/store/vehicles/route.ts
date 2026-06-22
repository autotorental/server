import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { CATALOG_MODULE } from "../../../modules/catalog"
import { LOCATIONS_MODULE } from "../../../modules/locations"

// Append CDN resize params to Contentful image URLs so mobile/web clients load
// ~100KB thumbnails instead of multi-MB originals. Server-side = every client
// benefits instantly (old apps, new apps, web) with no client update needed.
function optimizeImageUrl(url: string, width: number): string {
  if (!url || typeof url !== "string") return url
  if (url.includes("images.ctfassets.net")) {
    if (/[?&](w=|fm=)/.test(url)) return url // already optimized
    const sep = url.includes("?") ? "&" : "?"
    return `${url}${sep}w=${width}&fm=webp&q=78`
  }
  return url
}
function optimizeVehiclePhotos(v: any): void {
  try {
    const raw = Array.isArray(v.photos) ? v.photos : (typeof v.photos === "string" ? JSON.parse(v.photos || "[]") : [])
    if (Array.isArray(raw) && raw.length) {
      // List/card thumbnails: 800px is plenty and crisp on retina
      v.photos = raw.map((u: string) => optimizeImageUrl(u, 800))
    }
  } catch {}
}

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

  // Custom-domain vendors use their company page as their OWN website, so that
  // page shows their cars immediately (active + pending_approval) — no wait for
  // our review. The public marketplace (no seller_id, or sellers without a
  // custom domain) still shows approved cars only; pending stays gated to admin
  // review at /dashboard/pending-approvals.
  if (q.seller_id) {
    try {
      const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
      const row = await pg("seller").where({ id: q.seller_id }).select("custom_domain").first()
      if (row?.custom_domain) filters.status = ["active", "pending_approval"]
    } catch { /* fall back to active-only */ }
  }

  if (q.country && !q.city_id) {
    try {
      const cities = await loc.listCities({ country_code: q.country.toLowerCase() }, { take: 500 })
      const ids = cities.map((c: any) => c.id)
      if (ids.length) filters.city_id = ids
      else { res.json({ vehicles: [], limit: parseInt(q.limit,10)||20, offset: parseInt(q.offset,10)||0 }); return }
    } catch (e) {
      res.json({ vehicles: [], limit: parseInt(q.limit,10)||20, offset: parseInt(q.offset,10)||0 }); return
    }
  }

  const limit = parseInt(q.limit, 10) || 20
  const offset = parseInt(q.offset, 10) || 0
  // Over-fetch (skip:0) so the expired-subscription filter below cannot shrink
  // the page; we slice to [offset, offset+limit] AFTER filtering.
  let vehicles = await cat.listVehicles(filters, {
    order: { is_featured: "DESC", created_at: "DESC" },
    take: Math.min(offset + limit + 80, 500), skip: 0,
  })

  // Price range (daily) — applied on the over-fetched set before paging so the
  // advanced filter's budget range is real server-side filtering.
  const minP = q.min_price ? parseFloat(q.min_price) : null
  const maxP = q.max_price ? parseFloat(q.max_price) : null
  if (minP != null || maxP != null) {
    vehicles = vehicles.filter((v: any) => {
      const p = Number(v.daily_price)
      if (!isFinite(p)) return false
      if (minP != null && p < minP) return false
      if (maxP != null && p > maxP) return false
      return true
    })
  }

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

  // Page the active-only list (we over-fetched above).
  vehicles = vehicles.slice(offset, offset + limit)

  // Attach the city name to every vehicle so clients show the location
  // directly — no dependency on a separate cities list that can fail to load.
  try {
    const cityIds = [...new Set(vehicles.map((v: any) => v.city_id).filter(Boolean))]
    if (cityIds.length) {
      const cityRows = await loc.listCities({ id: cityIds }, { take: 500 })
      const nameById = new Map(cityRows.map((c: any) => [c.id, c.name]))
      const nameArById = new Map(cityRows.map((c: any) => [c.id, c.name_ar]))
      for (const v of vehicles) {
        v.city_name = nameById.get(v.city_id) || null
        v.city_name_ar = nameArById.get(v.city_id) || null
      }
    }
  } catch {}

  for (const v of vehicles) optimizeVehiclePhotos(v)
  res.json({ vehicles, limit, offset })
}

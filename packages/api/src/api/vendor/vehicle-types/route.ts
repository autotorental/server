import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { resolveVendorSellerId } from "../../../lib/vendor-seller"

// GET /vendor/vehicle-types — this vendor's cars grouped by body type (cards view)
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const sellerId = await resolveVendorSellerId(req)
  if (!sellerId) return res.status(401).json({ message: "unauthenticated" })
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const rows = await pg("vehicle as v")
    .leftJoin("body_type as bt", "bt.id", "v.body_type_id")
    .where("v.seller_id", sellerId).whereNull("v.deleted_at")
    .orderBy("v.created_at", "desc")
    .select("v.id", "v.title", "v.photos", "v.daily_price", "v.sale_daily_price", "v.status",
            pg.raw("coalesce(bt.name, 'Uncategorized') as type"))
  const groups: Record<string, any[]> = {}
  for (const r of rows) {
    const photos = Array.isArray(r.photos) ? r.photos : (() => { try { return JSON.parse(r.photos || "[]") } catch { return [] } })()
    const t = r.type || "Uncategorized"
    ;(groups[t] = groups[t] || []).push({ id: r.id, title: r.title, photo: photos[0] || null,
      daily_price: r.daily_price, sale_daily_price: r.sale_daily_price, status: r.status })
  }
  const types = Object.keys(groups)
    .sort((a, b) => groups[b].length - groups[a].length)
    .map((name) => ({ name, count: groups[name].length, cars: groups[name] }))
  res.json({ types, total: rows.length })
}

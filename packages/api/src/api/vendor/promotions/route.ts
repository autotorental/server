import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CATALOG_MODULE } from "../../../modules/catalog"
import { notifyFollowers } from "../../../lib/follower-notify"

function getSellerId(req: MedusaRequest): string | null {
  const auth = (req as any).auth_context
  return auth?.app_metadata?.seller_id || auth?.actor_id || null
}

// GET — list vendor's vehicles for promotion management
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const sellerId = getSellerId(req); if (!sellerId) return res.status(401).json({ message: "Unauthorized" })
  const svc: any = req.scope.resolve(CATALOG_MODULE)
  const vehicles = await svc.listVehicles({ seller_id: sellerId }, { order: { created_at: "DESC" } })
  res.json({ vehicles })
}

// POST — bulk apply discount to selected vehicles
//   body: { vehicle_ids: ["veh_xxx",...], discount_percent: 20, label?: "Eid Sale", starts_at?, ends_at? }
//      OR { vehicle_ids, sale_daily_price: 100, sale_weekly_price?: ..., sale_monthly_price?: ... }
//      OR clear: { vehicle_ids, clear: true }
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const sellerId = getSellerId(req); if (!sellerId) return res.status(401).json({ message: "Unauthorized" })
  const svc: any = req.scope.resolve(CATALOG_MODULE)
  const body = req.body as any
  if (!body?.vehicle_ids || !Array.isArray(body.vehicle_ids) || body.vehicle_ids.length === 0) {
    return res.status(400).json({ message: "vehicle_ids array required" })
  }
  // Fetch the vehicles and confirm ownership
  const vehicles = await svc.listVehicles({ id: body.vehicle_ids, seller_id: sellerId })
  const ownedIds = vehicles.map((v: any) => v.id)
  if (ownedIds.length === 0) return res.status(404).json({ message: "No vehicles found" })

  const updates = vehicles.map((v: any) => {
    const update: any = { id: v.id }
    if (body.clear) {
      update.sale_daily_price = null
      update.sale_weekly_price = null
      update.sale_monthly_price = null
      update.discount_percent = null
      update.discount_label = null
      update.discount_starts_at = null
      update.discount_ends_at = null
      return update
    }
    if (body.discount_percent != null) {
      const p = Math.max(0, Math.min(99, parseFloat(body.discount_percent)))
      update.discount_percent = p
      // compute sale prices from regular prices
      const factor = 1 - (p / 100)
      if (v.daily_price)   update.sale_daily_price   = Math.round(v.daily_price * factor)
      if (v.weekly_price)  update.sale_weekly_price  = Math.round(v.weekly_price * factor)
      if (v.monthly_price) update.sale_monthly_price = Math.round(v.monthly_price * factor)
    }
    if (body.sale_daily_price != null)   update.sale_daily_price = parseFloat(body.sale_daily_price)
    if (body.sale_weekly_price != null)  update.sale_weekly_price = parseFloat(body.sale_weekly_price)
    if (body.sale_monthly_price != null) update.sale_monthly_price = parseFloat(body.sale_monthly_price)
    if (body.label) update.discount_label = body.label
    if (body.starts_at) update.discount_starts_at = new Date(body.starts_at)
    if (body.ends_at)   update.discount_ends_at = new Date(body.ends_at)
    return update
  })
  await svc.updateVehicles(updates)

  if (!body.clear) {
    for (const v of vehicles) {
      const patch = updates.find((u: any) => u.id === v.id)
      if (!patch) continue
      const merged = { ...v, ...patch }
      const oldDaily = v.daily_price
      const newDaily = merged.sale_daily_price ?? merged.daily_price
      const hasOffer =
        patch.discount_percent != null ||
        patch.sale_daily_price != null ||
        patch.discount_label
      if (hasOffer && oldDaily && newDaily && newDaily < oldDaily) {
        void notifyFollowers(req.scope, sellerId, merged, "price_drop", oldDaily).catch((e: any) =>
          console.error("[follower-notify] promotion:", e?.message || e)
        )
      }
    }
  }

  res.json({ updated: updates.length, vehicle_ids: ownedIds })
}

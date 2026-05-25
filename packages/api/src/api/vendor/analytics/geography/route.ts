// GET /admin/analytics/geography?days=30&seller_id=optional
// Returns counts by country + device + hour-of-day
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const knex: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const q = req.query as any
  const days = parseInt(q.days || "30", 10)
  const from = new Date(Date.now() - days * 86400000)
  const sellerId = (req as any).auth_context?.app_metadata?.seller_id; if (!sellerId) return res.status(401).json({ message: "unauthenticated" }); const sellerFilter = { seller_id: sellerId }

  const [countries, devices, hourly, dow] = await Promise.all([
    knex("contact_event")
      .select("country_code", "country_name")
      .count("* as count")
      .whereNull("deleted_at")
      .where("created_at", ">=", from)
      .modify((qb: any) => { if (sellerFilter.seller_id) qb.where(sellerFilter) })
      .whereNotNull("country_code")
      .groupBy("country_code", "country_name")
      .orderBy("count", "desc")
      .limit(50),
    knex("contact_event")
      .select("device_type")
      .count("* as count")
      .whereNull("deleted_at")
      .where("created_at", ">=", from)
      .modify((qb: any) => { if (sellerFilter.seller_id) qb.where(sellerFilter) })
      .whereNotNull("device_type")
      .groupBy("device_type"),
    knex("contact_event")
      .select("hour")
      .count("* as count")
      .whereNull("deleted_at")
      .where("created_at", ">=", from)
      .modify((qb: any) => { if (sellerFilter.seller_id) qb.where(sellerFilter) })
      .whereNotNull("hour")
      .groupBy("hour")
      .orderBy("hour"),
    knex("contact_event")
      .select("day_of_week", "hour")
      .count("* as count")
      .whereNull("deleted_at")
      .where("created_at", ">=", from)
      .modify((qb: any) => { if (sellerFilter.seller_id) qb.where(sellerFilter) })
      .whereNotNull("hour")
      .whereNotNull("day_of_week")
      .groupBy("day_of_week", "hour"),
  ])

  res.json({
    countries: countries.map((c: any) => ({ code: c.country_code, name: c.country_name, count: parseInt(c.count, 10) })),
    devices: devices.map((d: any) => ({ type: d.device_type, count: parseInt(d.count, 10) })),
    hourly: hourly.map((h: any) => ({ hour: h.hour, count: parseInt(h.count, 10) })),
    heatmap: dow.map((h: any) => ({ day: h.day_of_week, hour: h.hour, count: parseInt(h.count, 10) })),
    days,
  })
}

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const knex: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const query = req.query as { from?: string; to?: string }
  const auth = (req as any).auth_context
  const sellerId = auth?.actor_id || auth?.app_metadata?.seller_id
  if (!sellerId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const from = query.from ? new Date(query.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const to = query.to ? new Date(query.to) : new Date()

  const totals = await knex("contact_event")
    .select("event_type")
    .count("* as count")
    .whereNull("deleted_at")
    .where("seller_id", sellerId)
    .whereBetween("created_at", [from, to])
    .groupBy("event_type")

  // Time series — by day
  const series = await knex("contact_event")
    .select(knex.raw("DATE(created_at) as day"), "event_type")
    .count("* as count")
    .whereNull("deleted_at")
    .where("seller_id", sellerId)
    .whereBetween("created_at", [from, to])
    .groupBy("day", "event_type")
    .orderBy("day")

  // Top products by clicks
  const topProducts = await knex("contact_event")
    .select("product_id", "event_type")
    .count("* as count")
    .whereNull("deleted_at")
    .where("seller_id", sellerId)
    .whereBetween("created_at", [from, to])
    .groupBy("product_id", "event_type")
    .orderBy("count", "desc")
    .limit(10)

  res.json({
    period: { from, to },
    seller_id: sellerId,
    totals: totals.reduce((acc: any, r: any) => ({ ...acc, [r.event_type]: parseInt(r.count, 10) }), { call: 0, whatsapp: 0, webrtc: 0, view: 0 }),
    daily: series,
    top_products: topProducts,
  })
}

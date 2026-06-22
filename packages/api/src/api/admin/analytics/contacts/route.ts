import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { excludeBots } from "../../../../lib/bot-filter"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const knex: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const q = req.query as any
  const query = q
  
  const from = query.from ? new Date(query.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const to = query.to ? new Date(query.to) : new Date()

  // Totals by event type (overall)
  const totals = await knex("contact_event")
    .select("event_type")
    .count("* as count")
    .whereNull("deleted_at")
    .whereBetween("created_at", [from, to])
    .modify((qb: any) => { excludeBots(qb, "user_agent"); if (q.seller_id) qb.where("seller_id", q.seller_id); if (q.event_type && q.event_type !== "all") qb.where("event_type", q.event_type) })
    .groupBy("event_type")

  // Per-vendor breakdown — LEFT JOIN to seller for the company name
  const byVendor = await knex("contact_event as ce")
    .leftJoin("seller as s", "s.id", "ce.seller_id")
    .select("ce.seller_id", "ce.event_type", "s.name as seller_name", "s.handle as seller_handle")
    .count("* as count")
    .whereNull("ce.deleted_at")
    .whereBetween("ce.created_at", [from, to])
    .modify((qb: any) => { excludeBots(qb, "ce.user_agent"); if (q.seller_id) qb.where("ce.seller_id", q.seller_id); if (q.event_type && q.event_type !== "all") qb.where("ce.event_type", q.event_type) })
    .groupBy("ce.seller_id", "ce.event_type", "s.name", "s.handle")

  // Aggregate per vendor
  const vendorMap = new Map<string, any>()
  for (const row of byVendor) {
    const v = vendorMap.get(row.seller_id) || {
      seller_id: row.seller_id,
      seller_name: row.seller_name || row.seller_id, // fallback to id if no seller record
      seller_handle: row.seller_handle,
      total: 0, call: 0, whatsapp: 0, webrtc: 0, view: 0,
    }
    v[row.event_type] = parseInt(row.count, 10)
    v.total += parseInt(row.count, 10)
    vendorMap.set(row.seller_id, v)
  }
  const vendors = Array.from(vendorMap.values()).sort((a, b) => b.total - a.total)

  // Top products (with seller name)
  const byProduct = await knex("contact_event as ce")
    .leftJoin("seller as s", "s.id", "ce.seller_id")
    .leftJoin("vehicle as p", "p.id", "ce.product_id")
    .select("ce.product_id", "ce.seller_id", "ce.event_type", "s.name as seller_name", "p.title as product_title")
    .count("* as count")
    .whereNull("ce.deleted_at")
    .whereBetween("ce.created_at", [from, to])
    .modify((qb: any) => { excludeBots(qb, "ce.user_agent"); if (q.seller_id) qb.where("ce.seller_id", q.seller_id); if (q.event_type && q.event_type !== "all") qb.where("ce.event_type", q.event_type) })
    .groupBy("ce.product_id", "ce.seller_id", "ce.event_type", "s.name", "p.title")
    .orderBy("count", "desc")
    .limit(30)

  res.json({
    period: { from, to },
    totals: totals.reduce((acc: any, r: any) => ({ ...acc, [r.event_type]: parseInt(r.count, 10) }), { call: 0, whatsapp: 0, webrtc: 0, view: 0 }),
    by_vendor: vendors,
    top_products: byProduct,
  })
}

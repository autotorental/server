import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { excludeBots } from "../../../../lib/bot-filter"

// GET /admin/analytics/events — raw, paginated feed of EVERY contact event
// (one row per event: time, type, car, company, country). Honors the same
// from/to/seller_id/event_type filters as the rest of the analytics page.
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const knex: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const q = req.query as any
  const from = q.from ? new Date(q.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const to = q.to ? new Date(q.to) : new Date()
  const limit = Math.min(200, Number(q.limit) || 50)
  const offset = Number(q.offset) || 0

  const base = () => knex("contact_event as ce")
    .whereNull("ce.deleted_at")
    .whereBetween("ce.created_at", [from, to])
    .modify((qb: any) => {
      excludeBots(qb, "ce.user_agent")
      if (q.seller_id) qb.where("ce.seller_id", q.seller_id)
      if (q.event_type && q.event_type !== "all") qb.where("ce.event_type", q.event_type)
    })

  const [{ count }] = await base().count("ce.id as count")
  const rows = await base()
    .leftJoin("seller as s", "s.id", "ce.seller_id")
    .leftJoin("vehicle as p", "p.id", "ce.product_id")
    .select(
      "ce.id", "ce.event_type", "ce.created_at", "ce.country_code", "ce.user_agent",
      "ce.utm_source", "s.name as seller_name", "s.handle as seller_handle",
      "p.title as product_title", "ce.product_id"
    )
    .orderBy("ce.created_at", "desc")
    .limit(limit).offset(offset)

  const events = rows.map((r: any) => ({
    id: r.id,
    event_type: r.event_type,
    created_at: r.created_at,
    country_code: r.country_code || "",
    device: /mobile|android|iphone|ipad|okhttp|cfnetwork|darwin/i.test(r.user_agent || "") ? "Mobile" : "Desktop",
    seller_name: r.seller_name || r.seller_handle || "—",
    product_title: r.product_title || r.product_id || "—",
    utm_source: r.utm_source || "",
  }))

  res.json({ events, count: Number(count), limit, offset })
}

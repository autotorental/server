import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const knex: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const q = req.query as any
  const from = q.from ? new Date(q.from as string) : new Date(Date.now() - 30 * 86400000)
  const to = q.to ? new Date(q.to as string) : new Date()
  const days = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86400000))
  // Use day buckets when range <= 90 days, else weekly buckets
  const useDays = days <= 90
  const trunc = useDays ? "day" : "week"

  let query = knex("contact_event")
    .select(knex.raw(`date_trunc(?, created_at) as bucket`, [trunc]))
    .select("event_type")
    .count("* as count")
    .whereNull("deleted_at")
    .whereBetween("created_at", [from, to])
  if (q.seller_id) query = query.where("seller_id", q.seller_id)
  if (q.event_type && q.event_type !== "all") query = query.where("event_type", q.event_type)
  const rows = await query.groupBy("bucket", "event_type").orderBy("bucket")

  // Build buckets
  const buckets: Record<string, any> = {}
  for (let i = 0; i <= days; i++) {
    const d = new Date(from.getTime() + i * 86400000)
    const k = d.toISOString().slice(0, 10)
    buckets[k] = { date: k, call: 0, whatsapp: 0, webrtc: 0, view: 0, follow: 0, report: 0 }
  }
  for (const r of rows) {
    const k = new Date(r.bucket).toISOString().slice(0, 10)
    if (!buckets[k]) buckets[k] = { date: k, call: 0, whatsapp: 0, webrtc: 0, view: 0, follow: 0, report: 0 }
    buckets[k][r.event_type] = parseInt(r.count, 10)
  }

  res.json({
    series: Object.values(buckets).sort((a: any, b: any) => a.date.localeCompare(b.date)),
    from, to, trunc,
  })
}

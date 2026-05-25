import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// GET /admin/analytics/campaigns?days=30
// Returns one row per (utm_source, utm_medium, utm_campaign) with conversion totals
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const knex: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const days = parseInt((req.query.days as string) || "30", 10)
  const from = new Date(Date.now() - days * 86400000)
  const rows = await knex("contact_event")
    .select("utm_source", "utm_medium", "utm_campaign", "event_type")
    .count("* as count")
    .whereNull("deleted_at")
    .where("created_at", ">=", from)
    .whereNotNull("utm_source")
    .groupBy("utm_source", "utm_medium", "utm_campaign", "event_type")

  const byCampaign = new Map<string, any>()
  for (const r of rows) {
    const key = `${r.utm_source}|${r.utm_medium || ""}|${r.utm_campaign || ""}`
    const c = byCampaign.get(key) || { utm_source: r.utm_source, utm_medium: r.utm_medium, utm_campaign: r.utm_campaign, call: 0, whatsapp: 0, webrtc: 0, view: 0 }
    c[r.event_type] = parseInt(r.count, 10)
    byCampaign.set(key, c)
  }
  const campaigns = [...byCampaign.values()].sort((a, b) => (b.call + b.whatsapp + b.webrtc) - (a.call + a.whatsapp + a.webrtc))
  res.json({ campaigns, days })
}

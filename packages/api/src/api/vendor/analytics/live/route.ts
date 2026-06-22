import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { resolveVendorSellerId } from "../../../../lib/vendor-seller"

const KINDS = ["call", "whatsapp", "webrtc"]

// GET /vendor/analytics/live — this vendor's live leads: recent feed, last-14-day
// trend, by-device, today/30m counts. All scoped to the seller via contact_event.
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const sellerId = await resolveVendorSellerId(req)
  if (!sellerId) return res.status(401).json({ message: "unauthenticated" })
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const now = Date.now()
  const base = () => pg("contact_event").where({ seller_id: sellerId }).whereIn("event_type", KINDS).whereNull("deleted_at")
  try {
    const recent = await base().orderBy("created_at", "desc").limit(15)
      .select("event_type", "country_code", "device_type", "created_at")
    const byDevice = await base().whereNotNull("device_type").whereNot("device_type", "")
      .select("device_type").count("* as n").groupBy("device_type").orderBy("n", "desc")
    const since14 = new Date(now - 14 * 86400000)
    const perDay = await base().where("created_at", ">=", since14)
      .select(pg.raw("to_char(created_at,'YYYY-MM-DD') as day")).count("* as n").groupByRaw("1").orderByRaw("1")
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const [today] = await base().where("created_at", ">=", todayStart).count("* as n")
    const [m30] = await base().where("created_at", ">=", new Date(now - 30 * 60000)).count("* as n")
    res.json({
      recent: recent.map((r: any) => ({
        type: r.event_type, country: r.country_code || null, device: r.device_type || null,
        ago: Math.max(0, Math.floor((now - new Date(r.created_at).getTime()) / 1000)),
      })),
      by_device: byDevice.map((d: any) => ({ device: d.device_type, n: Number(d.n) })),
      per_day: perDay.map((d: any) => ({ day: d.day, n: Number(d.n) })),
      leads_today: Number((today as any)?.n || 0),
      leads_30m: Number((m30 as any)?.n || 0),
    })
  } catch (e: any) {
    res.json({ recent: [], by_device: [], per_day: [], leads_today: 0, leads_30m: 0 })
  }
}

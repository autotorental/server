import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ANALYTICS_MODULE } from "../../../../modules/analytics"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const sellerId = (req as any).auth_context?.app_metadata?.seller_id
  if (!sellerId) return res.status(401).json({ message: "unauthenticated" })

  const days = parseInt((req.query.days as string) || "30", 10)
  const event = (req.query.event_type as string) || ""
  const since = new Date(Date.now() - days * 86400000)
  const svc: any = req.scope.resolve(ANALYTICS_MODULE)
  const filter: any = { seller_id: sellerId }
  if (event && event !== "all") filter.event_type = event
  const all = await svc.listContactEvents(filter, { take: 50000 })

  const buckets: Record<string, any> = {}
  for (let i = 0; i <= days; i++) {
    const d = new Date(Date.now() - i * 86400000)
    const k = d.toISOString().slice(0, 10)
    buckets[k] = { date: k, call: 0, whatsapp: 0, webrtc: 0, view: 0, follow: 0 }
  }
  let total = { call: 0, whatsapp: 0, webrtc: 0, view: 0, follow: 0 }
  for (const ev of all) {
    if (new Date(ev.created_at) < since) continue
    const k = new Date(ev.created_at).toISOString().slice(0, 10)
    if (!buckets[k]) continue
    if ((buckets[k] as any)[ev.event_type] !== undefined) {
      ;(buckets[k] as any)[ev.event_type] += 1
      ;(total as any)[ev.event_type] += 1
    }
  }
  res.json({
    series: Object.values(buckets).sort((a: any, b: any) => a.date.localeCompare(b.date)),
    total,
    days,
  })
}

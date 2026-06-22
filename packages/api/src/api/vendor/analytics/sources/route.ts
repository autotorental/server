import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { resolveVendorSellerId } from "../../../../lib/vendor-seller"

// GET /vendor/analytics/sources?days=30 — Google-Analytics-style acquisition for THIS seller:
// traffic sources (utm + referrer), top cities, browsers, real-time (30m), and view→lead conversion.
function sourceOf(referrer: string, utm: string): string {
  const u = (utm || "").trim().toLowerCase()
  if (u) return u.charAt(0).toUpperCase() + u.slice(1)
  const r = (referrer || "").toLowerCase()
  if (!r) return "Direct"
  if (/google\./.test(r)) return "Google"
  if (/instagram|ig\./.test(r)) return "Instagram"
  if (/facebook|fb\.|fb\.me/.test(r)) return "Facebook"
  if (/tiktok/.test(r)) return "TikTok"
  if (/snapchat/.test(r)) return "Snapchat"
  if (/t\.co|twitter|x\.com/.test(r)) return "X / Twitter"
  if (/bing\./.test(r)) return "Bing"
  if (/youtube/.test(r)) return "YouTube"
  if (/whatsapp|wa\.me/.test(r)) return "WhatsApp"
  if (/autotorental\.com/.test(r)) return "Direct"
  try { return new URL(r.startsWith("http") ? r : `https://${r}`).hostname.replace(/^www\./, "") } catch { return "Other" }
}
function browserOf(ua: string): string {
  const u = (ua || "").toLowerCase()
  if (/edg\//.test(u)) return "Edge"
  if (/samsungbrowser/.test(u)) return "Samsung"
  if (/chrome|crios/.test(u)) return "Chrome"
  if (/firefox|fxios/.test(u)) return "Firefox"
  if (/safari/.test(u)) return "Safari"
  return "Other"
}
const top = (m: Map<string, number>, n = 8) => Array.from(m.entries()).map(([k, v]) => ({ name: k, n: v })).sort((a, b) => b.n - a.n).slice(0, n)

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const sellerId = await resolveVendorSellerId(req)
  if (!sellerId) return res.status(401).json({ message: "unauthenticated" })
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const days = Math.min(Number((req.query as any).days) || 30, 365)
  const since = new Date(Date.now() - days * 86400000)
  try {
    const rows = await pg("contact_event").where({ seller_id: sellerId }).whereNull("deleted_at")
      .where("created_at", ">=", since)
      .select("referrer", "referer", "utm_source", "event_type", "city", "device_type", "user_agent", "created_at")
    const LEADS = new Set(["call", "whatsapp", "webrtc"])
    const src = new Map<string, number>(), cities = new Map<string, number>(), browsers = new Map<string, number>()
    let views = 0, leads = 0
    const cut30 = Date.now() - 30 * 60000
    let realtime = 0
    for (const r of rows) {
      const s = sourceOf(r.referrer || r.referer || "", r.utm_source || "")
      src.set(s, (src.get(s) || 0) + 1)
      if (r.city) cities.set(r.city, (cities.get(r.city) || 0) + 1)
      const b = browserOf(r.user_agent || ""); browsers.set(b, (browsers.get(b) || 0) + 1)
      if (r.event_type === "view") views++; else if (LEADS.has(r.event_type)) leads++
      if (new Date(r.created_at).getTime() >= cut30) realtime++
    }
    res.json({
      sources: top(src), cities: top(cities), browsers: top(browsers, 6),
      realtime_30m: realtime,
      conversion: { views, leads, rate: views > 0 ? Math.round((leads / views) * 1000) / 10 : 0 },
      total_events: rows.length, days,
    })
  } catch (e: any) {
    res.json({ sources: [], cities: [], browsers: [], realtime_30m: 0, conversion: { views: 0, leads: 0, rate: 0 }, total_events: 0, days })
  }
}

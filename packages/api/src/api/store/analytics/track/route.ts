import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ANALYTICS_MODULE } from "../../../../modules/analytics"
import { resolveCountryFromIp } from "../../../../lib/geoip-shared"
import { isBotUserAgent } from "../../../../lib/bot-filter"
import { rateLimited, clientIp } from "../../../../lib/rate-limit"
import { phCapture } from "../../../../lib/posthog"

function detectDevice(ua: string | null): string {
  if (!ua) return "unknown"
  if (/iPhone|iPod/i.test(ua)) return "mobile"
  if (/iPad/i.test(ua)) return "tablet"
  if (/Android/i.test(ua)) return /Mobile/i.test(ua) ? "mobile" : "tablet"
  if (/Mobile|Phone/i.test(ua)) return "mobile"
  if (/Tablet/i.test(ua)) return "tablet"
  return "desktop"
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  if (rateLimited("track", clientIp(req), 150, 60000)) return res.status(204).send("")
  const body = req.body as { product_id?: string; seller_id?: string; event_type?: string; metadata?: any; utm?: Record<string, string> }
  if (!body?.product_id || !body?.seller_id || !body?.event_type) {
    return res.status(400).json({ message: "Missing product_id, seller_id, or event_type" })
  }
  const validTypes = ["call", "whatsapp", "webrtc", "view"]
  if (!validTypes.includes(body.event_type)) {
    return res.status(400).json({ message: `event_type must be one of: ${validTypes.join(", ")}` })
  }
  const analytics: any = req.scope.resolve(ANALYTICS_MODULE)
  const utm = body.utm || {}
  const ip = (req.headers["x-forwarded-for"] || req.ip || "").toString().split(",")[0].trim() || null
  const ua = (req.headers["user-agent"] as string) || null

  // Skip automated crawlers/monitors so analytics reflect real people.
  if (isBotUserAgent(ua)) {
    return res.status(202).json({ recorded: false, reason: "bot" })
  }

  const { country_code, country_name } = await resolveCountryFromIp(ip, req.headers as Record<string, unknown>)

  const device_type = detectDevice(ua)
  const now = new Date()
  const hour = now.getUTCHours() + 4
  const day_of_week = now.getUTCDay()

  const event = await analytics.createContactEvents({
    product_id: body.product_id,
    seller_id: body.seller_id,
    event_type: body.event_type,
    ip_address: ip,
    user_agent: ua,
    referer: (req.headers["referer"] as string) || null,
    utm_source: utm.utm_source || null,
    utm_medium: utm.utm_medium || null,
    utm_campaign: utm.utm_campaign || null,
    utm_content: utm.utm_content || null,
    utm_term: utm.utm_term || null,
    referrer: utm.landing || null,
    country_code,
    country_name,
    device_type,
    hour: hour % 24,
    day_of_week,
    metadata: body.metadata || null,
  })
  try {
    phCapture(String((body.metadata && body.metadata.session_id) || ip || "anonymous"), `car_${body.event_type}`, {
      product_id: body.product_id, seller_id: body.seller_id, event_type: body.event_type,
      country: country_code, device: device_type, utm_source: utm.utm_source, utm_campaign: utm.utm_campaign,
    })
  } catch {}
  res.status(201).json({ id: event.id, event_type: event.event_type, country_code, device_type })
}

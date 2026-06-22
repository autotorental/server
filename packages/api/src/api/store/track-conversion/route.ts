import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getSetting } from "../../../lib/settings"
import * as crypto from "crypto"

const sha = (v?: string) => (v ? crypto.createHash("sha256").update(String(v).trim().toLowerCase()).digest("hex") : undefined)

// Server-side Meta Conversions API relay (deduped with the browser Pixel via event_id).
// Captures conversions even when the client Pixel is blocked (ad-blockers, iOS).
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body: any = req.body || {}
  const pixelId = (await getSetting(req.scope, "meta_pixel_id").catch(() => "")) || ""
  const token = (await getSetting(req.scope, "meta_capi_token").catch(() => "")) || ""
  if (!pixelId || !token) return res.json({ ok: false, skipped: "meta_capi_not_configured" })
  const testCode = (await getSetting(req.scope, "meta_test_event_code").catch(() => "")) || ""

  const ip = (String(req.headers["x-forwarded-for"] || "").split(",")[0].trim()) || ((req.socket as any)?.remoteAddress || "")
  const ua = String(req.headers["user-agent"] || "")
  const userData: any = { client_ip_address: ip, client_user_agent: ua }
  if (body.email) userData.em = [sha(body.email)]
  if (body.phone) userData.ph = [sha(String(body.phone).replace(/[^0-9]/g, ""))]
  if (body.fbp) userData.fbp = body.fbp
  if (body.fbc) userData.fbc = body.fbc

  const event: any = {
    event_name: String(body.type || "Lead"),
    event_time: Math.floor(Date.now() / 1000),
    event_id: body.event_id || undefined,
    action_source: "website",
    event_source_url: body.url || undefined,
    user_data: userData,
    custom_data: {
      currency: body.currency || "AED",
      value: body.value != null ? Number(body.value) : undefined,
      content_ids: body.content_id ? [String(body.content_id)] : undefined,
      content_type: body.content_id ? "product" : undefined,
    },
  }
  const payload: any = { data: [event] }
  if (testCode) payload.test_event_code = testCode

  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${encodeURIComponent(token)}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(8000),
    })
    const d: any = await r.json().catch(() => ({}))
    return res.json({ ok: r.ok && !d?.error, received: d?.events_received, error: d?.error?.message })
  } catch (e: any) { return res.json({ ok: false, error: String(e?.message || e).slice(0, 120) }) }
}

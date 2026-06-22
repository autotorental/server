import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

const MAX_EVENTS = 9000

// POST /store/rec — receive a batch of rrweb events for a session (native session replay)
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const b: any = req.body || {}
  const sid = String(b.session_id || "").slice(0, 80)
  const events = Array.isArray(b.events) ? b.events : []
  if (!sid || !events.length) return res.json({ ok: false })
  const path = String(b.path || "").slice(0, 300)
  const hdr = (n: string) => String((req.headers as any)[n] || "")
  let country = String(b.country || hdr("cf-ipcountry") || hdr("x-vercel-ip-country") || "").slice(0, 4).toUpperCase()
  if (country === "XX" || country === "T1") country = ""
  const ua = hdr("user-agent").toLowerCase()
  let device = String(b.device || "").slice(0, 16)
  if (!device) device = /mobile|iphone|ipod|windows phone|android.*mobile/.test(ua) ? "mobile" : /ipad|tablet|playbook|silk|android(?!.*mobile)/.test(ua) ? "tablet" : "desktop"
  try {
    const ex = await pg("session_recording").where({ id: sid }).first()
    const now = new Date()
    if (ex) {
      const prev = Array.isArray(ex.events) ? ex.events : (() => { try { return JSON.parse(ex.events) } catch { return [] } })()
      const merged = prev.concat(events).slice(-MAX_EVENTS)
      await pg("session_recording").where({ id: sid }).update({
        events: JSON.stringify(merged), updated_at: now, event_count: merged.length,
        path: path || ex.path, country: ex.country || country, device: ex.device || device,
        duration_ms: now.getTime() - new Date(ex.started_at).getTime(),
      })
    } else {
      await pg("session_recording").insert({
        id: sid, session_id: sid, events: JSON.stringify(events.slice(-MAX_EVENTS)),
        path, country, device, started_at: now, updated_at: now, event_count: events.length, duration_ms: 0,
      })
    }
  } catch {}
  res.json({ ok: true })
}

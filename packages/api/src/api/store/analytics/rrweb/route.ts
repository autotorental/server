import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { resolveCountryFromIp } from "../../../../lib/geoip-shared"

// POST /store/analytics/rrweb — ingest a batch of rrweb session-replay events.
// First-party session recording (no third party). Inputs are masked client-side.
const BOT = /(bot|crawl|spider|slurp|preview|monitor|headless|lighthouse|pingdom|uptime|statuscake|curl|wget|python|axios|node-fetch|go-http|okhttp|java\/|scrapy|phantomjs|selenium|puppeteer|playwright|gptbot|claudebot|anthropic|ccbot|bytespider|petalbot|dataforseo|ahrefs|semrush|mj12|dotbot|yandex|baiduspider|sogou|applebot|amazonbot|googleother)/i
const looksBot = (ua: string) => !ua || ua.length < 12 || BOT.test(ua) || !/mozilla/i.test(ua)
const RETENTION_DAYS = 10

function deviceOf(ua: string): string {
  const u = (ua || "").toLowerCase()
  if (/ipad|tablet/.test(u)) return "tablet"
  if (/mobi|android|iphone/.test(u)) return "mobile"
  return "desktop"
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const ua = String(req.headers["user-agent"] || "")
    if (looksBot(ua)) return res.status(204).send("")

    const b = (req.body || {}) as { session_id?: string; events?: any[]; path?: string }
    const sid = String(b.session_id || "").slice(0, 80)
    const events = Array.isArray(b.events) ? b.events : []
    if (!sid || events.length === 0) return res.status(204).send("")
    const path = String(b.path || "").slice(0, 300)

    const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

    // next seq for this session
    const [{ maxseq }] = await pg("session_event").where({ session_id: sid }).max("seq as maxseq")
    const seq = Number(maxseq || 0) + 1
    await pg("session_event").insert({ session_id: sid, seq, events: JSON.stringify(events) })

    const existing = await pg("session_recording").where({ id: sid }).first()
    if (!existing) {
      let country = ""
      try {
        const ip = (req.headers["x-forwarded-for"] || req.ip || "").toString().split(",")[0].trim() || null
        const { country_code } = await resolveCountryFromIp(ip, req.headers as Record<string, unknown>)
        country = String(country_code || "").slice(0, 4)
      } catch { /* ignore */ }
      await pg("session_recording").insert({
        id: sid, first_path: path, last_path: path, country, device: deviceOf(ua),
        user_agent: ua.slice(0, 300), event_count: events.length, bot: !country,
      })
    } else {
      await pg("session_recording").where({ id: sid }).update({
        last_at: new Date(),
        last_path: path || existing.last_path,
        event_count: (existing.event_count || 0) + events.length,
        duration_ms: Math.max(0, Date.now() - new Date(existing.started_at).getTime()),
      })
    }

    // opportunistic retention purge (~2% of writes)
    if (Math.floor(seq) % 50 === 0) {
      const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400000)
      const old = await pg("session_recording").where("last_at", "<", cutoff).pluck("id")
      if (old.length) {
        await pg("session_event").whereIn("session_id", old).del()
        await pg("session_recording").whereIn("id", old).del()
      }
    }

    res.status(204).send("")
  } catch {
    res.status(204).send("")
  }
}

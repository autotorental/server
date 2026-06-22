import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { resolveCountryFromIp } from "../../../../lib/geoip-shared"
import { phCapture } from "../../../../lib/posthog"

// POST /store/analytics/hit — records one page view for the live traffic dashboard.
// First-party, no cookies, no PII. Bots are skipped.
const BOT = /(bot|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegram|preview|monitor|headless|lighthouse|pingdom|gtmetrix|uptime|statuscake|curl|wget|python-requests|python|axios|node-fetch|go-http|okhttp|java\/|jakarta|perl|ruby|scrapy|phantomjs|selenium|puppeteer|playwright|gptbot|claudebot|claude-web|anthropic|ccbot|bytespider|petalbot|dataforseo|ahrefs|semrush|mj12|dotbot|blexbot|barkrowler|seekport|yandex|baiduspider|sogou|exabot|applebot|amazonbot|googleother|google-inspectiontool|archive\.org|ia_archiver|dataprovider|zoominfo|serpstat|screaming|sitebulb)/i
// Real browsers always send a User-Agent that mentions Mozilla; a missing or
// non-Mozilla UA on a JS-fired beacon is almost always a script/bot.
function looksBot(ua){ return !ua || ua.length < 12 || BOT.test(ua) || !/mozilla/i.test(ua) }

function deviceOf(ua: string): string {
  const u = (ua || "").toLowerCase()
  if (/ipad|tablet/.test(u)) return "tablet"
  if (/mobi|android|iphone/.test(u)) return "mobile"
  return "desktop"
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const ua = String(req.headers["user-agent"] || "")
    const b = (req.body || {}) as { path?: string; session_id?: string; referrer?: string }
    // Our own mobile app self-identifies via referrer="mobile-app" — always trust it
    // (its UA looks like a non-browser and would otherwise be dropped as a bot).
    const isMobileApp = String(b.referrer || "") === "mobile-app"
    // Drop the most obvious bots entirely; flag borderline ones below.
    if (!isMobileApp && looksBot(ua)) return res.status(204).send("")
    const path = String(b.path || "/").slice(0, 300)
    const sessionId = String(b.session_id || "").slice(0, 60)
    const referrer = String(b.referrer || "").slice(0, 300)
    let country = String(req.headers["cf-ipcountry"] || req.headers["x-vercel-ip-country"] || "").slice(0, 4)
    if (!country) {
      try {
        const ip = (req.headers["x-forwarded-for"] || req.ip || "").toString().split(",")[0].trim() || null
        const { country_code } = await resolveCountryFromIp(ip, req.headers as Record<string, unknown>)
        country = String(country_code || "").slice(0, 4)
      } catch { /* leave empty */ }
    }
    const device = isMobileApp ? "mobile-app" : deviceOf(ua)
    // Geo is reliable now: a hit with NO resolved country AND NO referrer is a
    // strong bot signal — record it but flag so the dashboard can exclude it.
    const is_bot = isMobileApp ? false : (!country && !referrer)

    const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    await pg("pageview").insert({ path, session_id: sessionId, referrer, country, device, is_bot, user_agent: ua.slice(0, 300) })
    if (!is_bot) { try { phCapture(sessionId || "anonymous", "$pageview", { $current_url: path, path, country, device, referrer: referrer || undefined }) } catch {} }
    res.status(204).send("")
  } catch {
    res.status(204).send("")
  }
}

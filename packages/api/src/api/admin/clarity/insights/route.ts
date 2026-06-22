import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getSetting } from "../../../../lib/settings"

// Microsoft Clarity "Data Export" API — project insights.
// HARD LIMIT: 10 requests per project per DAY. We make 3 calls per refresh and
// cache for 24h (in-memory + persisted to DB so it survives API restarts), so
// a normal day stays well under the cap. On 429 we serve the last good cache.
const CLARITY_URL = "https://www.clarity.ms/export-data/api/v1/project-live-insights"
const TTL_MS = 24 * 60 * 60 * 1000
const DB_KEY = "clarity_insights_cache"

let cache: { at: number; days: number; data: any } | null = null

async function callClarity(token: string, days: number, dims: string[]): Promise<any> {
  const params = new URLSearchParams({ numOfDays: String(days) })
  dims.forEach((d, i) => params.set(`dimension${i + 1}`, d))
  const r = await fetch(`${CLARITY_URL}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!r.ok) {
    const text = await r.text().catch(() => "")
    throw new Error(`Clarity API ${r.status}: ${text.slice(0, 180)}`)
  }
  return r.json()
}

async function loadDbCache(pg: any): Promise<typeof cache> {
  try {
    const row = await pg("app_setting").where({ key: DB_KEY }).first()
    if (row?.value) return JSON.parse(row.value)
  } catch { /* ignore */ }
  return null
}
async function saveDbCache(pg: any, c: typeof cache): Promise<void> {
  try {
    await pg("app_setting")
      .insert({ key: DB_KEY, value: JSON.stringify(c), is_secret: false, updated_at: new Date() })
      .onConflict("key")
      .merge({ value: JSON.stringify(c), updated_at: new Date() })
  } catch { /* ignore */ }
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const token = (await getSetting(req.scope, "clarity_api_token")) || ""
  if (!token) {
    res.json({ configured: false })
    return
  }

  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const q = req.query as any
  const days = Math.min(3, Math.max(1, Number(q.days) || 3))
  const force = q.force === "1" || q.force === "true"
  const now = Date.now()

  // Hydrate in-memory cache from DB (survives API restarts).
  if (!cache) cache = await loadDbCache(pg)

  if (!force && cache && cache.days === days && now - cache.at < TTL_MS) {
    res.json({ configured: true, cached: true, updatedAt: new Date(cache.at).toISOString(), ...cache.data })
    return
  }

  try {
    const [overall, byDevice, byCountry] = await Promise.all([
      callClarity(token, days, []),
      callClarity(token, days, ["Device"]),
      callClarity(token, days, ["Country/Region"]),
    ])
    const data = { days, overall, byDevice, byCountry }
    cache = { at: now, days, data }
    await saveDbCache(pg, cache)
    res.json({ configured: true, cached: false, updatedAt: new Date(now).toISOString(), ...data })
  } catch (e: any) {
    // Daily cap (429) or any error — serve the last good cache (memory or DB).
    const fallback = cache || (await loadDbCache(pg))
    if (fallback && fallback.data) {
      res.json({
        configured: true,
        cached: true,
        stale: true,
        rate_limited: /429/.test(String(e?.message || "")),
        error: String(e?.message || e),
        updatedAt: new Date(fallback.at).toISOString(),
        ...fallback.data,
      })
      return
    }
    // No cache yet — return a friendly rate-limited state instead of an error page.
    res.json({
      configured: true,
      rate_limited: /429/.test(String(e?.message || "")),
      error: String(e?.message || e),
      days,
      overall: null,
      byDevice: null,
      byCountry: null,
    })
  }
}

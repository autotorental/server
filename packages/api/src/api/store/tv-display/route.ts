import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getSetting } from "../../../lib/settings"

// GET /store/tv-display?token=XXX — PUBLIC live-traffic feed for the TV wall page.
// Gated by a secret token so only someone with the link can see it. Read-only.
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const expected = (await getSetting(req.scope, "tv_display_token").catch(() => "")) || ""
  const got = String((req.query as any).token || "")
  if (!expected || got !== expected) {
    return res.status(403).json({ message: "Invalid or missing token" })
  }
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const q = (sql: string) => pg.raw(sql).then((r: any) => r.rows)
  try {
    const [[active], [v30], [vToday], [sessToday], topCountries, byDevice, recent] = await Promise.all([
      q(`SELECT count(DISTINCT session_id) AS n FROM pageview WHERE is_bot IS NOT TRUE AND created_at > now() - interval '5 minutes'`),
      q(`SELECT count(*) AS n FROM pageview WHERE is_bot IS NOT TRUE AND created_at > now() - interval '30 minutes'`),
      q(`SELECT count(*) AS n FROM pageview WHERE is_bot IS NOT TRUE AND created_at::date = now()::date`),
      q(`SELECT count(DISTINCT session_id) AS n FROM pageview WHERE is_bot IS NOT TRUE AND created_at::date = now()::date`),
      q(`SELECT coalesce(nullif(country,''),'??') AS country, count(DISTINCT session_id) AS n FROM pageview WHERE is_bot IS NOT TRUE AND created_at::date = now()::date GROUP BY 1 ORDER BY n DESC LIMIT 8`),
      q(`SELECT device, count(*) AS n FROM pageview WHERE is_bot IS NOT TRUE AND created_at::date = now()::date GROUP BY device ORDER BY n DESC`),
      q(`SELECT path, coalesce(nullif(country,''),'??') AS country, device, extract(epoch FROM now()-created_at)::int AS ago FROM pageview WHERE is_bot IS NOT TRUE ORDER BY created_at DESC LIMIT 12`),
    ])
    res.json({
      active_now: Number(active?.n || 0),
      views_30m: Number(v30?.n || 0),
      views_today: Number(vToday?.n || 0),
      visitors_today: Number(sessToday?.n || 0),
      top_countries: topCountries.map((r: any) => ({ country: r.country, n: Number(r.n) })),
      by_device: byDevice.map((r: any) => ({ device: r.device, n: Number(r.n) })),
      recent: recent.map((r: any) => ({ path: r.path, country: r.country, device: r.device, ago: Number(r.ago) })),
      ts: Date.now(),
    })
  } catch (e: any) {
    res.status(500).json({ message: e?.message || "failed" })
  }
}

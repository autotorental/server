import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// GET /admin/analytics/reports?days=7  — historical traffic report from `pageview`
// (totals + previous-period comparison, daily trend, and breakdowns by every
// dimension). Read-only aggregates; column names are hard-coded (no injection).
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const q = async (sql: string) => (await pg.raw(sql)).rows
  const days = Math.min(365, Math.max(1, Number((req.query as any).days) || 7))
  const win = `interval '${days} days'`
  const F = "is_bot IS NOT TRUE"
  try {
    const [cur] = await q(`SELECT count(*)::int views, count(DISTINCT session_id)::int sessions FROM pageview WHERE ${F} AND created_at >= now() - ${win}`)
    const [prev] = await q(`SELECT count(*)::int views, count(DISTINCT session_id)::int sessions FROM pageview WHERE ${F} AND created_at >= now() - ${win} - ${win} AND created_at < now() - ${win}`)
    const trend = await q(`SELECT created_at::date AS d, count(*)::int views, count(DISTINCT session_id)::int sessions FROM pageview WHERE ${F} AND created_at >= now() - ${win} GROUP BY 1 ORDER BY 1`)
    const hours = await q(`SELECT extract(hour from created_at)::int AS h, count(*)::int views FROM pageview WHERE ${F} AND created_at >= now() - ${win} GROUP BY 1 ORDER BY 1`)
    const dim = (col: string) => q(`SELECT coalesce(nullif(${col},''),'(none)') AS k, count(*)::int views, count(DISTINCT session_id)::int sessions FROM pageview WHERE ${F} AND created_at >= now() - ${win} GROUP BY 1 ORDER BY 2 DESC LIMIT 100`)
    const [pages, countries, devices, browsers, oses, referrers, languages] = await Promise.all([
      dim("path"), dim("country"), dim("device"), dim("browser"), dim("os"), dim("referrer"), dim("language"),
    ])
    res.json({
      days,
      totals: { views: cur?.views || 0, sessions: cur?.sessions || 0, prev_views: prev?.views || 0, prev_sessions: prev?.sessions || 0 },
      trend, hours, pages, countries, devices, browsers, oses, referrers, languages,
    })
  } catch (e: any) {
    res.status(500).json({ message: e?.message || "report failed" })
  }
}

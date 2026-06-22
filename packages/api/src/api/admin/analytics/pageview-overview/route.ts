import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// GET /admin/analytics/pageview-overview?days=30 — REAL website traffic from the pageview table.
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const days = Math.min(365, Math.max(1, Number((req.query as any).days) || 30))
  const from = new Date(Date.now() - days * 86400000)
  try {
    const base = () => pg("pageview").whereNot("is_bot", true).where("created_at", ">=", from)
    const totalRow = await base().count("* as c").first()
    const visRow = await base().countDistinct("session_id as c").first()
    const byDay = await base().select(pg.raw("to_char(created_at, \x27YYYY-MM-DD\x27) as d")).count("* as n").groupByRaw("1").orderByRaw("1")
    const byCountry = await base().whereNotNull("country").select("country").count("* as n").groupBy("country").orderByRaw("2 desc").limit(12)
    const byDevice = await base().whereNotNull("device").select("device").count("* as n").groupBy("device")
    const topPages = await base().select("path").count("* as n").groupBy("path").orderByRaw("2 desc").limit(12)
    res.json({
      days,
      total_views: Number(totalRow?.c || 0),
      visitors: Number(visRow?.c || 0),
      series: byDay.map((r: any) => ({ date: r.d, views: Number(r.n) })),
      by_country: byCountry.map((r: any) => ({ country: r.country, views: Number(r.n) })),
      by_device: byDevice.map((r: any) => ({ device: r.device, views: Number(r.n) })),
      top_pages: topPages.map((r: any) => ({ path: r.path, views: Number(r.n) })),
    })
  } catch (e: any) {
    res.status(500).json({ message: e?.message || "failed" })
  }
}

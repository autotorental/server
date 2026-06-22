import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// GET /admin/analytics/live — real-time traffic from our own pageview table.
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  const q = async (sql: string) => (await pg.raw(sql)).rows

  const [activeRow] = await q(
    `SELECT count(DISTINCT session_id) AS n FROM pageview WHERE is_bot IS NOT TRUE AND created_at > now() - interval '5 minutes'`
  )
  const [v30] = await q(`SELECT count(*) AS n FROM pageview WHERE is_bot IS NOT TRUE AND created_at > now() - interval '30 minutes'`)
  const [vToday] = await q(`SELECT count(*) AS n FROM pageview WHERE is_bot IS NOT TRUE AND created_at::date = now()::date`)
  const [sToday] = await q(
    `SELECT count(DISTINCT session_id) AS n FROM pageview WHERE created_at::date = now()::date`
  )

  // per-minute counts for the last 30 minutes (sparkline)
  const perMin = await q(
    `SELECT to_char(date_trunc('minute', created_at), 'HH24:MI') AS m, count(*) AS n
     FROM pageview WHERE is_bot IS NOT TRUE AND created_at > now() - interval '30 minutes'
     GROUP BY 1 ORDER BY 1`
  )

  const topPages = await q(
    `SELECT path, count(*) AS n FROM pageview
     WHERE is_bot IS NOT TRUE AND created_at::date = now()::date GROUP BY path ORDER BY n DESC LIMIT 8`
  )

  const topCountries = await q(
    `SELECT coalesce(nullif(country,''),'??') AS country, count(DISTINCT session_id) AS n FROM pageview
     WHERE is_bot IS NOT TRUE AND created_at::date = now()::date GROUP BY 1 ORDER BY n DESC LIMIT 6`
  )

  const recent = await q(
    `SELECT path, coalesce(nullif(country,''),'??') AS country, device,
            to_char(created_at, 'HH24:MI:SS') AS t, extract(epoch FROM now()-created_at)::int AS ago
     FROM pageview WHERE is_bot IS NOT TRUE ORDER BY created_at DESC LIMIT 15`
  )

  // Resolve catalog IDs in recent paths (brnd_/bdy_/city_) -> human names, and strip
  // the locale prefix + query string, so the live ticker reads "Honda cars in Aleppo"
  // instead of raw "/zh/cars?brand=brnd_...". (Bots are already excluded above.)
  const idText = recent.map((r: any) => r.path || "").join(" ")
  const ids = Array.from(new Set((idText.match(/(?:brnd|bdy|city)_[a-z0-9]+/gi) || []).map((x: string) => x.toLowerCase())))
  const nameMap: Record<string, string> = {}
  if (ids.length) {
    const inList = ids.map((id) => `'${String(id).replace(/[^a-z0-9_]/g, "")}'`).join(",")
    for (const table of ["brand", "body_type", "city"]) {
      try { (await q(`SELECT id, name FROM ${table} WHERE id IN (${inList})`)).forEach((r: any) => { nameMap[String(r.id).toLowerCase()] = r.name }) } catch { /* ignore */ }
    }
  }
  const LOCALES = new Set(["ar", "es", "zh", "th", "ru", "ur"])
  const titledLbl = (x: string) => { try { return decodeURIComponent(x).replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) } catch { return x } }
  const nameOf = (v?: string | null) => { if (!v) return undefined; const k = v.toLowerCase(); if (nameMap[k]) return nameMap[k]; return /^(?:brnd|bdy|city)_/.test(k) ? undefined : titledLbl(v) }
  function cleanAndLabel(rawPath?: string): { path: string; label: string | null } {
    if (!rawPath) return { path: "/", label: null }
    const [base, query] = rawPath.split("?")
    let segs = base.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean)
    if (segs[0] && LOCALES.has(segs[0])) segs = segs.slice(1)
    const cleanBase = "/" + segs.join("/")
    if (!query) return { path: cleanBase, label: null }
    if (segs[0] === "cars") {
      const pr = new URLSearchParams(query)
      const head = [nameOf(pr.get("brand")), nameOf(pr.get("body") || pr.get("body_type"))].filter(Boolean).join(" ")
      let label = head ? `${head} cars` : "Cars"
      const city = nameOf(pr.get("city")); if (city) label += ` in ${city}`
      const period = pr.get("period"); if (period) label += ` (${titledLbl(period)})`
      return { path: cleanBase, label }
    }
    return { path: cleanBase, label: null }
  }

  const byDevice = await q(
    `SELECT device, count(*) AS n FROM pageview
     WHERE is_bot IS NOT TRUE AND created_at::date = now()::date GROUP BY device ORDER BY n DESC`
  )

  const activeCountries = await q(
    `SELECT country, count(DISTINCT session_id) AS n FROM pageview
     WHERE is_bot IS NOT TRUE AND created_at > now() - interval '5 minutes' AND coalesce(country,'') <> '' GROUP BY 1 ORDER BY n DESC LIMIT 60`
  )

  res.json({
    active_now: Number(activeRow?.n || 0),
    active_countries: activeCountries.map((r: any) => ({ country: r.country, n: Number(r.n) })),
    views_30m: Number(v30?.n || 0),
    views_today: Number(vToday?.n || 0),
    visitors_today: Number(sToday?.n || 0),
    per_minute: perMin.map((r: any) => ({ m: r.m, n: Number(r.n) })),
    top_pages: topPages.map((r: any) => ({ path: r.path, n: Number(r.n) })),
    top_countries: topCountries.map((r: any) => ({ country: r.country, n: Number(r.n) })),
    by_device: byDevice.map((r: any) => ({ device: r.device, n: Number(r.n) })),
    recent: recent.map((r: any) => { const cl = cleanAndLabel(r.path); return { path: cl.path, label: cl.label, country: r.country, device: r.device, t: r.t, ago: Number(r.ago) } }),
    fetched_at: new Date().toISOString(),
  })
}

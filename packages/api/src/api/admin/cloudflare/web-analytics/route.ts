// GET /admin/cloudflare/web-analytics?range=1d|7d|30d
// Real-visitor (RUM) Web Analytics from Cloudflare's rumPageloadEventsAdaptiveGroups
// dataset: page loads, visits, and breakdowns by page / country / device / browser
// / OS / referrer. Distinct from /admin/cloudflare/analytics (edge httpRequests).
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { cfContext, cfHeaders } from "../../../../lib/cloudflare"

// Resolve the account tag for a zone once and cache it (zones rarely move accounts).
let _acctCache: { zone: string; acct: string } | null = null
async function accountTag(token: string, zoneId: string): Promise<string> {
  if (_acctCache && _acctCache.zone === zoneId) return _acctCache.acct
  const r = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}`, { headers: cfHeaders(token) })
  const j = await r.json().catch(() => null)
  const acct = j?.result?.account?.id || ""
  if (acct) _acctCache = { zone: zoneId, acct }
  return acct
}

const RANGES: Record<string, number> = { "1d": 1, "7d": 7, "30d": 30 }

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { token, zoneId } = await cfContext(req.scope)
    const acct = await accountTag(token, zoneId)
    if (!acct) { res.json({ ok: false, error: "account_not_resolved" }); return }

    const rangeKey = (typeof req.query.range === "string" && RANGES[req.query.range]) ? req.query.range : "7d"
    const days = RANGES[rangeKey]
    const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString()
    // Group the trend by hour for 1d, else by date.
    const trendDim = days <= 1 ? "datetimeHour" : "date"

    const grp = (alias: string, dim: string | null, limit: number, order: string) =>
      `${alias}: rumPageloadEventsAdaptiveGroups(limit:${limit},filter:{datetime_geq:$s}${order ? `,orderBy:[${order}]` : ""}){ count sum{visits} ${dim ? `dimensions{${dim}}` : ""} }`

    const query = `query($a:String!,$s:Time!){viewer{accounts(filter:{accountTag:$a}){
      ${grp("totals", null, 1, "")}
      ${grp("bots", "bot", 5, "count_DESC")}
      ${grp("trend", trendDim, 1000, `${trendDim}_ASC`)}
      ${grp("pages", "requestPath", 12, "count_DESC")}
      ${grp("countries", "countryName", 12, "count_DESC")}
      ${grp("browsers", "userAgentBrowser", 8, "count_DESC")}
      ${grp("os", "userAgentOS", 8, "count_DESC")}
      ${grp("devices", "deviceType", 6, "count_DESC")}
      ${grp("referrers", "refererHost", 10, "count_DESC")}
    }}}`

    const r = await fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST", headers: cfHeaders(token),
      body: JSON.stringify({ query, variables: { a: acct, s: since } }),
    })
    const j = await r.json().catch(() => null)
    const a = j?.data?.viewer?.accounts?.[0]
    if (!a) { res.json({ ok: false, error: j?.errors?.[0]?.message || "no_data" }); return }

    const tot = a.totals?.[0] || { count: 0, sum: { visits: 0 } }
    const botRows = (a.bots || []) as any[]
    const botLoads = botRows.filter((x) => x.dimensions?.bot === 1 || x.dimensions?.bot === "1" || x.dimensions?.bot === true).reduce((s, x) => s + (x.count || 0), 0)

    const mapList = (rows: any[], key: string) => (rows || [])
      .map((x) => ({ name: x.dimensions?.[key] ?? "—", loads: x.count || 0, visits: x.sum?.visits || 0 }))
      .filter((x) => x.name !== "" && x.name !== null)

    res.json({
      ok: true,
      range: rangeKey,
      trendBy: trendDim,
      totals: {
        pageLoads: tot.count || 0,
        visits: tot.sum?.visits || 0,
        botLoads,
        botPct: (tot.count || 0) ? Math.round((botLoads / tot.count) * 100) : 0,
      },
      trend: (a.trend || []).map((x: any) => ({ t: x.dimensions?.[trendDim], loads: x.count || 0, visits: x.sum?.visits || 0 })),
      pages: mapList(a.pages, "requestPath"),
      countries: mapList(a.countries, "countryName"),
      browsers: mapList(a.browsers, "userAgentBrowser"),
      os: mapList(a.os, "userAgentOS"),
      devices: mapList(a.devices, "deviceType"),
      referrers: mapList(a.referrers, "refererHost"),
    })
  } catch (e: any) {
    res.json({ ok: false, error: e?.message || "failed", code: e?.code })
  }
}

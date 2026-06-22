import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { cfContext, cfHeaders } from "../../../../lib/cloudflare"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { token, zoneId } = await cfContext(req.scope)
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
    const query = `query($zone:String!,$since:Time!){viewer{zones(filter:{zoneTag:$zone}){httpRequests1hGroups(limit:24,filter:{datetime_geq:$since},orderBy:[datetime_ASC]){dimensions{datetime} sum{requests bytes cachedRequests threats pageViews} uniq{uniques}}}}}`
    const r = await fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST", headers: cfHeaders(token),
      body: JSON.stringify({ query, variables: { zone: zoneId, since } }),
    })
    const j: any = await r.json()
    if (j?.errors?.length) throw new Error(j.errors[0]?.message || "GraphQL error (token needs Analytics:Read)")
    const groups = j?.data?.viewer?.zones?.[0]?.httpRequests1hGroups || []
    let requests = 0, bytes = 0, cached = 0, threats = 0, pageViews = 0
    const series = groups.map((g: any) => {
      requests += g.sum.requests; bytes += g.sum.bytes; cached += g.sum.cachedRequests; threats += g.sum.threats; pageViews += g.sum.pageViews
      return { t: g.dimensions.datetime, requests: g.sum.requests, cached: g.sum.cachedRequests, bytes: g.sum.bytes, threats: g.sum.threats, pageViews: g.sum.pageViews }
    })
    res.json({ ok: true, totals: { requests, bytes, cached, threats, pageViews, cached_pct: requests ? Math.round((cached / requests) * 100) : 0 }, series })
  } catch (e: any) {
    if (e?.code === "NO_TOKEN") return res.json({ ok: false, no_token: true })
    res.status(500).json({ ok: false, message: e?.message || "Analytics error" })
  }
}

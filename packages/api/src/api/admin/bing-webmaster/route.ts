import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getSetting } from "../../../lib/settings"

// Bing Webmaster Tools — real search performance via the Webmaster API.
// Auth: a single API key the owner generates in Bing Webmaster Tools →
// Settings → API access. Stored as app_setting `bing_webmaster_api_key`.
const BASE = "https://ssl.bing.com/webmaster/api.svc/json"

// Bing serializes dates ASP.NET-style: "/Date(1718323200000-0700)/" — pull the ms.
function bingDate(v: any): string {
  const m = String(v || "").match(/\/Date\((\d+)/)
  return m ? new Date(Number(m[1])).toISOString().slice(0, 10) : ""
}
const num = (v: any) => (typeof v === "number" ? v : Number(v) || 0)

async function call(method: string, key: string, siteUrl: string): Promise<any[] | null> {
  try {
    const u = `${BASE}/${method}?apikey=${encodeURIComponent(key)}&siteUrl=${encodeURIComponent(siteUrl)}`
    const r = await fetch(u, { headers: { Accept: "application/json" } })
    if (!r.ok) return null
    const j: any = await r.json().catch(() => null)
    const d = j?.d ?? j
    return Array.isArray(d) ? d : d ? [d] : []
  } catch {
    return null
  }
}

// GET /admin/bing-webmaster
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const key = (await getSetting(req.scope, "bing_webmaster_api_key").catch(() => "")) || ""
  if (!key) return res.json({ connected: false })

  const siteCandidates = [
    (await getSetting(req.scope, "bing_site_url").catch(() => "")) || "",
    "https://autotorental.com",
    "https://autotorental.com/",
  ].filter(Boolean)

  let siteUrl = "", traffic: any[] | null = null
  for (const s of siteCandidates) {
    const t = await call("GetRankAndTrafficStats", key, s)
    if (t && t.length) { siteUrl = s; traffic = t; break }
    if (t && !siteUrl) { siteUrl = s; traffic = t } // valid key but no data yet
  }
  if (traffic === null) {
    return res.json({
      connected: false,
      error: true,
      message: "Bing rejected the API key or site. Check the key, and that this site is verified in Bing Webmaster Tools.",
    })
  }
  siteUrl = siteUrl || siteCandidates[0]

  const [queries, pages] = await Promise.all([
    call("GetQueryStats", key, siteUrl),
    call("GetPageStats", key, siteUrl),
  ])

  const by_date = (traffic || [])
    .map((r: any) => ({ date: bingDate(r.Date), clicks: num(r.Clicks), impressions: num(r.Impressions) }))
    .filter((x: any) => x.date)
    .sort((a: any, b: any) => a.date.localeCompare(b.date))

  const sum = by_date.reduce(
    (acc: any, r: any) => ({ clicks: acc.clicks + r.clicks, impressions: acc.impressions + r.impressions }),
    { clicks: 0, impressions: 0 }
  )
  const ctr = sum.impressions ? +((sum.clicks / sum.impressions) * 100).toFixed(2) : 0

  const mapRows = (arr: any[] | null, label: "query" | "page") =>
    (arr || [])
      .map((r: any) => ({
        [label]: r.Query ?? r.Page ?? r.Url ?? r.query ?? r.page ?? "",
        clicks: num(r.Clicks),
        impressions: num(r.Impressions),
        position: num(r.AvgClickPosition ?? r.AvgImpressionPosition),
      }))
      .filter((x: any) => x[label])
      .sort((a: any, b: any) => b.impressions - a.impressions)
      .slice(0, 100)

  res.json({
    connected: true,
    site_url: siteUrl,
    totals: { clicks: sum.clicks, impressions: sum.impressions, ctr },
    by_date,
    top_queries: mapRows(queries, "query"),
    top_pages: mapRows(pages, "page"),
  })
}

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getSetting } from "../../../lib/settings"
import { resolveVendorSellerId } from "../../../lib/vendor-seller"
import * as crypto from "crypto"

// GET /vendor/search-performance?days=28 — the authenticated vendor's OWN store
// page (/companies/<handle>) performance in Google Search, filtered from the
// platform's Search Console property. Also returns their store URL + custom domain.
const b64 = (o: any) => Buffer.from(JSON.stringify(o)).toString("base64url")

async function getToken(sa: any): Promise<string | null> {
  try {
    const now = Math.floor(Date.now() / 1000)
    const input = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/webmasters.readonly", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 })}`
    const key = crypto.createPrivateKey({ key: sa.private_key, format: "pem" })
    const sig = crypto.sign("RSA-SHA256", Buffer.from(input), key).toString("base64url")
    const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${input}.${sig}` }), signal: AbortSignal.timeout(15000) })
    const d: any = await r.json()
    return d.access_token || null
  } catch { return null }
}

async function query(token: string, siteUrl: string, body: any) {
  const r = await fetch(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) })
  return { ok: r.ok, status: r.status, data: await r.json().catch(() => ({} as any)) }
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const sid = await resolveVendorSellerId(req)
  if (!sid) return res.status(401).json({ message: "Unauthorized" })
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const seller = await pg("seller").where({ id: sid }).first().catch(() => null)
  const handle = (seller && seller.handle) || sid
  const storeUrl = `https://autotorental.com/companies/${handle}`
  const customDomain = (seller && seller.custom_domain) || null
  const base = { store_url: storeUrl, custom_domain: customDomain, custom_domain_status: (seller && seller.custom_domain_status) || null }

  let saRaw: any = await getSetting(req.scope, "ga4_service_account_json").catch(() => "")
  if (!saRaw) return res.json({ connected: false, ...base, message: "Search analytics not configured." })
  let sa: any
  try { sa = typeof saRaw === "string" ? JSON.parse(saRaw) : saRaw } catch { return res.json({ connected: false, ...base }) }
  const token = await getToken(sa)
  if (!token) return res.json({ connected: false, ...base })

  const days = Math.min(90, Math.max(1, Number((req.query as any).days) || 28))
  const fmt = (dt: Date) => dt.toISOString().slice(0, 10)
  const range = { startDate: fmt(new Date(Date.now() - days * 86400000)), endDate: fmt(new Date()) }
  const pageFilter = { dimensionFilterGroups: [{ filters: [{ dimension: "page", operator: "contains", expression: `/companies/${handle}` }] }] }
  const candidates = [((await getSetting(req.scope, "gsc_site_url").catch(() => "")) || ""), "sc-domain:autotorental.com", "https://autotorental.com/"].filter(Boolean)

  let siteUrl = ""
  for (const s of candidates) { const t = await query(token, s, { ...range, dimensions: [], ...pageFilter }); if (t.ok) { siteUrl = s; break } }
  if (!siteUrl) return res.json({ connected: false, ...base, message: "Search analytics unavailable." })

  const [tot, byDate, byQuery] = await Promise.all([
    query(token, siteUrl, { ...range, dimensions: [], ...pageFilter }),
    query(token, siteUrl, { ...range, dimensions: ["date"], rowLimit: 90, ...pageFilter }),
    query(token, siteUrl, { ...range, dimensions: ["query"], rowLimit: 25, ...pageFilter }),
  ])
  const sum = (tot.data && tot.data.rows && tot.data.rows[0]) || {}
  res.json({
    connected: true,
    ...base,
    days,
    totals: {
      clicks: Math.round(sum.clicks || 0),
      impressions: Math.round(sum.impressions || 0),
      ctr: sum.ctr ? +(sum.ctr * 100).toFixed(2) : 0,
      position: sum.position ? +sum.position.toFixed(1) : 0,
    },
    by_date: ((byDate.data && byDate.data.rows) || []).map((r: any) => ({ date: r.keys && r.keys[0], clicks: Math.round(r.clicks || 0), impressions: Math.round(r.impressions || 0) })),
    top_queries: ((byQuery.data && byQuery.data.rows) || []).map((r: any) => ({ query: r.keys && r.keys[0], clicks: Math.round(r.clicks || 0), impressions: Math.round(r.impressions || 0), ctr: r.ctr ? +(r.ctr * 100).toFixed(1) : 0, position: r.position ? +r.position.toFixed(1) : 0 })),
  })
}

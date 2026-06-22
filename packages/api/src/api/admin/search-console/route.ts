import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getSetting } from "../../../lib/settings"
import * as crypto from "crypto"

const b64 = (o: any) => Buffer.from(JSON.stringify(o)).toString("base64url")

async function signJwt(sa: any, scope: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: "RS256", typ: "JWT" }
  const claim = {
    iss: sa.client_email,
    scope,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }
  const input = `${b64(header)}.${b64(claim)}`
  const key = crypto.createPrivateKey({ key: sa.private_key, format: "pem" })
  const sig = crypto.sign("RSA-SHA256", Buffer.from(input), key).toString("base64url")
  return `${input}.${sig}`
}

async function getToken(sa: any): Promise<string | null> {
  try {
    const jwt = await signJwt(sa, "https://www.googleapis.com/auth/webmasters.readonly")
    const r = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
    })
    const d = await r.json()
    return d.access_token || null
  } catch { return null }
}

async function query(token: string, siteUrl: string, body: any) {
  const r = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) }
  )
  return { ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) }
}

// GET /admin/search-console?days=28
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  let saRaw = await getSetting(req.scope, "ga4_service_account_json").catch(() => "")
  if (!saRaw) return res.status(503).json({ message: "No Google service account configured" })
  let sa: any
  try { sa = typeof saRaw === "string" ? JSON.parse(saRaw) : saRaw } catch { return res.status(500).json({ message: "Bad service account JSON" }) }

  const token = await getToken(sa)
  if (!token) return res.status(502).json({ message: "Could not authenticate the service account with Google" })

  const days = Math.min(90, Math.max(1, Number((req.query as any).days) || 28))
  const end = new Date()
  const start = new Date(Date.now() - days * 86400000)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const range = { startDate: fmt(start), endDate: fmt(end) }

  // Try both common property formats.
  const candidates = [
    (await getSetting(req.scope, "gsc_site_url").catch(() => "")) || "",
    "sc-domain:autotorental.com",
    "https://autotorental.com/",
  ].filter(Boolean)

  let siteUrl = "", totals: any = null, lastErr = ""
  for (const s of candidates) {
    const t = await query(token, s, { ...range, dimensions: [] })
    if (t.ok) { siteUrl = s; totals = t.data; break }
    lastErr = `${t.status}: ${JSON.stringify(t.data).slice(0, 200)}`
  }
  if (!siteUrl) {
    if (/accessNotConfigured|SERVICE_DISABLED|has not been used in project|it is disabled/i.test(lastErr || "")) {
      const _m = (lastErr || "").match(/project[ =](\d+)/)
      return res.status(403).json({ message: "Google Search Console API is not enabled for this service account's Google Cloud project", hint: "Enable searchconsole.googleapis.com in the service account's Google Cloud project" + (_m ? (" (project " + _m[1] + ")") : "") + ", wait a few minutes, then retry. This is NOT a property-permission problem.", detail: lastErr, service_account: sa.client_email })
    }
    return res.status(403).json({
      message: "Service account has no access to the Search Console property",
      hint: `Add ${sa.client_email} as a user in Search Console (Settings → Users and permissions), then retry.`,
      detail: lastErr,
      service_account: sa.client_email,
    })
  }

  const [byQuery, byPage, byDate, byCountry, byDevice] = await Promise.all([
    query(token, siteUrl, { ...range, dimensions: ["query"], rowLimit: 200 }),
    query(token, siteUrl, { ...range, dimensions: ["page"], rowLimit: 200 }),
    query(token, siteUrl, { ...range, dimensions: ["date"], rowLimit: 90 }),
    query(token, siteUrl, { ...range, dimensions: ["country"], rowLimit: 60 }),
    query(token, siteUrl, { ...range, dimensions: ["device"], rowLimit: 10 }),
  ])

  const sum = totals?.rows?.[0] || {}
  res.json({
    connected: true,
    site_url: siteUrl,
    range,
    totals: {
      clicks: Math.round(sum.clicks || 0),
      impressions: Math.round(sum.impressions || 0),
      ctr: sum.ctr ? +(sum.ctr * 100).toFixed(2) : 0,
      position: sum.position ? +sum.position.toFixed(1) : 0,
    },
    top_queries: (byQuery.data?.rows || []).map((r: any) => ({ query: r.keys?.[0], clicks: Math.round(r.clicks), impressions: Math.round(r.impressions), ctr: +(r.ctr * 100).toFixed(1), position: +r.position.toFixed(1) })),
    top_pages: (byPage.data?.rows || []).map((r: any) => ({ page: r.keys?.[0], clicks: Math.round(r.clicks), impressions: Math.round(r.impressions), ctr: +(r.ctr * 100).toFixed(1), position: +r.position.toFixed(1) })),
    by_date: (byDate.data?.rows || []).map((r: any) => ({ date: r.keys?.[0], clicks: Math.round(r.clicks), impressions: Math.round(r.impressions) })),
    by_country: (byCountry.data?.rows || []).map((r: any) => ({ country: r.keys?.[0], clicks: Math.round(r.clicks), impressions: Math.round(r.impressions), ctr: +(r.ctr * 100).toFixed(1), position: +r.position.toFixed(1) })),
    by_device: (byDevice.data?.rows || []).map((r: any) => ({ device: r.keys?.[0], clicks: Math.round(r.clicks), impressions: Math.round(r.impressions), ctr: +(r.ctr * 100).toFixed(1), position: +r.position.toFixed(1) })),
  })
}

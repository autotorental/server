// GET /admin/analytics/firebase
// Returns Firebase project metadata + live GA4 metrics (if configured).
//
// Setup (one-time):
//   1. In admin → Integrations → Firebase: paste project_id, app_id, ga4_property_id
//   2. Service account JSON: create at Google Cloud Console → IAM → Service Accounts,
//      grant "Viewer" on the GA4 property, download JSON, paste the whole file as the
//      ga4_service_account_json setting. We sign a JWT to exchange for an access token
//      against analyticsdata.googleapis.com.
//   3. firebase_console_url is computed from project_id but can be overridden.

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getSetting } from "../../../../lib/settings"
import * as crypto from "crypto"

async function signJwt(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: "RS256", typ: "JWT" }
  const claim = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }
  const b64 = (obj: any) => Buffer.from(JSON.stringify(obj)).toString("base64url")
  const signing_input = `${b64(header)}.${b64(claim)}`
  const key = crypto.createPrivateKey({ key: serviceAccount.private_key, format: "pem" })
  const sig = crypto.sign("RSA-SHA256", Buffer.from(signing_input), key).toString("base64url")
  return `${signing_input}.${sig}`
}

async function getAccessToken(saJson: string): Promise<string | null> {
  try {
    const sa = JSON.parse(saJson)
    if (!sa.client_email || !sa.private_key) return null
    const jwt = await signJwt(sa)
    const r = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    })
    const d: any = await r.json()
    return d.access_token || null
  } catch (e) {
    console.error("[ga4] getAccessToken failed:", e)
    return null
  }
}

async function runReport(propertyId: string, token: string, body: any): Promise<any> {
  const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return r.json()
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const projectId = await getSetting(req.scope, "firebase_project_id")
  const appId = await getSetting(req.scope, "firebase_app_id")
  const consoleOverride = await getSetting(req.scope, "firebase_console_url")
  const propertyId = await getSetting(req.scope, "ga4_property_id")
  const saJson = await getSetting(req.scope, "ga4_service_account_json")

  const consoleUrl = consoleOverride ||
    (projectId
      ? `https://console.firebase.google.com/u/0/project/${projectId}/analytics/app/${appId || "overview"}/overview`
      : "https://console.firebase.google.com/")

  const out: any = {
    configured: !!projectId,
    project_id: projectId || null,
    app_id: appId || null,
    property_id: propertyId || null,
    console_url: consoleUrl,
    live_metrics_available: !!(propertyId && saJson),
  }

  if (!propertyId || !saJson) {
    return res.json(out)
  }

  try {
    const token = await getAccessToken(saJson)
    if (!token) {
      out.error = "Could not authenticate service account"
      return res.json(out)
    }
    // Run 4 small reports in parallel
    const [active28, byCountry, byDevice, byPage] = await Promise.all([
      runReport(propertyId, token, {
        dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
        metrics: [{ name: "activeUsers" }, { name: "screenPageViews" }, { name: "sessions" }, { name: "averageSessionDuration" }],
      }),
      runReport(propertyId, token, {
        dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
        dimensions: [{ name: "country" }],
        metrics: [{ name: "activeUsers" }],
        orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
        limit: 10,
      }),
      runReport(propertyId, token, {
        dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
        dimensions: [{ name: "deviceCategory" }],
        metrics: [{ name: "activeUsers" }],
      }),
      runReport(propertyId, token, {
        dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "screenPageViews" }],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 10,
      }),
    ])

    const m = (r: any) => r?.rows?.[0]?.metricValues || []
    out.totals = {
      active_users:    Number(m(active28)[0]?.value || 0),
      page_views:      Number(m(active28)[1]?.value || 0),
      sessions:        Number(m(active28)[2]?.value || 0),
      avg_session_sec: Math.round(Number(m(active28)[3]?.value || 0)),
    }
    out.by_country = (byCountry?.rows || []).map((r: any) => ({
      country: r.dimensionValues?.[0]?.value, users: Number(r.metricValues?.[0]?.value || 0),
    }))
    out.by_device = (byDevice?.rows || []).map((r: any) => ({
      device: r.dimensionValues?.[0]?.value, users: Number(r.metricValues?.[0]?.value || 0),
    }))
    out.top_pages = (byPage?.rows || []).map((r: any) => ({
      path: r.dimensionValues?.[0]?.value, views: Number(r.metricValues?.[0]?.value || 0),
    }))
    out.fetched_at = new Date().toISOString()
  } catch (e: any) {
    out.error = e?.message || "GA4 fetch failed"
  }

  res.json(out)
}

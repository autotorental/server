// GET /admin/analytics/firebase?days=28
// Returns Firebase project metadata + live GA4 metrics (if configured).

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
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

async function getAccessTokenFromOauth(req: MedusaRequest): Promise<string | null> {
  const access = await getSetting(req.scope, "ga4_oauth_access_token")
  const refresh = await getSetting(req.scope, "ga4_oauth_refresh_token")
  const expiresAtRaw = await getSetting(req.scope, "ga4_oauth_expires_at")
  const expiresAt = Number(expiresAtRaw || "0")
  const hasValidAccess = !!access && (!Number.isFinite(expiresAt) || expiresAt <= 0 || Date.now() < expiresAt - 60_000)

  if (hasValidAccess) return access
  if (!refresh) return access || null

  const clientId = (await getSetting(req.scope, "google_client_id")) || ""
  const clientSecret = (await getSetting(req.scope, "google_client_secret")) || ""
  if (!clientId || !clientSecret) return access || null

  try {
    const r = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: refresh,
      }),
    })
    const j: any = await r.json().catch(() => ({}))
    if (!r.ok || !j?.access_token) {
      return access || null
    }

    const nextAccess = j.access_token as string
    const nextExpiresIn = Number(j.expires_in || 0)
    const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const now = new Date()
    const update = async (key: string, value: string, isSecret: boolean) => {
      const existing = await pg("app_setting").where({ key }).first()
      if (existing) {
        await pg("app_setting").where({ key }).update({ value, is_secret: isSecret, updated_at: now })
      } else {
        await pg("app_setting").insert({ key, value, is_secret: isSecret, created_at: now, updated_at: now })
      }
    }
    await update("ga4_oauth_access_token", nextAccess, true)
    if (Number.isFinite(nextExpiresIn) && nextExpiresIn > 0) {
      await update("ga4_oauth_expires_at", String(Date.now() + Math.floor(nextExpiresIn) * 1000), false)
    }

    return nextAccess
  } catch {
    return access || null
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

async function runRealtimeReport(propertyId: string, token: string, body: any): Promise<any> {
  const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runRealtimeReport`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return r.json()
}

function gaDateToIso(gaDate: string) {
  if (!gaDate || gaDate.length !== 8) return gaDate
  return `${gaDate.slice(0, 4)}-${gaDate.slice(4, 6)}-${gaDate.slice(6, 8)}`
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const q = req.query as any
  const days = Math.min(90, Math.max(7, parseInt(q.days || "28", 10) || 28))

  const projectId = await getSetting(req.scope, "firebase_project_id")
  const appId = await getSetting(req.scope, "firebase_app_id")
  const consoleOverride = await getSetting(req.scope, "firebase_console_url")
  const propertyId = await getSetting(req.scope, "ga4_property_id")
  const measurementId = await getSetting(req.scope, "ga4_measurement_id")
  const saJson = await getSetting(req.scope, "ga4_service_account_json")
  const ga4OauthAccess = await getSetting(req.scope, "ga4_oauth_access_token")
  const ga4OauthRefresh = await getSetting(req.scope, "ga4_oauth_refresh_token")
  const lookerEmbed = await getSetting(req.scope, "ga4_looker_embed_url")
  const googleClientId = await getSetting(req.scope, "google_client_id")
  const googleClientSecret = await getSetting(req.scope, "google_client_secret")

  const consoleUrl = consoleOverride ||
    (projectId
      ? `https://console.firebase.google.com/u/0/project/${projectId}/analytics/app/${appId || "overview"}/overview`
      : "https://console.firebase.google.com/")

  const analyticsUrl = propertyId
    ? `https://analytics.google.com/analytics/web/#/p${propertyId}/reports/intelligenthome`
    : "https://analytics.google.com/"

  const hasOauth = !!(ga4OauthAccess || ga4OauthRefresh)
  const live = !!(propertyId && (saJson || hasOauth))

  const out: any = {
    configured: live || !!lookerEmbed,
    project_id: projectId || null,
    app_id: appId || null,
    property_id: propertyId || null,
    measurement_id: measurementId || null,
    console_url: consoleUrl,
    analytics_url: analyticsUrl,
    looker_embed_url: lookerEmbed || null,
    live_metrics_available: live,
    oauth_client_ready: !!(googleClientId && googleClientSecret),
    oauth_connected: hasOauth,
    days,
  }

  if (lookerEmbed && !live) {
    out.fetched_at = new Date().toISOString()
    return res.json(out)
  }

  if (!propertyId || (!saJson && !hasOauth)) {
    return res.json(out)
  }

  try {
    const token = saJson ? await getAccessToken(saJson) : await getAccessTokenFromOauth(req)
    if (!token) {
      out.error = saJson
        ? "Could not authenticate service account — check ga4_service_account_json in Integrations"
        : "Could not authenticate Google OAuth token — reconnect Firebase / GA4 in Integrations"
      return res.json(out)
    }

    const range = { startDate: `${days}daysAgo`, endDate: "today" }

    const [summary, byCountry, byDevice, byPage, byDay, realtime] = await Promise.all([
      runReport(propertyId, token, {
        dateRanges: [range],
        metrics: [
          { name: "activeUsers" },
          { name: "screenPageViews" },
          { name: "sessions" },
          { name: "averageSessionDuration" },
          { name: "newUsers" },
          { name: "bounceRate" },
        ],
      }),
      runReport(propertyId, token, {
        dateRanges: [range],
        dimensions: [{ name: "country" }],
        metrics: [{ name: "activeUsers" }],
        orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
        limit: 12,
      }),
      runReport(propertyId, token, {
        dateRanges: [range],
        dimensions: [{ name: "deviceCategory" }],
        metrics: [{ name: "activeUsers" }],
      }),
      runReport(propertyId, token, {
        dateRanges: [range],
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "screenPageViews" }],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 12,
      }),
      runReport(propertyId, token, {
        dateRanges: [range],
        dimensions: [{ name: "date" }],
        metrics: [{ name: "activeUsers" }, { name: "screenPageViews" }, { name: "sessions" }],
        orderBys: [{ dimension: { dimensionName: "date" } }],
      }),
      runRealtimeReport(propertyId, token, {
        metrics: [{ name: "activeUsers" }],
      }),
    ])

    const reportError = [summary, byCountry, byDevice, byPage, byDay, realtime].find((r: any) => r?.error?.message)
    if (reportError?.error?.message) {
      out.error = reportError.error.message
      return res.json(out)
    }

    const m = (r: any) => r?.rows?.[0]?.metricValues || []
    out.totals = {
      active_users: Number(m(summary)[0]?.value || 0),
      page_views: Number(m(summary)[1]?.value || 0),
      sessions: Number(m(summary)[2]?.value || 0),
      avg_session_sec: Math.round(Number(m(summary)[3]?.value || 0)),
      new_users: Number(m(summary)[4]?.value || 0),
      bounce_rate: Math.round(Number(m(summary)[5]?.value || 0) * 100) / 100,
    }
    out.realtime_users = Number(realtime?.rows?.[0]?.metricValues?.[0]?.value || 0)
    out.by_country = (byCountry?.rows || []).map((r: any) => ({
      country: r.dimensionValues?.[0]?.value,
      users: Number(r.metricValues?.[0]?.value || 0),
    }))
    out.by_device = (byDevice?.rows || []).map((r: any) => ({
      device: r.dimensionValues?.[0]?.value,
      users: Number(r.metricValues?.[0]?.value || 0),
    }))
    out.top_pages = (byPage?.rows || []).map((r: any) => ({
      path: r.dimensionValues?.[0]?.value,
      views: Number(r.metricValues?.[0]?.value || 0),
    }))
    out.series = (byDay?.rows || []).map((r: any) => ({
      date: gaDateToIso(r.dimensionValues?.[0]?.value || ""),
      active_users: Number(r.metricValues?.[0]?.value || 0),
      page_views: Number(r.metricValues?.[1]?.value || 0),
      sessions: Number(r.metricValues?.[2]?.value || 0),
    }))
    out.fetched_at = new Date().toISOString()
  } catch (e: any) {
    out.error = e?.message || "GA4 fetch failed"
  }

  res.json(out)
}

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { upsertAppSetting } from "../../../../../../lib/app-settings-upsert"
import { invalidateSettings } from "../../../../../../lib/settings"
import { normalizeReturnTo, verifyOauthState } from "../../../../../../lib/oauth-state"
import { getSetting } from "../../../../../../lib/settings"

export const AUTHENTICATE = false

type GoogleTokenResponse = {
  access_token?: string
  refresh_token?: string
  expires_in?: number
}

type AnalyticsAccountSummariesResponse = {
  accountSummaries?: Array<{
    propertySummaries?: Array<{
      property?: string
    }>
  }>
}

type DataStreamsResponse = {
  dataStreams?: Array<{
    type?: string
    webStreamData?: {
      measurementId?: string
      defaultUri?: string
    }
  }>
}

type FirebaseProjectsResponse = {
  results?: Array<{
    projectId?: string
    resources?: {
      hostingSite?: string
    }
  }>
}

async function exchangeGoogleToken(params: URLSearchParams): Promise<GoogleTokenResponse> {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) {
    throw new Error((j as any)?.error_description || (j as any)?.error || `Token exchange failed (${r.status})`)
  }
  return j as GoogleTokenResponse
}

async function googleGet<T>(url: string, accessToken: string): Promise<T> {
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error((j as any)?.error?.message || `Google API failed (${r.status})`)
  return j as T
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const code = (req.query.code as string) || ""
  const stateRaw = req.query.state as string | undefined
  const clientId = (await getSetting(req.scope, "google_client_id")) || ""
  const clientSecret = (await getSetting(req.scope, "google_client_secret")) || ""
  const redirectUri =
    (await getSetting(req.scope, "google_firebase_redirect_uri")) ||
    (await getSetting(req.scope, "google_redirect_uri")) ||
    "https://admin.autotorental.com/admin/integrations/oauth/firebase/callback"

  let returnTo = normalizeReturnTo(undefined)
  const oauthError = (req.query.error as string) || ""
  if (oauthError && !stateRaw) {
    const msg = (req.query.error_description as string) || oauthError
    return res.redirect(302, `${returnTo}?oauth=firebase_error&message=${encodeURIComponent(msg)}`)
  }
  try {
    const state = verifyOauthState(stateRaw, "firebase")
    returnTo = normalizeReturnTo(state.return_to)
  } catch (e: any) {
    return res.redirect(302, `${returnTo}?oauth=firebase_error&message=${encodeURIComponent(e.message)}`)
  }

  if (!code) {
    return res.redirect(302, `${returnTo}?oauth=firebase_error&message=${encodeURIComponent("Missing authorization code")}`)
  }
  if (!clientId || !clientSecret) {
    return res.redirect(302, `${returnTo}?oauth=firebase_error&message=${encodeURIComponent("Google app is not configured on server")}`)
  }

  try {
    const token = await exchangeGoogleToken(
      new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      })
    )
    const accessToken = token.access_token || ""
    if (!accessToken) throw new Error("Failed to obtain Google access token")

    const accountSummaries = await googleGet<AnalyticsAccountSummariesResponse>(
      "https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=50",
      accessToken
    )
    const firstProperty = (accountSummaries.accountSummaries || [])
      .flatMap((a) => a.propertySummaries || [])[0]
      ?.property
    const propertyId = firstProperty?.split("/").pop() || ""
    if (!propertyId) throw new Error("No GA4 property found on this Google account")

    const streams = await googleGet<DataStreamsResponse>(
      `https://analyticsadmin.googleapis.com/v1beta/properties/${propertyId}/dataStreams`,
      accessToken
    )
    const webStream = (streams.dataStreams || []).find((s) => s.type === "WEB_DATA_STREAM")
    const measurementId = webStream?.webStreamData?.measurementId || ""

    let firebaseProjectId = ""
    try {
      const projects = await googleGet<FirebaseProjectsResponse>("https://firebase.googleapis.com/v1beta1/projects", accessToken)
      firebaseProjectId = projects.results?.[0]?.projectId || ""
    } catch {
      // Firebase project listing can be restricted; GA4 linking should still succeed.
    }

    const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    await upsertAppSetting(pg, "ga4_property_id", propertyId, false)
    if (measurementId) {
      await upsertAppSetting(pg, "ga4_measurement_id", measurementId, false)
    }
    if (firebaseProjectId) {
      await upsertAppSetting(pg, "firebase_project_id", firebaseProjectId, false)
    }

    await upsertAppSetting(pg, "ga4_oauth_access_token", accessToken, true)
    if (token.refresh_token) {
      await upsertAppSetting(pg, "ga4_oauth_refresh_token", token.refresh_token, true)
    }
    if (token.expires_in && Number.isFinite(token.expires_in)) {
      await upsertAppSetting(
        pg,
        "ga4_oauth_expires_at",
        String(Date.now() + Math.max(0, Math.floor(token.expires_in)) * 1000),
        false
      )
    }

    invalidateSettings()
    return res.redirect(302, `${returnTo}?oauth=firebase_connected`)
  } catch (e: any) {
    return res.redirect(
      302,
      `${returnTo}?oauth=firebase_error&message=${encodeURIComponent(e.message || "OAuth failed")}`
    )
  }
}

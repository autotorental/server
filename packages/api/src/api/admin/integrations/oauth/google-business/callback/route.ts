import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { upsertAppSetting } from "../../../../../../lib/app-settings-upsert"
import { normalizeReturnTo, verifyOauthState } from "../../../../../../lib/oauth-state"
import { getSetting } from "../../../../../../lib/settings"

export const AUTHENTICATE = false

type GoogleTokenResponse = {
  access_token?: string
  refresh_token?: string
}

async function exchangeGoogleToken(params: URLSearchParams): Promise<GoogleTokenResponse> {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error((j as any)?.error_description || (j as any)?.error || `Token exchange failed (${r.status})`)
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
    (await getSetting(req.scope, "google_redirect_uri")) ||
    "https://admin.autotorental.com/admin/integrations/oauth/google-business/callback"

  let returnTo = normalizeReturnTo(undefined)
  const oauthError = (req.query.error as string) || ""
  if (oauthError && !stateRaw) {
    const msg = (req.query.error_description as string) || oauthError
    return res.redirect(302, `${returnTo}?oauth=google_business_error&message=${encodeURIComponent(msg)}`)
  }
  try {
    const state = verifyOauthState(stateRaw, "google_business")
    returnTo = normalizeReturnTo(state.return_to)
  } catch (e: any) {
    return res.redirect(302, `${returnTo}?oauth=google_business_error&message=${encodeURIComponent(e.message)}`)
  }

  if (!code) {
    return res.redirect(302, `${returnTo}?oauth=google_business_error&message=${encodeURIComponent("Missing authorization code")}`)
  }
  if (!clientId || !clientSecret) {
    return res.redirect(302, `${returnTo}?oauth=google_business_error&message=${encodeURIComponent("Google app is not configured on server")}`)
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

    const accounts = await googleGet<{ accounts?: Array<{ name?: string }> }>(
      "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
      accessToken
    )
    const accountName = (accounts.accounts || [])[0]?.name || ""
    if (!accountName) throw new Error("No Google Business account found")
    const accountId = accountName.split("/").pop() || ""

    const locations = await googleGet<{ locations?: Array<{ name?: string }> }>(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title`,
      accessToken
    )
    const locationName = (locations.locations || [])[0]?.name || ""
    if (!locationName) throw new Error("No Google Business location found")
    const locationId = locationName.split("/").pop() || ""

    const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    await upsertAppSetting(pg, "google_business_account_id", accountId, false)
    await upsertAppSetting(pg, "google_business_location_id", locationId, false)
    await upsertAppSetting(pg, "google_business_oauth_token", accessToken, true)
    if (token.refresh_token) {
      await upsertAppSetting(pg, "google_business_refresh_token", token.refresh_token, true)
    }
    // Enable autopost immediately after successful connect
    await upsertAppSetting(pg, "google_business_auto_post_enabled", "1", false)

    return res.redirect(302, `${returnTo}?oauth=google_business_connected`)
  } catch (e: any) {
    return res.redirect(
      302,
      `${returnTo}?oauth=google_business_error&message=${encodeURIComponent(e.message || "OAuth failed")}`
    )
  }
}

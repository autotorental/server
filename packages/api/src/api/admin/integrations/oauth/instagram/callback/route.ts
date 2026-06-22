import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { upsertAppSetting } from "../../../../../../lib/app-settings-upsert"
import { normalizeReturnTo, verifyOauthState } from "../../../../../../lib/oauth-state"

export const AUTHENTICATE = false

type FacebookTokenResponse = {
  access_token?: string
  token_type?: string
  expires_in?: number
}

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url)
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error((j as any)?.error?.message || `Request failed (${r.status})`)
  return j as T
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const code = (req.query.code as string) || ""
  const stateRaw = req.query.state as string | undefined
  const appId = process.env.FACEBOOK_APP_ID || ""
  const appSecret = process.env.FACEBOOK_APP_SECRET || ""
  const redirectUri = process.env.FACEBOOK_REDIRECT_URI || "https://api.autotorental.com/admin/integrations/oauth/instagram/callback"

  let returnTo = normalizeReturnTo(undefined)
  try {
    const state = verifyOauthState(stateRaw, "instagram")
    returnTo = normalizeReturnTo(state.return_to)
  } catch (e: any) {
    return res.redirect(302, `${returnTo}?oauth=instagram_error&message=${encodeURIComponent(e.message)}`)
  }

  if (!code) {
    return res.redirect(302, `${returnTo}?oauth=instagram_error&message=${encodeURIComponent("Missing authorization code")}`)
  }
  if (!appId || !appSecret) {
    return res.redirect(302, `${returnTo}?oauth=instagram_error&message=${encodeURIComponent("Facebook app is not configured on server")}`)
  }

  try {
    const shortToken = await getJson<FacebookTokenResponse>(
      `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${encodeURIComponent(
        appId
      )}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${encodeURIComponent(
        appSecret
      )}&code=${encodeURIComponent(code)}`
    )
    const shortAccess = shortToken.access_token || ""
    if (!shortAccess) throw new Error("Failed to obtain Facebook access token")

    const longToken = await getJson<FacebookTokenResponse>(
      `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${encodeURIComponent(
        appId
      )}&client_secret=${encodeURIComponent(appSecret)}&fb_exchange_token=${encodeURIComponent(shortAccess)}`
    )
    const userAccess = longToken.access_token || shortAccess

    const pages = await getJson<{ data?: Array<{ id: string; name: string; access_token?: string }> }>(
      `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token&access_token=${encodeURIComponent(userAccess)}`
    )
    const page = (pages.data || [])[0]
    if (!page?.id || !page?.access_token) {
      throw new Error("No Facebook page found on this account")
    }

    const ig = await getJson<{ instagram_business_account?: { id?: string } }>(
      `https://graph.facebook.com/v19.0/${encodeURIComponent(
        page.id
      )}?fields=instagram_business_account{id,username}&access_token=${encodeURIComponent(page.access_token)}`
    )
    const igId = ig.instagram_business_account?.id || ""
    if (!igId) throw new Error("No Instagram Business account linked to selected Facebook Page")

    const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    await upsertAppSetting(pg, "facebook_page_id", page.id, false)
    await upsertAppSetting(pg, "facebook_page_token", page.access_token, true)
    await upsertAppSetting(pg, "instagram_business_id", igId, false)
    // Enable autopost immediately after successful connect
    await upsertAppSetting(pg, "facebook_auto_post_enabled", "1", false)
    await upsertAppSetting(pg, "instagram_auto_post_enabled", "1", false)

    return res.redirect(302, `${returnTo}?oauth=instagram_connected`)
  } catch (e: any) {
    return res.redirect(302, `${returnTo}?oauth=instagram_error&message=${encodeURIComponent(e.message || "OAuth failed")}`)
  }
}

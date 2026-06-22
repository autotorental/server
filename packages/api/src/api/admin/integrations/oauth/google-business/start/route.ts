import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createOauthState, normalizeReturnTo } from "../../../../../../lib/oauth-state"
import { getSetting } from "../../../../../../lib/settings"

export const AUTHENTICATE = false

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const clientId = (await getSetting(req.scope, "google_client_id")) || ""
  const redirectUri =
    (await getSetting(req.scope, "google_redirect_uri")) ||
    "https://admin.autotorental.com/admin/integrations/oauth/google-business/callback"
  if (!clientId) {
    return res.status(503).json({ message: "GOOGLE_CLIENT_ID is not configured on server" })
  }

  const returnTo = normalizeReturnTo((req.query.return_to as string) || undefined)
  const state = createOauthState("google_business", returnTo)
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth")
  authUrl.searchParams.set("client_id", clientId)
  authUrl.searchParams.set("redirect_uri", redirectUri)
  authUrl.searchParams.set("response_type", "code")
  authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/business.manage")
  authUrl.searchParams.set("access_type", "offline")
  authUrl.searchParams.set("prompt", "consent")
  authUrl.searchParams.set("include_granted_scopes", "true")
  authUrl.searchParams.set("state", state)

  res.redirect(302, authUrl.toString())
}

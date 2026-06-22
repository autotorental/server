import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createOauthState, normalizeReturnTo } from "../../../../../../lib/oauth-state"

export const AUTHENTICATE = false

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const clientId = process.env.FACEBOOK_APP_ID || ""
  const redirectUri = process.env.FACEBOOK_REDIRECT_URI || "https://api.autotorental.com/admin/integrations/oauth/instagram/callback"
  if (!clientId) {
    return res.status(503).json({ message: "FACEBOOK_APP_ID is not configured on server" })
  }

  const returnTo = normalizeReturnTo((req.query.return_to as string) || undefined)
  const state = createOauthState("instagram", returnTo)
  const authUrl = new URL("https://www.facebook.com/v19.0/dialog/oauth")
  authUrl.searchParams.set("client_id", clientId)
  authUrl.searchParams.set("redirect_uri", redirectUri)
  authUrl.searchParams.set("state", state)
  authUrl.searchParams.set(
    "scope",
    [
      "pages_show_list",
      "pages_read_engagement",
      "pages_manage_posts",
      "instagram_basic",
      "instagram_content_publish",
    ].join(",")
  )

  res.redirect(302, authUrl.toString())
}

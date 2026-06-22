import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { SOCIAL_MODULE } from "../../../../../modules/social"
import {
  discoverAccounts,
  exchangeCodeForToken,
} from "../../../../../modules/social/lib/meta-oauth"
import { verifyState } from "../../../../../modules/social/lib/oauth-state"

// GET /social/oauth/facebook/callback
// Public route — Facebook redirects the browser here after the user grants
// access. We verify state, exchange the code, discover Pages + IG accounts and
// upsert them, then bounce back to the admin settings page.
function returnUrl(connected: number, error?: string): string {
  const base = (
    process.env.SOCIAL_ADMIN_RETURN ||
    `${(process.env.BACKEND_URL || "").replace(/\/$/, "")}/dashboard`
  ).replace(/\/$/, "")
  const q = error
    ? `?social_error=${encodeURIComponent(error)}`
    : `?social_connected=${connected}`
  return `${base}/social${q}`
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { code, state, error: oauthError } = req.query as Record<string, string>

  if (oauthError) {
    return res.redirect(returnUrl(0, oauthError))
  }
  if (!verifyState(state).ok) {
    return res.redirect(returnUrl(0, "invalid_state"))
  }
  if (!code) {
    return res.redirect(returnUrl(0, "missing_code"))
  }

  try {
    const social: any = req.scope.resolve(SOCIAL_MODULE)
    const userToken = await exchangeCodeForToken(code)
    const discovered = await discoverAccounts(userToken)

    let connected = 0
    for (const acc of discovered) {
      // Upsert by (platform, external_id) so re-connecting refreshes tokens.
      const existing = await social.listSocialAccounts({
        platform: acc.platform,
        external_id: acc.external_id,
      })
      if (existing.length) {
        await social.updateAccountToken(existing[0].id, acc.access_token, acc.name)
      } else {
        await social.createAccountWithTokens({
          platform: acc.platform,
          name: acc.name,
          external_id: acc.external_id,
          access_token: acc.access_token,
        })
      }
      connected++
    }
    return res.redirect(returnUrl(connected))
  } catch (e: any) {
    return res.redirect(returnUrl(0, e?.message || "connect_failed"))
  }
}

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { SOCIAL_MODULE } from "../../../../../modules/social"
import { ALL_PLATFORMS, SocialPlatform } from "../../../../../modules/social/types"

// POST /admin/social/accounts/manual
// Connect any platform by providing its credentials directly. Use this for
// Discord (paste a webhook URL as access_token) and for platforms where you
// already hold a token. Body:
//   { platform, name, access_token, external_id?, metadata? }
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const social: any = req.scope.resolve(SOCIAL_MODULE)
  const b = (req.body || {}) as any

  if (!ALL_PLATFORMS.includes(b.platform)) {
    return res.status(400).json({ message: `Unknown platform: ${b.platform}` })
  }
  if (!b.access_token) {
    return res.status(400).json({ message: "access_token (or webhook URL) is required" })
  }

  const account = await social.createAccountWithTokens({
    platform: b.platform as SocialPlatform,
    name: b.name || b.platform,
    external_id: b.external_id ?? null,
    access_token: b.access_token,
    refresh_token: b.refresh_token ?? null,
    metadata: b.metadata ?? null,
  })

  res.json({
    account: {
      id: account.id,
      platform: account.platform,
      name: account.name,
      external_id: account.external_id,
      enabled: account.enabled,
    },
  })
}

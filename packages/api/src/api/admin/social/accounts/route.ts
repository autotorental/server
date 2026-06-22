import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { SOCIAL_MODULE } from "../../../../modules/social"

// GET /admin/social/accounts — list connected accounts (no tokens exposed).
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const social: any = req.scope.resolve(SOCIAL_MODULE)
  const accounts = await social.listSocialAccounts({})
  res.json({
    accounts: accounts.map((a: any) => ({
      id: a.id,
      platform: a.platform,
      name: a.name,
      external_id: a.external_id,
      enabled: a.enabled,
      token_expires_at: a.token_expires_at,
    })),
  })
}

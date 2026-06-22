import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { SOCIAL_MODULE } from "../../../../../modules/social"

// PATCH /admin/social/accounts/:id — enable/disable an account.
export const PATCH = async (req: MedusaRequest, res: MedusaResponse) => {
  const social: any = req.scope.resolve(SOCIAL_MODULE)
  const { id } = req.params
  const { enabled } = (req.body || {}) as { enabled?: boolean }
  const updated = await social.updateSocialAccounts({ id, enabled: !!enabled })
  res.json({ account: { id: updated.id, enabled: updated.enabled } })
}

// DELETE /admin/social/accounts/:id — disconnect an account.
export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const social: any = req.scope.resolve(SOCIAL_MODULE)
  const { id } = req.params
  await social.deleteSocialAccounts(id)
  res.json({ id, deleted: true })
}

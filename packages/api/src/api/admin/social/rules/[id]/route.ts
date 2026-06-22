import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { SOCIAL_MODULE } from "../../../../../modules/social"

// PATCH /admin/social/rules/:id — update a rule (enable, template, accounts...).
export const PATCH = async (req: MedusaRequest, res: MedusaResponse) => {
  const social: any = req.scope.resolve(SOCIAL_MODULE)
  const { id } = req.params
  const b = (req.body || {}) as any
  const patch: any = { id }
  for (const k of ["name", "enabled", "event", "account_ids", "template", "filters", "delay_minutes"]) {
    if (k in b) patch[k] = b[k]
  }
  const rule = await social.updateAutoPostRules(patch)
  res.json({ rule })
}

// DELETE /admin/social/rules/:id
export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const social: any = req.scope.resolve(SOCIAL_MODULE)
  const { id } = req.params
  await social.deleteAutoPostRules(id)
  res.json({ id, deleted: true })
}

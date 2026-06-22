import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { SOCIAL_MODULE } from "../../../../modules/social"

// GET /admin/social/rules — list auto-post rules.
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const social: any = req.scope.resolve(SOCIAL_MODULE)
  const rules = await social.listAutoPostRules({})
  res.json({ rules })
}

// POST /admin/social/rules — create an auto-post rule.
// Body: { name, enabled?, event?, account_ids[], template, filters?, delay_minutes? }
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const social: any = req.scope.resolve(SOCIAL_MODULE)
  const b = (req.body || {}) as any

  if (!Array.isArray(b.account_ids) || !b.account_ids.length) {
    return res.status(400).json({ message: "account_ids is required" })
  }
  if (!b.template) {
    return res.status(400).json({ message: "template is required" })
  }

  const rule = await social.createAutoPostRules({
    name: b.name || "Auto-post cars",
    enabled: b.enabled ?? true,
    event: b.event || "product_created",
    account_ids: b.account_ids,
    template: b.template,
    filters: b.filters ?? null,
    delay_minutes: b.delay_minutes ?? 0,
  })
  res.json({ rule })
}

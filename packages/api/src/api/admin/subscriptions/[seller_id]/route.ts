import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// POST — update seller subscription (admin marks as paid / extends / cancels).
// Writes directly via SQL because subscription_* are custom columns not in the Mercur
// seller model, so seller.updateSellers() silently ignores them.
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const id = req.params.seller_id
  const body = (req.body || {}) as any

  const current = await pg("seller").where({ id }).first()
  if (!current) return res.status(404).json({ message: "Seller not found" })

  const updates: any = {}
  if (body.subscription_status) updates.subscription_status = body.subscription_status
  if (body.subscription_plan) updates.subscription_plan = body.subscription_plan

  if (body.extend_days) {
    // Clock starts on the listing-approval date when possible:
    //   1) extend an already-active subscription from its future end date
    //   2) else start from the approval date (trade_license_verified_at)
    //   3) else today
    let base: Date
    if (current.subscription_ends_at && new Date(current.subscription_ends_at) > new Date()) {
      base = new Date(current.subscription_ends_at)
    } else if (current.trade_license_verified_at) {
      base = new Date(current.trade_license_verified_at)
    } else {
      base = new Date()
    }
    base.setDate(base.getDate() + (parseInt(body.extend_days, 10) || 0))
    updates.subscription_ends_at = base.toISOString()
    updates.subscription_status = "active"
    if (current.trade_license_verified_at) {
      const meta = (current.metadata && typeof current.metadata === "object") ? current.metadata : {}
      updates.metadata = JSON.stringify({ ...meta, subscription_started_at: new Date(current.trade_license_verified_at).toISOString() })
    }
  }
  if (body.subscription_ends_at) updates.subscription_ends_at = body.subscription_ends_at

  if (Object.keys(updates).length === 0) {
    return res.json({ seller: current })
  }
  updates.updated_at = new Date()
  await pg("seller").where({ id }).update(updates)
  const updated = await pg("seller").where({ id }).first()
  res.json({ seller: updated })
}


// GET — the seller's current subscription, for the inline card on the company page.
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const id = req.params.seller_id
  const s = await pg("seller").where({ id }).first()
  if (!s) return res.status(404).json({ message: "Seller not found" })
  res.json({
    name: s.name,
    subscription_status: s.subscription_status || "trial",
    subscription_plan: s.subscription_plan || null,
    subscription_ends_at: s.subscription_ends_at || null,
    trial_ends_at: s.trial_ends_at || null,
  })
}

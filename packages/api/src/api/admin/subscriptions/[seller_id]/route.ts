import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

// POST — update seller subscription (admin marks as paid, extends, cancels)
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const seller: any = req.scope.resolve("seller")
  const body = req.body as any
  const updates: any = { id: req.params.seller_id }
  if (body.subscription_status) updates.subscription_status = body.subscription_status
  if (body.subscription_plan) updates.subscription_plan = body.subscription_plan
  if (body.extend_days) {
    // Extend subscription by N days from today (or from current subscription_ends_at if in future)
    const current = await seller.retrieveSeller(req.params.seller_id)
    const base = current.subscription_ends_at && new Date(current.subscription_ends_at) > new Date()
      ? new Date(current.subscription_ends_at)
      : new Date()
    base.setDate(base.getDate() + parseInt(body.extend_days, 10))
    updates.subscription_ends_at = base.toISOString()
    updates.subscription_status = "active"
  }
  if (body.subscription_ends_at) updates.subscription_ends_at = body.subscription_ends_at
  const [updated] = await seller.updateSellers([updates])
  res.json({ seller: updated })
}

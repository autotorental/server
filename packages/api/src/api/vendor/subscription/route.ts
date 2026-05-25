import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const sellerId = (req as any).auth_context?.app_metadata?.seller_id
  if (!sellerId) return res.status(401).json({ message: "unauthenticated" })
  const seller: any = req.scope.resolve("seller")
  const s = await seller.retrieveSeller(sellerId)
  const now = new Date()
  const trialEnd = s.trial_ends_at ? new Date(s.trial_ends_at) : null
  const subEnd = s.subscription_ends_at ? new Date(s.subscription_ends_at) : null
  let status = s.subscription_status || "trial"
  if (status === "active" && subEnd && subEnd < now) status = "expired"
  if (status === "trial" && trialEnd && trialEnd < now) status = "expired"
  const daysLeft = status === "trial" && trialEnd
    ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / 86400000))
    : status === "active" && subEnd
    ? Math.max(0, Math.ceil((subEnd.getTime() - now.getTime()) / 86400000))
    : 0
  res.json({
    status, days_left: daysLeft,
    trial_ends_at: s.trial_ends_at,
    subscription_ends_at: s.subscription_ends_at,
    subscription_plan: s.subscription_plan,
  })
}

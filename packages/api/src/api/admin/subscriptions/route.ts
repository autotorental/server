import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

// GET — list all sellers with subscription info
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const seller: any = req.scope.resolve("seller")
  const list = await seller.listSellers({}, { take: 500 })
  const now = new Date()
  const rows = list.map((s: any) => {
    const trialEnd = s.trial_ends_at ? new Date(s.trial_ends_at) : null
    const subEnd = s.subscription_ends_at ? new Date(s.subscription_ends_at) : null
    let effective_status = s.subscription_status || "trial"
    if (s.subscription_status === "active" && subEnd && subEnd < now) effective_status = "expired"
    if (s.subscription_status === "trial" && trialEnd && trialEnd < now) effective_status = "expired"
    const daysLeft = effective_status === "trial" && trialEnd
      ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / 86400000))
      : effective_status === "active" && subEnd
      ? Math.max(0, Math.ceil((subEnd.getTime() - now.getTime()) / 86400000))
      : 0
    return { ...s, effective_status, days_left: daysLeft }
  })
  res.json({ subscriptions: rows })
}

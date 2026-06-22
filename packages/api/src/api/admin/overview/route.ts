import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// GET /admin/overview — owner cockpit business metrics.
const PLAN_PRICE_AED = 99 // base monthly plan; est. MRR = paying vendors * this

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  try {
    const now = new Date()
    const in7 = new Date(Date.now() + 7 * 86400000)
    const [companies, vehicles, pending, paying, trials, expiring] = await Promise.all([
      pg("seller").whereNull("deleted_at").count("* as n").first(),
      pg("vehicle").whereNull("deleted_at").count("* as n").first(),
      pg("vehicle").whereNull("deleted_at").where("status", "pending_approval").count("* as n").first(),
      pg("seller").whereNull("deleted_at").where("subscription_status", "active").count("* as n").first(),
      pg("seller").whereNull("deleted_at").where("subscription_status", "trial").count("* as n").first(),
      pg("seller").whereNull("deleted_at").where("subscription_status", "trial")
        .whereNotNull("trial_ends_at").where("trial_ends_at", "<=", in7).where("trial_ends_at", ">=", now)
        .count("* as n").first(),
    ])
    const payingN = Number(paying?.n || 0)
    res.json({
      companies: Number(companies?.n || 0),
      vehicles: Number(vehicles?.n || 0),
      pending_approvals: Number(pending?.n || 0),
      paying_vendors: payingN,
      trial_vendors: Number(trials?.n || 0),
      trials_expiring_7d: Number(expiring?.n || 0),
      est_mrr_aed: payingN * PLAN_PRICE_AED,
    })
  } catch (e: any) {
    res.status(500).json({ message: e?.message || "overview failed" })
  }
}

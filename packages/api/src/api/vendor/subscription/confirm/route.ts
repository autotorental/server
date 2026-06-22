// POST /vendor/subscription/confirm — after a successful native PaymentSheet
// payment, read the subscription straight from Stripe (authoritative, no webhook
// needed) and flip the seller to active. Returns the same shape as
// GET /vendor/subscription so the app can refresh in place.
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getSetting } from "../../../../lib/settings"

function getSellerId(req: MedusaRequest): string | null {
  const auth = (req as any).auth_context
  return (auth?.app_metadata?.seller_id || auth?.actor_id) || null
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const sellerId = getSellerId(req)
  if (!sellerId) return res.status(401).json({ message: "Unauthorized" })

  const body = req.body as { subscription_id?: string }
  const subId = body?.subscription_id
  if (!subId) return res.status(400).json({ message: "Missing subscription_id" })

  const secret = (await getSetting(req.scope, "stripe_secret_key").catch(() => "")) || ""
  if (!secret) return res.status(400).json({ message: "Stripe is not configured." })

  const r = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subId)}`, {
    headers: { Authorization: `Bearer ${secret}` },
  })
  const sub: any = await r.json()
  if (sub.error) return res.status(400).json({ message: sub.error.message })

  // Only the seller who owns the subscription may confirm it.
  if (sub.metadata?.seller_id && sub.metadata.seller_id !== sellerId) {
    return res.status(403).json({ message: "Forbidden" })
  }

  const active = ["active", "trialing", "past_due"].includes(sub.status)
  const plan = sub.metadata?.plan === "yearly" ? "yearly" : "monthly"
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  if (active) {
    let ends: Date
    if (sub.current_period_end) {
      ends = new Date(sub.current_period_end * 1000)
    } else {
      ends = new Date()
      ends.setMonth(ends.getMonth() + (plan === "yearly" ? 12 : 1))
    }
    await pg("seller").where({ id: sellerId }).update({
      subscription_status: "active",
      subscription_plan: plan,
      subscription_ends_at: ends,
      updated_at: new Date(),
    })
  }

  // Mirror GET /vendor/subscription so the app can setSub() directly.
  const s = await pg("seller").where({ id: sellerId }).first()
  const now = new Date()
  const subEnd = s?.subscription_ends_at ? new Date(s.subscription_ends_at) : null
  let status = s?.subscription_status || "trial"
  if (status === "active" && subEnd && subEnd < now) status = "expired"
  const daysLeft = (status === "active" && subEnd)
    ? Math.max(0, Math.ceil((subEnd.getTime() - now.getTime()) / 86400000))
    : 0
  return res.json({
    status,
    days_left: daysLeft,
    trial_ends_at: s?.trial_ends_at,
    subscription_ends_at: s?.subscription_ends_at,
    subscription_plan: s?.subscription_plan,
  })
}

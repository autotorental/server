// POST /vendor/subscription/checkout — create Stripe Checkout Session
// Body: { plan: "monthly" | "yearly" }
// Returns: { url } to redirect the vendor to Stripe-hosted checkout

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getSetting } from "../../../../lib/settings"

const PRICES = {
  // Auto to Rental pricing — adjust to your real product prices in Stripe dashboard
  // We use price_data inline so no setup is needed in Stripe — Stripe creates the price on the fly.
  monthly: { amount_cents: 9900, currency: "aed", interval: "month" as const, label: "Auto to Rental — Monthly" },
  yearly:  { amount_cents: 99000, currency: "aed", interval: "year"  as const, label: "Auto to Rental — Yearly (save 17%)" },
}

function getSellerId(req: MedusaRequest): string | null {
  const auth = (req as any).auth_context
  return auth?.app_metadata?.seller_id || auth?.actor_id || null
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const sellerId = getSellerId(req)
  if (!sellerId) return res.status(401).json({ message: "Unauthorized" })

  const body = req.body as { plan?: "monthly" | "yearly" }
  const plan = body?.plan || "monthly"
  const tier = PRICES[plan]
  if (!tier) return res.status(400).json({ message: "Unknown plan" })

  const secret = await getSetting(req.scope, "stripe_secret_key")
  if (!secret) return res.status(500).json({ message: "Stripe not configured in admin settings" })

  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const seller = await pg("seller").where({ id: sellerId }).first()
  if (!seller) return res.status(404).json({ message: "Seller not found" })

  // Reuse existing Stripe customer if we have one
  let customerId = seller.stripe_customer_id || null

  try {
    if (!customerId) {
      const cust = await fetch("https://api.stripe.com/v1/customers", {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          email: seller.email || "",
          name: seller.name || "",
          "metadata[seller_id]": sellerId,
        }),
      }).then(r => r.json())
      if (cust.error) throw new Error(cust.error.message)
      customerId = cust.id
      await pg("seller").where({ id: sellerId }).update({ stripe_customer_id: customerId, updated_at: new Date() })
    }

    const params = new URLSearchParams()
    params.append("mode", "subscription")
    params.append("customer", customerId)
    params.append("success_url", `https://seller.autotorental.com/rental/subscription?ok=1`)
    params.append("cancel_url",  `https://seller.autotorental.com/rental/subscription?cancelled=1`)
    params.append("client_reference_id", sellerId)
    params.append("metadata[seller_id]", sellerId)
    params.append("metadata[plan]", plan)
    params.append("line_items[0][quantity]", "1")
    params.append("line_items[0][price_data][currency]", tier.currency)
    params.append("line_items[0][price_data][unit_amount]", String(tier.amount_cents))
    params.append("line_items[0][price_data][recurring][interval]", tier.interval)
    params.append("line_items[0][price_data][product_data][name]", tier.label)
    params.append("line_items[0][price_data][product_data][description]", "Unlimited vehicle listings, analytics, follower notifications.")
    params.append("subscription_data[metadata][seller_id]", sellerId)
    params.append("subscription_data[metadata][plan]", plan)

    const sessRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    })
    const sess = await sessRes.json()
    if (sess.error) throw new Error(sess.error.message)
    return res.json({ url: sess.url, session_id: sess.id })
  } catch (e: any) {
    return res.status(500).json({ message: e.message || "Checkout failed" })
  }
}

// GET /vendor/subscription/checkout — also expose Customer Portal link
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const sellerId = getSellerId(req)
  if (!sellerId) return res.status(401).json({ message: "Unauthorized" })

  const secret = await getSetting(req.scope, "stripe_secret_key")
  if (!secret) return res.status(500).json({ message: "Stripe not configured" })

  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const seller = await pg("seller").where({ id: sellerId }).first()
  if (!seller?.stripe_customer_id) return res.status(400).json({ message: "No active customer — subscribe first" })

  try {
    const portal = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        customer: seller.stripe_customer_id,
        return_url: "https://seller.autotorental.com/rental/subscription",
      }),
    }).then(r => r.json())
    if (portal.error) throw new Error(portal.error.message)
    return res.json({ url: portal.url })
  } catch (e: any) {
    return res.status(500).json({ message: e.message })
  }
}

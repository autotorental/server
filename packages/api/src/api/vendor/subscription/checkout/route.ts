// POST /vendor/subscription/checkout — start a hosted checkout for the vendor
// subscription. Provider-agnostic: Mollie (default in MENA — Stripe is hard to
// open there), Stripe, or a no-charge "demo" mode for safe testing.
// Body: { plan: "monthly" | "yearly" }  ->  { url } to redirect the vendor.

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getSetting } from "../../../../lib/settings"
import { mollieClient, mollieAmount } from "../../../../lib/mollie"

const PARTNER = "https://partner.autotorental.com/rental/subscription"
const WEBHOOK = "https://api.autotorental.com/webhooks/mollie"

// Stripe still bills in AED cents inline; Mollie prices come from settings below.
const PRICES = {
  monthly: { amount_cents: 9900, currency: "aed", interval: "month" as const, label: "Auto to Rental — Monthly" },
  yearly:  { amount_cents: 99000, currency: "aed", interval: "year"  as const, label: "Auto to Rental — Yearly (save 17%)" },
}

function getSellerId(req: MedusaRequest): string | null {
  const auth = (req as any).auth_context
  return auth?.app_metadata?.seller_id || auth?.actor_id || null
}

// Mollie does NOT support AED — currency + prices are admin-configurable (default EUR).
async function mollieMoney(scope: any, plan: "monthly" | "yearly") {
  const currency = (await getSetting(scope, "mollie_currency").catch(() => "")) || "EUR"
  const monthly  = (await getSetting(scope, "mollie_price_monthly").catch(() => "")) || "25.00"
  const yearly   = (await getSetting(scope, "mollie_price_yearly").catch(() => "")) || "250.00"
  return mollieAmount(currency, plan === "yearly" ? yearly : monthly)
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const sellerId = getSellerId(req)
  if (!sellerId) return res.status(401).json({ message: "Unauthorized" })

  const body = req.body as { plan?: "monthly" | "yearly" }
  const plan: "monthly" | "yearly" = body?.plan === "yearly" ? "yearly" : "monthly"
  const tier = PRICES[plan]

  const scope = req.scope
  const mollieKey = (await getSetting(scope, "mollie_api_key").catch(() => "")) || ""
  const stripeKey = (await getSetting(scope, "stripe_secret_key").catch(() => "")) || ""
  const payMode   = (await getSetting(scope, "payment_mode").catch(() => "")) || ""
  let provider = ((await getSetting(scope, "payment_provider").catch(() => "")) || "").toLowerCase()
  if (!provider) {
    // No explicit choice: honour the legacy demo flag, else auto-detect by key.
    if (payMode === "demo") provider = "demo"
    else provider = mollieKey ? "mollie" : (stripeKey ? "stripe" : "demo")
  }
  // Safety: fall back to demo if the chosen provider has no key configured.
  if (provider === "mollie" && !mollieKey) provider = "demo"
  if (provider === "stripe" && !stripeKey) provider = "demo"

  const pg: any = scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const seller = await pg("seller").where({ id: sellerId }).first()
  if (!seller) return res.status(404).json({ message: "Seller not found" })

  // ----------------------------- DEMO -----------------------------
  if (provider === "demo") {
    const months = plan === "yearly" ? 12 : 1
    const ends = new Date(); ends.setMonth(ends.getMonth() + months)
    await pg("seller").where({ id: sellerId }).update({
      subscription_status: "active",
      subscription_plan: plan,
      subscription_ends_at: ends,
      updated_at: new Date(),
    })
    return res.json({
      demo: true, activated: true, plan, subscription_ends_at: ends,
      url: `${PARTNER}?demo=1&ok=1`,
      message: "Demo payment — subscription activated (no real charge).",
    })
  }

  // ----------------------------- MOLLIE -----------------------------
  if (provider === "mollie") {
    try {
      const testmode = (await getSetting(scope, "mollie_testmode").catch(() => "")) === "true"
      const mollie = mollieClient(mollieKey, testmode)
      const amount = await mollieMoney(scope, plan)
      // No `method` and no `sequenceType`: Mollie's hosted page then offers EVERY
      // activated method (card, Klarna, PayPal once enabled) and the vendor picks.
      // (A mandate/recurring flow would hide PayPal & Klarna, so we stay one-off.)
      const pay: any = await mollie.createPayment({
        amount,
        description: tier.label,
        redirectUrl: `${PARTNER}?ok=1`,
        webhookUrl: WEBHOOK,
        metadata: { seller_id: sellerId, plan },
      })
      const url = pay?._links?.checkout?.href
      if (!url) throw new Error("Mollie returned no checkout URL")
      return res.json({ url, payment_id: pay.id, provider: "mollie" })
    } catch (e: any) {
      return res.status(500).json({ message: e?.message || "Mollie checkout failed" })
    }
  }

  // ----------------------------- STRIPE -----------------------------
  try {
    let customerId = seller.stripe_customer_id || null
    if (!customerId) {
      const cust = await fetch("https://api.stripe.com/v1/customers", {
        method: "POST",
        headers: { Authorization: `Bearer ${stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ email: seller.email || "", name: seller.name || "", "metadata[seller_id]": sellerId }),
      }).then(r => r.json())
      if (cust.error) throw new Error(cust.error.message)
      customerId = cust.id
      await pg("seller").where({ id: sellerId }).update({ stripe_customer_id: customerId, updated_at: new Date() })
    }

    const params = new URLSearchParams()
    params.append("mode", "subscription")
    params.append("customer", customerId)
    params.append("success_url", `${PARTNER}?ok=1`)
    params.append("cancel_url",  `${PARTNER}?cancelled=1`)
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

    const sess = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    }).then(r => r.json())
    if (sess.error) throw new Error(sess.error.message)
    return res.json({ url: sess.url, session_id: sess.id, provider: "stripe" })
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || "Checkout failed" })
  }
}

// GET — Stripe billing portal (Mollie has no portal; vendors re-checkout to renew).
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const sellerId = getSellerId(req)
  if (!sellerId) return res.status(401).json({ message: "Unauthorized" })

  const secret = await getSetting(req.scope, "stripe_secret_key")
  if (!secret) return res.status(400).json({ message: "Billing portal is only available with Stripe." })

  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const seller = await pg("seller").where({ id: sellerId }).first()
  if (!seller?.stripe_customer_id) return res.status(400).json({ message: "No active customer — subscribe first" })

  try {
    const portal = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ customer: seller.stripe_customer_id, return_url: PARTNER }),
    }).then(r => r.json())
    if (portal.error) throw new Error(portal.error.message)
    return res.json({ url: portal.url })
  } catch (e: any) {
    return res.status(500).json({ message: e.message })
  }
}

// POST /vendor/subscription/payment-sheet — native Stripe PaymentSheet params.
// Creates (or reuses) a Stripe customer, an ephemeral key, and a subscription in
// `default_incomplete` so the first invoice's PaymentIntent drives the in-app
// PaymentSheet. Returns { configured:false } when the owner hasn't added Stripe
// keys yet, so the app can show a friendly "not set up" notice instead of failing.
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getSetting } from "../../../../lib/settings"

// AED display prices live in app_setting (sub_basic_monthly etc.) so the owner can
// edit them from the dashboard with NO app rebuild. Same source as /store/subscription-plans.
const PRICE_DEFAULTS: Record<string, number> = { basic_monthly: 99, basic_yearly: 990, plus_monthly: 150, plus_yearly: 1500 }
async function priceAed(scope: any, tierId: string, plan: string): Promise<number> {
  const key = `sub_${tierId}_${plan}`
  const raw = (await getSetting(scope, key).catch(() => "")) || ""
  const n = Number(raw)
  return (raw !== "" && Number.isFinite(n) && n > 0) ? n : PRICE_DEFAULTS[`${tierId}_${plan}`]
}
const STRIPE_VERSION = "2024-06-20"

function getSellerId(req: MedusaRequest): string | null {
  const auth = (req as any).auth_context
  return (auth?.app_metadata?.seller_id || auth?.actor_id) || null
}

async function stripe(path: string, key: string, params: URLSearchParams): Promise<any> {
  const r = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": STRIPE_VERSION,
    },
    body: params,
  })
  const d = await r.json()
  if (d.error) throw new Error(d.error.message || "Stripe error")
  return d
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const sellerId = getSellerId(req)
  if (!sellerId) return res.status(401).json({ message: "Unauthorized" })

  const body = req.body as { plan?: "monthly" | "yearly"; tier?: "basic" | "plus" }
  const plan: "monthly" | "yearly" = body?.plan === "yearly" ? "yearly" : "monthly"
  const tierId: "basic" | "plus" = body?.tier === "plus" ? "plus" : "basic"
  const aed = await priceAed(req.scope, tierId, plan)
  const tier = {
    amount_cents: Math.round(aed * 100),
    currency: "aed",
    interval: (plan === "yearly" ? "year" : "month") as "year" | "month",
    label: `Auto to Rental — ${tierId === "plus" ? "Plus" : "Basic"} (${plan === "yearly" ? "Yearly" : "Monthly"})`,
  }

  const scope = req.scope
  const secret = (await getSetting(scope, "stripe_secret_key").catch(() => "")) || ""
  const pubKey = (await getSetting(scope, "stripe_publishable_key").catch(() => "")) || ""
  if (!secret || !pubKey) {
    return res.json({ configured: false, message: "Stripe is not configured yet." })
  }

  const pg: any = scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const seller = await pg("seller").where({ id: sellerId }).first()
  if (!seller) return res.status(404).json({ message: "Seller not found" })

  try {
    // 1) Customer (reuse the one we created before, if any).
    let customerId = seller.stripe_customer_id || null
    if (!customerId) {
      const cust = await stripe("customers", secret, new URLSearchParams({
        email: seller.email || "",
        name: seller.name || "",
        "metadata[seller_id]": sellerId,
      }))
      customerId = cust.id
      await pg("seller").where({ id: sellerId }).update({ stripe_customer_id: customerId, updated_at: new Date() })
    }

    // 2) Ephemeral key for the mobile SDK.
    const ek = await stripe("ephemeral_keys", secret, new URLSearchParams({ customer: customerId }))

    // 3) Inline recurring price (product created inline).
    const price = await stripe("prices", secret, new URLSearchParams({
      currency: tier.currency,
      unit_amount: String(tier.amount_cents),
      "recurring[interval]": tier.interval,
      "product_data[name]": tier.label,
    }))

    // 4) Subscription (default_incomplete) — first invoice's PaymentIntent drives PaymentSheet.
    const subParams = new URLSearchParams()
    subParams.append("customer", customerId)
    subParams.append("items[0][price]", price.id)
    subParams.append("payment_behavior", "default_incomplete")
    subParams.append("payment_settings[save_default_payment_method]", "on_subscription")
    subParams.append("expand[]", "latest_invoice.payment_intent")
    subParams.append("metadata[seller_id]", sellerId)
    subParams.append("metadata[plan]", plan)
    const sub = await stripe("subscriptions", secret, subParams)

    const pi = sub?.latest_invoice?.payment_intent
    if (!pi?.client_secret) throw new Error("Stripe returned no payment intent")

    return res.json({
      configured: true,
      publishableKey: pubKey,
      customer: customerId,
      ephemeralKey: ek.secret,
      paymentIntent: pi.client_secret,
      subscription_id: sub.id,
      plan,
    })
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || "Stripe payment sheet failed" })
  }
}

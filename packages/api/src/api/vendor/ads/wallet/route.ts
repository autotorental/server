import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import crypto from "crypto"
import { resolveVendorSellerId } from "../../../../lib/vendor-seller"
import { getSetting } from "../../../../lib/settings"

const mkid = (p: string) => p + crypto.randomUUID().replace(/-/g, "")
const STRIPE_VERSION = "2024-06-20"

// Minimal Stripe REST helper (same pattern as the subscription PaymentSheet).
async function stripe(path: string, key: string, params: URLSearchParams): Promise<any> {
  const r = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded", "Stripe-Version": STRIPE_VERSION },
    body: params,
  })
  const d = await r.json()
  if (d.error) throw new Error(d.error.message || "Stripe error")
  return d
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const sellerId = await resolveVendorSellerId(req)
  if (!sellerId) return res.status(401).json({ message: "unauthenticated" })
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  let w = await pg("ad_wallet").where({ seller_id: sellerId }).first()
  if (!w) { await pg("ad_wallet").insert({ seller_id: sellerId, balance_cents: 0, currency: "aed" }).onConflict("seller_id").ignore(); w = await pg("ad_wallet").where({ seller_id: sellerId }).first() }
  const txns = await pg("ad_wallet_txn").where({ seller_id: sellerId }).orderBy("created_at", "desc").limit(50)
  res.json({ balance: Number(w.balance_cents) / 100, currency: w.currency, txns: txns.map((t: any) => ({ ...t, amount: Number(t.amount_cents) / 100, balance_after: Number(t.balance_after_cents) / 100 })) })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const sellerId = await resolveVendorSellerId(req)
  if (!sellerId) return res.status(401).json({ message: "unauthenticated" })
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const amount = Math.round(Number((req.body as any)?.amount || 0) * 100) // AED → fils
  if (amount < 100) return res.status(400).json({ message: "Amount too low" })

  let mode = "demo"
  try { const s = await pg("app_setting").where({ key: "payment_mode" }).first(); if (s?.value) mode = String(s.value) } catch {}

  // DEMO: credit instantly (testing only — no real charge).
  if (mode === "demo") {
    const out = await pg.transaction(async (trx: any) => {
      const w = await trx("ad_wallet").where({ seller_id: sellerId }).forUpdate().first()
      const bal = (w ? Number(w.balance_cents) : 0) + amount
      if (w) await trx("ad_wallet").where({ seller_id: sellerId }).update({ balance_cents: bal, updated_at: trx.fn.now() })
      else await trx("ad_wallet").insert({ seller_id: sellerId, balance_cents: bal, currency: "aed" })
      await trx("ad_wallet_txn").insert({ id: mkid("adtx_"), seller_id: sellerId, kind: "topup", amount_cents: amount, balance_after_cents: bal, note: "Wallet top-up (demo)" })
      return bal
    })
    return res.json({ balance: out / 100, demo: true })
  }

  // LIVE: charge in AED via Stripe native PaymentSheet. We create a PaymentIntent
  // here and return its client secret; the app presents the sheet, then calls
  // /vendor/ads/wallet/confirm which verifies the payment and credits the wallet.
  // "test" mode = Stripe sandbox keys (test card 4242, no real money); "live" = real keys.
  const isTest = mode === "test"
  const secret = (await getSetting(req.scope, isTest ? "stripe_test_secret_key" : "stripe_secret_key").catch(() => "")) || ""
  const pubKey = (await getSetting(req.scope, isTest ? "stripe_test_publishable_key" : "stripe_publishable_key").catch(() => "")) || ""
  if (!secret || !pubKey) return res.status(402).json({ message: isTest ? "Add your Stripe TEST keys (sk_test / pk_test) in the dashboard Payments page." : "Online payment isn't configured yet. Add your Stripe keys in the dashboard, or use demo mode.", code: "PAYMENT_REQUIRED" })
  try {
    const aed = amount / 100
    const seller = await pg("seller").where({ id: sellerId }).first()
    // 1) Stripe customer (reuse the one created for subscriptions, if any).
    let customerId = seller?.stripe_customer_id || null
    if (!customerId) {
      const cust = await stripe("customers", secret, new URLSearchParams({ email: seller?.email || "", name: seller?.name || "", "metadata[seller_id]": sellerId }))
      customerId = cust.id
      await pg("seller").where({ id: sellerId }).update({ stripe_customer_id: customerId, updated_at: new Date() })
    }
    // 2) Ephemeral key for the mobile SDK.
    const ek = await stripe("ephemeral_keys", secret, new URLSearchParams({ customer: customerId }))
    // 3) One-time PaymentIntent in AED (fils == AED cents — no currency conversion).
    const piParams = new URLSearchParams()
    piParams.append("amount", String(amount))
    piParams.append("currency", "aed")
    piParams.append("customer", customerId)
    piParams.append("payment_method_types[]", "card") // AED requires an explicit method
    piParams.append("description", `Auto to Rental — ad wallet top-up (AED ${aed})`)
    piParams.append("metadata[kind]", "ad_topup")
    piParams.append("metadata[seller_id]", sellerId)
    piParams.append("metadata[amount_cents]", String(amount))
    const pi = await stripe("payment_intents", secret, piParams)
    if (!pi?.client_secret) return res.status(502).json({ message: "Could not start the payment. Please try again." })
    return res.json({
      requires_payment: true,
      configured: true,
      publishableKey: pubKey,
      customer: customerId,
      ephemeralKey: ek.secret,
      paymentIntent: pi.client_secret,
      payment_intent_id: pi.id,
      aed,
    })
  } catch (e: any) {
    return res.status(502).json({ message: `Payment error: ${String(e?.message || e).slice(0, 120)}` })
  }
}

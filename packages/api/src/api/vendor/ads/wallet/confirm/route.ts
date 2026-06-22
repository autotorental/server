import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import crypto from "crypto"
import { resolveVendorSellerId } from "../../../../../lib/vendor-seller"
import { getSetting } from "../../../../../lib/settings"

const mkid = (p: string) => p + crypto.randomUUID().replace(/-/g, "")

// POST /vendor/ads/wallet/confirm — after a successful native Stripe PaymentSheet,
// verify the PaymentIntent straight from Stripe (authoritative, no webhook needed)
// and credit the ad wallet. Idempotent: a given PaymentIntent credits at most once.
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const sellerId = await resolveVendorSellerId(req)
  if (!sellerId) return res.status(401).json({ message: "unauthenticated" })

  const piId = String((req.body as any)?.payment_intent_id || "")
  if (!piId) return res.status(400).json({ message: "Missing payment_intent_id" })

  // Retrieve the PaymentIntent with the SAME key tier (test/live) that created it.
  const pg0: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  let mode = "demo"
  try { const s = await pg0("app_setting").where({ key: "payment_mode" }).first(); if (s?.value) mode = String(s.value) } catch {}
  const isTest = mode === "test"
  const secret = (await getSetting(req.scope, isTest ? "stripe_test_secret_key" : "stripe_secret_key").catch(() => "")) || ""
  if (!secret) return res.status(400).json({ message: "Stripe is not configured." })

  const r = await fetch(`https://api.stripe.com/v1/payment_intents/${encodeURIComponent(piId)}`, {
    headers: { Authorization: `Bearer ${secret}` },
  })
  const pi: any = await r.json()
  if (pi.error) return res.status(400).json({ message: pi.error.message })

  // Only the seller who created this top-up may confirm it.
  if (pi.metadata?.kind !== "ad_topup") return res.status(400).json({ message: "Not an ad top-up" })
  if (pi.metadata?.seller_id && pi.metadata.seller_id !== sellerId) return res.status(403).json({ message: "Forbidden" })

  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  if (pi.status !== "succeeded") {
    const w = await pg("ad_wallet").where({ seller_id: sellerId }).first()
    return res.json({ balance: w ? Number(w.balance_cents) / 100 : 0, pending: true, status: pi.status })
  }

  const amount = Number(pi.metadata?.amount_cents || pi.amount_received || pi.amount || 0)
  const out = await pg.transaction(async (trx: any) => {
    // Idempotency: skip if this PaymentIntent was already credited.
    const already = await trx("ad_wallet_txn").where({ seller_id: sellerId }).where("note", "like", `%${piId}%`).first()
    const w = await trx("ad_wallet").where({ seller_id: sellerId }).forUpdate().first()
    let bal = w ? Number(w.balance_cents) : 0
    if (already) return bal
    bal = bal + amount
    if (w) await trx("ad_wallet").where({ seller_id: sellerId }).update({ balance_cents: bal, updated_at: trx.fn.now() })
    else await trx("ad_wallet").insert({ seller_id: sellerId, balance_cents: bal, currency: "aed" })
    await trx("ad_wallet_txn").insert({ id: mkid("adtx_"), seller_id: sellerId, kind: "topup", amount_cents: amount, balance_after_cents: bal, note: `Stripe top-up ${piId}` })
    return bal
  })
  return res.json({ balance: out / 100 })
}

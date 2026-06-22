// POST /webhooks/mollie — Mollie calls this with `id=tr_xxx` (form-encoded) on
// every payment status change. We never trust the body: we fetch the real
// payment from Mollie with our key and act only on its true status.
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getSetting } from "../../../lib/settings"
import { mollieClient } from "../../../lib/mollie"

function paymentIdFrom(req: MedusaRequest): string | null {
  const b: any = req.body
  if (b && typeof b === "object" && typeof b.id === "string") return b.id
  const raw = (req as any).rawBody?.toString?.() || (typeof b === "string" ? b : "")
  const m = /(?:^|&)id=([^&]+)/.exec(raw || "")
  return m ? decodeURIComponent(m[1]) : null
}

function periodEnd(plan: string): Date {
  const d = new Date()
  if (plan === "yearly") d.setFullYear(d.getFullYear() + 1)
  else d.setMonth(d.getMonth() + 1)
  return d
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const id = paymentIdFrom(req)
  const key = await getSetting(req.scope, "mollie_api_key").catch(() => "")
  if (!id || !key) return res.json({ received: true })

  const testmode = (await getSetting(req.scope, "mollie_testmode").catch(() => "")) === "true"
  const mollie = mollieClient(key, testmode)
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  try {
    const pay: any = await mollie.getPayment(id)
    const meta = pay?.metadata || {}
    const sellerId: string | null = meta.seller_id || null
    if (!sellerId) return res.json({ received: true })

    // --- Ad wallet top-up (separate from subscriptions) ---
    if (meta.kind === "ad_topup") {
      if (pay.status === "paid") {
        const amount = Math.round(Number(meta.amount_cents || 0))
        if (amount > 0) {
          const txId = `adtx_mollie_${pay.id}` // deterministic → idempotent (webhook may fire twice)
          await pg.transaction(async (trx: any) => {
            const already = await trx("ad_wallet_txn").where({ id: txId }).first()
            if (already) return
            let w = await trx("ad_wallet").where({ seller_id: sellerId }).forUpdate().first()
            const bal = (w ? Number(w.balance_cents) : 0) + amount
            if (w) await trx("ad_wallet").where({ seller_id: sellerId }).update({ balance_cents: bal, updated_at: trx.fn.now() })
            else await trx("ad_wallet").insert({ seller_id: sellerId, balance_cents: bal, currency: "aed" })
            await trx("ad_wallet_txn").insert({ id: txId, seller_id: sellerId, kind: "topup", amount_cents: amount, balance_after_cents: bal, note: `Wallet top-up (Mollie ${pay.id})` })
          })
          console.log(`[mollie-webhook] ad_topup seller ${sellerId} +${amount} fils (${pay.id})`)
        }
      }
      return res.json({ received: true })
    }

    // --- Subscription (default) ---
    const plan = meta.plan === "yearly" ? "yearly" : "monthly"
    if (pay.status === "paid") {
      await pg("seller").where({ id: sellerId }).update({
        subscription_status: "active",
        subscription_plan: plan,
        subscription_ends_at: periodEnd(plan),
        updated_at: new Date(),
      })
      console.log(`[mollie-webhook] seller ${sellerId} active until ${periodEnd(plan).toISOString()} (${pay.method || "?"})`)
    } else if (["failed", "expired", "canceled"].includes(pay.status)) {
      console.log(`[mollie-webhook] seller ${sellerId} payment ${pay.status}`)
    }
  } catch (e: any) {
    console.error("[mollie-webhook] error:", e?.message || e)
  }
  res.json({ received: true })
}

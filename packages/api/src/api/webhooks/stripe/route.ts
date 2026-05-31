// POST /webhooks/stripe — verify signature and update seller.subscription_status
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getSetting } from "../../../lib/settings"
import * as crypto from "crypto"

function verifyStripeSignature(payload: string, sig: string, secret: string): boolean {
  if (!sig || !secret) return false
  // sig format: "t=<ts>,v1=<sig>,..."
  const parts = Object.fromEntries(sig.split(",").map(s => s.split("=")) as [string, string][])
  const t = parts.t
  const v1 = parts.v1
  if (!t || !v1) return false
  const signed = `${t}.${payload}`
  const expected = crypto.createHmac("sha256", secret).update(signed).digest("hex")
  // Constant-time compare
  if (expected.length !== v1.length) return false
  let same = 0
  for (let i = 0; i < expected.length; i++) same |= expected.charCodeAt(i) ^ v1.charCodeAt(i)
  return same === 0
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const whSecret = await getSetting(req.scope, "stripe_webhook_secret")
  const raw = (req as any).rawBody?.toString?.() ||
              (typeof req.body === "string" ? req.body : JSON.stringify(req.body))
  const sig = req.headers["stripe-signature"] as string

  const envSecret = process.env.STRIPE_WEBHOOK_SECRET || ""
  const secret = whSecret || envSecret
  if (!secret) {
    return res.status(503).send("Stripe webhook secret not configured")
  }
  if (!verifyStripeSignature(raw, sig, secret)) {
    return res.status(400).send("Invalid signature")
  }

  let event: any
  try { event = typeof req.body === "string" ? JSON.parse(req.body) : req.body }
  catch { return res.status(400).send("Bad JSON") }

  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const data = event?.data?.object || {}
  const meta = data?.metadata || {}
  const sellerId = meta.seller_id || data?.client_reference_id || null

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        if (sellerId) {
          await pg("seller").where({ id: sellerId }).update({
            stripe_customer_id: data.customer,
            stripe_subscription_id: data.subscription || null,
            subscription_status: "active",
            subscription_plan: meta.plan || "monthly",
            subscription_ends_at: null,
            updated_at: new Date(),
          })
          console.log(`[stripe-webhook] activated seller ${sellerId}`)
        }
        break
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sid = meta.seller_id
        if (sid) {
          await pg("seller").where({ id: sid }).update({
            stripe_subscription_id: data.id,
            subscription_status: data.status === "active" || data.status === "trialing" ? "active" : data.status,
            subscription_ends_at: data.cancel_at ? new Date(data.cancel_at * 1000) : null,
            updated_at: new Date(),
          })
        }
        break
      }
      case "customer.subscription.deleted": {
        const sid = meta.seller_id
        if (sid) {
          await pg("seller").where({ id: sid }).update({
            subscription_status: "cancelled",
            subscription_ends_at: new Date(),
            updated_at: new Date(),
          })
        }
        break
      }
      case "invoice.payment_failed": {
        const sid = meta.seller_id
        if (sid) {
          await pg("seller").where({ id: sid }).update({
            subscription_status: "past_due",
            updated_at: new Date(),
          })
        }
        break
      }
    }
  } catch (e: any) {
    console.error("[stripe-webhook] handler error:", e?.message || e)
  }

  res.json({ received: true })
}

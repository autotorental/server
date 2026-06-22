// POST /webhooks/resend
// Logs email delivery events from Resend (delivered, bounced, opened, clicked, etc.)
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getSetting } from "../../../lib/settings"

function newId() { return "ee_" + Math.random().toString(36).slice(2, 14) + Date.now().toString(36) }

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  // When a webhook secret is configured, verify the svix signature over the RAW
  // body to reject forged email-status writes. If unset (or svix unavailable),
  // fall through so existing event logging keeps working.
  const secret = (await getSetting(req.scope, "resend_webhook_secret")) || process.env.RESEND_WEBHOOK_SECRET || ""
  if (secret) {
    let Webhook: any = null
    try { Webhook = require("svix").Webhook } catch { /* svix not installed */ }
    if (Webhook) {
      try { new Webhook(secret).verify((req as any).rawBody, req.headers as any) }
      catch { return res.status(401).json({ message: "Invalid signature" }) }
    }
  }
  const knex: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const evt = req.body as any
  const type = evt?.type || "unknown"
  const data = evt?.data || {}
  const messageId = data.email_id || data.id || null
  const to = Array.isArray(data.to) ? data.to[0] : data.to || null

  await knex("email_event").insert({
    id: newId(),
    message_id: messageId,
    to_addr: to,
    event_type: type,
    payload: evt,
  })

  // Update email_sent status based on event
  if (messageId) {
    const status = type.replace("email.", "")
    if (["delivered", "bounced", "complained", "delivery_delayed"].includes(status)) {
      await knex("email_sent").where({ resend_id: messageId }).update({ status })
    }
  }

  res.json({ received: true })
}

export const AUTHENTICATE = false

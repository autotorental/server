// POST /webhooks/resend
// Logs email delivery events from Resend (delivered, bounced, opened, clicked, etc.)
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

function newId() { return "ee_" + Math.random().toString(36).slice(2, 14) + Date.now().toString(36) }

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
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

// POST /webhooks/email-inbound — receives parsed inbound email from Cloudflare Email Worker.
//
// Setup on Cloudflare side (one-time):
//   1) Enable Email Routing for autotorental.com (MX records published automatically)
//   2) Create a Worker with the snippet at the bottom of this file (commented)
//   3) Bind the Worker to addresses (info@, support@, sales@, catch-all)
//   4) Set ATR_API_KEY environment variable in the Worker to the value you also
//      paste into admin → Integrations → "Inbound email signing key"
//
// Expected JSON body from the Worker:
//   { from: string, to: string, subject: string, text: string, html?: string,
//     message_id?: string, in_reply_to?: string }
//
// We validate via header X-ATR-Key against the inbound_email_secret stored in app_setting.

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getSetting } from "../../../lib/settings"

function newId() {
  return "msg_" + Math.random().toString(36).slice(2, 14) + Date.now().toString(36)
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const secret = await getSetting(req.scope, "inbound_email_secret")
  const provided = (req.headers["x-atr-key"] as string) || ""
  if (secret && provided !== secret) {
    return res.status(401).json({ message: "Invalid signing key" })
  }

  const body = req.body as any
  if (!body?.from || !body?.subject) {
    return res.status(400).json({ message: "from and subject required" })
  }

  const fromEmail = String(body.from).match(/<([^>]+)>/)?.[1] || String(body.from).trim()
  const fromName = String(body.from).replace(/<[^>]+>/, "").trim().replace(/^"|"$/g, "") || fromEmail.split("@")[0]

  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  await pg("contact_message").insert({
    id: newId(),
    name: fromName,
    email: fromEmail,
    phone: null,
    subject: String(body.subject).slice(0, 300),
    message: String(body.text || body.html || "").slice(0, 20000),
    status: "unread",
    source: "email_inbound",
    user_agent: body.message_id || null,
    ip_address: null,
    country_code: null,
    created_at: new Date(),
  })

  res.status(201).json({ stored: true })
}

/*
=============================================================================
CLOUDFLARE EMAIL WORKER SCRIPT (paste into Cloudflare → Workers & Pages → Create)
=============================================================================

import PostalMime from "postal-mime"

export default {
  async email(message, env, ctx) {
    const parser = new PostalMime()
    const raw = await new Response(message.raw).arrayBuffer()
    const parsed = await parser.parse(raw)
    await fetch("https://api.autotorental.com/webhooks/email-inbound", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-ATR-Key": env.ATR_API_KEY },
      body: JSON.stringify({
        from: parsed.from?.address ? `${parsed.from.name || ""} <${parsed.from.address}>` : message.from,
        to: message.to,
        subject: parsed.subject || "(no subject)",
        text: parsed.text || "",
        html: parsed.html || "",
        message_id: parsed.messageId,
        in_reply_to: parsed.inReplyTo,
      }),
    })
  },
}

In wrangler.toml or dashboard:
  [vars]
  ATR_API_KEY = "paste-same-secret-as-admin-Integrations-Inbound-email-signing-key"

Bind in Cloudflare → Email → Routing → catch-all → "Send to Worker" → pick this worker.
============================================================================
*/

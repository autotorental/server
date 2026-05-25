// POST /admin/inbox/compose
// Body: { to, subject, text, html?, log_in_inbox? }
// Sends a fresh email via Resend, with the API key sourced from app_setting (falls back to env).

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { Resend } from "resend"
import { getSetting } from "../../../../lib/settings"

function newId() {
  return "es_" + Math.random().toString(36).slice(2, 14) + Date.now().toString(36)
}

function wrapHtml(body: string, recipientName: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f7fb;font-family:-apple-system,system-ui,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7fb;padding:32px 16px">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e5e7eb;max-width:600px">
      <tr><td style="padding:32px 32px 16px">
        <a href="https://autotorental.com" style="font-weight:900;font-size:20px;color:#1753b0;text-decoration:none">AUTO TO RENTAL</a>
      </td></tr>
      <tr><td style="padding:0 32px 32px;color:#111;font-size:15px;line-height:1.6">
        <p>Hi ${recipientName || "there"},</p>
        ${body}
        <hr style="border:0;border-top:1px solid #e5e7eb;margin:24px 0">
        <p style="font-size:12px;color:#666">— Auto to Rental Team<br><a href="https://autotorental.com" style="color:#1753b0">autotorental.com</a></p>
      </td></tr>
    </table>
    <p style="font-size:11px;color:#999;margin-top:16px">Auto to Rental · Car rental marketplace · UAE &amp; Syria</p>
  </td></tr>
</table>
</body></html>`
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const apiKey = (await getSetting(req.scope, "resend_api_key")) || process.env.RESEND_API_KEY || ""
  const from = (await getSetting(req.scope, "resend_from_email")) ||
               process.env.RESEND_FROM || "Auto to Rental <info@autotorental.com>"
  if (!apiKey) return res.status(503).json({ message: "Resend API key not configured. Add it in Integrations." })

  const b = req.body as any
  const to = (b.to || "").trim()
  const subject = (b.subject || "").trim()
  const text = (b.text || b.message || "").trim()
  if (!to || !to.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    return res.status(400).json({ message: "Valid recipient email required" })
  }
  if (!subject) return res.status(400).json({ message: "Subject required" })
  if (!text) return res.status(400).json({ message: "Message body required" })

  const knex: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  const html = b.html || wrapHtml(
    text.split(/\n\n+/).map((p: string) => `<p>${p.replace(/\n/g, "<br/>")}</p>`).join(""),
    (to.split("@")[0] || "").replace(/[._-]/g, " ")
  )

  try {
    const resend = new Resend(apiKey)
    const result = await resend.emails.send({
      from,
      to: [to],
      subject,
      html,
      text,
      replyTo: from,
    })

    // Audit log
    const sentId = newId()
    try {
      await knex("email_sent").insert({
        id: sentId,
        resend_id: result.data?.id || null,
        to_addr: to,
        from_addr: from,
        subject,
        html,
        related_message_id: null,
        sent_by: (req as any).auth_context?.actor_id || "admin",
        status: result.data ? "sent" : "failed",
      })
    } catch (e: any) { console.error("[compose] email_sent log failed:", e?.message) }

    // Optionally also drop a copy in contact_message so it appears in the unified inbox UI
    if (b.log_in_inbox !== false) {
      try {
        await knex("contact_message").insert({
          id: "msg_out_" + Math.random().toString(36).slice(2, 14),
          name: (to.split("@")[0] || "").replace(/[._-]/g, " ") || to,
          email: to,
          phone: null,
          subject,
          message: text,
          status: "sent",
          source: "outbound",
          user_agent: null,
          ip_address: null,
          country_code: null,
          replied_at: new Date(),
          created_at: new Date(),
        })
      } catch (e: any) { console.error("[compose] inbox log failed:", e?.message) }
    }

    res.status(201).json({ ok: true, resend_id: result.data?.id, sent_id: sentId })
  } catch (e: any) {
    res.status(500).json({ message: e?.message || "send failed" })
  }
}

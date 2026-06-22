// POST /admin/inbox/:id/reply
// Body: { subject, html, mark_replied }
// Sends an HTML email via SMTP FROM the configured from-address
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { isEmailConfiguredForScope, sendEmail } from "../../../../../lib/email"

const FROM = process.env.MAIL_FROM || process.env.SMTP_FROM || process.env.RESEND_FROM || "Auto to Rental <info@autotorental.com>"

function newId() { return "es_" + Math.random().toString(36).slice(2, 14) + Date.now().toString(36) }

function wrapHtml(body: string, customerName: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f7fb;font-family:-apple-system,system-ui,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7fb;padding:32px 16px">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e5e7eb;max-width:600px">
      <tr><td style="padding:32px 32px 16px">
        <a href="https://autotorental.com" style="font-weight:900;font-size:20px;color:#1753b0;text-decoration:none">AUTO TO RENTAL</a>
      </td></tr>
      <tr><td style="padding:0 32px 32px;color:#111;font-size:15px;line-height:1.6">
        <p>Hi ${customerName || "there"},</p>
        ${body}
        <hr style="border:0;border-top:1px solid #e5e7eb;margin:24px 0">
        <p style="font-size:12px;color:#666">— Auto to Rental Team<br><a href="https://autotorental.com" style="color:#1753b0">autotorental.com</a></p>
      </td></tr>
    </table>
    <p style="font-size:11px;color:#999;margin-top:16px">Auto to Rental · Car rental marketplace · UAE & Syria</p>
  </td></tr>
</table>
</body></html>`
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  if (!(await isEmailConfiguredForScope(req.scope))) return res.status(503).json({ message: "SMTP not configured" })
  const knex: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const b = req.body as any

  const original = await knex("contact_message").where({ id: req.params.id }).first()
  if (!original) return res.status(404).json({ message: "Message not found" })

  const subject = b.subject || `Re: ${original.subject || "Your message"}`
  const text = (b.text || b.message || "").trim()
  if (!text) return res.status(400).json({ message: "Reply body required" })

  const html = wrapHtml(text.split(/\n+/).map((p: string) => `<p>${p}</p>`).join(""), original.name)
  const fromAccount = (b.from_account || original.mailbox || "").trim() || undefined

  try {
    const result = await sendEmail({
      scope: req.scope,
      accountEmail: fromAccount,
      to: original.email,
      subject,
      html,
      text,
    })
    const fromAddr = result.from || fromAccount || FROM
    const sentRow = {
      id: newId(),
      resend_id: result.id || null,
      to_addr: original.email,
      from_addr: fromAddr,
      subject,
      html,
      related_message_id: original.id,
      sent_by: (req as any).auth_context?.actor_id || "admin",
      status: result.id ? "sent" : "failed",
    }
    await knex("email_sent").insert(sentRow)
    if (b.mark_replied !== false) {
      await knex("contact_message").where({ id: original.id }).update({ status: "replied", replied_at: new Date() })
    }
    res.json({ ok: true, resend_id: sentRow.resend_id, sent_id: sentRow.id })
  } catch (e: any) {
    res.status(500).json({ message: "send failed", error: e.message })
  }
}

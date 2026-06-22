// POST /store/contact — submit a contact form message
// GET  /admin/inbox — list messages
// POST /admin/inbox/:id — update status (mark replied/spam/closed)
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

function newId() { return "msg_" + Math.random().toString(36).slice(2, 14) + Date.now().toString(36) }

import { rateLimited, clientIp } from "../../../lib/rate-limit"
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  if (rateLimited("contact", clientIp(req), 3, 60000)) return res.status(429).json({ message: "Too many messages — please wait a moment" })
  const knex: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const b = req.body as any
  if (!b?.name || !b?.email || !b?.message) {
    return res.status(400).json({ message: "name, email, message required" })
  }
  const ip = ((req.headers["x-forwarded-for"] || req.ip || "") + "").split(",")[0].trim() || null
  const row = {
    id: newId(),
    name: String(b.name).slice(0, 200),
    email: String(b.email).slice(0, 200),
    phone: b.phone ? String(b.phone).slice(0, 50) : null,
    subject: b.subject ? String(b.subject).slice(0, 200) : null,
    message: String(b.message).slice(0, 5000),
    user_agent: (req.headers["user-agent"] as string)?.slice(0, 500) || null,
    ip_address: ip,
    source: b.source || "contact_form",
    status: "unread",
    created_at: new Date(),
  }
  await knex("contact_message").insert(row)

  // Send notification email via Resend
  try {
    const notif: any = req.scope.resolve(Modules.NOTIFICATION)
    await notif.createNotifications({
      to: "info@autotorental.com",
      channel: "email",
      template: "contact-form",
      data: {
        subject: `New contact: ${row.subject || "general"} — from ${row.name}`,
        html: `<h2>New message from ${row.name}</h2>
          <p><strong>Email:</strong> ${row.email}</p>
          <p><strong>Phone:</strong> ${row.phone || "—"}</p>
          <p><strong>Subject:</strong> ${row.subject || "—"}</p>
          <hr>
          <p>${row.message.replace(/\n/g, "<br>")}</p>
          <hr>
          <p style="font-size:12px;color:#666">Reply directly to this email, or open inbox: <a href="https://admin.autotorental.com/dashboard/inbox">View in dashboard</a></p>`,
        text: `New contact: ${row.message}\nFrom: ${row.name} <${row.email}>`,
      },
    })
  } catch (e: any) {
    console.warn("[contact] resend notification failed:", e.message)
  }

  res.status(201).json({ id: row.id, message: "Message received. We'll reply within 24h." })
}

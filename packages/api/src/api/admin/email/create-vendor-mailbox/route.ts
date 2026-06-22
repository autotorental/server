import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { loadCpanelConfig, cpanelAddPop } from "../../../../lib/cpanel"

// Admin: create a vendor mailbox via cPanel UAPI.
// POST /admin/email/create-vendor-mailbox  Body: { mailbox_name }
// cPanel credentials come from app_setting.cpanel_mail (editable in the admin
// "Mail Server" page) so the token can be rotated without a code change.

const generatePassword = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%"
  let pwd = ""
  for (let i = 0; i < 18; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length))
  return pwd
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { mailbox_name } = req.body as any
  if (!mailbox_name || !/^[a-z0-9._-]+$/i.test(mailbox_name)) {
    return res.status(400).json({ message: "Invalid mailbox name" })
  }
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const cfg = await loadCpanelConfig(pg)
  if (!cfg.token) {
    return res.status(400).json({ message: "cPanel mail isn't configured yet — set the API token in Settings → Mail Server." })
  }

  const email = `${mailbox_name}@${cfg.domain}`
  const password = generatePassword()
  const r = await cpanelAddPop(cfg, mailbox_name, password)
  if (!r.ok) return res.status(400).json({ message: r.message || "cPanel error" })

  res.json({
    email,
    password,
    imap_host: `mail.${cfg.domain}`,
    imap_port: 993,
    imap_secure: true,
    smtp_host: `mail.${cfg.domain}`,
    smtp_port: 465,
    smtp_secure: true,
    message: `✅ Mailbox ${email} created successfully. Password saved above.`,
  })
}

// GET  /admin/inbox/accounts  -> list mail accounts (passwords masked)
// POST /admin/inbox/accounts  -> save the full accounts array
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getSetting, invalidateSettings } from "../../../../lib/settings"
import { invalidateGlobalSettings } from "../../../../lib/settings-global"
import {
  getMailAccounts,
  maskAccount,
  normalizeAccount,
  accountFrom,
  MailAccount,
} from "../../../../lib/mail-accounts"

const readScoped = (scope: any) => (key: string) => getSetting(scope, key)

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const accounts = await getMailAccounts(readScoped(req.scope))
  res.json({ accounts: accounts.map(maskAccount) })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const body = req.body as any
  const incoming = Array.isArray(body?.accounts) ? body.accounts : null
  if (!incoming) return res.status(400).json({ message: "accounts array required" })

  // Existing accounts (to preserve passwords when the UI sends a mask).
  const existing = await getMailAccounts(readScoped(req.scope))
  const byId = new Map(existing.map((a) => [a.id, a]))
  const byEmail = new Map(existing.map((a) => [a.email.toLowerCase(), a]))

  const cleaned: MailAccount[] = []
  for (const raw of incoming) {
    const acc = normalizeAccount(raw)
    if (!acc.email) continue
    // Preserve stored password if the client didn't provide a new one.
    if (!acc.password || acc.password.startsWith("•••")) {
      const prev = byId.get(acc.id) || byEmail.get(acc.email.toLowerCase())
      acc.password = prev?.password || ""
    }
    cleaned.push(acc)
  }
  if (!cleaned.length) return res.status(400).json({ message: "At least one account with an email is required" })

  // Exactly one default.
  if (!cleaned.some((a) => a.is_default)) cleaned[0].is_default = true
  let seen = false
  for (const a of cleaned) {
    if (a.is_default && !seen) seen = true
    else a.is_default = false
  }

  const json = JSON.stringify(cleaned)
  const now = new Date()
  const existsRow = await pg("app_setting").where({ key: "mail_accounts" }).first()
  if (existsRow) {
    await pg("app_setting").where({ key: "mail_accounts" }).update({ value: json, updated_at: now })
  } else {
    await pg("app_setting").insert({ key: "mail_accounts", value: json, is_secret: true, updated_at: now })
  }

  // Mirror the default account into the legacy mail_smtp_* keys so any code
  // still reading those (and the existing single-account path) stays in sync.
  const def = cleaned.find((a) => a.is_default) || cleaned[0]
  if (def) {
    const legacy: Record<string, string> = {
      mail_smtp_host: def.smtp_host,
      mail_smtp_port: String(def.smtp_port),
      mail_smtp_secure: def.smtp_secure ? "true" : "false",
      mail_smtp_user: def.email,
      mail_from_email: accountFrom(def),
    }
    if (def.tls_servername) legacy.mail_tls_servername = def.tls_servername
    if (def.password) legacy.mail_smtp_pass = def.password
    for (const [k, v] of Object.entries(legacy)) {
      const row = await pg("app_setting").where({ key: k }).first()
      const isSecret = /pass|secret|token|key/.test(k)
      if (row) await pg("app_setting").where({ key: k }).update({ value: v, updated_at: now })
      else await pg("app_setting").insert({ key: k, value: v, is_secret: isSecret, updated_at: now })
    }
  }

  invalidateSettings()
  invalidateGlobalSettings()

  const saved = await getMailAccounts(readScoped(req.scope))
  res.json({ ok: true, accounts: saved.map(maskAccount) })
}

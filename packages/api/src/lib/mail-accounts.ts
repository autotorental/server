/**
 * Multi-account mail configuration.
 *
 * Accounts are stored as a JSON array in app_setting key "mail_accounts".
 * If none are saved yet, a single "Primary" account is synthesized from the
 * legacy mail_smtp_* settings / env so existing setups keep working.
 */

type ReadSetting = (key: string) => Promise<string>

export type MailAccount = {
  id: string
  label: string
  email: string
  from_name: string
  smtp_host: string
  smtp_port: number
  smtp_secure: boolean
  imap_host: string
  imap_port: number
  /** TLS certificate hostname (SNI). Use when the mail server's cert CN
   *  differs from the host you connect to (e.g. connecting by IP). */
  tls_servername: string
  password: string
  is_default: boolean
}

export const MASK = "•••••••• set"

export function parseBool(value: any, defaultValue: boolean): boolean {
  if (value == null || value === "") return defaultValue
  if (typeof value === "boolean") return value
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase())
}

function genId(): string {
  return "mailacc_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export function normalizeAccount(raw: any): MailAccount {
  const email = String(raw?.email || "").trim()
  const smtpHost = String(raw?.smtp_host || "mail.autotorental.com").trim()
  const smtpPort = Number(raw?.smtp_port) || 465
  const imapHost = String(raw?.imap_host || smtpHost.replace(/^smtp\./i, "mail.")).trim()
  const imapPort = Number(raw?.imap_port) || 993
  return {
    id: String(raw?.id || genId()),
    label: String(raw?.label || email || "Account").trim(),
    email,
    from_name: String(raw?.from_name || "").trim(),
    smtp_host: smtpHost,
    smtp_port: smtpPort,
    smtp_secure: parseBool(raw?.smtp_secure, smtpPort === 465),
    imap_host: imapHost,
    imap_port: imapPort,
    tls_servername: String(raw?.tls_servername || "").trim(),
    password: typeof raw?.password === "string" ? raw.password : "",
    is_default: parseBool(raw?.is_default, false),
  }
}

/** Build the "From" header for an account. */
export function accountFrom(a: MailAccount): string {
  if (a.from_name) return `${a.from_name} <${a.email}>`
  return a.email
}

/**
 * Returns the configured mail accounts. Falls back to a single legacy account
 * derived from mail_smtp_* when nothing has been saved yet.
 */
export async function getMailAccounts(readSetting: ReadSetting): Promise<MailAccount[]> {
  let accounts: MailAccount[] = []
  const raw = (await readSetting("mail_accounts")) || ""
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) accounts = parsed.map(normalizeAccount).filter((a) => a.email)
    } catch {
      /* ignore malformed JSON, fall through to legacy */
    }
  }

  if (accounts.length === 0) {
    const user =
      (await readSetting("mail_smtp_user")) ||
      process.env.MAIL_SMTP_USER ||
      "info@autotorental.com"
    const pass =
      (await readSetting("mail_smtp_pass")) || process.env.MAIL_SMTP_PASS || ""
    const smtpHost =
      (await readSetting("mail_smtp_host")) ||
      process.env.MAIL_SMTP_HOST ||
      "mail.autotorental.com"
    const smtpPort = Number(
      (await readSetting("mail_smtp_port")) || process.env.MAIL_SMTP_PORT || "465"
    )
    const smtpSecure = parseBool(
      (await readSetting("mail_smtp_secure")) || process.env.MAIL_SMTP_SECURE,
      smtpPort === 465
    )
    const from =
      (await readSetting("mail_from_email")) ||
      process.env.MAIL_FROM ||
      process.env.SMTP_FROM ||
      ""
    const fromName = from.includes("<") ? from.split("<")[0].trim().replace(/^"|"$/g, "") : ""
    if (user) {
      accounts = [
        normalizeAccount({
          id: "primary",
          label: "Primary",
          email: user,
          from_name: fromName,
          smtp_host: smtpHost,
          smtp_port: smtpPort,
          smtp_secure: smtpSecure,
          imap_host: (await readSetting("mail_imap_host")) || process.env.MAIL_IMAP_HOST || smtpHost.replace(/^smtp\./i, "mail."),
          imap_port: Number((await readSetting("mail_imap_port")) || process.env.MAIL_IMAP_PORT || "993"),
          tls_servername: (await readSetting("mail_tls_servername")) || process.env.MAIL_TLS_SERVERNAME || "",
          password: pass,
          is_default: true,
        }),
      ]
    }
  }

  if (accounts.length && !accounts.some((a) => a.is_default)) {
    accounts[0].is_default = true
  }
  // Guarantee a single default
  let seenDefault = false
  for (const a of accounts) {
    if (a.is_default && !seenDefault) seenDefault = true
    else a.is_default = false
  }
  return accounts
}

/** Pick an account by email (case-insensitive) else the default else the first. */
export function pickAccount(accounts: MailAccount[], email?: string | null): MailAccount | null {
  if (!accounts.length) return null
  if (email) {
    const match = accounts.find((a) => a.email.toLowerCase() === email.toLowerCase())
    if (match) return match
  }
  return accounts.find((a) => a.is_default) || accounts[0]
}

/** Mask the password for safe transport to the admin UI. */
export function maskAccount(a: MailAccount): Omit<MailAccount, "password"> & { has_password: boolean } {
  const { password, ...rest } = a
  return { ...rest, has_password: !!password }
}

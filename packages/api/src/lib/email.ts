import nodemailer from "nodemailer"
import { getSetting } from "./settings"
import { getGlobalSetting } from "./settings-global"
import { mailTlsOptions, resolveMailTlsServername } from "./mail-tls"
import { getMailAccounts, pickAccount, accountFrom } from "./mail-accounts"

export type SendEmailInput = {
  scope?: any
  to: string | string[]
  subject: string
  html?: string
  text?: string
  from?: string
  replyTo?: string
  /** Email address of the configured account to send through. */
  accountEmail?: string
}

type ResolvedSmtpConfig = {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
  from: string
  tlsServername: string
}

const transporterCache = new Map<string, nodemailer.Transporter>()

/** Production uses our own SMTP mail server only. Set EMAIL_PROVIDER=resend only for dev. */
function useSmtpOnly(): boolean {
  const p = (process.env.EMAIL_PROVIDER || "smtp").toLowerCase()
  return p !== "resend"
}

function parseBool(value: string | undefined, defaultValue: boolean): boolean {
  if (value == null || value === "") return defaultValue
  return ["1", "true", "yes", "on"].includes(value.toLowerCase())
}

async function readSetting(scope: any | undefined, key: string): Promise<string> {
  if (scope) {
    try {
      return await getSetting(scope, key)
    } catch {
      /* fall through */
    }
  }
  return getGlobalSetting(key)
}

async function resolveFrom(scope?: any): Promise<string> {
  return (
    (await readSetting(scope, "mail_from_email")) ||
    process.env.MAIL_FROM ||
    process.env.SMTP_FROM ||
    "Auto to Rental <info@autotorental.com>"
  )
}

/**
 * Resolve SMTP config. Prefers the multi-account configuration (mail_accounts);
 * picks the requested account by email, else the default. Falls back to the
 * legacy single-account mail_smtp_* resolution if no account has a password.
 */
async function resolveSmtpConfig(
  scope?: any,
  accountEmail?: string
): Promise<ResolvedSmtpConfig | null> {
  // 1) Account-aware path
  try {
    const accounts = await getMailAccounts((key) => readSetting(scope, key))
    const acc = pickAccount(accounts, accountEmail)
    if (acc && acc.email && acc.password) {
      const port = acc.smtp_port
      if (!Number.isFinite(port) || port <= 0) return null
      const tlsServername =
        acc.tls_servername || (await resolveMailTlsServername((key) => readSetting(scope, key)))
      return {
        host: acc.smtp_host,
        port,
        secure: acc.smtp_secure,
        user: acc.email,
        pass: acc.password,
        from: accountFrom(acc),
        tlsServername,
      }
    }
  } catch {
    /* fall through to legacy */
  }

  // 2) Legacy single-account path (unchanged behavior)
  const host =
    (await readSetting(scope, "mail_smtp_host")) ||
    process.env.MAIL_SMTP_HOST ||
    "mail.autotorental.com"
  const port = Number(
    (await readSetting(scope, "mail_smtp_port")) || process.env.MAIL_SMTP_PORT || "465"
  )
  const secure = parseBool(
    (await readSetting(scope, "mail_smtp_secure")) || process.env.MAIL_SMTP_SECURE,
    port === 465
  )
  const user =
    (await readSetting(scope, "mail_smtp_user")) ||
    process.env.MAIL_SMTP_USER ||
    "info@autotorental.com"
  const pass =
    (await readSetting(scope, "mail_smtp_pass")) ||
    process.env.MAIL_SMTP_PASS ||
    ""

  if (!user || !pass) return null
  if (!Number.isFinite(port) || port <= 0) return null

  const tlsServername = await resolveMailTlsServername((key) => readSetting(scope, key))

  return {
    host,
    port,
    secure,
    user,
    pass,
    from: await resolveFrom(scope),
    tlsServername,
  }
}

function getTransporter(cfg: ResolvedSmtpConfig): nodemailer.Transporter {
  const key = `${cfg.host}|${cfg.port}|${cfg.secure}|${cfg.user}|${cfg.tlsServername}`
  let t = transporterCache.get(key)
  if (!t) {
    t = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: { user: cfg.user, pass: cfg.pass },
      tls: mailTlsOptions(cfg.tlsServername, cfg.host),
    })
    transporterCache.set(key, t)
  }
  return t
}

export function isEmailConfigured(): boolean {
  return !!(
    (process.env.MAIL_SMTP_USER || "info@autotorental.com") &&
    process.env.MAIL_SMTP_PASS
  )
}

export async function isEmailConfiguredForScope(scope?: any): Promise<boolean> {
  return !!(await resolveSmtpConfig(scope))
}

export async function sendEmail(
  input: SendEmailInput
): Promise<{ id?: string; from?: string }> {
  const cfg = await resolveSmtpConfig(input.scope, input.accountEmail)
  if (!cfg) {
    const hint = useSmtpOnly()
      ? "Mail is not ready: add an email account with its password in the Inbox → Mail settings."
      : "Email not configured."
    throw new Error(hint)
  }

  const transporter = getTransporter(cfg)
  const fromHeader = input.from || cfg.from
  const info = await transporter.sendMail({
    from: fromHeader,
    to: Array.isArray(input.to) ? input.to.join(", ") : input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    replyTo: input.replyTo,
  })

  return { id: info.messageId || undefined, from: fromHeader }
}

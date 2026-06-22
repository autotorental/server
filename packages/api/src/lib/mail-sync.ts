/**
 * Sync configured mailboxes (cPanel IMAP) into contact_message.
 * Supports multiple accounts via mail_accounts (see lib/mail-accounts).
 */
import { ImapFlow } from "imapflow"
import { simpleParser } from "mailparser"
import { mailTlsOptions, resolveMailTlsServername } from "./mail-tls"
import { getMailAccounts } from "./mail-accounts"
type Knex = any

type ImapConfig = {
  host: string
  port: number
  user: string
  pass: string
  mailbox: string
  tlsServername: string
}

export type SyncResult = {
  ok: boolean
  inbox: number
  sent: number
  skipped: number
  errors: string[]
}

function msgId(): string {
  return "msg_" + Math.random().toString(36).slice(2, 14) + Date.now().toString(36)
}

/** All IMAP configs (one per account that has a password). */
export async function resolveAllImapConfigs(
  readSetting: (key: string) => Promise<string>
): Promise<ImapConfig[]> {
  const accounts = await getMailAccounts(readSetting)
  const globalTls = await resolveMailTlsServername(readSetting)
  return accounts
    .filter((a) => a.email && a.password)
    .map((a) => ({
      host: a.imap_host,
      port: a.imap_port,
      user: a.email,
      pass: a.password,
      mailbox: a.email,
      tlsServername: a.tls_servername || globalTls,
    }))
}

/** Backward-compatible: the default account's IMAP config. */
export async function resolveImapConfig(
  readSetting: (key: string) => Promise<string>
): Promise<ImapConfig | null> {
  const all = await resolveAllImapConfigs(readSetting)
  return all[0] || null
}

async function upsertMessage(
  knex: Knex,
  row: {
    imap_key: string
    legacy_imap_key?: string
    direction: "inbound" | "outbound"
    name: string
    email: string
    to_addr: string | null
    subject: string | null
    message: string
    html_message: string | null
    status: string
    source: string
    created_at: Date
    mailbox: string
  }
): Promise<"inserted" | "updated" | "skipped"> {
  let existing = await knex("contact_message").where({ imap_key: row.imap_key }).first()
  // Migrate rows synced under the legacy (mailbox-less) key format in place,
  // so changing the key scheme doesn't create duplicates.
  if (!existing && row.legacy_imap_key) {
    existing = await knex("contact_message")
      .where({ imap_key: row.legacy_imap_key, mailbox: row.mailbox })
      .first()
  }
  if (existing) {
    // Respect the user's deletion: never resurrect a trashed message on re-sync.
    if (existing.deleted_at) return "skipped"
    await knex("contact_message").where({ id: existing.id }).update({
      imap_key: row.imap_key,
      subject: row.subject,
      message: row.message,
      html_message: row.html_message,
      status: existing.status === "unread" ? "unread" : row.status,
      to_addr: row.to_addr,
    })
    return "updated"
  }
  await knex("contact_message").insert({
    id: msgId(),
    name: row.name.slice(0, 200),
    email: row.email.slice(0, 200),
    phone: null,
    subject: row.subject?.slice(0, 300) || null,
    message: row.message.slice(0, 50000),
    html_message: row.html_message?.slice(0, 100000) || null,
    status: row.status,
    source: row.source,
    direction: row.direction,
    mailbox: row.mailbox,
    imap_key: row.imap_key,
    to_addr: row.to_addr,
    user_agent: null,
    ip_address: null,
    country_code: null,
    replied_at: null,
    created_at: row.created_at,
  })
  return "inserted"
}

async function syncMailboxFolder(
  client: ImapFlow,
  knex: Knex,
  folderPath: string,
  direction: "inbound" | "outbound",
  mailbox: string,
  limit: number
): Promise<{ inserted: number; updated: number; skipped: number; errors: string[] }> {
  const errors: string[] = []
  let inserted = 0
  let updated = 0
  let skipped = 0

  const lock = await client.getMailboxLock(folderPath)
  try {
    const since = new Date()
    since.setDate(since.getDate() - 90)

    const uids = await client.search({ since }, { uid: true })
    const slice = (uids || []).slice(-limit)

    for (const uid of slice) {
      try {
        const fetched = await client.fetchOne(
          uid,
          { uid: true, envelope: true, source: true, flags: true },
          { uid: true }
        )
        if (!fetched || !("source" in fetched) || !fetched.source) {
          skipped++
          continue
        }
        const msg = fetched

        const parsed = await simpleParser(msg.source)
        const fromAddr =
          parsed.from?.value?.[0]?.address ||
          msg.envelope?.from?.[0]?.address ||
          "unknown@unknown"
        const fromName =
          parsed.from?.value?.[0]?.name ||
          msg.envelope?.from?.[0]?.name ||
          fromAddr.split("@")[0]
        const toList = parsed.to?.value?.length
          ? parsed.to.value
          : (msg.envelope?.to || []).map((t: any) => ({
              address: t.address,
              name: t.name,
            }))
        const toAddr = toList?.[0]?.address || null
        const subject = (parsed.subject || msg.envelope?.subject || "(no subject)").toString()
        const text = (parsed.text || parsed.textAsHtml || "").toString().trim()
        const html = parsed.html ? String(parsed.html) : null
        const body = text || (html ? html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "")
        const seen = msg.flags?.has("\\Seen")
        const imap_key = `imap:${mailbox}:${folderPath}:${uid}`
        const legacy_imap_key = `imap:${folderPath}:${uid}`

        const result = await upsertMessage(knex, {
          imap_key,
          legacy_imap_key,
          direction,
          name:
            direction === "inbound"
              ? fromName
              : (toList?.[0]?.name || toAddr?.split("@")[0] || "Recipient"),
          email: direction === "inbound" ? fromAddr : toAddr || fromAddr,
          to_addr: direction === "outbound" ? toAddr : mailbox,
          subject,
          message: body || "(empty)",
          html_message: html,
          status: direction === "inbound" && !seen ? "unread" : direction === "outbound" ? "sent" : "read",
          source: direction === "inbound" ? "imap_inbox" : "imap_sent",
          created_at: parsed.date || msg.envelope?.date || new Date(),
          mailbox,
        })

        if (result === "inserted") inserted++
        else if (result === "updated") updated++
        else skipped++
      } catch (e: any) {
        errors.push(`uid ${uid}: ${e?.message || e}`)
      }
    }
  } finally {
    lock.release()
  }

  return { inserted, updated, skipped, errors }
}

async function pickSentFolder(client: ImapFlow): Promise<string | null> {
  const list = await client.list()
  const names = list.map((b) => b.path)
  const candidates = ["INBOX/Sent", "Sent", "Sent Items", "Sent Mail", "[Gmail]/Sent Mail"]
  for (const c of candidates) {
    if (names.includes(c)) return c
  }
  const sent = names.find((n) => /sent/i.test(n))
  return sent || null
}

/** Sync a single mailbox account. */
async function syncOneMailbox(
  knex: Knex,
  cfg: ImapConfig,
  inboxLimit: number,
  sentLimit: number
): Promise<SyncResult> {
  const errors: string[] = []
  let inbox = 0
  let sent = 0
  let skipped = 0

  const client = new ImapFlow({
    host: cfg.host,
    port: cfg.port,
    secure: true,
    auth: { user: cfg.user, pass: cfg.pass },
    tls: mailTlsOptions(cfg.tlsServername, cfg.host),
    logger: false,
    connectionTimeout: 20000,
  })

  try {
    await client.connect()
  } catch (e: any) {
    const msg = String(e?.response || e?.message || e)
    return {
      ok: false,
      inbox: 0,
      sent: 0,
      skipped: 0,
      errors: [`${cfg.mailbox}: ${msg || `IMAP connection failed (${cfg.host}:${cfg.port})`}`],
    }
  }

  try {
    const inResult = await syncMailboxFolder(client, knex, "INBOX", "inbound", cfg.mailbox, inboxLimit)
    inbox = inResult.inserted + inResult.updated
    skipped += inResult.skipped
    errors.push(...inResult.errors)

    const sentFolder = await pickSentFolder(client)
    if (sentFolder) {
      const sentResult = await syncMailboxFolder(client, knex, sentFolder, "outbound", cfg.mailbox, sentLimit)
      sent = sentResult.inserted + sentResult.updated
      skipped += sentResult.skipped
      errors.push(...sentResult.errors)
    } else {
      errors.push(`${cfg.mailbox}: Sent folder not found`)
    }
  } finally {
    await client.logout().catch(() => {})
  }

  return { ok: errors.length === 0 || inbox + sent > 0, inbox, sent, skipped, errors: errors.slice(0, 10) }
}

/** Sync ALL configured mailbox accounts. */
export async function syncMailbox(
  knex: Knex,
  readSetting: (key: string) => Promise<string>,
  opts?: { inboxLimit?: number; sentLimit?: number }
): Promise<SyncResult> {
  const configs = await resolveAllImapConfigs(readSetting)
  if (!configs.length) {
    return { ok: false, inbox: 0, sent: 0, skipped: 0, errors: ["No mail account with a password — add one in Inbox → Mail settings."] }
  }

  const inboxLimit = opts?.inboxLimit ?? 150
  const sentLimit = opts?.sentLimit ?? 100

  let inbox = 0
  let sent = 0
  let skipped = 0
  const errors: string[] = []

  for (const cfg of configs) {
    const r = await syncOneMailbox(knex, cfg, inboxLimit, sentLimit)
    inbox += r.inbox
    sent += r.sent
    skipped += r.skipped
    errors.push(...r.errors)
  }

  return { ok: inbox + sent > 0 || errors.length === 0, inbox, sent, skipped, errors: errors.slice(0, 20) }
}

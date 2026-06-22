import crypto from "crypto"

const B32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
// Crockford-base32 ULID-ish id (text-unique is all the DB needs; format matches Medusa).
export function ulid(): string {
  let ts = Date.now(), t = ""
  for (let i = 0; i < 10; i++) { t = B32[ts % 32] + t; ts = Math.floor(ts / 32) }
  const rb = crypto.randomBytes(16); let r = ""
  for (let i = 0; i < 16; i++) r += B32[rb[i] % 32]
  return t + r
}

export function genPw(n = 12): string {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#"
  return Array.from(crypto.randomBytes(n)).map(b => c[b % c.length]).join("")
}

function parseMeta(raw: unknown): Record<string, unknown> {
  if (!raw) return {}
  if (typeof raw === "string") { try { return JSON.parse(raw) } catch { return {} } }
  return typeof raw === "object" ? { ...(raw as any) } : {}
}

type EnsureResult = {
  auth_identity_id?: string
  login_email?: string
  created?: boolean
  hadLogin?: boolean
  newPassword?: string
  error?: string
}

/**
 * Find the emailpass login for a customer; CREATE one (with a fresh password) if absent,
 * or reset the password when forceReset/password is given. Stores entity_id lowercased so
 * sign-in works regardless of how the email was typed.
 */
export async function ensureEmailpassLogin(
  pg: any,
  customer: { id: string; email?: string | null },
  opts?: { password?: string; forceReset?: boolean }
): Promise<EnsureResult> {
  const id = customer.id
  const emailLc = (customer.email || "").trim().toLowerCase()
  const base = () => pg("provider_identity").where({ provider: "emailpass" }).whereNull("deleted_at")

  let pi = emailLc ? await base().whereRaw("lower(entity_id) = ?", [emailLc]).first() : null
  let ai: any = await pg("auth_identity").whereRaw(`app_metadata::jsonb->>'customer_id' = ?`, [id]).whereNull("deleted_at").first()
  if (!pi && ai) pi = await base().where({ auth_identity_id: ai.id }).first()

  const scryptKdf = (await import("scrypt-kdf")).default
  const hashOf = async (pw: string) => (await scryptKdf.kdf(pw, { logN: 15, r: 8, p: 1 })).toString("base64")
  const adminSupplied = typeof opts?.password === "string" && (opts.password as string).length >= 8

  // Login already exists and we're not asked to change it → just return it.
  if (pi && !opts?.forceReset && !adminSupplied) {
    return { auth_identity_id: pi.auth_identity_id, login_email: pi.entity_id, created: false, hadLogin: true }
  }

  // Login exists → reset its password.
  if (pi) {
    const newPassword = adminSupplied ? (opts!.password as string) : genPw(12)
    const meta = parseMeta(pi.provider_metadata); meta.password = await hashOf(newPassword)
    await pg("provider_identity").where({ id: pi.id }).update({ provider_metadata: JSON.stringify(meta), updated_at: new Date() })
    return { auth_identity_id: pi.auth_identity_id, login_email: pi.entity_id, created: false, hadLogin: true, newPassword: adminSupplied ? undefined : newPassword }
  }

  // No login → create one (auth_identity + emailpass provider_identity).
  if (!emailLc) return { error: "This customer has no email, so a login cannot be created. Add an email first." }
  if (!ai) {
    const aid = "authid_" + ulid()
    await pg("auth_identity").insert({ id: aid, app_metadata: JSON.stringify({ customer_id: id }), created_at: new Date(), updated_at: new Date() })
    ai = { id: aid }
  } else {
    const m = parseMeta(ai.app_metadata)
    if (!m.customer_id) { m.customer_id = id; await pg("auth_identity").where({ id: ai.id }).update({ app_metadata: JSON.stringify(m), updated_at: new Date() }) }
  }
  const newPassword = adminSupplied ? (opts!.password as string) : genPw(12)
  await pg("provider_identity").insert({
    id: ulid(), entity_id: emailLc, provider: "emailpass", auth_identity_id: ai.id,
    provider_metadata: JSON.stringify({ password: await hashOf(newPassword) }), created_at: new Date(), updated_at: new Date(),
  })
  await pg("customer").where({ id }).update({ has_account: true, updated_at: new Date() }).catch(() => {})
  return { auth_identity_id: ai.id, login_email: emailLc, created: true, hadLogin: false, newPassword: adminSupplied ? undefined : newPassword }
}

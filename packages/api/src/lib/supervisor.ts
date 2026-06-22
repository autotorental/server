import crypto from "crypto"
import { ulid, genPw } from "./customer-login"

// Supervisor permission keys (each toggled per supervisor by the owner).
export const PERM_KEYS = ["reset_password", "vip", "verified", "featured", "suspend"] as const

// Dashboard pages a supervisor can be granted access to (sidebar segment → label).
export const NAV_CATALOG: { key: string; label: string; ar: string }[] = [
  { key: "overview", label: "Overview", ar: "نظرة عامة" },
  { key: "rental-companies", label: "Rental Companies", ar: "شركات التأجير" },
  { key: "vehicles", label: "Vehicles", ar: "السيارات" },
  { key: "pending-approvals", label: "Pending Approvals", ar: "بانتظار الموافقة" },
  { key: "customers", label: "Customers", ar: "العملاء" },
  { key: "orders", label: "Orders", ar: "الطلبات" },
  { key: "call-logs", label: "Calls & Contacts", ar: "المكالمات" },
  { key: "analytics", label: "Analytics", ar: "التحليلات" },
  { key: "import-cars", label: "Import Cars", ar: "استيراد سيارات" },
]

export function parseMeta(r: any): Record<string, any> {
  if (!r) return {}
  if (typeof r === "string") { try { return JSON.parse(r) } catch { return {} } }
  return typeof r === "object" ? { ...r } : {}
}

export type Actor = {
  userId: string | null
  email: string | null
  isSupervisor: boolean
  countries: string[]
  perms: Record<string, boolean>
  nav: string[]
}

// Resolve the calling admin user + their supervisor config (if any).
export async function getAdminActor(req: any, pg: any): Promise<Actor> {
  const actorId = (req as any).auth_context?.actor_id || null
  let user: any = null
  if (actorId) user = await pg("user").where({ id: actorId }).whereNull("deleted_at").first().catch(() => null)
  const md = parseMeta(user?.metadata)
  const sup = md.supervisor
  if (sup && typeof sup === "object") {
    return {
      userId: user.id, email: user.email, isSupervisor: true,
      countries: (sup.countries || []).map((c: string) => String(c).toUpperCase()),
      perms: sup.perms || {}, nav: sup.nav || [],
    }
  }
  return { userId: user?.id || actorId, email: user?.email || null, isSupervisor: false, countries: [], perms: {}, nav: [] }
}

// Country of a seller (from its default city, else metadata.country).
export async function sellerCountry(pg: any, sellerId: string): Promise<string | null> {
  const s = await pg("seller").where({ id: sellerId }).first().catch(() => null)
  if (!s) return null
  if (s.default_city_id) {
    const c = await pg("city").where({ id: s.default_city_id }).first().catch(() => null)
    if (c?.country_code) return String(c.country_code).toUpperCase()
  }
  const md = parseMeta(s.metadata)
  if (md.country) return String(md.country).toUpperCase()
  return null
}

// Returns null if allowed, else { status, message }. Owner = always allowed.
export async function checkCan(req: any, pg: any, permKey: string, sellerId?: string): Promise<null | { status: number; message: string }> {
  const actor = await getAdminActor(req, pg)
  if (!actor.isSupervisor) return null
  if (!actor.perms[permKey]) return { status: 403, message: "You don't have permission for this action." }
  if (sellerId) {
    const country = await sellerCountry(pg, sellerId)
    if (!country) return { status: 403, message: "This vendor has no country set, so it is outside your scope." }
    if (!actor.countries.includes(country)) return { status: 403, message: "This vendor is outside your assigned country." }
  }
  return null
}

// Create (or reuse) an ADMIN-user login: user row + auth_identity{user_id} + emailpass + super_admin role.
const nid = (p: string) => p + crypto.randomBytes(13).toString("hex").toUpperCase()
export async function ensureAdminLogin(
  pg: any, opts: { email: string; password?: string; first_name?: string; last_name?: string }
): Promise<{ user_id: string; login_email: string; newPassword?: string; error?: string }> {
  const emailLc = (opts.email || "").trim().toLowerCase()
  if (!emailLc || !emailLc.includes("@")) return { user_id: "", login_email: "", error: "Valid email required" }

  // user row
  let user = await pg("user").whereRaw("lower(email)=?", [emailLc]).whereNull("deleted_at").first()
  if (!user) {
    const uid = nid("user_")
    await pg("user").insert({ id: uid, email: emailLc, first_name: opts.first_name || null, last_name: opts.last_name || null, created_at: new Date(), updated_at: new Date() })
    user = { id: uid, email: emailLc }
  }

  // auth_identity linked to the user
  let ai = await pg("auth_identity").whereRaw(`app_metadata::jsonb->>'user_id' = ?`, [user.id]).whereNull("deleted_at").first()
  const piBase = () => pg("provider_identity").where({ provider: "emailpass" }).whereNull("deleted_at")
  let pi = await piBase().whereRaw("lower(entity_id)=?", [emailLc]).first()
  if (!ai && pi) ai = await pg("auth_identity").where({ id: pi.auth_identity_id }).first()
  if (!ai) {
    const aid = "authid_" + ulid()
    await pg("auth_identity").insert({ id: aid, app_metadata: JSON.stringify({ user_id: user.id }), created_at: new Date(), updated_at: new Date() })
    ai = { id: aid }
  } else {
    const m = parseMeta(ai.app_metadata)
    if (m.user_id !== user.id) { m.user_id = user.id; await pg("auth_identity").where({ id: ai.id }).update({ app_metadata: JSON.stringify(m), updated_at: new Date() }) }
  }

  // password (emailpass provider_identity)
  const scryptKdf = (await import("scrypt-kdf")).default
  const newPassword = (opts.password && opts.password.length >= 6) ? opts.password : genPw(12)
  const hash = (await scryptKdf.kdf(newPassword, { logN: 15, r: 8, p: 1 })).toString("base64")
  if (pi) {
    const meta = parseMeta(pi.provider_metadata); meta.password = hash
    await pg("provider_identity").where({ id: pi.id }).update({ provider_metadata: JSON.stringify(meta), updated_at: new Date() })
  } else {
    await pg("provider_identity").insert({ id: ulid(), entity_id: emailLc, provider: "emailpass", auth_identity_id: ai.id, provider_metadata: JSON.stringify({ password: hash }), created_at: new Date(), updated_at: new Date() })
  }

  // super_admin role so they can sign into the dashboard
  const ROLE = "role_super_admin"
  const ex = await pg("user_rbac_role").where({ user_id: user.id, rbac_role_id: ROLE }).first().catch(() => null)
  if (!ex) await pg("user_rbac_role").insert({ id: nid("userrole_"), user_id: user.id, rbac_role_id: ROLE, created_at: new Date(), updated_at: new Date() }).catch(() => {})

  return { user_id: user.id, login_email: emailLc, newPassword: (opts.password && opts.password.length >= 6) ? undefined : newPassword }
}

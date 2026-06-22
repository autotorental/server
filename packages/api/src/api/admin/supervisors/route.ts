import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getAdminActor, ensureAdminLogin, parseMeta, PERM_KEYS, NAV_CATALOG } from "../../../lib/supervisor"

// Only the owner (a full admin, NOT a supervisor) may manage supervisors.
async function ownerOnly(req: any, pg: any): Promise<null | { status: number; message: string }> {
  const a = await getAdminActor(req, pg)
  if (a.isSupervisor) return { status: 403, message: "Only the owner can manage supervisors." }
  return null
}

// GET /admin/supervisors — list supervisors + the catalog the owner picks from.
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const guard = await ownerOnly(req, pg); if (guard) return res.status(guard.status).json({ message: guard.message })

  const users = await pg("user").whereNull("deleted_at").whereRaw("metadata::jsonb ? 'supervisor'").select("id", "email", "first_name", "last_name", "metadata")
  const supervisors = users.map((u: any) => {
    const sup = parseMeta(u.metadata).supervisor || {}
    return {
      id: u.id, email: u.email, name: [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email,
      countries: sup.countries || [], perms: sup.perms || {}, nav: sup.nav || [],
    }
  })

  // Countries that actually have sellers (derived from each seller's default city).
  const rows = await pg("seller as s").leftJoin("city as c", "c.id", "s.default_city_id")
    .whereNull("s.deleted_at").select("c.country_code as cc").distinct().catch(() => [])
  const countries = Array.from(new Set(rows.map((r: any) => (r.cc || "").toUpperCase()).filter(Boolean))).sort()

  res.json({ supervisors, perm_keys: PERM_KEYS, nav_catalog: NAV_CATALOG, countries })
}

// POST /admin/supervisors — create a supervisor (creates the login + grants scope).
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const guard = await ownerOnly(req, pg); if (guard) return res.status(guard.status).json({ message: guard.message })

  const { email, password, name, countries, perms, nav } = (req.body || {}) as any
  if (!email) return res.status(400).json({ message: "Email is required" })

  const parts = String(name || "").trim().split(" ")
  const r = await ensureAdminLogin(pg, { email, password, first_name: parts[0] || undefined, last_name: parts.slice(1).join(" ") || undefined })
  if (r.error) return res.status(400).json({ message: r.error })

  const cleanPerms: Record<string, boolean> = {}
  for (const k of PERM_KEYS) cleanPerms[k] = !!(perms && perms[k])
  const cleanCountries = Array.isArray(countries) ? countries.map((c: string) => String(c).toUpperCase()).filter(Boolean) : []
  const navKeys = NAV_CATALOG.map((n) => n.key)
  const cleanNav = Array.isArray(nav) ? nav.filter((n: string) => navKeys.includes(n)) : []

  const user = await pg("user").where({ id: r.user_id }).first()
  const md = parseMeta(user.metadata)
  md.supervisor = { countries: cleanCountries, perms: cleanPerms, nav: cleanNav }
  await pg("user").where({ id: r.user_id }).update({ metadata: JSON.stringify(md), updated_at: new Date() })

  res.json({ success: true, user_id: r.user_id, login_email: r.login_email, new_password: r.newPassword })
}

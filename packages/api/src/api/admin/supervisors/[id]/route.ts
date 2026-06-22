import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getAdminActor, ensureAdminLogin, parseMeta, PERM_KEYS, NAV_CATALOG } from "../../../../lib/supervisor"

async function ownerOnly(req: any, pg: any): Promise<null | { status: number; message: string }> {
  const a = await getAdminActor(req, pg)
  if (a.isSupervisor) return { status: 403, message: "Only the owner can manage supervisors." }
  return null
}

// POST /admin/supervisors/:id — update scope/permissions (and optionally reset password).
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const guard = await ownerOnly(req, pg); if (guard) return res.status(guard.status).json({ message: guard.message })
  const id = (req.params as any).id

  const user = await pg("user").where({ id }).whereNull("deleted_at").first()
  if (!user) return res.status(404).json({ message: "Supervisor not found" })

  const { countries, perms, nav, password } = (req.body || {}) as any
  const md = parseMeta(user.metadata)
  const sup = md.supervisor || {}
  if (Array.isArray(countries)) sup.countries = countries.map((c: string) => String(c).toUpperCase()).filter(Boolean)
  if (perms) { const cp: Record<string, boolean> = {}; for (const k of PERM_KEYS) cp[k] = !!perms[k]; sup.perms = cp }
  if (Array.isArray(nav)) { const navKeys = NAV_CATALOG.map((n) => n.key); sup.nav = nav.filter((n: string) => navKeys.includes(n)) }
  md.supervisor = sup
  await pg("user").where({ id }).update({ metadata: JSON.stringify(md), updated_at: new Date() })

  let new_password: string | undefined
  if (password) {
    const r = await ensureAdminLogin(pg, { email: user.email, password })
    if (r.error) return res.status(400).json({ message: r.error })
    new_password = password
  }
  res.json({ success: true, new_password })
}

// DELETE /admin/supervisors/:id — revoke supervisor (removes admin role + supervisor scope).
export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const guard = await ownerOnly(req, pg); if (guard) return res.status(guard.status).json({ message: guard.message })
  const id = (req.params as any).id

  const user = await pg("user").where({ id }).first()
  if (!user) return res.status(404).json({ message: "Supervisor not found" })

  await pg("user_rbac_role").where({ user_id: id, rbac_role_id: "role_super_admin" }).del().catch(() => {})
  const md = parseMeta(user.metadata); delete md.supervisor
  await pg("user").where({ id }).update({ metadata: JSON.stringify(md), updated_at: new Date() })
  // Disable the login so they can no longer access the dashboard.
  await pg("auth_identity").whereRaw(`app_metadata::jsonb->>'user_id' = ?`, [id]).update({ deleted_at: new Date() }).catch(() => {})
  res.json({ success: true, message: "Supervisor access revoked." })
}

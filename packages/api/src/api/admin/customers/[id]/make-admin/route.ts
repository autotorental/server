import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import crypto from "crypto"
import { logUserEvent } from "../../../../../lib/user-history"
const nid = (p: string) => p + crypto.randomBytes(13).toString("hex").toUpperCase()
const meta = (r: unknown) => { if (!r) return {}; if (typeof r === "string") { try { return JSON.parse(r) } catch { return {} } } return typeof r === "object" ? { ...(r as any) } : {} }

async function findAuth(pg: any, id: string, email?: string) {
  let ai = await pg("auth_identity").whereRaw(`app_metadata::jsonb->>'customer_id' = ?`, [id]).whereNull("deleted_at").first()
  if (!ai && email) {
    const pi = await pg("provider_identity").where({ provider: "emailpass", entity_id: email }).whereNull("deleted_at").first()
    if (pi) ai = await pg("auth_identity").where({ id: pi.auth_identity_id }).first()
  }
  return ai
}

// POST /admin/customers/:id/make-admin — grant a customer dashboard-admin access
// (role Super Admin). Body { remove: true } revokes it. The original owner ("root")
// is unaffected — this just adds another admin who logs in with the same email.
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const id = (req.params as any).id
  const remove = !!(req.body as any)?.remove
  const customer = await pg("customer").where({ id }).first()
  if (!customer) return res.status(404).json({ message: "Customer not found" })
  const ai = await findAuth(pg, id, customer.email)
  if (!ai) return res.status(404).json({ message: "No login account found for this customer." })
  const m = meta(ai.app_metadata)
  const ROLE = "role_super_admin"

  if (remove) {
    if (m.user_id) await pg("user_rbac_role").where({ user_id: m.user_id, rbac_role_id: ROLE }).del()
    await logUserEvent(pg, id, "customer", "admin_revoked", "Dashboard admin access revoked", (req as any).auth_context?.actor_id)
    return res.json({ success: true, removed: true, message: "Admin access revoked." })
  }

  let userId = m.user_id
  if (!userId) {
    userId = nid("user_")
    await pg("user").insert({ id: userId, email: customer.email, first_name: customer.first_name || null, last_name: customer.last_name || null, created_at: new Date(), updated_at: new Date() })
    m.user_id = userId
    await pg("auth_identity").where({ id: ai.id }).update({ app_metadata: JSON.stringify(m), updated_at: new Date() })
  }
  const ex = await pg("user_rbac_role").where({ user_id: userId, rbac_role_id: ROLE }).whereNull("deleted_at").first()
  if (!ex) await pg("user_rbac_role").insert({ id: nid("userrole_"), user_id: userId, rbac_role_id: ROLE, created_at: new Date(), updated_at: new Date() })
  await logUserEvent(pg, id, "customer", "became_admin", "Granted dashboard admin access", (req as any).auth_context?.actor_id)
  res.json({ success: true, user_id: userId, role: "Admin (Super Admin)", login: customer.email, message: "Customer can now log into the dashboard with the same email/password." })
}


// GET /admin/customers/:id/make-admin — is this customer currently a dashboard admin?
// Lets the UI show only the relevant button (Make admin OR Remove admin, never both).
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const id = (req.params as any).id
  const customer = await pg("customer").where({ id }).first()
  if (!customer) return res.json({ is_admin: false })
  const user = await pg("user").whereRaw("lower(email)=?", [(customer.email || "").toLowerCase()]).whereNull("deleted_at").first()
  if (!user) return res.json({ is_admin: false })
  const r = await pg("user_rbac_role").where({ user_id: user.id, rbac_role_id: "role_super_admin" }).whereNull("deleted_at").first()
  return res.json({ is_admin: !!r })
}

import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getSetting } from "./settings"

// Securely determine if the authenticated identity is a platform admin.
// Admin = email exists in the Medusa "user" table OR in the admin_emails setting.
// Derives email only from the authenticated actor (no client-supplied value).
export async function getAuthEmail(req: any): Promise<string | null> {
  const auth = (req as any).auth_context || {}
  if (auth?.app_metadata?.email) return String(auth.app_metadata.email).toLowerCase()
  const actorId = auth?.actor_id
  if (!actorId) return null
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  for (const tbl of ["user", "customer", "member"]) {
    try {
      const row = await pg(tbl).where({ id: actorId }).first()
      if (row?.email) return String(row.email).toLowerCase()
    } catch { /* table may not exist */ }
  }
  return null
}

export async function isPlatformAdmin(req: any): Promise<boolean> {
  const email = await getAuthEmail(req)
  if (!email) return false
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  try {
    const u = await pg("user").whereRaw("lower(email) = ?", [email]).whereNull("deleted_at").first()
    if (u) return true
  } catch { /* ignore */ }
  try {
    const list = String((await getSetting(req.scope, "admin_emails")) || "").toLowerCase()
    if (list.split(/[,\s]+/).filter(Boolean).includes(email)) return true
  } catch { /* ignore */ }
  return false
}

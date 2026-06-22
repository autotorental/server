import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getAdminActor } from "../../../lib/supervisor"

// GET /admin/me — who am I + my supervisor scope (used by the dashboard to gate nav/buttons).
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const a = await getAdminActor(req, pg)
  res.json({ user_id: a.userId, email: a.email, is_supervisor: a.isSupervisor, countries: a.countries, perms: a.perms, nav: a.nav })
}

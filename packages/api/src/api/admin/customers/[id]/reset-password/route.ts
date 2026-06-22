import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { logUserEvent } from "../../../../../lib/user-history"
import { ensureEmailpassLogin } from "../../../../../lib/customer-login"

// POST /admin/customers/:id/reset-password — set (or CREATE) an emailpass password for a
// storefront customer so admin can hand it to them. Creates the login if it doesn't exist yet.
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const id = (req.params as any).id
  const body = (req.body || {}) as { password?: string }

  const customer = await pg("customer").where({ id }).first()
  if (!customer) return res.status(404).json({ message: "Customer not found" })

  const r = await ensureEmailpassLogin(pg, customer, { password: body.password, forceReset: true })
  if (r.error) return res.status(400).json({ message: r.error })

  await logUserEvent(pg, id, "customer", r.created ? "login_created" : "password_reset",
    r.created ? "Login account created by admin" : "Password reset by admin", (req as any).auth_context?.actor_id)

  res.json({ success: true, created: r.created, login_email: r.login_email, new_password: r.newPassword })
}

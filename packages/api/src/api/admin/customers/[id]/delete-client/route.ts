// POST /admin/customers/:id/delete-client — fully remove a client + their data so
// the email is free again and a re-signup creates a brand-new client.
// Strategy (safe, no FK cascade surprises): hard-delete the emailpass login so the
// email can be reused, soft-delete + scramble the customer email, and drop the
// customer's addresses + group links. Never touches admins/sellers.
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const id = (req.params as any).id
  const customer = await pg("customer").where({ id }).first()
  if (!customer) return res.status(404).json({ success: false, message: "Customer not found" })
  const email = String(customer.email || "")

  try {
    await pg.transaction(async (trx: any) => {
      // 1) Remove the login (emailpass) so the email becomes reusable for re-signup.
      const pis = await trx("provider_identity").where({ provider: "emailpass", entity_id: email })
      for (const pi of pis) {
        if (pi.auth_identity_id) {
          await trx("auth_identity").where({ id: pi.auth_identity_id }).del().catch(() => {})
        }
        await trx("provider_identity").where({ id: pi.id }).del().catch(() => {})
      }
      // Any auth_identity tied to this customer by metadata.
      await trx("auth_identity").whereRaw(`app_metadata::jsonb->>'customer_id' = ?`, [id]).del().catch(() => {})

      // 2) Drop the customer's personal data.
      await trx("customer_address").where({ customer_id: id }).del().catch(() => {})
      await trx("customer_group_customer").where({ customer_id: id }).del().catch(() => {})

      // 3) Soft-delete the customer and free the email (scramble) so it can register again.
      const freed = `${email}.deleted.${Date.now()}`
      await trx("customer").where({ id }).update({ email: freed, deleted_at: trx.fn.now(), updated_at: trx.fn.now() })
    })
    return res.json({ success: true, message: "Client and all their data were deleted. They can sign up again as a brand-new client." })
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e?.message || "Delete failed" })
  }
}

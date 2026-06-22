import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// Securely resolve the seller_id for the authenticated vendor.
// Works for seller/member tokens (app_metadata.seller_id) AND for mobile vendors
// who authenticate as a customer: customer.email -> member -> seller_member -> seller.
// No client-supplied id is trusted — everything derives from the auth identity.
export async function resolveVendorSellerId(req: any): Promise<string | null> {
  const auth = (req as any).auth_context || {}
  if (auth?.app_metadata?.seller_id) return auth.app_metadata.seller_id
  const actorId = auth?.actor_id
  if (!actorId) return null
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  // actor is already a seller?
  const directSeller = await pg("seller").where({ id: actorId }).whereNull("deleted_at").first().catch(() => null)
  if (directSeller) return directSeller.id

  // find the authenticated identity email (customer or member)
  let email: string | null = null
  const cust = await pg("customer").where({ id: actorId }).first().catch(() => null)
  email = cust?.email || null
  if (!email) {
    const mem0 = await pg("member").where({ id: actorId }).first().catch(() => null)
    email = mem0?.email || null
  }
  if (!email) return null

  const mem = await pg("member").where({ email }).whereNull("deleted_at").first().catch(() => null)
  if (!mem) return null
  const link = await pg("seller_member").where({ member_id: mem.id }).whereNull("deleted_at").first().catch(() => null)
  return link?.seller_id || null
}

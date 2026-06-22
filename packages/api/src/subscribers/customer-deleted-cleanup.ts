import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * When a customer is deleted from the admin dashboard, also remove the
 * leftover emailpass auth identity so the same email can register again
 * (e.g. switch from client to vendor). Vendor/seller identities are kept.
 */
export default async function customerDeletedCleanup({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const pg: any = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  const customerId = (data as any)?.id
  if (!customerId) return

  const customer = await pg("customer").where({ id: customerId }).first("email")
  const email = customer?.email
  if (!email) return

  const normalized = String(email).trim().toLowerCase()

  const rows = await pg("provider_identity as pi")
    .join("auth_identity as ai", "ai.id", "pi.auth_identity_id")
    .where("pi.provider", "emailpass")
    .whereRaw("LOWER(pi.entity_id) = ?", [normalized])
    .select("ai.id as auth_id", "ai.app_metadata")

  for (const row of rows) {
    let meta: any = {}
    try {
      meta = typeof row.app_metadata === "string" ? JSON.parse(row.app_metadata) : (row.app_metadata || {})
    } catch {}

    if (meta?.seller_id || meta?.member_id) {
      continue
    }

    await pg("provider_identity").where({ auth_identity_id: row.auth_id }).delete()
    await pg("auth_identity").where({ id: row.auth_id }).delete()
    logger.info(`[customer-deleted-cleanup] removed auth identity ${row.auth_id} for ${normalized}`)
  }
}

export const config: SubscriberConfig = {
  event: "customer.deleted",
}

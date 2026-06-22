import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// Resolve a seller directly from the authenticated identity's app_metadata,
// which already carries seller_id for Mercur seller identities. This is the most
// reliable path and works even when the vendor's login email differs from the
// company's contact email (seller.email).
export async function resolveSellerAuthByIdentity(pg: any, authIdentity: any) {
  const meta = authIdentity?.app_metadata || {}
  const sellerId = meta.seller_id
  if (!sellerId) return null

  const seller = await pg("seller").where({ id: sellerId }).first("*")
  if (!seller?.id) return null

  const membership = await pg("seller_member")
    .where({ seller_id: seller.id })
    .orderBy("is_owner", "desc")
    .first("*")

  const memberId = membership?.member_id || meta.actor_id || meta.member_id
  if (!memberId) return null

  return {
    seller,
    member_id: memberId as string,
    seller_id: seller.id as string,
    auth_identity_id: authIdentity?.id as string | undefined,
  }
}

export async function resolveSellerAuthByEmail(pg: any, email: string) {
  const normalized = String(email || "").trim().toLowerCase()
  if (!normalized) return null

  // Match the seller either by its own contact email OR by the email of any of
  // its members. The address a vendor authenticates with is the member's email,
  // which can differ from the company contact email stored on seller.email.
  let seller = await pg("seller").whereRaw("LOWER(email) = ?", [normalized]).first("*")
  let membership: any = null

  if (seller?.id) {
    membership = await pg("seller_member")
      .where({ seller_id: seller.id })
      .orderBy("is_owner", "desc")
      .first("*")
  } else {
    membership = await pg("seller_member as sm")
      .join("member as m", "m.id", "sm.member_id")
      .whereRaw("LOWER(m.email) = ?", [normalized])
      .orderBy("sm.is_owner", "desc")
      .first("sm.*")
    if (membership?.seller_id) {
      seller = await pg("seller").where({ id: membership.seller_id }).first("*")
    }
  }

  if (!seller?.id || !membership?.member_id) return null

  const provider = await pg("provider_identity")
    .where({ provider: "emailpass" })
    .andWhere(function (this: any) {
      this.whereRaw("LOWER(entity_id) = ?", [normalized]).orWhere({ entity_id: membership.member_id })
    })
    .first("auth_identity_id")

  return {
    seller,
    member_id: membership.member_id as string,
    seller_id: seller.id as string,
    auth_identity_id: provider?.auth_identity_id as string | undefined,
  }
}

/** Keep provider entity_id as email — only enrich auth_identity app_metadata. */
export async function linkSellerAuthIdentity(
  pg: any,
  authIdentityId: string,
  sellerId: string,
  memberId: string
) {
  await pg("auth_identity")
    .where({ id: authIdentityId })
    .update({
      app_metadata: JSON.stringify({
        seller_id: sellerId,
        member_id: memberId,
      }),
    })
}

export async function syncSellerAuthLinks(pg: any) {
  const rows = await pg("seller as s")
    .join("seller_member as sm", "sm.seller_id", "s.id")
    .join("member as m", "m.id", "sm.member_id")
    .leftJoin("provider_identity as pi", function (this: any) {
      this.on("pi.provider", pg.raw("?", ["emailpass"])).andOn(
        pg.raw("LOWER(pi.entity_id) = LOWER(m.email)")
      )
    })
    .select(
      "s.id as seller_id",
      "sm.member_id as member_id",
      "pi.auth_identity_id as auth_identity_id"
    )

  let updated = 0
  for (const row of rows) {
    if (!row.auth_identity_id) continue
    await linkSellerAuthIdentity(pg, row.auth_identity_id, row.seller_id, row.member_id)
    updated += 1
  }
  return updated
}

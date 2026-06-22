import { deleteVehicleFromIndex } from "./meili"

type Pg = any

async function tableExists(pg: Pg, name: string): Promise<boolean> {
  const r = await pg.raw(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ?`,
    [name]
  )
  return (r.rows?.length ?? 0) > 0
}

async function safeDel(pg: Pg, table: string, where: Record<string, unknown>) {
  if (!(await tableExists(pg, table))) return 0
  return pg(table).where(where).del()
}

/**
 * Hard-delete a rental company and all first-party data tied to it.
 */
export async function deleteSellerCompletely(pg: Pg, sellerId: string, sellerEmail?: string | null) {
  const email = sellerEmail?.trim() || null

  const vehicles = await pg("vehicle").where({ seller_id: sellerId }).select("id")
  const vehicleIds = vehicles.map((v: { id: string }) => v.id)

  for (const vid of vehicleIds) {
    try { await deleteVehicleFromIndex(vid) } catch { /* meili optional */ }
  }

  if (vehicleIds.length) {
    await safeDel(pg, "report", { seller_id: sellerId })
    await pg("report").whereIn("vehicle_id", vehicleIds).del().catch(() => 0)
    await safeDel(pg, "contact_event", { seller_id: sellerId })
    await safeDel(pg, "vendor_call", { seller_id: sellerId })
    await pg("vehicle").where({ seller_id: sellerId }).del()
  }

  await safeDel(pg, "seller_follow", { seller_id: sellerId })
  await safeDel(pg, "social_post_log", { seller_id: sellerId })
  await safeDel(pg, "contact_event", { seller_id: sellerId })
  await safeDel(pg, "vendor_call", { seller_id: sellerId })
  await safeDel(pg, "report", { seller_id: sellerId })

  // Seller reviews (link table + review rows)
  if (await tableExists(pg, "seller_seller_reviews_review")) {
    const links = await pg("seller_seller_reviews_review").where({ seller_id: sellerId }).select("review_id")
    const reviewIds = links.map((l: { review_id: string }) => l.review_id).filter(Boolean)
    await pg("seller_seller_reviews_review").where({ seller_id: sellerId }).del()
    if (reviewIds.length && (await tableExists(pg, "review"))) {
      await pg("review").whereIn("id", reviewIds).del()
    }
  }

  const members = await pg("seller_member").where({ seller_id: sellerId }).select("member_id")
  const memberIds = members.map((m: { member_id: string }) => m.member_id)

  await pg("seller_member").where({ seller_id: sellerId }).del()

  if (await tableExists(pg, "seller_address")) {
    await pg("seller_address").where({ seller_id: sellerId }).del()
  }

  // Mercur link tables (ignore if missing)
  const linkTables = [
    "seller_seller_customer_customer",
    "seller_seller_fulfillment_fulfillment_set",
    "seller_seller_payout_payout_account",
    "product_product_seller_seller",
    "order_order_seller_seller",
    "promotion_promotion_seller_seller",
    "pricing_price_list_seller_seller",
  ]
  for (const t of linkTables) {
    await safeDel(pg, t, { seller_id: sellerId })
  }

  // Auth: all identities for this seller's members + email registration
  const authIds = new Set<string>()
  if (email) {
    const byEmail = await pg("provider_identity")
      .where({ entity_id: email, provider: "emailpass" })
      .select("auth_identity_id")
    byEmail.forEach((r: { auth_identity_id: string }) => authIds.add(r.auth_identity_id))
  }
  if (memberIds.length) {
    const byMember = await pg("provider_identity")
      .whereIn("entity_id", memberIds)
      .select("auth_identity_id")
    byMember.forEach((r: { auth_identity_id: string }) => authIds.add(r.auth_identity_id))
    await pg("provider_identity").whereIn("entity_id", memberIds).del()
  }
  if (email) {
    await pg("provider_identity").where({ entity_id: email, provider: "emailpass" }).del()
  }

  const authIdList = [...authIds].filter(Boolean)
  if (authIdList.length) {
    await pg("auth_identity").whereIn("id", authIdList).del()
  }

  if (memberIds.length && (await tableExists(pg, "member"))) {
    await pg("member").whereIn("id", memberIds).del()
  }

  await pg("seller").where({ id: sellerId }).del()

  return {
    vehicles_deleted: vehicleIds.length,
    members_deleted: memberIds.length,
    auth_identities_deleted: authIdList.length,
  }
}

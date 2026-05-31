import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import crypto from "crypto"
import { resolveSellerByParam } from "../../../../../lib/resolve-seller"

function generatePassword(length = 12) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#"
  return Array.from(crypto.randomBytes(length))
    .map(b => chars[b % chars.length]).join("")
}

function parseMetadata(raw: unknown): Record<string, unknown> {
  if (!raw) return {}
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, unknown>
    } catch {
      return {}
    }
  }
  if (typeof raw === "object") return { ...(raw as Record<string, unknown>) }
  return {}
}

async function findSellerProviderIdentity(pg: any, seller: { id: string; email: string }) {
  const base = () =>
    pg("provider_identity").where({ provider: "emailpass" }).whereNull("deleted_at")

  if (seller.email) {
    const byEmail = await base().where({ entity_id: seller.email }).first()
    if (byEmail) return byEmail
  }

  const owners = await pg("seller_member as sm")
    .join("member as m", "m.id", "sm.member_id")
    .where({ "sm.seller_id": seller.id, "sm.is_owner": true })
    .whereNull("sm.deleted_at")
    .select("m.id", "m.email")

  for (const owner of owners) {
    const byMemberId = await base().where({ entity_id: owner.id }).first()
    if (byMemberId) return byMemberId
    if (owner.email) {
      const byMemberEmail = await base().where({ entity_id: owner.email }).first()
      if (byMemberEmail) return byMemberEmail
    }
  }

  const authRow = await pg("auth_identity")
    .whereRaw(`app_metadata::jsonb->>'seller_id' = ?`, [seller.id])
    .whereNull("deleted_at")
    .first()

  if (authRow) {
    return base().where({ auth_identity_id: authRow.id }).first()
  }

  return null
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const body = (req.body || {}) as { password?: string }
  const seller = await resolveSellerByParam(pg, req.params.id)
  if (!seller) return res.status(404).json({ message: "Seller not found" })
  const sellerId = seller.id

  const providerIdentity = await findSellerProviderIdentity(pg, seller)
  if (!providerIdentity) {
    return res.status(404).json({
      message:
        "No login account found for this vendor. They may have signed up before passwords were enabled — ask them to use “Forgot password” on the vendor login page, or create a new account.",
    })
  }

  const adminSupplied =
    typeof body.password === "string" && body.password.length >= 8
  const newPassword = adminSupplied ? (body.password as string) : generatePassword(12)

  const scryptKdf = (await import("scrypt-kdf")).default
  const hashConfig = { logN: 15, r: 8, p: 1 }
  const passwordHash = (await scryptKdf.kdf(newPassword, hashConfig)).toString("base64")

  const metadata = parseMetadata(providerIdentity.provider_metadata)
  metadata.password = passwordHash

  await pg("provider_identity")
    .where({ id: providerIdentity.id })
    .update({
      provider_metadata: JSON.stringify(metadata),
      updated_at: new Date(),
    })

  res.json({
    success: true,
    message: "Password reset successfully",
    seller_id: sellerId,
    seller_name: seller.name,
    seller_email: seller.email,
    login_email: providerIdentity.entity_id?.includes("@") ? providerIdentity.entity_id : seller.email,
    // Only echo an auto-generated password (the admin has no other way to learn
    // it). When the admin set the password themselves, they already know it, so
    // we don't return it.
    new_password: adminSupplied ? undefined : newPassword,
  })
}

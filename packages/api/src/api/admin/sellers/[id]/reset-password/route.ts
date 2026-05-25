import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import crypto from "crypto"

function generatePassword(length = 12) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#"
  return Array.from(crypto.randomBytes(length))
    .map(b => chars[b % chars.length]).join("")
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const sellerId = req.params.id

  const seller = await pg("seller").where({ id: sellerId }).first()
  if (!seller) return res.status(404).json({ message: "Seller not found" })

  // Generate new password
  const newPassword = generatePassword(12)

  // Hash password using scrypt-kdf (same as Medusa auth-emailpass module)
  const { default: scryptKdf } = await import("scrypt-kdf")
  const hashConfig = { logN: 15, r: 8, p: 1 }
  const passwordHash = (await scryptKdf.kdf(newPassword, hashConfig)).toString("base64")

  // Update provider_identity for this seller
  const providerIdentity = await pg("provider_identity")
    .where({ entity_id: seller.email, provider: "emailpass" })
    .first()

  if (!providerIdentity) {
    return res.status(404).json({ message: "No email/password identity found for this seller" })
  }

  const metadata = providerIdentity.provider_metadata || {}
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
    seller_email: seller.email,
    new_password: newPassword,
  })
}

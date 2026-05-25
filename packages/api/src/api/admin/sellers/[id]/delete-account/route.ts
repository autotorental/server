import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const sellerId = req.params.id
  const force = req.query.force === "true"

  const seller = await pg("seller").where({ id: sellerId }).first()
  if (!seller) return res.status(404).json({ message: "Seller not found" })

  // Count vehicles for safety check
  const [{ count: vehicleCount }] = await pg("vehicle")
    .where({ seller_id: sellerId })
    .count("*")

  // Delete vehicles
  await pg("vehicle").where({ seller_id: sellerId }).del()

  // Delete provider_identity records
  await pg("provider_identity")
    .where({ entity_id: seller.email, provider: "emailpass" })
    .del()

  // Delete the seller
  await pg("seller").where({ id: sellerId }).del()

  res.json({
    success: true,
    message: "Seller account deleted",
    seller_id: sellerId,
    seller_name: seller.name,
    vehicles_deleted: parseInt(vehicleCount as string) || 0,
  })
}

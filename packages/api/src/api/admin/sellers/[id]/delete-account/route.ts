import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { deleteSellerCompletely } from "../../../../../lib/seller-cleanup"
import { resolveSellerByParam } from "../../../../../lib/resolve-seller"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const seller = await resolveSellerByParam(pg, req.params.id)
  if (!seller) return res.status(404).json({ message: "Seller not found" })
  const sellerId = seller.id

  const stats = await deleteSellerCompletely(pg, sellerId, seller.email)

  res.json({
    success: true,
    message: "Seller account deleted",
    seller_id: sellerId,
    seller_name: seller.name,
    ...stats,
  })
}

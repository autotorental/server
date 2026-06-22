import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { resolveVendorSellerId } from "../../../../lib/vendor-seller"

// GET /vendor/rental-tracking/:id → session + live location
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const sellerId = await resolveVendorSellerId(req)
  if (!sellerId) return res.status(401).json({ message: "Unauthorized" })
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const session = await pg("rental_tracking").where({ id: req.params.id, seller_id: sellerId }).first()
  if (!session) return res.status(404).json({ message: "Session not found" })
  res.json({ session })
}

// DELETE /vendor/rental-tracking/:id → end tracking
export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const sellerId = await resolveVendorSellerId(req)
  if (!sellerId) return res.status(401).json({ message: "Unauthorized" })
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  await pg("rental_tracking").where({ id: req.params.id, seller_id: sellerId }).update({ status: "ended", updated_at: new Date() })
  res.json({ ok: true })
}

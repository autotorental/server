import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { FOLLOWS_MODULE } from "../../../../../modules/follows"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { resolveSellerByParam } from "../../../../../lib/resolve-seller"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const seller = await resolveSellerByParam(pg, req.params.id)
  if (!seller) return res.status(404).json({ message: "Seller not found" })
  const sellerId = seller.id
  const svc: any = req.scope.resolve(FOLLOWS_MODULE)
  const followers = await svc.listSellerFollows(
    { seller_id: sellerId },
    { order: { created_at: "DESC" }, take: 50 }
  )
  const total = followers.length
  const withEmail = followers.filter((f: any) => f.follower_email).length
  const notifyOn = followers.filter((f: any) => f.notify_email && f.follower_email).length
  res.json({
    total,
    with_email: withEmail,
    notify_on: notifyOn,
    recent: followers.slice(0, 20),
  })
}

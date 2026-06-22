import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { FOLLOWS_MODULE } from "../../../modules/follows"
function getSellerId(req: MedusaRequest): string | null {
  const auth = (req as any).auth_context
  return auth?.app_metadata?.seller_id || auth?.actor_id || null
}
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const sellerId = getSellerId(req); if (!sellerId) return res.status(401).json({ message: "Unauthorized" })
  const svc: any = req.scope.resolve(FOLLOWS_MODULE)
  const followers = await svc.listSellerFollows({ seller_id: sellerId }, { order: { created_at: "DESC" } })
  res.json({ followers, count: followers.length })
}

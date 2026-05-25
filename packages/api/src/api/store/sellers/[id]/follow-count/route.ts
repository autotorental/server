import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { FOLLOWS_MODULE } from "../../../../../modules/follows"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(FOLLOWS_MODULE)
  const all = await svc.listSellerFollows({ seller_id: req.params.id })
  res.json({ count: all.length })
}

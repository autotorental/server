import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

function getSellerId(req: MedusaRequest): string | null {
  const auth = (req as any).auth_context
  return auth?.app_metadata?.seller_id || auth?.actor_id || null
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const sellerId = getSellerId(req)
  if (!sellerId) return res.status(401).json({ message: "Unauthorized" })

  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const calls = await pg("vendor_call")
    .where({ seller_id: sellerId })
    .orderBy("created_at", "desc")
    .limit(50)
    .select("*")

  res.json({ calls })
}

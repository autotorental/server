import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

function getCustomerId(req: MedusaRequest): string | null {
  const auth = (req as any).auth_context
  return auth?.actor_id || null
}

// GET /store/calls/incoming — ringing outbound (callback) calls for the logged-in client.
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const clientId = getCustomerId(req)
  if (!clientId) return res.status(401).json({ message: "Unauthorized" })

  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const calls = await pg("vendor_call")
    .where({ client_id: clientId, direction: "outbound", status: "ringing" })
    .orderBy("created_at", "desc")
    .limit(20)
    .select("*")

  res.json({ calls })
}

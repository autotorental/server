import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// GET /admin/support-calls/incoming — ringing support calls from the last 2 minutes
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const since = new Date(Date.now() - 2 * 60 * 1000)
  const calls = await pg("vendor_call")
    .where("room_name", "like", "support-%")
    .andWhere("status", "ringing")
    .andWhere("created_at", ">=", since)
    .orderBy("created_at", "desc")
    .select("id", "room_name", "client_name", "client_phone", "client_country", "created_at")
  res.json({ calls })
}

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { isPlatformAdmin } from "../../../lib/platform-admin"

// GET /admin/rental-tracking → ALL active sessions (admin sees everything)
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  if (!(await isPlatformAdmin(req))) return res.status(403).json({ message: "Admins only" })
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const sessions = await pg("rental_tracking as rt")
    .leftJoin("seller as s", "s.id", "rt.seller_id")
    .leftJoin("vehicle as v", "v.id", "rt.vehicle_id")
    .whereIn("rt.status", ["pending", "active"])
    .orderBy("rt.created_at", "desc")
    .select("rt.*", "s.name as seller_name", "v.title as vehicle_title")
    .limit(500)
  res.json({ sessions, count: sessions.length })
}

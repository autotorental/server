import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { isPlatformAdmin } from "../../../../lib/platform-admin"
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  if (!(await isPlatformAdmin(req))) return res.status(403).json({ message: "Admins only" })
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  try {
    const rows = await pg("vehicle as v").leftJoin("seller as s", "s.id", "v.seller_id")
      .whereNull("v.deleted_at").whereIn("v.status", ["pending_approval", "pending", "draft", "in_review", "submitted"])
      .orderBy("v.created_at", "desc").limit(100)
      .select("v.id", "v.title", "v.status", "v.daily_price", "v.photos", "v.created_at", "s.name as seller_name")
    const cars = rows.map((c: any) => ({ ...c, photo: Array.isArray(c.photos) ? c.photos[0] : (typeof c.photos === "string" ? (() => { try { return JSON.parse(c.photos)?.[0] } catch { return null } })() : null) }))
    res.json({ vehicles: cars, count: cars.length })
  } catch (e: any) { res.status(500).json({ message: e?.message || "failed" }) }
}

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { isPlatformAdmin } from "../../../../lib/platform-admin"
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  if (!(await isPlatformAdmin(req))) return res.status(403).json({ message: "Admins only" })
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  try {
    const rows = await pg("seller as s").whereNull("s.deleted_at")
      .orderBy("s.created_at", "desc").limit(200)
      .select("s.id", "s.name", "s.handle", "s.phone", "s.logo", "s.subscription_status", "s.is_premium",
        pg.raw("(select count(*) from vehicle v where v.seller_id = s.id and v.deleted_at is null) as cars"))
    res.json({ sellers: rows, count: rows.length })
  } catch (e: any) { res.status(500).json({ message: e?.message || "failed" }) }
}

import { revalidateSellerPages } from "../../../../../../lib/storefront-revalidate"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { isPlatformAdmin } from "../../../../../../lib/platform-admin"
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  if (!(await isPlatformAdmin(req))) return res.status(403).json({ message: "Admins only" })
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  try {
    const [v] = await pg("vehicle").where({ id: req.params.id }).update({ status: "active", approved_at: new Date(), rejected_at: null, updated_at: new Date() }).returning(["id", "status"])
    void revalidateSellerPages(req.params.id, null)
    res.json({ ok: true, vehicle: v })
  } catch (e: any) { res.status(400).json({ message: e?.message || "approve failed" }) }
}

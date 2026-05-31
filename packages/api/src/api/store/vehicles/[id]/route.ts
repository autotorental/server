import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { CATALOG_MODULE } from "../../../../modules/catalog"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(CATALOG_MODULE)
  const v = await svc.retrieveVehicle(req.params.id).catch(() => null)
  if (!v || v.status !== "active") return res.status(404).json({ message: "Not found" })
  // increment view count
  await svc.updateVehicles([{ id: v.id, view_count: (v.view_count || 0) + 1 }]).catch(() => {})

  // Attach the seller's delivery config (active emirates only) so the listing
  // can show where this car can be delivered and at what price.
  try {
    if (v.seller_id) {
      const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
      const rows = await pg("seller").where({ id: v.seller_id }).select("metadata")
      const delivery = rows[0]?.metadata?.delivery
      if (delivery?.enabled && delivery.emirates) {
        v.delivery = {
          enabled: true,
          emirates: Object.entries(delivery.emirates)
            .filter(([, e]: any) => e?.active)
            .map(([name, e]: any) => ({
              name,
              free: !!e.free,
              price: e.free ? 0 : Number(e.price) || 0,
            })),
        }
      }
    }
  } catch {
    // delivery is optional; never block the listing on it
  }

  res.json({ vehicle: v })
}

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { CATALOG_MODULE } from "../../../../modules/catalog"

function optimizeImageUrl(url: string, width: number): string {
  if (!url || typeof url !== "string") return url
  if (url.includes("images.ctfassets.net")) {
    if (/[?&](w=|fm=)/.test(url)) return url
    const sep = url.includes("?") ? "&" : "?"
    return `${url}${sep}w=${width}&fm=webp&q=82`
  }
  return url
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(CATALOG_MODULE)
  const param = req.params.id
  let v = await svc.retrieveVehicle(param).catch(() => null)
  if (!v) {
    const bySlug = await svc.listVehicles({ slug: param }).catch(() => [])
    if (bySlug && bySlug[0]) v = await svc.retrieveVehicle(bySlug[0].id).catch(() => null)
  }
  if (!v || v.status !== "active") return res.status(404).json({ message: "Not found" })
  // Subscription paywall: hide cars from sellers whose trial/subscription has expired.
  try {
    const pgsub: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const sRow = await pgsub("seller").where({ id: v.seller_id }).first("subscription_status", "trial_ends_at", "subscription_ends_at")
    if (sRow) {
      const now = Date.now()
      let st = sRow.subscription_status || "trial"
      const te = sRow.trial_ends_at ? new Date(sRow.trial_ends_at).getTime() : null
      const se = sRow.subscription_ends_at ? new Date(sRow.subscription_ends_at).getTime() : null
      if (st === "active" && se && se < now) st = "expired"
      if (st === "trial" && te && te < now) st = "expired"
      if (st !== "trial" && st !== "active") return res.status(404).json({ message: "Not found" })
    }
  } catch { /* fail open */ }
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

  try {
    const _raw = Array.isArray((v as any).photos) ? (v as any).photos : (typeof (v as any).photos === "string" ? JSON.parse((v as any).photos || "[]") : [])
    if (Array.isArray(_raw) && _raw.length) (v as any).photos = _raw.map((u: string) => optimizeImageUrl(u, 1280))
  } catch {}
  res.json({ vehicle: v })
}

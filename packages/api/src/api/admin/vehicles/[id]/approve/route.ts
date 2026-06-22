import { revalidateSellerPages } from "../../../../../lib/storefront-revalidate"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { CATALOG_MODULE } from "../../../../../modules/catalog"
import { LOCATIONS_MODULE } from "../../../../../modules/locations"
import { postAndLog } from "../../../../../lib/social-post-log"
import { notifyFollowers } from "../../../../../lib/follower-notify"
import { syncVehicleToSearch } from "../../../../../lib/vehicle-meili"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(CATALOG_MODULE)
  const [v] = await svc.updateVehicles([{
    id: req.params.id,
    status: "active",
    rejection_reason: null,
    rejection_note: null,
    approved_at: new Date(),
    rejected_at: null,
  }])

  ;(async () => {
    try { await syncVehicleToSearch(req.scope, v) } catch (e: any) {
      console.error("[meili] approve index failed:", e?.message || e)
    }
  })()

  // Fire-and-forget social media post (don't block the response)
  ;(async () => {
    try {
      const locSvc: any = req.scope.resolve(LOCATIONS_MODULE)
      let brand_name: string | null = null
      let model_name: string | null = null
      let city_name: string | null = null
      try {
        if (v.brand_id) { const [b] = await svc.listBrands({ id: v.brand_id }); brand_name = b?.name || null }
        if (v.model_id) { const [m] = await svc.listCarModels({ id: v.model_id }); model_name = m?.name || null }
        if (v.city_id) { const [c] = await locSvc.listCities({ id: v.city_id }); city_name = c?.name || null }
      } catch {}
      const slug = (v.title || v.id).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
      const results = await postAndLog(req.scope, {
        id: v.id, title: v.title, description: v.description,
        daily_price: v.daily_price, currency_code: v.currency_code,
        photos: v.photos || [], slug,
        city_name, brand_name, model_name, seller_id: v.seller_id,
      }, "approve")
      // Log results (no DB write yet — could add a social_post_log table later)
      console.log(`[social-post] vehicle ${v.id}:`, JSON.stringify(results))
      // Notify followers about the new active listing
      try {
        const fn = await notifyFollowers(req.scope, v.seller_id, v as any, "new_vehicle")
        console.log(`[follower-notify] new_vehicle ${v.id} sent=${fn.sent} skipped=${fn.skipped}`)
      } catch (e: any) { console.error("[follower-notify] new_vehicle failed:", e?.message || e) }
    } catch (e: any) {
      console.error("[social-post] failed:", e?.message || e)
    }
  })()

  res.json({ vehicle: v })
}

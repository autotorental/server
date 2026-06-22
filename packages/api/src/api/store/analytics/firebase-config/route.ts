import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getSetting } from "../../../../lib/settings"

// GET /store/analytics/firebase-config
// Public-safe runtime analytics config for storefront scripts.
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const measurementId = (await getSetting(req.scope, "ga4_measurement_id")) || ""
  const ga4PropertyId = (await getSetting(req.scope, "ga4_property_id")) || ""
  const clarityProjectId = (await getSetting(req.scope, "clarity_project_id")) || ""
  const googleAdsId = (await getSetting(req.scope, "google_ads_id")) || ""
  const metaPixelId = (await getSetting(req.scope, "meta_pixel_id")) || ""
  const adsLabelLead = (await getSetting(req.scope, "google_ads_label_lead")) || ""
  const adsLabelCall = (await getSetting(req.scope, "google_ads_label_call")) || ""
  const adsLabelPurchase = (await getSetting(req.scope, "google_ads_label_purchase")) || ""

  res.json({
    ga4_measurement_id: measurementId,
    ga4_property_id: ga4PropertyId,
    clarity_project_id: clarityProjectId,
    google_ads_id: googleAdsId,
    meta_pixel_id: metaPixelId,
    google_ads_label_lead: adsLabelLead,
    google_ads_label_call: adsLabelCall,
    google_ads_label_purchase: adsLabelPurchase,
  })
}

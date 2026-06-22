import { revalidateSellerPages } from "../../../lib/storefront-revalidate"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { CATALOG_MODULE } from "../../../modules/catalog"
import { normalizeVehicleMedia } from "../../../lib/vehicle-media"
import { notifyAdminFeed } from "../../../lib/admin-feed"
import { findOrCreateCity } from "../../../lib/city-resolve"
import { notifyAdminVehiclePending } from "../../../lib/vehicle-pending-notify"
import { getSetting } from "../../../lib/settings"

// AI-generate title (and optionally description) when the vendor doesn't provide them.
async function aiGenerateTitle(scope: any, body: any): Promise<{ title?: string; description?: string }> {
  try {
    const api_key = await getSetting(scope, "openai_api_key")
    const base_url = (await getSetting(scope, "openai_base_url")) || "https://api.openai.com/v1"
    const model = (await getSetting(scope, "openai_model")) || "gpt-4o-mini"
    if (!api_key) return {}

    // Resolve brand/body-type names from catalog if IDs provided
    const pg: any = scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const brandRow = body.brand_id ? await pg("brand").where({ id: body.brand_id }).first() : null
    const bodyRow = body.body_type_id ? await pg("body_type").where({ id: body.body_type_id }).first() : null
    const cityRow = body.city_id ? await pg("city").where({ id: body.city_id }).first() : null

    const brand = brandRow?.name || ""
    const bodyType = bodyRow?.name || ""
    const city = cityRow?.name || ""
    const year = body.year || ""
    const color = body.color || ""
    const transmission = body.transmission || "Automatic"
    const price = body.daily_price || ""

    const prompt = `Generate JSON with two fields for a car rental listing:
- "title": compelling headline ≤ 65 chars (year + brand + model/variant). No generic words like "rental" or "car".
- "description": 90-140 words, conversational premium tone. Mention standout features, ideal driver, why this car. Plain text only.

Car details:
Year: ${year} | Brand: ${brand} | Body: ${bodyType} | Color: ${color}
Transmission: ${transmission} | Daily price: AED ${price} | City: ${city}
${body.description ? `Vendor notes: ${String(body.description).slice(0, 200)}` : ""}`

    const r = await fetch(`${base_url.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${api_key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model, temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(15000),
    })
    if (!r.ok) return {}
    const d = await r.json()
    const content = JSON.parse(d.choices?.[0]?.message?.content || "{}")
    return { title: content.title?.slice(0, 70), description: content.description }
  } catch {
    return {}
  }
}

function getSellerId(req: MedusaRequest): string | null {
  const auth = (req as any).auth_context
  return auth?.app_metadata?.seller_id || auth?.actor_id || null
}

async function loadSeller(req: MedusaRequest, sellerId: string) {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const rows = await pg("seller").where({ id: sellerId }).select("*")
  return rows[0] || null
}

function licenseOK(seller: any): boolean {
  if (!seller) return false
  if (!seller.trade_license_verified) return false
  if (seller.trade_license_expiry) {
    const exp = new Date(seller.trade_license_expiry)
    if (exp < new Date()) return false
  }
  return true
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const sellerId = getSellerId(req); if (!sellerId) return res.status(401).json({ message: "Unauthorized" })
  const svc: any = req.scope.resolve(CATALOG_MODULE)
  const vehicles = await svc.listVehicles({ seller_id: sellerId }, { order: { created_at: "DESC" } })
  res.json({ vehicles })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const sellerId = getSellerId(req); if (!sellerId) return res.status(401).json({ message: "Unauthorized" })
  const seller = await loadSeller(req, sellerId)
  if (!seller) return res.status(404).json({ message: "Seller not found" })

  const svc: any = req.scope.resolve(CATALOG_MODULE)
  const body = req.body as any
  try {
    normalizeVehicleMedia(body)
  } catch (e: any) {
    return res.status(400).json({ message: e?.message || "Invalid media payload" })
  }

  // Auto-fill city + contact from seller defaults if not provided
  if (!body.city_id && seller.default_city_id) body.city_id = seller.default_city_id
  if (!body.phone_number && seller.company_phone) body.phone_number = seller.company_phone
  if (!body.whatsapp_number && seller.company_whatsapp) body.whatsapp_number = seller.company_whatsapp

  // If vendor didn't provide a title, auto-generate via AI
  if (!body?.title && body?.brand_id) {
    const ai = await aiGenerateTitle(req.scope, body)
    if (ai.title) body.title = ai.title
    if (ai.description && !body.description) body.description = ai.description
  }

  if (!body.city_id && body.city_name && body.country_code) {
    try {
      const _pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
      const c = await findOrCreateCity(_pg, { name: body.city_name, country_code: body.country_code })
      if (c) body.city_id = c.id
    } catch { /* fall through to validation */ }
  }
  if (!body?.title || !body?.brand_id || !body?.city_id) {
    return res.status(400).json({
      message: "title, brand_id, city_id required",
      hint: !body?.city_id ? "Set a default city in Trade License settings, or pick one for this vehicle" : undefined,
    })
  }

  // License gate — if not verified or expired, force draft and tell the user
  const canGoLive = licenseOK(seller)
  if (!canGoLive) {
    body.status = "draft"
  } else {
    body.status = "pending_approval"
  body.livekit_enabled = true  // Always enable free video calls for all listings
  }

  body.rejection_reason = null
  body.rejection_note = null
  body.approved_at = null
  body.rejected_at = null

  // SEO-optimised slug: "rent-{brand}-{model}-in-{city}"
  // e.g. rent-mercedes-gle-53-amg-in-dubai  →  strong local search signal
  const pg2: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const brandRow2 = body.brand_id ? await pg2("brand").where({ id: body.brand_id }).select("slug","name").first().catch(() => null) : null
  const cityRow2  = body.city_id  ? await pg2("city").where({ id: body.city_id }).select("name").first().catch(() => null) : null
  const brandPart = String(brandRow2?.slug || brandRow2?.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
  const cityPart  = String(cityRow2?.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
  // Model part: strip year + brand prefix from title
  const modelPart = String(body.title || "car")
    .replace(/^\d{4}\s+/, "")
    .replace(new RegExp(`^(${String(brandRow2?.name || "").replace(/[.*+?^${}()|[\]\\]/g,"\\$&")})[\\s-]*`, "i"), "")
    .toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50)
  const seoSlug = [
    "rent",
    brandPart,
    modelPart || "car",
    cityPart ? "in" : null,
    cityPart || null,
  ].filter(Boolean).join("-").replace(/--+/g, "-").slice(0, 100)
  let slug = seoSlug || "car"
  let si = 2
  while (((await svc.listVehicles({ slug }).catch(() => [])) || []).length) { slug = `${seoSlug}-${si++}` }
  body.slug = slug
  const [vehicle] = await svc.createVehicles([{ ...body, seller_id: sellerId }])
  const vTitle = vehicle?.title || body.title
  const company = seller.name || "A company"
  if (canGoLive) {
    void notifyAdminFeed(
      req.scope,
      "Vehicle pending approval",
      company + " added \"" + vTitle + "\" and it needs your approval.\nReview & approve here:\nhttps://admin.autotorental.com/dashboard/pending-approvals"
    )
    void notifyAdminVehiclePending(req.scope, vehicle, seller)
  } else {
    void notifyAdminFeed(
      req.scope,
      "New vehicle (draft)",
      company + " added \"" + vTitle + "\" but their trade license isn't verified yet, so it's saved as a draft."
    )
  }
  res.status(201).json({
    vehicle,
    license_status: canGoLive ? "ok" : "missing_or_expired",
    notice: canGoLive ? null : "Saved as draft. Upload a valid Trade License in Settings → Trade License to publish your listings.",
  })
  void revalidateSellerPages(sellerId, seller.handle)
}

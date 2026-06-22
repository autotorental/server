import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

function arr(p: any): any[] {
  if (Array.isArray(p)) return p
  if (typeof p === "string") { try { const j = JSON.parse(p); return Array.isArray(j) ? j : (p ? [p] : []) } catch { return p ? [p] : [] } }
  return []
}
function videoUrl(v: any): string | null {
  if (!v) return null
  if (typeof v === "string") return v
  return v.url || v.video_url || v.src || v.uri || null
}

// GET /store/ads/sponsored?placement=cars|videos&limit=6
// Returns ACTIVE vendor ad campaigns resolved to a real vehicle, for native in-app
// placement (sponsored cars in the browse list, sponsored videos in the reels feed).
// Fair rotation: least-shown campaigns first.
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const placement = String((req.query as any).placement || "cars")
  const limit = Math.min(Number((req.query as any).limit) || 6, 12)

  const camps = await pg("ad_campaign").where({ status: "active" }).orderBy("impressions", "asc").limit(40)
    .select("id", "seller_id", "target_type", "target_id", "name", "platforms")

  const out: any[] = []
  const seen = new Set<string>()
  for (const c of camps) {
    let veh: any = null
    if (c.target_type === "car" && c.target_id) veh = await pg("vehicle").where({ id: c.target_id, status: "active" }).first().catch(() => null)
    if (!veh) veh = await pg("vehicle").where({ seller_id: c.seller_id, status: "active" }).orderBy("is_featured", "desc").orderBy("created_at", "desc").first().catch(() => null)
    if (!veh || seen.has(veh.id)) continue

    const vids = arr(veh.videos).map(videoUrl).filter(Boolean)
    if (placement === "videos" && vids.length === 0) continue

    seen.add(veh.id)
    const seller = await pg("seller").where({ id: c.seller_id }).first().catch(() => null)
    out.push({
      campaign_id: c.id,
      sponsored: true,
      seller: seller ? { id: seller.id, name: seller.name, handle: seller.handle, logo: seller.logo } : null,
      video: vids[0] || null,
      vehicle: {
        id: veh.id, seller_id: veh.seller_id, title: veh.title, slug: veh.slug,
        photos: arr(veh.photos), videos: vids,
        daily_price: veh.daily_price, sale_daily_price: veh.sale_daily_price, currency_code: veh.currency_code,
        city_id: veh.city_id, brand_id: veh.brand_id, year: veh.year, is_featured: veh.is_featured,
      },
    })
    if (out.length >= limit) break
  }
  res.json({ ads: out })
}

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { resolveVendorSellerId } from "../../../../lib/vendor-seller"
import { isPlatformAdmin } from "../../../../lib/platform-admin"

// GET /vendor/analytics/views — per-car view counts + company profile views
// for the authenticated seller (Google-Analytics-style report).
// Platform admins get a PLATFORM-WIDE report across all vendors.
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  // Platform owner/admin → aggregate across the whole marketplace.
  if (await isPlatformAdmin(req)) {
    try {
      const cars = await pg("vehicle as v").leftJoin("seller as s", "s.id", "v.seller_id")
        .whereNull("v.deleted_at")
        .select("v.id", "v.title", "v.view_count", "v.status", "v.photos", "s.name as seller_name")
        .orderBy("v.view_count", "desc")
        .limit(50)
      const carsOut = (cars || []).map((c: any) => ({
        id: c.id,
        title: c.seller_name ? `${c.title} · ${c.seller_name}` : c.title,
        status: c.status,
        views: Number(c.view_count || 0),
        photo: Array.isArray(c.photos) ? c.photos[0] : (typeof c.photos === "string" ? (() => { try { return JSON.parse(c.photos)?.[0] } catch { return null } })() : null),
      }))
      const totalCarViewsRow = await pg("vehicle").whereNull("deleted_at").sum("view_count as s").first()
      const profileViewsRow = await pg("seller").whereNull("deleted_at").sum("profile_view_count as s").first()
      const carCountRow = await pg("vehicle").whereNull("deleted_at").count("* as c").first()
      const sellerCountRow = await pg("seller").whereNull("deleted_at").count("* as c").first()
      let contacts = { calls: 0, whatsapp: 0 }
      try {
        const rows = await pg("contact_event").whereIn("event_type", ["call", "whatsapp", "webrtc"]).select("event_type").count("* as n").groupBy("event_type")
        for (const r of rows) { const n = Number(r.n || 0); if (r.event_type === "whatsapp") contacts.whatsapp += n; else contacts.calls += n }
      } catch { /* optional */ }
      return res.json({
        site_wide: true,
        profile_views: Number(profileViewsRow?.s || 0),
        total_car_views: Number(totalCarViewsRow?.s || 0),
        car_count: Number(carCountRow?.c || 0),
        seller_count: Number(sellerCountRow?.c || 0),
        contacts,
        cars: carsOut,
      })
    } catch (e: any) {
      return res.status(500).json({ message: "Could not load platform report" })
    }
  }

  const sellerId = await resolveVendorSellerId(req)
  if (!sellerId) return res.status(401).json({ message: "unauthenticated" })

  try {
    const seller = await pg("seller").where({ id: sellerId }).first()
    const cars = await pg("vehicle")
      .where({ seller_id: sellerId })
      .whereNull("deleted_at")
      .select("id", "title", "view_count", "status", "photos")
      .orderBy("view_count", "desc")

    const carsOut = (cars || []).map((c: any) => ({
      id: c.id,
      title: c.title,
      status: c.status,
      views: Number(c.view_count || 0),
      photo: Array.isArray(c.photos) ? c.photos[0] : (typeof c.photos === "string" ? (() => { try { return JSON.parse(c.photos)?.[0] } catch { return null } })() : null),
    }))
    const totalCarViews = carsOut.reduce((s: number, c: any) => s + c.views, 0)

    // contact events (calls / whatsapp) for this seller, if any
    let contacts = { calls: 0, whatsapp: 0 }
    try {
      const rows = await pg("contact_event")
        .where({ seller_id: sellerId })
        .whereIn("event_type", ["call", "whatsapp", "webrtc"])
        .select("event_type")
        .count("* as n")
        .groupBy("event_type")
      for (const r of rows) {
        const n = Number(r.n || 0)
        if (r.event_type === "whatsapp") contacts.whatsapp += n
        else contacts.calls += n
      }
    } catch { /* table optional */ }

    res.json({
      profile_views: Number(seller?.profile_view_count || 0),
      total_car_views: totalCarViews,
      car_count: carsOut.length,
      contacts,
      cars: carsOut,
    })
  } catch (e: any) {
    res.status(500).json({ message: "Could not load views report" })
  }
}

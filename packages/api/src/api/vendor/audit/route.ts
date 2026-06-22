import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { resolveVendorSellerId } from "../../../lib/vendor-seller"

type Issue = { severity: "error" | "warning" | "notice"; category: string; title: string; detail: string; fix: string }

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const sellerId = await resolveVendorSellerId(req)
  if (!sellerId) return res.status(401).json({ message: "unauthenticated" })
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  try {
    const s = await pg("seller").where({ id: sellerId }).first()
    const cars = await pg("vehicle").where({ seller_id: sellerId }).whereNull("deleted_at")
      .select("id", "title", "description", "photos", "daily_price", "brand_id", "body_type_id", "city_id", "status")
    const issues: Issue[] = []
    const add = (severity: any, category: string, title: string, detail: string, fix: string) => issues.push({ severity, category, title, detail, fix })

    if (!s?.logo) add("error", "Profile", "Missing company logo", "Companies with a logo get far more clicks.", "Upload your logo in Branding.")
    if (!s?.phone && !s?.company_phone) add("error", "Profile", "Missing phone number", "Customers cannot call you.", "Add a phone number in Company Profile.")
    if (!s?.banner) add("warning", "Profile", "Missing cover banner", "A banner makes your page look professional.", "Upload a banner in Branding.")
    const desc = String(s?.description || "")
    if (!desc) add("warning", "Profile", "Missing company description", "Description helps SEO and trust.", "Write 2-3 sentences about your company.")
    else if (desc.length < 60) add("notice", "Profile", "Short description", "Only " + desc.length + " characters - aim for 150+.", "Expand your company description.")
    if (!s?.trade_license_verified) add("warning", "Trust", "Trade license not verified", "Unverified companies rank lower and lose trust.", "Upload your trade license for verification.")
    if (!s?.company_whatsapp) add("notice", "Contact", "No WhatsApp number", "Most customers prefer WhatsApp.", "Add a WhatsApp number.")
    if (!s?.website_url) add("notice", "Profile", "No website link", "A website adds credibility.", "Add your website URL.")
    if (!s?.company_location_lat || !s?.company_location_lng) add("warning", "Profile", "No map location", "Customers cannot find you on the map.", "Set your location pin in Company Profile.")
    const faqs = (() => { try { return Array.isArray(s?.faqs) ? s.faqs : JSON.parse(s?.faqs || "[]") } catch { return [] } })()
    if (!faqs.length) add("notice", "SEO", "No FAQs", "FAQs improve SEO and answer customer questions.", "Add a few FAQs in the FAQ section.")

    if (s?.subscription_ends_at) {
      const days = Math.ceil((new Date(s.subscription_ends_at).getTime() - Date.now()) / 86400000)
      if (days < 0) add("error", "Subscription", "Subscription expired", "Your listings may be hidden.", "Renew your subscription.")
      else if (days <= 7) add("warning", "Subscription", "Subscription ends in " + days + " day(s)", "Renew to keep your visibility.", "Renew your subscription.")
    }

    const active = cars.filter((c: any) => c.status === "active")
    const arrPhotos = (c: any) => (Array.isArray(c.photos) ? c.photos : (() => { try { return JSON.parse(c.photos || "[]") } catch { return [] } })())
    if (cars.length === 0) add("error", "Listings", "No cars listed", "You cannot receive any leads without cars.", "Add your first car.")
    else if (active.length === 0) add("error", "Listings", "No active cars", "All your cars are draft/pending/rejected - none are visible.", "Publish or fix your car listings.")
    const noPhoto = cars.filter((c: any) => !arrPhotos(c).length).length
    if (noPhoto) add("error", "Listings", noPhoto + " car(s) with no photos", "Cars without photos almost never get booked.", "Add at least 3 photos per car.")
    const noPrice = cars.filter((c: any) => !c.daily_price).length
    if (noPrice) add("warning", "Listings", noPrice + " car(s) with no daily price", "Customers filter by price.", "Add a daily price to every car.")
    const shortDesc = cars.filter((c: any) => !c.description || String(c.description).length < 40).length
    if (shortDesc) add("warning", "Listings", shortDesc + " car(s) with missing/short description", "Descriptions help SEO and conversions.", "Write a clear description for each car.")
    const noMeta = cars.filter((c: any) => !c.brand_id || !c.body_type_id || !c.city_id).length
    if (noMeta) add("warning", "Listings", noMeta + " car(s) missing brand, type or city", "Incomplete cars do not appear in filters.", "Set brand, body type and city for each car.")
    const pending = cars.filter((c: any) => ["pending", "draft", "in_review"].includes(c.status)).length
    if (pending) add("notice", "Listings", pending + " car(s) awaiting approval/draft", "These are not visible to customers yet.", "Complete and submit them for review.")

    const counts = { error: issues.filter(i => i.severity === "error").length, warning: issues.filter(i => i.severity === "warning").length, notice: issues.filter(i => i.severity === "notice").length }
    let score = 100 - counts.error * 12 - counts.warning * 5 - counts.notice * 2
    score = Math.max(0, Math.min(100, score))
    const order: any = { error: 0, warning: 1, notice: 2 }

    res.json({
      score,
      grade: score >= 85 ? "Excellent" : score >= 65 ? "Good" : score >= 40 ? "Needs work" : "Poor",
      counts,
      cars_total: cars.length,
      cars_active: active.length,
      issues: issues.sort((a, b) => order[a.severity] - order[b.severity]),
      generated_at: new Date().toISOString(),
    })
  } catch (e: any) {
    res.status(500).json({ message: e?.message || "audit failed" })
  }
}

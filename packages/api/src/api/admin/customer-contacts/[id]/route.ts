import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// GET /admin/customer-contacts/:id — a customer's real activity with rental
// companies (calls + WhatsApp/phone contact clicks). This marketplace is
// 0% commission / direct-contact, so customers have NO orders — this is the
// meaningful replacement for the empty Orders tab on the customer page.
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const id = (req.params as any).id
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  try {
    const calls = await pg("vendor_call as vc")
      .leftJoin("seller as s", "s.id", "vc.seller_id")
      .leftJoin("vehicle as v", "v.id", "vc.vehicle_id")
      .where("vc.client_id", id)
      .orderBy("vc.created_at", "desc").limit(40)
      .select("vc.created_at as at", "vc.status", "s.name as seller", "v.title as vehicle", "vc.client_country as country")

    const events = await pg("contact_event as ce")
      .leftJoin("seller as s", "s.id", "ce.seller_id")
      .leftJoin("vehicle as v", "v.id", "ce.product_id")
      .where("ce.customer_id", id).whereNull("ce.deleted_at").whereNot("ce.event_type", "view")
      .orderBy("ce.created_at", "desc").limit(40)
      .select("ce.created_at as at", "ce.event_type", "s.name as seller", "v.title as vehicle", "ce.country_name as country")

    // history events (registration + role changes + password resets)
    let hist: any[] = []
    try { hist = await pg("user_history").where("subject_id", id).orderBy("created_at", "desc").limit(40) } catch { /* table may not exist */ }
    const cust = await pg("customer").where({ id }).first().catch(() => null)
    const histItems = hist.map((h: any) => ({ kind: h.event, detail: h.detail, at: h.created_at, history: true }))
    if (cust?.created_at) histItems.push({ kind: "registered", detail: "Account created", at: cust.created_at, history: true })

    const items = [
      ...histItems,
      ...calls.map((c: any) => ({ kind: "call", seller: c.seller, vehicle: c.vehicle, at: c.at, info: c.status, country: c.country })),
      ...events.map((e: any) => ({ kind: e.event_type, seller: e.seller, vehicle: e.vehicle, at: e.at, country: e.country })),
    ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 40)

    res.json({ items, calls: calls.length, contacts: events.length, registered_at: cust?.created_at || null })
  } catch (e: any) {
    res.json({ items: [], calls: 0, contacts: 0, error: e?.message })
  }
}

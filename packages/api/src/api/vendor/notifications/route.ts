import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { resolveVendorSellerId } from "../../../lib/vendor-seller"

// GET /vendor/notifications — unified activity feed for the logged-in vendor:
// incoming calls, new followers, cars pending approval, new client messages.
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const sellerId = await resolveVendorSellerId(req)
  if (!sellerId) return res.status(401).json({ message: "unauthenticated" })

  const since = new Date(Date.now() - 30 * 86400000)
  const items: any[] = []

  // 1) Incoming calls
  try {
    const calls = await pg("vendor_call")
      .where({ seller_id: sellerId })
      .where("created_at", ">=", since)
      .orderBy("created_at", "desc")
      .limit(25)
      .select("id", "client_name", "status", "created_at")
    for (const c of calls) {
      items.push({
        id: "call_" + c.id,
        type: "call",
        title: c.status === "missed" ? "Missed call" : "Incoming call",
        body: c.client_name || "A client tried to reach you",
        created_at: c.created_at,
      })
    }
  } catch {}

  // 2) New followers
  try {
    const fol = await pg("seller_follow")
      .where({ seller_id: sellerId })
      .whereNull("deleted_at")
      .where("created_at", ">=", since)
      .orderBy("created_at", "desc")
      .limit(20)
      .select("id", "follower_name", "created_at")
    for (const f of fol) {
      items.push({
        id: "follow_" + f.id,
        type: "follow",
        title: "New follower",
        body: (f.follower_name || "Someone") + " started following your company",
        created_at: f.created_at,
      })
    }
  } catch {}

  // 3) Cars pending approval
  try {
    const pend = await pg("vehicle")
      .where({ seller_id: sellerId, status: "pending_approval" })
      .whereNull("deleted_at")
      .orderBy("created_at", "desc")
      .limit(20)
      .select("id", "title", "created_at")
    for (const v of pend) {
      items.push({
        id: "pending_" + v.id,
        type: "pending",
        title: "Car pending approval",
        body: (v.title || "Your car") + " is awaiting review",
        created_at: v.created_at,
        data: { vehicle_id: v.id },
      })
    }
  } catch {}

  // 4) New client chat messages
  try {
    const msgs = await pg("support_chat")
      .where({ seller_id: sellerId })
      .whereNot("sender", "vendor")
      .where("created_at", ">=", since)
      .orderBy("created_at", "desc")
      .limit(20)
      .select("id", "text", "name", "created_at")
    for (const m of msgs) {
      items.push({
        id: "msg_" + m.id,
        type: "message",
        title: "New message" + (m.name ? " from " + m.name : ""),
        body: m.text || "You have a new message",
        created_at: m.created_at,
      })
    }
  } catch {}

  items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  res.json({ notifications: items.slice(0, 60) })
}

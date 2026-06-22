import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { resolveVendorSellerId } from "../../../lib/vendor-seller"

// GET /vendor/leads — unified lead inbox: phone/free calls + chat conversations,
// merged into one reverse-chronological timeline. This is the core "product" a
// paying vendor consumes: every customer who reached out, in one place.
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const sellerId = await resolveVendorSellerId(req)
  if (!sellerId) return res.status(401).json({ message: "unauthenticated" })
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  try {
    // 1) Calls (free LiveKit + callbacks)
    const calls = await pg("vendor_call")
      .where({ seller_id: sellerId })
      .orderBy("created_at", "desc").limit(100)
      .select("id", "client_name", "client_phone", "client_country", "status", "direction", "created_at", "recording_url")

    // 2) Chat conversations — group support_chat by session, keep the latest message + unread count
    const chatRows = await pg("support_chat")
      .where({ seller_id: sellerId })
      .orderBy("created_at", "desc").limit(500)
      .select("id", "session_id", "sender", "name", "text", "country", "read_by_agent", "created_at")
    const sessions: Record<string, any> = {}
    for (const r of chatRows) {
      const k = r.session_id || r.id
      if (!sessions[k]) sessions[k] = { session_id: k, name: null, country: r.country, last_text: r.text, created_at: r.created_at, unread: 0, messages: 0 }
      sessions[k].messages++
      if (r.sender !== "agent" && !r.read_by_agent) sessions[k].unread++
      if (!sessions[k].name && r.name) sessions[k].name = r.name
      // after loop, default any still-null name to "Customer"
    }

    const leads = [
      ...calls.map((c: any) => ({
        kind: "call",
        id: c.id,
        name: c.client_name || "Customer",
        phone: c.client_phone || null,
        country: c.client_country || null,
        status: c.status,
        direction: c.direction,
        recording_url: c.recording_url || null,
        preview: c.status === "missed" ? "Missed call" : c.status === "answered" ? "Answered call" : "Call",
        created_at: c.created_at,
      })),
      ...Object.values(sessions).map((s: any) => ({
        kind: "chat",
        id: s.session_id,
        name: s.name,
        phone: null,
        country: s.country || null,
        status: s.unread > 0 ? "unread" : "read",
        unread: s.unread,
        messages: s.messages,
        preview: (s.last_text || "").slice(0, 120),
        created_at: s.created_at,
      })),
    ].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    const unreadChats = Object.values(sessions).filter((s: any) => s.unread > 0).length
    const missedCalls = calls.filter((c: any) => c.status === "missed").length
    res.json({ leads, counts: { total: leads.length, calls: calls.length, chats: Object.keys(sessions).length, unread_chats: unreadChats, missed_calls: missedCalls } })
  } catch (e: any) {
    res.status(500).json({ message: e?.message || "failed", leads: [] })
  }
}

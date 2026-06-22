import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// GET  /admin/support-chat/:session  -> full thread (marks visitor msgs read)
// POST /admin/support-chat/:session  { text } -> admin reply. When the session
//      belongs to a vendor, the reply is tagged with that seller_id so it stays
//      inside the vendor↔client thread (vendor and client both see it).
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const sid = String(req.params.session || "")
  try {
    const rows = await pg("support_chat").where({ session_id: sid }).orderBy("id", "asc")
      .select("id", "sender", "name", "text", "created_at", "seller_id")
    await pg("support_chat").where({ session_id: sid, sender: "visitor", read_by_agent: false }).update({ read_by_agent: true })
    res.json({ messages: rows })
  } catch {
    res.status(500).json({ message: "Could not load chat" })
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const sid = String(req.params.session || "")
  const b = (req.body || {}) as { text?: string }
  const text = String(b.text || "").trim().slice(0, 2000)
  if (!sid || !text) return res.status(400).json({ message: "text required" })
  try {
    const existing = await pg("support_chat").where({ session_id: sid }).whereNotNull("seller_id").select("seller_id").first()
    const sellerId = existing?.seller_id || null
    const [row] = await pg("support_chat")
      .insert({ session_id: sid, seller_id: sellerId, sender: "agent", name: "Support", text, read_by_agent: true })
      .returning(["id", "sender", "name", "text", "created_at"])
    res.status(201).json({ message: row })
  } catch {
    res.status(500).json({ message: "Could not send" })
  }
}

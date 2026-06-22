import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { resolveVendorSellerId } from "../../../../lib/vendor-seller"

// GET  /vendor/chat/:session  -> all messages in this conversation (marks read)
// POST /vendor/chat/:session  { text } -> vendor reply
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const sellerId = await resolveVendorSellerId(req)
  if (!sellerId) return res.status(401).json({ message: "unauthenticated" })
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const sid = String(req.params.session || "")
  try {
    const rows = await pg("support_chat").where({ session_id: sid, seller_id: sellerId }).orderBy("id", "asc").select("id", "sender", "name", "text", "created_at")
    await pg("support_chat").where({ session_id: sid, seller_id: sellerId, sender: "visitor", read_by_agent: false }).update({ read_by_agent: true })
    res.json({ messages: rows })
  } catch (e: any) { res.status(500).json({ message: "Could not load chat" }) }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const sellerId = await resolveVendorSellerId(req)
  if (!sellerId) return res.status(401).json({ message: "unauthenticated" })
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const sid = String(req.params.session || "")
  const b = (req.body || {}) as { text?: string }
  const text = String(b.text || "").trim().slice(0, 2000)
  if (!sid || !text) return res.status(400).json({ message: "text required" })
  try {
    const [row] = await pg("support_chat").insert({ session_id: sid, seller_id: sellerId, sender: "vendor", name: "Company", text, read_by_agent: true }).returning(["id", "sender", "name", "text", "created_at"])
    res.status(201).json({ message: row })
  } catch (e: any) { res.status(500).json({ message: "Could not send" }) }
}

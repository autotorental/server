import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { resolveVendorSellerId } from "../../../lib/vendor-seller"

// GET /vendor/chat — conversations for the authenticated vendor (client messages about their cars/company)
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const sellerId = await resolveVendorSellerId(req)
  if (!sellerId) return res.status(401).json({ message: "unauthenticated" })
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  try {
    const rows = await pg.raw(
      `select distinct on (session_id) session_id, name, text, sender, created_at,
         (select count(*) from support_chat m2 where m2.session_id = m.session_id and m2.seller_id = ? and m2.sender = \x27visitor\x27 and m2.read_by_agent = false) as unread
       from support_chat m where seller_id = ? order by session_id, id desc`, [sellerId, sellerId])
    const list = (rows.rows || rows).map((r: any) => ({
      session_id: r.session_id, name: r.name, last_text: r.text, last_sender: r.sender, last_at: r.created_at, unread: Number(r.unread || 0),
    })).sort((a: any, b: any) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime())
    res.json({ conversations: list })
  } catch (e: any) {
    res.status(500).json({ message: e?.message || "Could not load chats" })
  }
}

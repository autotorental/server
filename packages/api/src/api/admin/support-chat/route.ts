import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// GET /admin/support-chat — full conversation log: platform-support chats AND
// every vendor↔client chat, one row per session, each attributed to its vendor
// company so the admin sees who every conversation is between.
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  try {
    const rows = await pg.raw(`
      SELECT DISTINCT ON (c.session_id)
        c.session_id, c.name, c.country, c.seller_id,
        s.name AS seller_name, s.handle AS seller_handle,
        c.text AS last_text, c.sender AS last_sender, c.created_at AS last_at,
        (SELECT count(*) FROM support_chat c2 WHERE c2.session_id = c.session_id AND c2.sender = 'visitor' AND c2.read_by_agent = false) AS unread
      FROM support_chat c
      LEFT JOIN seller s ON s.id = c.seller_id
      ORDER BY c.session_id, c.created_at DESC
    `)
    const list = ((rows.rows || rows) as any[])
      .map((r: any) => ({
        session_id: r.session_id,
        name: r.name,
        country: r.country,
        seller_id: r.seller_id || null,
        seller_name: r.seller_name || null,
        seller_handle: r.seller_handle || null,
        scope: r.seller_id ? "vendor" : "support",
        last_text: r.last_text,
        last_sender: r.last_sender,
        last_at: r.last_at,
        unread: Number(r.unread || 0),
      }))
      .sort((a: any, b: any) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime())
      .slice(0, 200)
    res.json({ conversations: list })
  } catch (e: any) {
    res.json({ conversations: [] })
  }
}

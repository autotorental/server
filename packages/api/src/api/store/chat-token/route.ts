import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { mintChatToken, ensureCCUserId, ccConfigured } from "../../../lib/connectycube"

// POST /store/chat-token — the logged-in app user (customer) exchanges their
// Medusa auth for a short-lived ConnectyCube USER session token, then connects
// to ConnectyCube chat directly. The Auth Secret never leaves the server.
// Body: { name?, seller_id?, seller_name? } — if seller_id is given we also
// ensure that seller's ConnectyCube user and return its id (peer_cc_user_id)
// so the buyer can open a private dialog with the vendor.
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  if (!ccConfigured()) return res.status(503).json({ ok: false, error: "ConnectyCube not configured" })
  const actorId = (req as any).auth_context?.actor_id
  if (!actorId) return res.status(401).json({ ok: false, error: "authentication required" })
  const b = (req.body as any) || {}
  const r = await mintChatToken({ kind: "c", id: String(actorId), name: String(b.name || "").slice(0, 100) })
  if (!r.ok) return res.status(502).json({ ok: false, error: r.error })
  let peer_cc_user_id: number | null = null
  if (b.seller_id) peer_cc_user_id = await ensureCCUserId({ kind: "v", id: String(b.seller_id), name: String(b.seller_name || "").slice(0, 100) })
  res.json({ ok: true, app_id: r.app_id, token: r.token, cc_user_id: r.cc_user_id, peer_cc_user_id })
}

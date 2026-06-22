import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { resolveCountryFromIp } from "../../../lib/geoip-shared"

// First-party live chat (visitor side).
// GET  /store/support-chat?session_id=...&after=<id>  -> messages for the visitor
// POST /store/support-chat  { session_id, text, name? }  -> visitor sends a message
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const q = req.query as any
  const sid = String(q.session_id || "").slice(0, 80)
  if (!sid) return res.json({ messages: [] })
  const after = Number(q.after || 0)
  try {
    const rows = await pg("support_chat")
      .where({ session_id: sid })
      .modify((b: any) => { if (after) b.where("id", ">", after) })
      .orderBy("id", "asc")
      .limit(200)
      .select("id", "sender", "name", "text", "created_at")
    res.json({ messages: rows })
  } catch {
    res.json({ messages: [] })
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const b = (req.body || {}) as { session_id?: string; text?: string; name?: string; seller_id?: string }
  const sid = String(b.session_id || "").slice(0, 80)
  const text = String(b.text || "").trim().slice(0, 2000)
  if (!sid || !text) return res.status(400).json({ message: "session_id and text required" })
  const name = String(b.name || "").trim().slice(0, 80) || null
  let country = ""
  try {
    const ip = (req.headers["x-forwarded-for"] || req.ip || "").toString().split(",")[0].trim() || null
    const { country_code } = await resolveCountryFromIp(ip, req.headers as Record<string, unknown>)
    country = String(country_code || "").slice(0, 4)
  } catch { /* ignore */ }
  try {
    let sellerId: string | null = null
    if (b.seller_id) {
      const s = await pg("seller").where({ id: String(b.seller_id).slice(0,60) }).whereNull("deleted_at").first("id","status")
      if (s && s.status !== "suspended" && s.status !== "rejected") sellerId = s.id
    }
    const [row] = await pg("support_chat")
      .insert({ session_id: sid, sender: "visitor", name, text, country, read_by_agent: false, seller_id: sellerId })
      .returning(["id", "sender", "name", "text", "created_at"])
    res.status(201).json({ message: row })
  } catch {
    res.status(500).json({ message: "Could not send" })
  }
}

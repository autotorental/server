import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { cfCall, cfContext } from "../../../../lib/cloudflare"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { token, zoneId } = await cfContext(req.scope)
    const records = await cfCall(token, `/zones/${zoneId}/dns_records?per_page=200`)
    res.json({ ok: true, records: (records || []).map((r: any) => ({ id: r.id, type: r.type, name: r.name, content: r.content, ttl: r.ttl, proxied: r.proxied, proxiable: r.proxiable })) })
  } catch (e: any) {
    if (e?.code === "NO_TOKEN") return res.json({ ok: false, no_token: true })
    res.status(500).json({ ok: false, message: e?.message || "DNS error" })
  }
}
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const b = req.body as any
  if (!b?.type || !b?.name || !b?.content) return res.status(400).json({ message: "type, name, content required" })
  try {
    const { token, zoneId } = await cfContext(req.scope)
    const r = await cfCall(token, `/zones/${zoneId}/dns_records`, "POST", { type: b.type, name: b.name, content: b.content, ttl: Number(b.ttl) || 1, proxied: !!b.proxied })
    res.json({ ok: true, record: r })
  } catch (e: any) { res.status(500).json({ ok: false, message: e?.message || "Create failed" }) }
}

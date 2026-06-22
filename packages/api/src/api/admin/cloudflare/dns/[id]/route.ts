import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { cfCall, cfContext } from "../../../../../lib/cloudflare"

export const PATCH = async (req: MedusaRequest, res: MedusaResponse) => {
  const id = (req.params as any).id; const b = req.body as any
  try {
    const { token, zoneId } = await cfContext(req.scope)
    const payload: any = {}
    for (const k of ["type", "name", "content"]) if (b[k] != null) payload[k] = b[k]
    if (b.ttl != null) payload.ttl = Number(b.ttl) || 1
    if (typeof b.proxied === "boolean") payload.proxied = b.proxied
    const r = await cfCall(token, `/zones/${zoneId}/dns_records/${id}`, "PATCH", payload)
    res.json({ ok: true, record: r })
  } catch (e: any) { res.status(500).json({ ok: false, message: e?.message || "Update failed" }) }
}
export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { token, zoneId } = await cfContext(req.scope)
    await cfCall(token, `/zones/${zoneId}/dns_records/${(req.params as any).id}`, "DELETE")
    res.json({ ok: true })
  } catch (e: any) { res.status(500).json({ ok: false, message: e?.message || "Delete failed" }) }
}

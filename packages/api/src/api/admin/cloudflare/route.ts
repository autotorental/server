import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { cfCall, cfContext } from "../../../lib/cloudflare"

// Speed & performance settings we surface (Cloudflare zone settings ids).

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { token, zoneId } = await cfContext(req.scope)
    const all = await cfCall(token, `/zones/${zoneId}/settings`)
    const map: Record<string, any> = {}
    ;(all || []).forEach((s: any) => { map[s.id] = { value: s.value, editable: s.editable !== false, modified_on: s.modified_on } })
    res.json({ ok: true, settings: map, zone_id: zoneId })
  } catch (e: any) {
    if (e?.code === "NO_TOKEN") return res.json({ ok: false, no_token: true })
    res.status(500).json({ ok: false, message: e?.message || "Cloudflare error" })
  }
}

export const PATCH = async (req: MedusaRequest, res: MedusaResponse) => {
  const b = req.body as any
  if (!b?.id) return res.status(400).json({ message: "setting id required" })
  try {
    const { token, zoneId } = await cfContext(req.scope)
    const result = await cfCall(token, `/zones/${zoneId}/settings/${b.id}`, "PATCH", { value: b.value })
    res.json({ ok: true, setting: { id: result.id, value: result.value, editable: result.editable !== false } })
  } catch (e: any) {
    res.status(500).json({ ok: false, message: e?.message || "Cloudflare update failed" })
  }
}

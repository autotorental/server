import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { cfCall, cfContext } from "../../../../lib/cloudflare"

// POST /admin/cloudflare/purge — purge everything (or { files: [...] }).
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const b = req.body as any
  try {
    const { token, zoneId } = await cfContext(req.scope)
    const body = Array.isArray(b?.files) && b.files.length ? { files: b.files.slice(0, 30) } : { purge_everything: true }
    await cfCall(token, `/zones/${zoneId}/purge_cache`, "POST", body)
    res.json({ ok: true, purged: body })
  } catch (e: any) {
    res.status(500).json({ ok: false, message: e?.message || "Purge failed" })
  }
}

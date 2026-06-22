import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// Web push token registration (browser visitors on autotorental.com).
// Publishable-key protected (standard /store auth). Anonymous web visitors
// register as platform=web, role=customer.
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const body: any = req.body || {}
  if (body.error) { console.warn("[webpush] getToken failed on client:", String(body.error).slice(0, 200)); return res.json({ ok: true, logged: true }) }
  const token = String(body.token || body.push_token || "").trim()
  if (!token || token.length < 20) return res.status(400).json({ message: "token required" })
  const now = new Date()
  try {
    const existing = await pg("push_token").where({ token }).first()
    if (existing) {
      await pg("push_token").where({ token }).update({ platform: "web", role: existing.role || "customer", updated_at: now })
    } else {
      await pg("push_token").insert({
        id: "pt_web_" + Math.random().toString(36).slice(2) + Date.now().toString(36),
        token, platform: "web", role: "customer", created_at: now, updated_at: now,
      })
    }
  } catch (e: any) { return res.status(500).json({ message: String(e?.message || e).slice(0, 120) }) }
  res.json({ ok: true })
}

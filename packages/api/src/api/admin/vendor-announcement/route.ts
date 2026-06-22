import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

const KEY = "vendor_announcement"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  let val: any = { emoji: "📣", text: "", text_ar: "", link: "", active: false }
  const row = await pg("app_setting").where({ key: KEY }).first()
  if (row?.value) { try { val = { ...val, ...JSON.parse(row.value) } } catch { /* ignore */ } }
  res.json({ announcement: val })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const b = req.body as any
  const val = {
    emoji: (b.emoji || "📣").slice(0, 8),
    text: String(b.text || "").trim().slice(0, 240),
    text_ar: String(b.text_ar || "").trim().slice(0, 240),
    link: String(b.link || "").trim().slice(0, 300),
    active: !!b.active,
  }
  const value = JSON.stringify(val)
  const existing = await pg("app_setting").where({ key: KEY }).first()
  if (existing) await pg("app_setting").where({ key: KEY }).update({ value, is_secret: false, updated_at: new Date() })
  else await pg("app_setting").insert({ key: KEY, value, is_secret: false, updated_at: new Date() })
  res.json({ ok: true, announcement: val })
}

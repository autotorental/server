import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// GET /vendor/announcement — the platform owner's banner message shown to ALL
// rental companies on their Traffic page. Stored in app_setting.vendor_announcement.
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  try {
    const row = await pg("app_setting").where({ key: "vendor_announcement" }).first()
    if (!row?.value) return res.json({ active: false })
    const a = JSON.parse(row.value)
    if (!a?.active || !a?.text) return res.json({ active: false })
    res.json({ active: true, emoji: a.emoji || "📣", text: a.text, text_ar: a.text_ar || "", link: a.link || null })
  } catch { res.json({ active: false }) }
}

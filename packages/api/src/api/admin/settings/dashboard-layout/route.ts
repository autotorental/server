import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// Server-side persistence for the admin Command Center layout (so the dashboard
// arrangement syncs across browsers/devices, not just localStorage).
// GET  /admin/settings/dashboard-layout  -> { layout: Widget[] | null }
// POST /admin/settings/dashboard-layout  { layout: Widget[] }
const KEY = "admin_dashboard_layout"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  try {
    const r = await pg("app_setting").where({ key: KEY }).first()
    return res.json({ layout: r && r.value ? JSON.parse(r.value) : null })
  } catch { return res.json({ layout: null }) }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const layout = (req.body as any) && (req.body as any).layout
  if (!Array.isArray(layout)) return res.status(400).json({ message: "layout array required" })
  const value = JSON.stringify(layout.slice(0, 80))
  try {
    const exists = await pg("app_setting").where({ key: KEY }).first()
    if (exists) await pg("app_setting").where({ key: KEY }).update({ value, updated_at: new Date() })
    else await pg("app_setting").insert({ key: KEY, value, updated_at: new Date() })
    res.json({ ok: true })
  } catch (e: any) { res.status(500).json({ message: e?.message || "save failed" }) }
}

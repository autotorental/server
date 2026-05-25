import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const rows = await pg("app_setting").select("*").orderBy("key")
  // Mask secrets in API response — show only whether set
  const settings = rows.map((r: any) => ({
    key: r.key,
    is_secret: r.is_secret,
    value: r.is_secret ? (r.value ? "•••••••• set" : "") : (r.value || ""),
    has_value: !!r.value,
    updated_at: r.updated_at,
  }))
  res.json({ settings })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = req.body as Record<string, string>
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const valid = await pg("app_setting").select("key", "is_secret")
  const validKeys = new Set(valid.map((r: any) => r.key))
  const updates: { key: string; value: string }[] = []
  for (const [k, v] of Object.entries(body || {})) {
    if (!validKeys.has(k)) continue
    if (typeof v !== "string") continue
    // Ignore masked placeholder
    if (v.startsWith("•••")) continue
    updates.push({ key: k, value: v })
  }
  for (const u of updates) {
    await pg("app_setting").where({ key: u.key }).update({ value: u.value, updated_at: new Date() })
  }
  res.json({ updated: updates.length })
}

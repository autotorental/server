import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ENV_MAP, getSetting, invalidateSettings } from "../../../lib/settings"
import { invalidateGlobalSettings } from "../../../lib/settings-global"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const dbRows = await pg("app_setting").select("*").orderBy("key")
  const byKey = new Map<string, any>(dbRows.map((r: any) => [r.key, r]))

  // Include env-backed keys even when app_setting row doesn't exist yet
  // so Integrations can show them as pre-filled/saved automatically.
  const virtualRows: any[] = []
  for (const key of Object.keys(ENV_MAP)) {
    if (byKey.has(key)) continue
    const envValue = await getSetting(req.scope, key)
    if (!envValue) continue
    const k = key.toLowerCase()
    const isSecret = ["key", "secret", "token", "password", "pass"].some((part) => k.includes(part))
    virtualRows.push({
      key,
      is_secret: isSecret,
      value: "",
      updated_at: null,
    })
  }

  const rows = [...dbRows, ...virtualRows].sort((a, b) => String(a.key).localeCompare(String(b.key)))

  const settings = await Promise.all(rows.map(async (r: any) => {
    const envValue = await getSetting(req.scope, r.key)
    const hasDb = !!r.value
    return {
      key: r.key,
      is_secret: r.is_secret,
      value: r.is_secret ? (r.value || envValue ? "•••••••• set" : "") : (r.value || envValue || ""),
      has_value: hasDb || !!envValue,
      updated_at: r.updated_at,
    }
  }))
  res.json({ settings })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = req.body as Record<string, string>
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const existingRows = await pg("app_setting").select("key", "is_secret")
  const existingMap = new Map(existingRows.map((r: any) => [r.key, !!r.is_secret]))
  const updates: { key: string; value: string }[] = []
  for (const [k, v] of Object.entries(body || {})) {
    if (typeof v !== "string") continue
    // Ignore masked placeholder
    if (v.startsWith("•••")) continue
    updates.push({ key: k, value: v })
  }
  for (const u of updates) {
    if (existingMap.has(u.key)) {
      await pg("app_setting").where({ key: u.key }).update({ value: u.value, updated_at: new Date() })
      continue
    }

    const k = u.key.toLowerCase()
    const isSecret = ["key", "secret", "token", "password", "pass"].some((part) => k.includes(part))
    await pg("app_setting").insert({
      key: u.key,
      value: u.value,
      is_secret: isSecret,
      updated_at: new Date(),
    })
  }
  invalidateSettings()
  invalidateGlobalSettings()
  res.json({ updated: updates.length })
}

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

const KEYS = {
  enabled: "splash_enabled",
  mediaUrl: "splash_media_url",
  mediaType: "splash_media_type",
  durationMs: "splash_duration_ms",
  updatedAt: "splash_updated_at",
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const knex: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const rows = await knex("app_setting")
    .whereIn("key", Object.values(KEYS))
    .select("key", "value", "updated_at")

  const map = Object.fromEntries(rows.map((r: any) => [r.key, r.value]))
  const duration = parseInt(map[KEYS.durationMs] || "", 10)

  res.json({
    splash: {
      enabled: map[KEYS.enabled] === "true",
      media_url: map[KEYS.mediaUrl] || "",
      media_type: map[KEYS.mediaType] || "video",
      duration_ms: Number.isFinite(duration) ? duration : 5000,
      updated_at: map[KEYS.updatedAt] || null,
    },
  })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const knex: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const body = (req.body || {}) as {
    enabled?: boolean
    media_url?: string
    media_type?: string
    duration_ms?: number
  }

  const mediaType = body.media_type === "image" ? "image" : "video"
  const duration =
    typeof body.duration_ms === "number" && Number.isFinite(body.duration_ms)
      ? Math.max(1000, Math.min(60000, Math.round(body.duration_ms)))
      : 5000

  const entries: Array<[string, string]> = [
    [KEYS.enabled, body.enabled ? "true" : "false"],
    [KEYS.mediaUrl, typeof body.media_url === "string" ? body.media_url : ""],
    [KEYS.mediaType, mediaType],
    [KEYS.durationMs, String(duration)],
    [KEYS.updatedAt, new Date().toISOString()],
  ]

  for (const [key, value] of entries) {
    await knex("app_setting")
      .insert({ key, value, is_secret: false })
      .onConflict("key")
      .merge({ value, updated_at: new Date() })
  }

  res.json({ ok: true })
}

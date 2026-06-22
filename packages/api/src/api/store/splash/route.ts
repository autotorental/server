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

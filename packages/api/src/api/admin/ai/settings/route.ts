import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// GET /admin/ai/settings
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const knex: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const row = await knex("ai_setting").where({ id: "default" }).first()
  // Mask api_key for safety
  const masked = row?.api_key ? row.api_key.slice(0, 6) + "..." + row.api_key.slice(-4) : ""
  res.json({
    settings: {
      ...row,
      api_key_masked: masked,
      api_key_set: !!row?.api_key,
      dataforseo_password: undefined,
      dataforseo_set: !!(row?.dataforseo_login && row?.dataforseo_password),
    },
  })
}

// POST /admin/ai/settings — partial update
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const knex: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const body = req.body as any
  const updates: Record<string, any> = { updated_at: new Date() }
  for (const k of ["api_key", "base_url", "model", "description_prompt", "short_description_prompt", "dataforseo_login", "dataforseo_password"]) {
    if (body[k] !== undefined) updates[k] = body[k] || null
  }
  await knex("ai_setting").where({ id: "default" }).update(updates)
  const row = await knex("ai_setting").where({ id: "default" }).first()
  res.json({ settings: { ...row, api_key_set: !!row.api_key } })
}

// DELETE /admin/ai/settings — clear key (useful for testing)
export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const knex: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  await knex("ai_setting").where({ id: "default" }).update({ api_key: null })
  res.json({ ok: true })
}

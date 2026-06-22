import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// GET /admin/ai/settings
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const knex: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const row = await knex("ai_setting").where({ id: "default" }).first()
  // Read fal_api_key from app_setting
  const falRow = await knex("app_setting").where({ key: "fal_api_key" }).first()
  const masked = row?.api_key ? row.api_key.slice(0, 6) + "..." + row.api_key.slice(-4) : ""
  const claudeRow = await knex("app_setting").where({ key: "claude_api_key" }).first()
  const openaiRow = await knex("app_setting").where({ key: "openai_api_key" }).first()
  const openrouterRow = await knex("app_setting").where({ key: "openrouter_api_key" }).first()
  const huggingfaceRow = await knex("app_setting").where({ key: "huggingface_api_key" }).first()
  const openaiModelRow = await knex("app_setting").where({ key: "openai_model" }).first()
  const openrouterModelRow = await knex("app_setting").where({ key: "openrouter_model" }).first()
  const huggingfaceModelRow = await knex("app_setting").where({ key: "huggingface_model" }).first()
  const provRow = await knex("app_setting").where({ key: "ai_provider" }).first()
  const rolePlannerRow  = await knex("app_setting").where({ key: "ai_role_planner" }).first()
  const roleCoderRow    = await knex("app_setting").where({ key: "ai_role_coder" }).first()
  const roleReviewerRow = await knex("app_setting").where({ key: "ai_role_reviewer" }).first()
  res.json({
    settings: {
      ...row,
      api_key_masked: masked,
      api_key_set: !!row?.api_key,
      dataforseo_password: undefined,
      dataforseo_set: !!(row?.dataforseo_login && row?.dataforseo_password),
      fal_key_set: !!falRow?.value,
      claude_key_set: !!claudeRow?.value,
      claude_key_masked: claudeRow?.value ? claudeRow.value.slice(0,10) + "..." : "",
      openai_key_set: !!openaiRow?.value,
      openai_key_masked: openaiRow?.value ? openaiRow.value.slice(0,10) + "..." : "",
      openrouter_key_set: !!openrouterRow?.value,
      openrouter_key_masked: openrouterRow?.value ? openrouterRow.value.slice(0,10) + "..." : "",
      huggingface_key_set: !!huggingfaceRow?.value,
      huggingface_key_masked: huggingfaceRow?.value ? huggingfaceRow.value.slice(0,10) + "..." : "",
      openai_model: openaiModelRow?.value || "",
      openrouter_model: openrouterModelRow?.value || "",
      huggingface_model: huggingfaceModelRow?.value || "",
      ai_provider: provRow?.value || "hermes3",
      ai_role_planner:  rolePlannerRow?.value  || "claude-haiku",
      ai_role_coder:    roleCoderRow?.value    || "qwen2.5-coder:14b",
      ai_role_reviewer: roleReviewerRow?.value || "hermes3",
    },
  })
}

// POST /admin/ai/settings — partial update
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const knex: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const body = req.body as any
  const updates: Record<string, any> = { updated_at: new Date() }
  for (const k of ["api_key", "base_url", "model", "description_prompt", "short_description_prompt", "dataforseo_login", "dataforseo_password", "video_prompt"]) {
    if (body[k] !== undefined) updates[k] = body[k] || null
  }
  await knex("ai_setting").where({ id: "default" }).update(updates)

  // Save claude_api_key
  if (body.claude_api_key) {
    await knex("app_setting")
      .insert({ key: "claude_api_key", value: body.claude_api_key, is_secret: true, updated_at: new Date() })
      .onConflict("key").merge({ value: body.claude_api_key, updated_at: new Date() })
  }
  // Save ai_provider (hermes3 | claude-haiku | claude-sonnet | claude-opus)
  if (body.ai_provider) {
    await knex("app_setting")
      .insert({ key: "ai_provider", value: body.ai_provider, updated_at: new Date() })
      .onConflict("key").merge({ value: body.ai_provider, updated_at: new Date() })
  }
  // Save openai/openrouter/huggingface keys + models
  for (const k of ["openai_api_key", "openrouter_api_key", "huggingface_api_key"] as const) {
    if (body[k]) {
      await knex("app_setting")
        .insert({ key: k, value: body[k], is_secret: true, updated_at: new Date() })
        .onConflict("key").merge({ value: body[k], updated_at: new Date() })
    }
  }
  for (const k of ["openai_model", "openrouter_model", "huggingface_model"] as const) {
    if (body[k] !== undefined) {
      await knex("app_setting")
        .insert({ key: k, value: body[k] || null, updated_at: new Date() })
        .onConflict("key").merge({ value: body[k] || null, updated_at: new Date() })
    }
  }
  // Save fal_api_key to app_setting if provided
  if (body.fal_api_key) {
    await knex("app_setting")
      .insert({ key: "fal_api_key", value: body.fal_api_key, is_secret: true, updated_at: new Date() })
      .onConflict("key").merge({ value: body.fal_api_key, updated_at: new Date() })
  }

  // Save ai_role_planner / ai_role_coder / ai_role_reviewer
  for (const roleKey of ["ai_role_planner", "ai_role_coder", "ai_role_reviewer"] as const) {
    if (body[roleKey]) {
      await knex("app_setting")
        .insert({ key: roleKey, value: body[roleKey], updated_at: new Date() })
        .onConflict("key").merge({ value: body[roleKey], updated_at: new Date() })
    }
  }

  const row = await knex("ai_setting").where({ id: "default" }).first()
  const falRow = await knex("app_setting").where({ key: "fal_api_key" }).first()
  res.json({ settings: { ...row, api_key_set: !!row.api_key, fal_key_set: !!falRow?.value } })
}

// DELETE /admin/ai/settings — clear key
export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const knex: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  await knex("ai_setting").where({ id: "default" }).update({ api_key: null })
  res.json({ ok: true })
}

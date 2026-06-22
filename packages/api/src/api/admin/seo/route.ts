import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// GET /admin/seo — list overrides + auto-include known pages with default copy
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const knex: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const overrides = await knex("seo_setting")
  res.json({ items: overrides })
}

// POST /admin/seo — upsert one row
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const knex: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const b = req.body as any
  if (!b?.path) return res.status(400).json({ message: "path required" })
  // Validate custom JSON-LD if provided — must be valid JSON, else reject so we never inject broken schema.
  let custom_schema: string | null = null
  if (b.custom_schema != null && String(b.custom_schema).trim() !== "") {
    try {
      JSON.parse(String(b.custom_schema))
      custom_schema = String(b.custom_schema)
    } catch {
      return res.status(400).json({ message: "custom_schema must be valid JSON" })
    }
  }
  const data = {
    path: b.path,
    title: b.title ?? null,
    description: b.description ?? null,
    focus_keyword: b.focus_keyword ?? null,
    og_image: b.og_image ?? null,
    noindex: !!b.noindex,
    custom_schema,
    updated_at: new Date(),
  }
  await knex("seo_setting").insert(data).onConflict("path").merge()
  res.json({ item: data })
}

// DELETE /admin/seo?path=/cars — remove override (reverts to default)
export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const knex: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const path = req.query.path as string
  if (!path) return res.status(400).json({ message: "path required" })
  await knex("seo_setting").where({ path }).del()
  res.json({ ok: true })
}

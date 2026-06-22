import { model } from "@medusajs/framework/utils"

export const Brand = model.define("brand", {
  id: model.id({ prefix: "brnd" }).primaryKey(),
  name: model.text().index(),
  slug: model.text().unique(),
  logo_url: model.text().nullable(),
  origin_country: model.text().nullable(),  // "DE", "JP", etc.
  is_active: model.boolean().default(true),
  sort_order: model.number().default(0),
})

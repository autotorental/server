import { model } from "@medusajs/framework/utils"

export const City = model.define("city", {
  id: model.id({ prefix: "city" }).primaryKey(),
  country_code: model.text().index(),
  name: model.text(),
  name_ar: model.text().nullable(),
  slug: model.text().unique(),
  is_active: model.boolean().default(true),
  sort_order: model.number().default(0),
  image_url: model.text().nullable(),
})

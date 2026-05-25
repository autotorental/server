import { model } from "@medusajs/framework/utils"

export const BodyType = model.define("body_type", {
  id: model.id({ prefix: "bdy" }).primaryKey(),
  name: model.text(),
  name_ar: model.text().nullable(),
  slug: model.text().unique(),
  icon: model.text().nullable(),       // emoji
  icon_url: model.text().nullable(),   // uploaded image URL
  sort_order: model.number().default(0),
})

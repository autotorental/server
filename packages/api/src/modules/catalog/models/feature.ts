import { model } from "@medusajs/framework/utils"

export const Feature = model.define("feature", {
  id: model.id({ prefix: "feat" }).primaryKey(),
  name: model.text(),
  name_ar: model.text().nullable(),
  slug: model.text().unique(),
  category: model.text().nullable(),
  icon: model.text().nullable(),       // emoji
  icon_url: model.text().nullable(),   // uploaded image URL
})

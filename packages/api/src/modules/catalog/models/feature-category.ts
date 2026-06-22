import { model } from "@medusajs/framework/utils"

export const FeatureCategory = model.define("feature_category", {
  id: model.id({ prefix: "fcat" }).primaryKey(),
  key: model.text().unique(),
  label: model.text(),
  sort_order: model.number().default(0),
})

import { model } from "@medusajs/framework/utils"

export const CarModel = model.define("car_model", {
  id: model.id({ prefix: "mdl" }).primaryKey(),
  brand_id: model.text().index(),
  name: model.text(),
  slug: model.text(),
  year_from: model.number().nullable(),
  year_to: model.number().nullable(),
  body_type_id: model.text().nullable(),
  colors: model.json().nullable(),
  is_active: model.boolean().default(true),
  sort_order: model.number().default(0),
})

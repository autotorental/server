import { model } from "@medusajs/framework/utils"

export const Report = model.define("report", {
  id: model.id({ prefix: "rep" }).primaryKey(),
  vehicle_id: model.text().index(),
  seller_id: model.text().index().nullable(),  // auto-filled from vehicle
  reporter_name: model.text().nullable(),
  reporter_email: model.text().nullable(),
  reporter_phone: model.text().nullable(),
  reason: model.enum([
    "wrong_info","price_wrong","already_rented","scam","duplicate",
    "inappropriate","spam","fake_photos","stolen_vehicle","other"
  ]),
  description: model.text().nullable(),
  status: model.enum(["open","reviewing","resolved","dismissed"]).default("open").index(),
  admin_note: model.text().nullable(),
  ip_address: model.text().nullable(),
})

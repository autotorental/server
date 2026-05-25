import { model } from "@medusajs/framework/utils"

export const SellerFollow = model.define("seller_follow", {
  id: model.id({ prefix: "flw" }).primaryKey(),
  seller_id: model.text().index(),
  follower_email: model.text().index().nullable(),
  follower_phone: model.text().nullable(),
  follower_name: model.text().nullable(),
  follower_device_id: model.text().index().nullable(),  // for anonymous follow per device
  notify_email: model.boolean().default(true),
})

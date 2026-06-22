import { model } from "@medusajs/framework/utils"

// Admin-defined rule that decides which cars get auto-posted and where.
// This is the equivalent of Bit Social's "auto share" settings: pick the
// trigger, the target accounts, the caption template and optional filters.
export const AutoPostRule = model.define("auto_post_rule", {
  id: model.id({ prefix: "soc_rule" }).primaryKey(),
  name: model.text(),
  enabled: model.boolean().default(true),
  // When the rule fires.
  event: model.enum(["product_created", "product_updated"]).default("product_created"),
  // Accounts (SocialAccount ids) this rule publishes to.
  account_ids: model.json(),
  // Caption template, supports tokens like {title} {price} {url} {description}.
  template: model.text(),
  // Optional product filters, e.g. { category_id, collection_id, min_price, max_price, status }.
  filters: model.json().nullable(),
  // Delay before publishing (lets the admin batch / avoid instant posts). 0 = immediate.
  delay_minutes: model.number().default(0),
})

import { model } from "@medusajs/framework/utils"

// A connected social media account/page that posts can be published to.
// Tokens are stored encrypted (see ../lib/crypto) — never in plain text.
export const SocialAccount = model.define("social_account", {
  id: model.id({ prefix: "soc_acc" }).primaryKey(),
  platform: model.enum([
    "facebook",
    "instagram",
    "twitter",
    "linkedin",
    "pinterest",
    "tiktok",
    "tumblr",
    "discord",
    "google_business",
  ]),
  // Human readable name shown in the admin (e.g. the Facebook Page name).
  name: model.text(),
  // Platform side identifier (Page id, IG business account id, etc.).
  external_id: model.text().nullable(),
  // Encrypted credentials.
  access_token: model.text(),
  refresh_token: model.text().nullable(),
  token_expires_at: model.dateTime().nullable(),
  enabled: model.boolean().default(true),
  metadata: model.json().nullable(),
})

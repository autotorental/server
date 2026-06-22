import { model } from "@medusajs/framework/utils"

// One publish attempt of a product (car) to one social account.
// A single car shared to 3 accounts produces 3 SocialPost rows.
export const SocialPost = model.define("social_post", {
  id: model.id({ prefix: "soc_post" }).primaryKey(),
  // The car being advertised. Nullable so manual/free posts are possible too.
  product_id: model.text().nullable(),
  // Target account this row publishes to.
  account_id: model.text(),
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
  // Rendered caption that will be posted.
  content: model.text(),
  // Absolute image/video URLs attached to the post.
  media_urls: model.json().nullable(),
  status: model
    .enum(["draft", "scheduled", "publishing", "published", "failed"])
    .default("draft"),
  scheduled_at: model.dateTime().nullable(),
  published_at: model.dateTime().nullable(),
  // Identifier returned by the platform after a successful publish.
  external_post_id: model.text().nullable(),
  // Last error message when status = failed.
  error: model.text().nullable(),
  attempts: model.number().default(0),
})

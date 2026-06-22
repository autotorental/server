// Shared types for the social module.

export type SocialPlatform =
  | "facebook"
  | "instagram"
  | "twitter"
  | "linkedin"
  | "pinterest"
  | "tiktok"
  | "tumblr"
  | "discord"
  | "google_business"

// All platforms the module knows about, in display order.
export const ALL_PLATFORMS: SocialPlatform[] = [
  "facebook",
  "instagram",
  "twitter",
  "linkedin",
  "pinterest",
  "tiktok",
  "tumblr",
  "discord",
  "google_business",
]

export type SocialPostStatus =
  | "draft"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed"

// Normalised payload a provider needs to publish one post.
export interface PublishInput {
  // Decrypted access token for the target account.
  accessToken: string
  // Platform side account id (Page id, IG user id, ...).
  externalId?: string | null
  content: string
  mediaUrls?: string[]
  // Per-account extras: board_id (Pinterest), author urn (LinkedIn),
  // blog name (Tumblr), webhook url (Discord), location id (Google), etc.
  meta?: Record<string, any> | null
}

export interface PublishResult {
  externalPostId: string
  raw?: unknown
}

// Every platform integration implements this interface. Adding a new network
// is just a new file implementing SocialProvider — nothing else changes.
export interface SocialProvider {
  readonly platform: SocialPlatform
  publish(input: PublishInput): Promise<PublishResult>
}

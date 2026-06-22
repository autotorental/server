import { SocialPlatform } from "../types"

// UI/connect metadata for each platform. `connect` tells the admin dashboard
// how to wire the button: an OAuth redirect, a pasted webhook, or a manual
// token form. `needs` lists the extra account fields a manual connect requires.
export interface PlatformInfo {
  platform: SocialPlatform
  label: string
  connect: "oauth" | "webhook" | "manual"
  needs?: string[]
}

export const PLATFORM_INFO: Record<SocialPlatform, PlatformInfo> = {
  facebook: { platform: "facebook", label: "Facebook", connect: "oauth" },
  instagram: { platform: "instagram", label: "Instagram", connect: "oauth" },
  twitter: { platform: "twitter", label: "X (Twitter)", connect: "manual", needs: ["access_token"] },
  linkedin: { platform: "linkedin", label: "LinkedIn", connect: "manual", needs: ["access_token", "external_id"] },
  pinterest: { platform: "pinterest", label: "Pinterest", connect: "manual", needs: ["access_token", "metadata.board_id"] },
  tiktok: { platform: "tiktok", label: "TikTok", connect: "manual", needs: ["access_token"] },
  tumblr: { platform: "tumblr", label: "Tumblr", connect: "manual", needs: ["access_token", "external_id"] },
  discord: { platform: "discord", label: "Discord", connect: "webhook", needs: ["access_token"] },
  google_business: { platform: "google_business", label: "Google Business", connect: "manual", needs: ["access_token", "external_id"] },
}

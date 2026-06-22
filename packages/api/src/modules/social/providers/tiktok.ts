import { PublishInput, PublishResult, SocialProvider } from "../types"

// Publishes a photo post via the TikTok Content Posting API (Content Posting
// API must be enabled and the app approved for direct posting). Token scope:
// video.publish / photo.publish. For cars we use the PHOTO mode with an image
// URL that TikTok pulls (PULL_FROM_URL).
const API = "https://open.tiktokapis.com/v2/post/publish/content/init/"

export class TiktokProvider implements SocialProvider {
  readonly platform = "tiktok" as const

  async publish(input: PublishInput): Promise<PublishResult> {
    const image = input.mediaUrls?.[0]
    if (!image) {
      throw new Error("[tiktok] an image is required")
    }
    const body = {
      post_info: {
        title: input.content.slice(0, 90),
        description: input.content,
        privacy_level: input.meta?.privacy_level || "PUBLIC_TO_EVERYONE",
      },
      source_info: {
        source: "PULL_FROM_URL",
        photo_cover_index: 0,
        photo_images: [image],
      },
      post_mode: "DIRECT_POST",
      media_type: "PHOTO",
    }
    const res = await fetch(API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify(body),
    })
    const json: any = await res.json().catch(() => ({}))
    if (!res.ok || json?.error?.code !== "ok") {
      throw new Error(
        `[tiktok] publish failed: ${json?.error?.message || res.statusText}`
      )
    }
    return { externalPostId: json?.data?.publish_id || "", raw: json }
  }
}

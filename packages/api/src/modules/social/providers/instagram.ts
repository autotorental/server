import { PublishInput, PublishResult, SocialProvider } from "../types"

// Publishes to an Instagram Business account via the Graph API.
// Two step flow: create a media container, then publish it.
// Requires `instagram_content_publish`. Instagram requires an image.
const GRAPH = "https://graph.facebook.com/v21.0"

export class InstagramProvider implements SocialProvider {
  readonly platform = "instagram" as const

  async publish(input: PublishInput): Promise<PublishResult> {
    const igUserId = input.externalId
    if (!igUserId) {
      throw new Error("[instagram] missing ig user id (external_id)")
    }
    const image = input.mediaUrls?.[0]
    if (!image) {
      throw new Error("[instagram] an image is required to publish")
    }

    // 1) create container
    const createRes = await fetch(`${GRAPH}/${igUserId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        image_url: image,
        caption: input.content,
        access_token: input.accessToken,
      }).toString(),
    })
    const created: any = await createRes.json()
    if (!createRes.ok || created?.error) {
      throw new Error(
        `[instagram] container failed: ${created?.error?.message || createRes.statusText}`
      )
    }

    // 2) publish container
    const pubRes = await fetch(`${GRAPH}/${igUserId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        creation_id: created.id,
        access_token: input.accessToken,
      }).toString(),
    })
    const published: any = await pubRes.json()
    if (!pubRes.ok || published?.error) {
      throw new Error(
        `[instagram] publish failed: ${published?.error?.message || pubRes.statusText}`
      )
    }
    return { externalPostId: published.id, raw: published }
  }
}

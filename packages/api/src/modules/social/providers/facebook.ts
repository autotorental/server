import { PublishInput, PublishResult, SocialProvider } from "../types"

// Publishes to a Facebook Page using the Graph API.
// Requires a Page access token with `pages_manage_posts`.
const GRAPH = "https://graph.facebook.com/v21.0"

export class FacebookProvider implements SocialProvider {
  readonly platform = "facebook" as const

  async publish(input: PublishInput): Promise<PublishResult> {
    const pageId = input.externalId
    if (!pageId) {
      throw new Error("[facebook] missing page id (external_id)")
    }

    const hasPhoto = (input.mediaUrls?.length ?? 0) > 0
    // Single photo -> /photos, otherwise a plain feed post with a link/message.
    const endpoint = hasPhoto
      ? `${GRAPH}/${pageId}/photos`
      : `${GRAPH}/${pageId}/feed`

    const body: Record<string, string> = {
      access_token: input.accessToken,
    }
    if (hasPhoto) {
      body.url = input.mediaUrls![0]
      body.caption = input.content
    } else {
      body.message = input.content
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(body).toString(),
    })
    const json: any = await res.json()
    if (!res.ok || json?.error) {
      throw new Error(
        `[facebook] publish failed: ${json?.error?.message || res.statusText}`
      )
    }
    return { externalPostId: json.post_id || json.id, raw: json }
  }
}

import { PublishInput, PublishResult, SocialProvider } from "../types"

// Publishes a photo/text post via the Tumblr API v2 (OAuth2 bearer).
// The target blog identifier is stored on the account as external_id
// (e.g. "myblog.tumblr.com").
export class TumblrProvider implements SocialProvider {
  readonly platform = "tumblr" as const

  async publish(input: PublishInput): Promise<PublishResult> {
    const blog = input.externalId
    if (!blog) {
      throw new Error("[tumblr] blog identifier (external_id) is required")
    }
    const image = input.mediaUrls?.[0]

    // Neue Post Format: a text block, plus an image block when present.
    const contentBlocks: any[] = [{ type: "text", text: input.content }]
    if (image) {
      contentBlocks.push({
        type: "image",
        media: [{ type: "image/jpeg", url: image }],
      })
    }

    const res = await fetch(`https://api.tumblr.com/v2/blog/${blog}/posts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: contentBlocks }),
    })
    const json: any = await res.json().catch(() => ({}))
    if (!res.ok || json?.meta?.status >= 400) {
      throw new Error(
        `[tumblr] publish failed: ${json?.meta?.msg || json?.errors?.[0]?.detail || res.statusText}`
      )
    }
    return { externalPostId: String(json?.response?.id || ""), raw: json }
  }
}

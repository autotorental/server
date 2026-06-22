import { PublishInput, PublishResult, SocialProvider } from "../types"

// Posts a tweet via the X/Twitter API v2 (OAuth2 user-context bearer token,
// scope tweet.write). Posting an image requires uploading media first via the
// v1.1 endpoint (OAuth1.0a) — that can be layered on; here we post the caption
// with the product link, which X expands into a card/preview.
const API = "https://api.twitter.com/2/tweets"
const MAX = 280

export class TwitterProvider implements SocialProvider {
  readonly platform = "twitter" as const

  async publish(input: PublishInput): Promise<PublishResult> {
    let text = input.content
    if (text.length > MAX) {
      text = text.slice(0, MAX - 1) + "…"
    }
    const res = await fetch(API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    })
    const json: any = await res.json().catch(() => ({}))
    if (!res.ok || json?.errors) {
      throw new Error(
        `[twitter] publish failed: ${json?.detail || json?.errors?.[0]?.message || res.statusText}`
      )
    }
    return { externalPostId: json?.data?.id, raw: json }
  }
}

import { PublishInput, PublishResult, SocialProvider } from "../types"

// Publishes a post via the LinkedIn UGC Posts API.
// The author URN (e.g. "urn:li:organization:123" or "urn:li:person:abc") is
// resolved at connect time and stored on the account as external_id.
// Token needs w_member_social (person) or w_organization_social (org/page).
const API = "https://api.linkedin.com/v2/ugcPosts"

export class LinkedinProvider implements SocialProvider {
  readonly platform = "linkedin" as const

  async publish(input: PublishInput): Promise<PublishResult> {
    const author = input.externalId
    if (!author) {
      throw new Error("[linkedin] author urn (external_id) is required")
    }
    const link = input.meta?.link
    const image = input.mediaUrls?.[0]

    // Article share (link with preview) keeps this single-call. Native image
    // upload is a 3-step asset flow that can be added later.
    const media =
      link || image
        ? [
            {
              status: "READY",
              originalUrl: link || image,
              ...(image ? { thumbnails: [{ url: image }] } : {}),
            },
          ]
        : []

    const body = {
      author,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: input.content },
          shareMediaCategory: media.length ? "ARTICLE" : "NONE",
          ...(media.length ? { media } : {}),
        },
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    }

    const res = await fetch(API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(body),
    })
    const json: any = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(`[linkedin] publish failed: ${json?.message || res.statusText}`)
    }
    return { externalPostId: json.id || res.headers.get("x-restli-id") || "", raw: json }
  }
}

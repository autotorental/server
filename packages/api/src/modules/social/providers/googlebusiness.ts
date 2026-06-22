import { PublishInput, PublishResult, SocialProvider } from "../types"

// Publishes a local post to a Google Business Profile location via the
// My Business API. The location resource name (e.g.
// "accounts/123/locations/456") is stored on the account as external_id.
// Token scope: https://www.googleapis.com/auth/business.manage
export class GoogleBusinessProvider implements SocialProvider {
  readonly platform = "google_business" as const

  async publish(input: PublishInput): Promise<PublishResult> {
    const location = input.externalId
    if (!location) {
      throw new Error("[google_business] location name (external_id) is required")
    }
    const image = input.mediaUrls?.[0]
    const body: any = {
      languageCode: input.meta?.language || "en",
      summary: input.content,
      topicType: "STANDARD",
      ...(image
        ? { media: [{ mediaFormat: "PHOTO", sourceUrl: image }] }
        : {}),
      ...(input.meta?.link
        ? { callToAction: { actionType: "LEARN_MORE", url: input.meta.link } }
        : {}),
    }

    const res = await fetch(
      `https://mybusiness.googleapis.com/v4/${location}/localPosts`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    )
    const json: any = await res.json().catch(() => ({}))
    if (!res.ok || json?.error) {
      throw new Error(
        `[google_business] publish failed: ${json?.error?.message || res.statusText}`
      )
    }
    return { externalPostId: json.name || "", raw: json }
  }
}

import { PublishInput, PublishResult, SocialProvider } from "../types"

// Creates a Pin via the Pinterest API v5.
// Requires an access token with boards:read, pins:write. The target board id
// is stored on the account metadata as { board_id }.
const API = "https://api.pinterest.com/v5"

export class PinterestProvider implements SocialProvider {
  readonly platform = "pinterest" as const

  async publish(input: PublishInput): Promise<PublishResult> {
    const boardId = input.meta?.board_id
    if (!boardId) {
      throw new Error("[pinterest] account metadata.board_id is required")
    }
    const image = input.mediaUrls?.[0]
    if (!image) {
      throw new Error("[pinterest] an image is required to create a pin")
    }

    const res = await fetch(`${API}/pins`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        board_id: boardId,
        description: input.content,
        media_source: { source_type: "image_url", url: image },
        ...(input.meta?.link ? { link: input.meta.link } : {}),
      }),
    })
    const json: any = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(`[pinterest] publish failed: ${json?.message || res.statusText}`)
    }
    return { externalPostId: json.id, raw: json }
  }
}

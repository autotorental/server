import { PublishInput, PublishResult, SocialProvider } from "../types"

// Posts to a Discord channel via an Incoming Webhook.
// No OAuth: the account stores the webhook URL (as access_token). Easiest
// platform to connect — the admin just pastes a webhook URL.
export class DiscordProvider implements SocialProvider {
  readonly platform = "discord" as const

  async publish(input: PublishInput): Promise<PublishResult> {
    const webhook = input.accessToken
    if (!webhook?.startsWith("http")) {
      throw new Error("[discord] account access_token must be a webhook URL")
    }
    const image = input.mediaUrls?.[0]
    const payload: any = {
      content: input.content,
      ...(image ? { embeds: [{ image: { url: image } }] } : {}),
    }
    // wait=true makes Discord return the created message object.
    const res = await fetch(`${webhook}?wait=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      throw new Error(`[discord] publish failed: ${res.status} ${await res.text()}`)
    }
    const json: any = await res.json().catch(() => ({}))
    return { externalPostId: json.id || "sent", raw: json }
  }
}

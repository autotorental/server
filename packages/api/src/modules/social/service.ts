import { MedusaService } from "@medusajs/framework/utils"

import { SocialAccount } from "./models/social-account"
import { SocialPost } from "./models/social-post"
import { AutoPostRule } from "./models/auto-post-rule"
import { decrypt, encrypt } from "./lib/crypto"
import { getProvider } from "./providers"
import { PublishResult } from "./types"

// Auto generated CRUD for the three models via MedusaService, plus a few
// helpers for credential handling and the actual publish call.
class SocialModuleService extends MedusaService({
  SocialAccount,
  SocialPost,
  AutoPostRule,
}) {
  // Create an account, encrypting tokens before they hit the database.
  async createAccountWithTokens(data: {
    platform: "facebook" | "instagram" | "twitter" | "linkedin"
    name: string
    external_id?: string | null
    access_token: string
    refresh_token?: string | null
    token_expires_at?: Date | null
    metadata?: Record<string, unknown> | null
  }) {
    return this.createSocialAccounts({
      ...data,
      access_token: encrypt(data.access_token),
      refresh_token: data.refresh_token ? encrypt(data.refresh_token) : null,
    })
  }

  // Returns the decrypted access token for an account.
  async getDecryptedToken(accountId: string): Promise<string> {
    const account = await this.retrieveSocialAccount(accountId)
    return decrypt(account.access_token)
  }

  // Refresh an account's stored token (and optionally its name) on re-connect.
  async updateAccountToken(accountId: string, accessToken: string, name?: string) {
    return this.updateSocialAccounts({
      id: accountId,
      access_token: encrypt(accessToken),
      ...(name ? { name } : {}),
    })
  }

  // Publishes a single SocialPost row to its target account and records the
  // outcome (published / failed). Returns the updated row.
  async publishPost(postId: string) {
    const post = await this.retrieveSocialPost(postId)
    const account = await this.retrieveSocialAccount(post.account_id)

    await this.updateSocialPosts({
      id: postId,
      status: "publishing",
      attempts: (post.attempts ?? 0) + 1,
    })

    try {
      if (!account.enabled) {
        throw new Error(`account ${account.id} is disabled`)
      }
      const provider = getProvider(post.platform)
      const result: PublishResult = await provider.publish({
        accessToken: decrypt(account.access_token),
        externalId: account.external_id,
        content: post.content,
        mediaUrls: (post.media_urls as string[] | null) ?? undefined,
        meta: (account.metadata as Record<string, any> | null) ?? null,
      })
      return await this.updateSocialPosts({
        id: postId,
        status: "published",
        published_at: new Date(),
        external_post_id: result.externalPostId,
        error: null,
      })
    } catch (e: any) {
      return await this.updateSocialPosts({
        id: postId,
        status: "failed",
        error: e?.message || String(e),
      })
    }
  }
}

export default SocialModuleService

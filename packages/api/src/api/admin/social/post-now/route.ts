import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { SOCIAL_MODULE } from "../../../../modules/social"
import { PRODUCT_POST_FIELDS, renderTemplate } from "../../../../modules/social/lib/template"

// POST /admin/social/post-now
// Body: { product_id, account_ids[], template?, content? }
// Immediately publishes a specific car to the chosen accounts.
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const social: any = req.scope.resolve(SOCIAL_MODULE)
  const b = (req.body || {}) as any

  if (!b.product_id) {
    return res.status(400).json({ message: "product_id is required" })
  }
  if (!Array.isArray(b.account_ids) || !b.account_ids.length) {
    return res.status(400).json({ message: "account_ids is required" })
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: products } = await query.graph({
    entity: "product",
    fields: PRODUCT_POST_FIELDS,
    filters: { id: b.product_id },
  })
  const product = products?.[0]
  if (!product) {
    return res.status(404).json({ message: "Product not found" })
  }

  const content =
    b.content || renderTemplate(b.template || "{title}\n{url}", product)
  const media = product.thumbnail ? [product.thumbnail] : []

  const results: any[] = []
  for (const accountId of b.account_ids as string[]) {
    const account = await social.retrieveSocialAccount(accountId).catch(() => null)
    if (!account) {
      results.push({ account_id: accountId, status: "failed", error: "account not found" })
      continue
    }
    const post = await social.createSocialPosts({
      product_id: product.id,
      account_id: accountId,
      platform: account.platform,
      content,
      media_urls: media,
      status: "scheduled",
      scheduled_at: new Date(),
    })
    const published = await social.publishPost(post.id)
    results.push({
      account_id: accountId,
      post_id: post.id,
      status: published.status,
      external_post_id: published.external_post_id,
      error: published.error,
    })
  }

  res.json({ results })
}

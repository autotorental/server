import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { SOCIAL_MODULE } from "../modules/social"
import {
  matchesFilters,
  PRODUCT_POST_FIELDS,
  renderTemplate,
} from "../modules/social/lib/template"

// On product create/update, apply every enabled auto-post rule and queue a
// scheduled SocialPost per target account. The publisher job sends them.
async function handle(
  { event: { data, name }, container }: SubscriberArgs<{ id: string }>
) {
  try {
    const social: any = container.resolve(SOCIAL_MODULE)
    const eventKey = name === "product.created" ? "product_created" : "product_updated"

    const rules = await social.listAutoPostRules({ enabled: true, event: eventKey })
    if (!rules.length) {
      return
    }

    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: products } = await query.graph({
      entity: "product",
      fields: PRODUCT_POST_FIELDS,
      filters: { id: data.id },
    })
    const product = products?.[0]
    if (!product) {
      return
    }

    for (const rule of rules) {
      if (!matchesFilters(product, rule.filters)) {
        continue
      }
      const content = renderTemplate(rule.template, product)
      const media = product.thumbnail ? [product.thumbnail] : []
      const scheduledAt =
        rule.delay_minutes > 0
          ? new Date(Date.now() + rule.delay_minutes * 60 * 1000)
          : new Date()

      for (const accountId of rule.account_ids as string[]) {
        const account = await social.retrieveSocialAccount(accountId).catch(() => null)
        if (!account || !account.enabled) {
          continue
        }
        await social.createSocialPosts({
          product_id: product.id,
          account_id: accountId,
          platform: account.platform,
          content,
          media_urls: media,
          status: "scheduled",
          scheduled_at: scheduledAt,
        })
      }
    }
  } catch (e: any) {
    console.error("[social-auto-post] failed:", e?.message || e)
  }
}

export default handle

export const config: SubscriberConfig = {
  event: ["product.created", "product.updated"],
}

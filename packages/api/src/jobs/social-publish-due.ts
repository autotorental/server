import { MedusaContainer } from "@medusajs/framework/types"

import { SOCIAL_MODULE } from "../modules/social"

// Runs every minute, picks up scheduled posts whose time has come and
// publishes them. Failed posts are retried up to MAX_ATTEMPTS.
const MAX_ATTEMPTS = 3
const BATCH = 25

export default async function socialPublishDue(container: MedusaContainer) {
  const social: any = container.resolve(SOCIAL_MODULE)

  try {
    const due = await social.listSocialPosts(
      {
        status: ["scheduled", "failed"],
        scheduled_at: { $lte: new Date() },
        attempts: { $lt: MAX_ATTEMPTS },
      },
      { take: BATCH, order: { scheduled_at: "ASC" } }
    )

    if (!due.length) {
      return
    }

    for (const post of due) {
      const result = await social.publishPost(post.id)
      if (result?.status === "published") {
        console.log(`[social-publish-due] published ${post.id} (${post.platform})`)
      } else {
        console.warn(
          `[social-publish-due] ${post.id} failed (attempt ${result?.attempts}): ${result?.error}`
        )
      }
    }
  } catch (e: any) {
    console.error("[social-publish-due] failed:", e?.message || e)
  }
}

export const config = {
  name: "social-publish-due",
  schedule: "* * * * *", // every minute
}

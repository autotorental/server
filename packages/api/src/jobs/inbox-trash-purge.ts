import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// How long a soft-deleted message stays in the Deleted folder before it is
// permanently removed.
const RETENTION_DAYS = 15

export default async function inboxTrashPurge(container: MedusaContainer) {
  const knex: any = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000)

  try {
    const removed = await knex("contact_message")
      .whereNotNull("deleted_at")
      .where("deleted_at", "<", cutoff)
      .del()
    if (removed) {
      console.log(`[inbox-trash-purge] permanently removed ${removed} message(s) older than ${RETENTION_DAYS} days`)
    }
  } catch (e: any) {
    console.error("[inbox-trash-purge] failed:", e?.message || e)
  }
}

export const config = {
  name: "inbox-trash-purge",
  schedule: "0 3 * * *", // every day at 03:00 server time
}

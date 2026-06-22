// medusa exec ./src/scripts/sync-inbox.ts
// Cron: every 10 min — cd /opt/autorental/packages/api && npx medusa exec ./src/scripts/sync-inbox.ts
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getGlobalSetting } from "../lib/settings-global"
import { syncMailbox } from "../lib/mail-sync"

export default async function syncInbox({ container }: ExecArgs) {
  const knex: any = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const result = await syncMailbox(knex, getGlobalSetting, { inboxLimit: 200, sentLimit: 150 })
  console.log("[sync-inbox]", JSON.stringify(result))
  if (!result.ok && result.inbox === 0 && result.sent === 0) {
    throw new Error(result.errors[0] || "sync failed")
  }
}

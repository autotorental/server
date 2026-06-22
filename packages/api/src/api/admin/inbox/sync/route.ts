import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getGlobalSetting } from "../../../../lib/settings-global"
import { syncMailbox } from "../../../../lib/mail-sync"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const knex: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const b = (req.body || {}) as { inbox_limit?: number; sent_limit?: number }

  const result = await syncMailbox(knex, getGlobalSetting, {
    inboxLimit: b.inbox_limit,
    sentLimit: b.sent_limit,
  })

  if (!result.ok && result.inbox === 0 && result.sent === 0) {
    return res.status(503).json({
      message: result.errors[0] || "Mailbox sync failed",
      mailbox: "info@autotorental.com",
      ...result,
      ok: false,
    })
  }

  res.json({
    mailbox: "info@autotorental.com",
    ...result,
    ok: true,
  })
}

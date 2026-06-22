import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const knex: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const b = req.body as any
  const updates: any = {}
  if (b.action === "restore") {
    // Bring a message back from the Deleted folder.
    updates.deleted_at = null
  } else {
    if (b.status) updates.status = b.status
    if (b.status === "replied") updates.replied_at = new Date()
  }
  if (Object.keys(updates).length) {
    await knex("contact_message").where({ id: req.params.id }).update(updates)
  }
  res.json({ ok: true })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const knex: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  // Soft delete by default: move to the Deleted folder (auto-purged after 15 days).
  // Pass ?permanent=1 to remove the row immediately.
  const permanent = req.query.permanent === "1" || req.query.permanent === "true"
  if (permanent) {
    await knex("contact_message").where({ id: req.params.id }).del()
  } else {
    await knex("contact_message").where({ id: req.params.id }).update({ deleted_at: new Date() })
  }
  res.json({ ok: true })
}

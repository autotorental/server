import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const knex: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const b = req.body as any
  const updates: any = {}
  if (b.status) updates.status = b.status
  if (b.status === "replied") updates.replied_at = new Date()
  await knex("contact_message").where({ id: req.params.id }).update(updates)
  res.json({ ok: true })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const knex: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  await knex("contact_message").where({ id: req.params.id }).del()
  res.json({ ok: true })
}

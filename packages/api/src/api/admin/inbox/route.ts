import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const knex: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const status = req.query.status as string
  const q = knex("contact_message").orderBy("created_at", "desc").limit(200)
  if (status && status !== "all") q.where("status", status)
  const items = await q
  const counts = await knex("contact_message").select("status").count("* as count").groupBy("status")
  res.json({
    items,
    counts: counts.reduce((a: any, r: any) => { a[r.status] = parseInt(r.count, 10); return a }, {}),
  })
}

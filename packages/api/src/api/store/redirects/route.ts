import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// GET /store/redirects — public list used by storefront middleware to 301 old URLs.
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const knex: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  let rows: any[] = []
  try { rows = await knex("redirect").select("from_path", "to_path", "status").limit(5000) } catch {}
  res.json({ redirects: rows.map((r) => ({ from: r.from_path, to: r.to_path, status: r.status || 301 })) })
}

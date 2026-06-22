// PUBLIC endpoint storefront can call to fetch SEO override for a given path.
// No auth — only returns title/desc/keyword/og/noindex.
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const knex: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const path = (req.query.path as string) || ""
  if (!path) return res.status(400).json({ message: "path required" })
  const row = await knex("seo_setting").where({ path }).first()
  res.json({ seo: row || null })
}

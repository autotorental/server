import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// GET — published page slugs (for the sitemap / discovery).
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const pages = await pg("cms_page").where({ published: true }).select("slug", "title", "updated_at").orderBy("updated_at", "desc")
  res.json({ pages })
}

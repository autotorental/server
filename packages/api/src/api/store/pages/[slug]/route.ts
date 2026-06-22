import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const [page] = await pg("cms_page").where({ slug: req.params.slug, published: true }).select("*")
  if (!page) return res.status(404).json({ message: "Page not found" })
  res.json({ page })
}

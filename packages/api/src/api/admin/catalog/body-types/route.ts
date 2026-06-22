import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CATALOG_MODULE } from "../../../../modules/catalog"
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(CATALOG_MODULE)
  const body_types = await svc.listBodyTypes({}, { order: { sort_order: "ASC", name: "ASC" } })
  res.json({ body_types })
}
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(CATALOG_MODULE)
  const [bt] = await svc.createBodyTypes([req.body])
  res.status(201).json({ body_type: bt })
}

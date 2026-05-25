import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CATALOG_MODULE } from "../../../../modules/catalog"
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(CATALOG_MODULE)
  const features = await svc.listFeatures({}, { order: { category: "ASC", name: "ASC" } })
  res.json({ features })
}
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(CATALOG_MODULE)
  const [feat] = await svc.createFeatures([req.body])
  res.status(201).json({ feature: feat })
}

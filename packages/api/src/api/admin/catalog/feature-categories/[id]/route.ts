import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CATALOG_MODULE } from "../../../../../modules/catalog"

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(CATALOG_MODULE)
  const id = req.params.id
  const [cat] = await svc.listFeatureCategories({ id })
  if (!cat) return res.status(404).json({ message: "Category not found" })
  const features = await svc.listFeatures({ category: cat.key })
  for (const f of features) {
    if (f.id) await svc.deleteFeatures([f.id])
  }
  await svc.deleteFeatureCategories([id])
  res.json({ id, deleted: true, features_deleted: features.length })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(CATALOG_MODULE)
  const body = req.body as { label?: string; sort_order?: number }
  const [cat] = await svc.updateFeatureCategories([{ id: req.params.id, ...body }])
  res.json({ category: cat })
}

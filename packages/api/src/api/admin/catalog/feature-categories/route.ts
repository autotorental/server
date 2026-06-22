import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CATALOG_MODULE } from "../../../../modules/catalog"

const DEFAULT_CATEGORIES = [
  { key: "comfort", label: "Comfort", sort_order: 0 },
  { key: "extras", label: "Extras", sort_order: 1 },
  { key: "performance", label: "Performance", sort_order: 2 },
  { key: "safety", label: "Safety", sort_order: 3 },
  { key: "tech", label: "Tech", sort_order: 4 },
]

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(CATALOG_MODULE)
  let categories = await svc.listFeatureCategories({}, { order: { sort_order: "ASC", label: "ASC" } })
  if (!categories.length) {
    await svc.createFeatureCategories(DEFAULT_CATEGORIES)
    categories = await svc.listFeatureCategories({}, { order: { sort_order: "ASC", label: "ASC" } })
  }
  const features = await svc.listFeatures({}, {})
  const usedKeys = new Set(features.map((f: any) => f.category).filter(Boolean) as string[])
  for (const key of usedKeys) {
    if (categories.some((c: any) => c.key === key)) continue
    const [created] = await svc.createFeatureCategories([{
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "),
      sort_order: categories.length,
    }])
    categories.push(created)
  }
  categories.sort((a: any, b: any) => (a.sort_order - b.sort_order) || a.label.localeCompare(b.label))
  res.json({ categories })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(CATALOG_MODULE)
  const body = req.body as { key?: string; label?: string; sort_order?: number }
  const key = (body.key || "").trim().toLowerCase().replace(/\s+/g, "_")
  const label = (body.label || "").trim()
  if (!key || !label) return res.status(400).json({ message: "key and label are required" })
  const existing = await svc.listFeatureCategories({ key })
  if (existing.length) return res.status(409).json({ message: "Category already exists" })
  const maxOrder = await svc.listFeatureCategories({}, { order: { sort_order: "DESC" }, take: 1 })
  const sort_order = body.sort_order ?? ((maxOrder[0]?.sort_order ?? -1) + 1)
  const [category] = await svc.createFeatureCategories([{ key, label, sort_order }])
  res.status(201).json({ category })
}

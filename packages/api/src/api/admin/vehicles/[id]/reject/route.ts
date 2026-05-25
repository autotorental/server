import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CATALOG_MODULE } from "../../../../../modules/catalog"
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(CATALOG_MODULE)
  const body = req.body as any
  if (!body?.rejection_reason) return res.status(400).json({ message: "rejection_reason required" })
  const [v] = await svc.updateVehicles([{
    id: req.params.id,
    status: "rejected",
    rejection_reason: body.rejection_reason,
    rejection_note: body.rejection_note || null,
    rejected_at: new Date(),
    approved_at: null,
  }])
  res.json({ vehicle: v })
}

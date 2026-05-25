import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { REPORTS_MODULE } from "../../../../modules/reports"
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(REPORTS_MODULE)
  const body = req.body as any; delete body.id
  const [r] = await svc.updateReports([{ id: req.params.id, ...body }])
  res.json({ report: r })
}
export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(REPORTS_MODULE)
  await svc.deleteReports([req.params.id])
  res.json({ id: req.params.id, deleted: true })
}

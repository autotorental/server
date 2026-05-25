import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { REPORTS_MODULE } from "../../../modules/reports"
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(REPORTS_MODULE)
  const q = req.query as any
  const filters: any = {}
  if (q.status) filters.status = q.status
  if (q.seller_id) filters.seller_id = q.seller_id
  const reports = await svc.listReports(filters, { order: { created_at: "DESC" } })
  res.json({ reports })
}

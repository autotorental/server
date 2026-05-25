import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { REPORTS_MODULE } from "../../../modules/reports"
import { CATALOG_MODULE } from "../../../modules/catalog"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const reports: any = req.scope.resolve(REPORTS_MODULE)
  const catalog: any = req.scope.resolve(CATALOG_MODULE)
  const body = req.body as any
  if (!body?.vehicle_id || !body?.reason) return res.status(400).json({ message: "vehicle_id and reason required" })
  // resolve seller_id from vehicle
  let seller_id: string | null = null
  try {
    const v = await catalog.retrieveVehicle(body.vehicle_id)
    seller_id = v?.seller_id || null
  } catch {}
  const [report] = await reports.createReports([{
    vehicle_id: body.vehicle_id,
    seller_id,
    reporter_name: body.reporter_name || null,
    reporter_email: body.reporter_email || null,
    reporter_phone: body.reporter_phone || null,
    reason: body.reason,
    description: body.description || null,
    ip_address: (req.headers["x-forwarded-for"] || req.ip || "").toString().split(",")[0].trim() || null,
  }])
  res.status(201).json({ id: report.id })
}

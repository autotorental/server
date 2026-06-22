import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { loadGa4, ga4Token, ga4RunReport, ga4Metadata, GA4_SA_HINT } from "../../../../lib/ga4"

// GET /admin/analytics/ga4?metadata=1   -> ALL available GA4 metrics & dimensions
// GET /admin/analytics/ga4?metric=activeUsers&dimension=date&days=30 -> a report
// Returns { connected:false, reason, sa_email, property_id, message } when the
// service account hasn't been granted access to the GA4 property yet.
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const creds = await loadGa4(req.scope)
  if (!creds) return res.json({ connected: false, reason: "not_configured", sa_email: GA4_SA_HINT, message: "GA4 property id / service account not set." })
  const token = await ga4Token(creds.saJson)
  if (!token) return res.json({ connected: false, reason: "auth_failed", sa_email: GA4_SA_HINT, message: "Service-account authentication failed." })
  const q = req.query as any

  const denied = (j: any) => ({ connected: false, reason: "permission", property_id: creds.propertyId, sa_email: GA4_SA_HINT, message: (j && j.error && j.error.message) || "GA4 access denied — grant the service account access to the property." })

  if (q.metadata) {
    const m = await ga4Metadata(creds.propertyId, token)
    if (m.status !== 200) return res.json(denied(m.json))
    const metrics = ((m.json && m.json.metrics) || []).map((x: any) => ({ name: x.apiName, label: x.uiName || x.apiName, category: x.category || "", type: x.type || "" }))
    const dimensions = ((m.json && m.json.dimensions) || []).map((x: any) => ({ name: x.apiName, label: x.uiName || x.apiName, category: x.category || "" }))
    return res.json({ connected: true, property_id: creds.propertyId, metrics, dimensions })
  }

  const metric = String(q.metric || "activeUsers")
  const dimension = String(q.dimension || "date")
  const days = Math.min(365, Math.max(1, parseInt(q.days, 10) || 30))
  const orderBys = dimension === "date"
    ? [{ dimension: { dimensionName: "date" } }]
    : [{ metric: { metricName: metric }, desc: true }]
  const body = {
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
    dimensions: [{ name: dimension }],
    metrics: [{ name: metric }],
    orderBys,
    limit: dimension === "date" ? 400 : 12,
  }
  const rep = await ga4RunReport(creds.propertyId, token, body)
  if (rep.status !== 200) return res.json(denied(rep.json))
  const rows = ((rep.json && rep.json.rows) || []).map((r: any) => ({
    key: (r.dimensionValues && r.dimensionValues[0] && r.dimensionValues[0].value) || "",
    value: Number((r.metricValues && r.metricValues[0] && r.metricValues[0].value) || 0),
  }))
  res.json({ connected: true, metric, dimension, days, rows })
}

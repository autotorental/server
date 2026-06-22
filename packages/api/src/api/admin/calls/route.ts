import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import fs from "fs"
import path from "path"

const REC_DIR = process.env.RECORDINGS_DIR || "/opt/autorental/recordings"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  const limit = Math.min(Number(req.query.limit) || 50, 200)
  const offset = Number(req.query.offset) || 0
  const status = req.query.status ? String(req.query.status) : null
  const direction = req.query.direction ? String(req.query.direction) : null
  const sellerId = req.query.seller_id ? String(req.query.seller_id) : null
  const dateFrom = req.query.date_from ? String(req.query.date_from) : null
  const dateTo = req.query.date_to ? String(req.query.date_to) : null

  const base = () => {
    let q = pg("vendor_call as vc")
      .leftJoin("seller as s", "s.id", "vc.seller_id")
      .leftJoin("vehicle as v", "v.id", "vc.vehicle_id")
    if (status) q = q.where("vc.status", status)
    if (direction) q = q.where("vc.direction", direction)
    if (sellerId) q = q.where("vc.seller_id", sellerId)
    if (dateFrom) q = q.where("vc.created_at", ">=", new Date(`${dateFrom}T00:00:00.000Z`))
    if (dateTo) q = q.where("vc.created_at", "<=", new Date(`${dateTo}T23:59:59.999Z`))
    return q
  }

  const calls = await base()
    .orderBy("vc.created_at", "desc")
    .limit(limit)
    .offset(offset)
    .select(
      "vc.*",
      "s.name as seller_name",
      "s.phone as seller_phone",
      "v.title as vehicle_title"
    )

  const countRow = await base().count("vc.id as c").first()

  const callsWithRecording = (calls as any[]).map((c) => ({
    ...c,
    recording_url: c.recording_file ? `/admin/calls/${c.id}/recording` : null,
  }))

  res.json({
    calls: callsWithRecording,
    count: Number((countRow as any)?.c || 0),
    limit,
    offset,
  })
}


// DELETE /admin/calls — bulk delete by { ids: string[] } (and their recording files).
export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const ids = (req.body as any)?.ids
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: "Provide a non-empty ids array" })
  }

  const rows = await pg("vendor_call").whereIn("id", ids).select("id", "recording_file")
  const deleted = await pg("vendor_call").whereIn("id", ids).del()

  for (const r of rows as any[]) {
    if (!r.recording_file) continue
    try {
      const fp = path.join(REC_DIR, path.basename(String(r.recording_file)))
      if (fs.existsSync(fp)) fs.unlinkSync(fp)
    } catch {
      // best-effort recording cleanup
    }
  }

  res.json({ deleted })
}

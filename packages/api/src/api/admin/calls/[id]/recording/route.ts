import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import fs from "fs"
import path from "path"

const REC_DIR = process.env.RECORDINGS_DIR || "/opt/autorental/recordings"

// GET /admin/calls/:id/recording — streams the audio recording (admin-only).
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const id = req.params.id
  const [call] = await pg("vendor_call").where({ id }).select("recording_file")
  if (!call?.recording_file) return res.status(404).json({ message: "No recording" })

  const safe = path.basename(String(call.recording_file))
  const fp = path.join(REC_DIR, safe)
  if (!fs.existsSync(fp)) return res.status(404).json({ message: "Recording file not found" })

  const stat = fs.statSync(fp)
  res.setHeader("Content-Type", "audio/ogg")
  res.setHeader("Accept-Ranges", "bytes")

  const range = req.headers.range
  if (range) {
    const m = /bytes=(\d+)-(\d*)/.exec(range)
    const start = m ? parseInt(m[1], 10) : 0
    const end = m && m[2] ? parseInt(m[2], 10) : stat.size - 1
    res.status(206)
    res.setHeader("Content-Range", `bytes ${start}-${end}/${stat.size}`)
    res.setHeader("Content-Length", String(end - start + 1))
    fs.createReadStream(fp, { start, end }).pipe(res)
  } else {
    res.setHeader("Content-Length", String(stat.size))
    fs.createReadStream(fp).pipe(res)
  }
}

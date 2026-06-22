import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import fs from "fs"
import path from "path"

const REC_DIR = process.env.RECORDINGS_DIR || "/opt/autorental/recordings"

// DELETE /admin/calls/:id — permanently remove a single call log (and its recording file).
export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const id = req.params.id

  const [call] = await pg("vendor_call").where({ id }).select("id", "recording_file")
  if (!call) return res.status(404).json({ message: "Call not found" })

  await pg("vendor_call").where({ id }).del()

  if (call.recording_file) {
    try {
      const fp = path.join(REC_DIR, path.basename(String(call.recording_file)))
      if (fs.existsSync(fp)) fs.unlinkSync(fp)
    } catch {
      // recording cleanup is best-effort; the log row is already gone
    }
  }

  res.json({ id, deleted: true })
}

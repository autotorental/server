import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import * as fs from "fs"

const FILE = "/opt/autorental/uploads/call-waiting.mp3"
const URL = "https://api.autotorental.com/static/call-waiting.mp3"
const MAX = 10 * 1024 * 1024

export const GET = async (_req: MedusaRequest, res: MedusaResponse) => {
  let exists = false, size = 0, updated_at: any = null
  try { const st = fs.statSync(FILE); exists = true; size = st.size; updated_at = st.mtime } catch {}
  res.json({ url: URL + "?t=" + (updated_at ? new Date(updated_at).getTime() : 0), exists, size, updated_at })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body: any = req.body || {}
  const b64 = String(body.content_base64 || "").replace(/^data:[^;]+;base64,/, "")
  if (!b64) return res.status(400).json({ message: "content_base64 required" })
  const buf = Buffer.from(b64, "base64")
  if (!buf.length) return res.status(400).json({ message: "empty file" })
  if (buf.length > MAX) return res.status(413).json({ message: "Max 10 MB" })
  const h = buf.subarray(0, 12)
  const isMp3 = (h[0] === 0x49 && h[1] === 0x44 && h[2] === 0x33) || (h[0] === 0xff && (h[1] & 0xe0) === 0xe0)
  const isM4a = h.subarray(4, 8).toString("latin1") === "ftyp"
  const isWav = h.subarray(0, 4).toString("latin1") === "RIFF"
  const isOgg = h.subarray(0, 4).toString("latin1") === "OggS"
  if (!(isMp3 || isM4a || isWav || isOgg)) return res.status(415).json({ message: "Please upload an audio file (MP3 / M4A / WAV / OGG)." })
  try { fs.writeFileSync(FILE, buf) } catch (e: any) { return res.status(500).json({ message: String(e?.message || e).slice(0, 120) }) }
  res.json({ ok: true, url: URL + "?t=" + Date.now(), size: buf.length })
}

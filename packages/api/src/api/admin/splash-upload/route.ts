// Admin-only upload endpoint for the mobile splash screen media.
// Accepts JSON: { filename: string, content_base64: string }
// Returns a public URL served by nginx at /static/<file>.

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import * as fs from "fs"
import * as path from "path"
import * as crypto from "crypto"
import { toWebpIfImage } from "../../../lib/media-convert"

const UPLOAD_DIR = "/opt/autorental/uploads"
const MAX_BYTES = 50 * 1024 * 1024
const ALLOWED_EXT: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
}
const PUBLIC_BASE = "https://api.autotorental.com/static"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const body = req.body as { filename?: string; content_base64?: string }
    if (!body?.filename || !body?.content_base64) {
      return res.status(400).json({ message: "filename and content_base64 required" })
    }

    const ext = (path.extname(body.filename) || "").toLowerCase().slice(0, 8)
    if (!ALLOWED_EXT[ext]) {
      return res
        .status(415)
        .json({ message: `Unsupported file type: ${ext}. Allowed: MP4/WEBM/MOV video or PNG/JPG/WEBP/GIF image.` })
    }

    const b64 = body.content_base64.replace(/^data:[^;]+;base64,/, "")
    const buffer = Buffer.from(b64, "base64")

    if (buffer.length > MAX_BYTES) {
      return res.status(413).json({ message: `File exceeds ${MAX_BYTES / 1024 / 1024} MB limit` })
    }
    if (buffer.length === 0) {
      return res.status(400).json({ message: "Empty file" })
    }

    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })
    const { buffer: outBuffer, ext: outExt } = await toWebpIfImage(buffer, ext)
    const safeName = `splash_${Date.now()}_${crypto.randomBytes(8).toString("hex")}${outExt}`
    const dest = path.join(UPLOAD_DIR, safeName)
    fs.writeFileSync(dest, outBuffer)

    const url = `${PUBLIC_BASE}/${safeName}`
    const media_type = ALLOWED_EXT[ext].startsWith("video/") ? "video" : "image"
    return res.status(201).json({ url, media_type })
  } catch (e: any) {
    console.error("[splash-upload]", e)
    return res.status(500).json({ message: e?.message || "Upload failed" })
  }
}

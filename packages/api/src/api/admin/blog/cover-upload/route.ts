import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import * as fs from "fs"
import * as path from "path"
import * as crypto from "crypto"
import sharp from "sharp"

// POST /admin/blog/cover-upload  { filename, content_base64 }
// Crops the uploaded cover to a clean default 1200x630 (16:8.4) WebP and returns its URL.
const UPLOAD_DIR = "/opt/autorental/uploads"
const PUBLIC_BASE = "https://api.autotorental.com/static"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const body = req.body as { filename?: string; content_base64?: string }
    if (!body?.content_base64) return res.status(400).json({ message: "content_base64 required" })
    const b64 = body.content_base64.replace(/^data:[^;]+;base64,/, "")
    const buf = Buffer.from(b64, "base64")
    if (!buf.length) return res.status(400).json({ message: "Empty file" })
    if (buf.length > 25 * 1024 * 1024) return res.status(413).json({ message: "Max 25MB" })

    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })
    const out = await sharp(buf)
      .resize(1200, 630, { fit: "cover", position: "attention" })
      .webp({ quality: 82 })
      .toBuffer()
    const name = `blogcover_${Date.now()}_${crypto.randomBytes(6).toString("hex")}.webp`
    fs.writeFileSync(path.join(UPLOAD_DIR, name), out)
    res.status(201).json({ url: `${PUBLIC_BASE}/${name}`, width: 1200, height: 630 })
  } catch (e: any) {
    res.status(500).json({ message: e?.message || "Cover upload failed" })
  }
}

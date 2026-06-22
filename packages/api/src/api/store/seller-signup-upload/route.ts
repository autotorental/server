// Public upload endpoint for the seller signup form.
// Accepts JSON: { filename: string, content_base64: string }
// Returns a public URL served by nginx at /static/<file>.

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import * as fs from "fs"
import * as path from "path"
import * as crypto from "crypto"
import { toWebpIfImage } from "../../../lib/media-convert"

const UPLOAD_DIR = "/opt/autorental/uploads"
const MAX_BYTES = 8 * 1024 * 1024
const ALLOWED_EXT: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".heic": "image/heic",
  ".heif": "image/heif",
}
const PUBLIC_BASE = "https://api.autotorental.com/static"

const ipHits: Map<string, number[]> = new Map()
function rateLimited(ip: string): boolean {
  const now = Date.now()
  const hour = 60 * 60 * 1000
  const hits = (ipHits.get(ip) || []).filter(t => now - t < hour)
  if (hits.length >= 10) return true
  hits.push(now)
  ipHits.set(ip, hits)
  return false
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() || req.ip || "unknown"
    if (rateLimited(ip)) return res.status(429).json({ message: "Too many uploads from your IP — wait an hour" })

    const body = req.body as { filename?: string; content_base64?: string }
    if (!body?.filename || !body?.content_base64) {
      return res.status(400).json({ message: "filename and content_base64 required" })
    }

    const ext = (path.extname(body.filename) || "").toLowerCase().slice(0, 8)
    if (!ALLOWED_EXT[ext]) {
      return res.status(415).json({ message: `Unsupported file type: ${ext}. Allowed: PDF or image (PNG/JPG/WEBP/HEIC).` })
    }

    // Strip any "data:...;base64," prefix
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
    const safeName = `tl_${Date.now()}_${crypto.randomBytes(8).toString("hex")}${outExt}`
    const dest = path.join(UPLOAD_DIR, safeName)
    fs.writeFileSync(dest, outBuffer)

    const url = `${PUBLIC_BASE}/${safeName}`
    return res.status(201).json({ url, files: [{ url }] })
  } catch (e: any) {
    console.error("[seller-signup-upload]", e)
    return res.status(500).json({ message: e?.message || "Upload failed" })
  }
}

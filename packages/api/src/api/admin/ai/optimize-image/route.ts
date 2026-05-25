import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import sharp from "sharp"
import { promises as fs } from "fs"
import path from "path"

const UPLOAD_DIR = "/opt/autorental/uploads"
const PUBLIC_URL = "https://api.autotorental.com/static"

// POST /admin/ai/optimize-image
// Body: { url: string, target?: "card" | "hero" | "thumb" }
// Downloads or reads, resizes + compresses, uploads back, returns new URL
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = req.body as any
  if (!body?.url) return res.status(400).json({ message: "url required" })

  const target = body.target || "card"
  const presets: Record<string, { width: number; quality: number }> = {
    thumb: { width: 400, quality: 75 },
    card:  { width: 1200, quality: 82 },
    hero:  { width: 2000, quality: 85 },
  }
  const preset = presets[target] || presets.card

  try {
    // Fetch image bytes (either local /static/... or remote)
    let buf: Buffer
    if (body.url.includes("/static/")) {
      const localPath = path.join(UPLOAD_DIR, body.url.split("/static/")[1])
      buf = await fs.readFile(localPath)
    } else {
      const r = await fetch(body.url)
      buf = Buffer.from(await r.arrayBuffer())
    }

    const meta = await sharp(buf).metadata()
    const out = await sharp(buf)
      .rotate()
      .resize({ width: preset.width, withoutEnlargement: true, fit: "inside" })
      .webp({ quality: preset.quality, effort: 4 })
      .toBuffer()

    const filename = `${Date.now()}-opt-${target}.webp`
    await fs.writeFile(path.join(UPLOAD_DIR, filename), out)
    const newUrl = `${PUBLIC_URL}/${filename}`

    res.json({
      url: newUrl,
      original: { width: meta.width, height: meta.height, bytes: buf.length },
      optimized: { width: Math.min(preset.width, meta.width || 0), bytes: out.length, format: "webp" },
      savings_pct: Math.round((1 - out.length / buf.length) * 100),
    })
  } catch (e: any) {
    res.status(500).json({ message: "optimize failed", error: e.message })
  }
}

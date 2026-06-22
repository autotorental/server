import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import fs from "fs"
import path from "path"
import sharp from "sharp"

// GET /img?src=<filename>&w=<width>&q=<quality>
// On-the-fly image resizer + WebP converter with a disk cache. The mobile app
// requests small thumbnails (e.g. w=700) instead of the 2–4 MB originals, so the
// grid loads ~40x less data. First request resizes + caches under uploads/.thumbs/
// <w>/<name>.webp; later requests stream the cached WebP (immutable, 1-year cache).
const UPLOADS = "/opt/autorental/uploads"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const q = req.query as any
  const base = path.basename(String(q.src || "")) // basename only → no path traversal
  const w = Math.min(1600, Math.max(48, parseInt(String(q.w || "700")) || 700))
  const quality = Math.min(95, Math.max(40, parseInt(String(q.q || "78")) || 78))
  if (!base || base === "." || base.includes("..")) return res.status(400).end()

  const orig = path.join(UPLOADS, base)
  if (!fs.existsSync(orig)) return res.status(404).end()

  // Don't rasterise video/pdf/vector/animated — send the original path back
  // (SVG logos must stay vector; GIFs must keep their animation).
  if (/\.(mp4|webm|mov|m4v|pdf|mp3|svg|gif)$/i.test(base)) {
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable")
    return res.redirect(302, `/static/${encodeURIComponent(base)}`)
  }

  const cacheDir = path.join(UPLOADS, ".thumbs", `${w}q${quality}`)
  const out = path.join(cacheDir, base.replace(/\.[^.]+$/, "") + ".webp")

  try {
    if (!fs.existsSync(out)) {
      fs.mkdirSync(cacheDir, { recursive: true })
      await sharp(orig, { failOn: "none" })
        .rotate() // honour EXIF orientation
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality, effort: 4 })
        .toFile(out)
    }
    const buf = fs.readFileSync(out)
    res.setHeader("Content-Type", "image/webp")
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable")
    res.setHeader("Content-Length", String(buf.length))
    res.setHeader("Access-Control-Allow-Origin", "*")
    return res.end(buf)
  } catch {
    // Any decode/resize failure → fall back to the original so images never break.
    res.setHeader("Cache-Control", "public, max-age=86400")
    return res.redirect(302, `/static/${encodeURIComponent(base)}`)
  }
}

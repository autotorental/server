// Shared media conversion helper.
// Images → WebP (resized, auto-oriented, compressed) using sharp (bundled with Medusa).
// Videos are left untouched here (WebM transcode needs ffmpeg + a background worker — handled separately).
import sharp from "sharp"

const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".gif", ".heic", ".heif", ".webp", ".bmp", ".tiff", ".tif"])
// Formats sharp can read but browsers can't (or handle poorly) — always convert these.
const ALWAYS_CONVERT = new Set([".heic", ".heif", ".bmp", ".tiff", ".tif"])

const MAX_DIM = 1920
const WEBP_QUALITY = 80

export type ConvertResult = { buffer: Buffer; ext: string; mime: string; converted: boolean }

// Convert an image buffer to optimized WebP. Returns the original untouched for non-images or on any failure.
export async function toWebpIfImage(buffer: Buffer, ext: string): Promise<ConvertResult> {
  const e = (ext || "").toLowerCase()
  if (!IMAGE_EXTS.has(e)) return { buffer, ext: e, mime: "", converted: false }
  try {
    const animated = e === ".gif" || e === ".webp"
    let img = sharp(buffer, { animated, failOn: "none" })
    const meta = await img.metadata()
    img = img.rotate() // auto-orient from EXIF, then strip metadata
    if ((meta.width || 0) > MAX_DIM || (meta.height || 0) > MAX_DIM) {
      img = img.resize(MAX_DIM, MAX_DIM, { fit: "inside", withoutEnlargement: true })
    }
    const out = await img.webp({ quality: WEBP_QUALITY, effort: 4 }).toBuffer()
    // Use WebP if it saves space, or if the source format must be converted anyway.
    if (ALWAYS_CONVERT.has(e) || out.length < buffer.length) {
      return { buffer: out, ext: ".webp", mime: "image/webp", converted: true }
    }
    return { buffer, ext: e, mime: "", converted: false }
  } catch {
    // Never block an upload because conversion failed — store the original.
    return { buffer, ext: e, mime: "", converted: false }
  }
}

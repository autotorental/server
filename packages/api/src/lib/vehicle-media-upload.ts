import * as crypto from "crypto"
import * as fs from "fs"
import * as path from "path"
import sharp from "sharp"

const UPLOAD_DIR = "/opt/autorental/uploads"
const PUBLIC_BASE = "https://api.autotorental.com/static"
const IMAGE_MAX_BYTES = 8 * 1024 * 1024
const VIDEO_MAX_BYTES = 50 * 1024 * 1024

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".heic", ".heif"])
const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov", ".m4v", ".ogg", ".ogv"])
const EXT_TO_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".m4v": "video/x-m4v",
  ".ogg": "video/ogg",
  ".ogv": "video/ogg",
}

const ipHits: Map<string, number[]> = new Map()

export type UploadKind = "image" | "video"

function cleanHits(ip: string): number[] {
  const now = Date.now()
  const hour = 60 * 60 * 1000
  const hits = (ipHits.get(ip) || []).filter((t) => now - t < hour)
  ipHits.set(ip, hits)
  return hits
}

export function isRateLimited(ip: string): boolean {
  const hits = cleanHits(ip)
  if (hits.length >= 20) return true
  hits.push(Date.now())
  ipHits.set(ip, hits)
  return false
}

function getExtension(filename: string): string {
  return (path.extname(filename) || "").toLowerCase().slice(0, 8)
}

function allowedSet(kind: UploadKind): Set<string> {
  return kind === "video" ? VIDEO_EXTENSIONS : IMAGE_EXTENSIONS
}

function maxBytes(kind: UploadKind): number {
  return kind === "video" ? VIDEO_MAX_BYTES : IMAGE_MAX_BYTES
}

function mimeIsAllowed(ext: string, mime: string | null | undefined): boolean {
  if (!mime) return true
  const expected = EXT_TO_MIME[ext]
  if (!expected) return false
  return mime.toLowerCase() === expected || (expected === "video/ogg" && mime.toLowerCase() === "application/ogg")
}

export async function saveVehicleMediaFile(params: {
  filename: string
  contentBase64: string
  kind: UploadKind
  declaredMimeType?: string | null
}): Promise<{ url: string; kind: UploadKind; mime_type: string }> {
  const ext = getExtension(params.filename)
  const allowed = allowedSet(params.kind)
  if (!allowed.has(ext)) {
    throw new Error(`Unsupported ${params.kind} type: ${ext || "unknown"}`)
  }

  if (!mimeIsAllowed(ext, params.declaredMimeType)) {
    throw new Error(`MIME type does not match ${params.kind} extension`)
  }

  const b64 = params.contentBase64.replace(/^data:[^;]+;base64,/, "")
  const buffer = Buffer.from(b64, "base64")
  if (!buffer.length) throw new Error("Empty file")

  const max = maxBytes(params.kind)
  if (buffer.length > max) {
    throw new Error(`${params.kind} exceeds ${Math.round(max / 1024 / 1024)} MB limit`)
  }

  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })

  let outputBuffer: Buffer = buffer as Buffer
  let outputExt = ext
  let outputMime = EXT_TO_MIME[ext] || (params.kind === "video" ? "video/mp4" : "image/jpeg")

  if (params.kind === "image" && ext !== ".webp") {
    // Canonical upload format for photos is WebP (better compression + SEO-friendly image URLs).
    outputBuffer = (await sharp(buffer, { failOn: "none", animated: true })
      .rotate()
      .resize(1920, 1920, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 84, effort: 6, smartSubsample: true })
      .toBuffer()) as Buffer
    outputExt = ".webp"
    outputMime = "image/webp"
  }

  const safeName = `veh_${params.kind}_${Date.now()}_${crypto.randomBytes(8).toString("hex")}${outputExt}`
  const dest = path.join(UPLOAD_DIR, safeName)
  fs.writeFileSync(dest, outputBuffer)

  return {
    url: `${PUBLIC_BASE}/${safeName}`,
    kind: params.kind,
    mime_type: outputMime,
  }
}

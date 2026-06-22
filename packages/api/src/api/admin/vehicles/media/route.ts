import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { isRateLimited, saveVehicleMediaFile } from "../../../../lib/vehicle-media-upload"

type UploadBody = {
  filename?: string
  content_base64?: string
  media_kind?: "image" | "video"
  mime_type?: string
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() || req.ip || "unknown"
    if (isRateLimited(ip)) {
      return res.status(429).json({ message: "Too many uploads from your IP — wait an hour" })
    }

    const body = req.body as UploadBody
    if (!body?.filename || !body?.content_base64 || !body?.media_kind) {
      return res.status(400).json({ message: "filename, content_base64, media_kind required" })
    }
    if (!["image", "video"].includes(body.media_kind)) {
      return res.status(400).json({ message: "media_kind must be image or video" })
    }

    const file = await saveVehicleMediaFile({
      filename: body.filename,
      contentBase64: body.content_base64,
      kind: body.media_kind,
      declaredMimeType: body.mime_type,
    })
    return res.status(201).json({ file, files: [{ url: file.url, type: file.kind, mime_type: file.mime_type }] })
  } catch (e: any) {
    const message = e?.message || "Upload failed"
    const status = /exceeds/i.test(message) ? 413 : /unsupported|mime|invalid|empty/i.test(message) ? 415 : 500
    return res.status(status).json({ message })
  }
}

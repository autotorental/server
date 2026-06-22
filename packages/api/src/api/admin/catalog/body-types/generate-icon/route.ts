import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const { name } = (req.body || {}) as { name: string }
  if (!name?.trim()) return res.status(400).json({ message: "name required" })

  const falRow = await pg("app_setting").where({ key: "fal_api_key" }).first()
  if (!falRow?.value) return res.status(400).json({ message: "FAL.ai key not set in AI Settings" })

  const prompt = `Minimalist flat icon of a ${name} car/vehicle type. Clean vector style, single color or duotone, transparent-friendly background, icon for web app. No text, no watermark. Professional UI icon.`

  const r = await fetch("https://fal.run/fal-ai/flux/schnell", {
    method: "POST",
    headers: { "Authorization": `Key ${falRow.value}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, image_size: "square_hd", num_images: 1, enable_safety_checker: false }),
    signal: AbortSignal.timeout(60000),
  })
  if (!r.ok) return res.status(r.status).json({ message: "FAL.ai error" })
  const d = await r.json()
  const url = d.images?.[0]?.url
  if (!url) return res.status(500).json({ message: "No image returned" })
  res.json({ ok: true, url })
}

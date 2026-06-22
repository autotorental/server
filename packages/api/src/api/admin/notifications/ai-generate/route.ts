import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { resolveAiTask, aiComplete } from "../../../../lib/ai-resolve"
import * as fs from "fs"
import * as path from "path"
import * as crypto from "crypto"

const UPLOAD_DIR = "/opt/autorental/uploads"
const PUBLIC_BASE = "https://api.autotorental.com/static"

function saveBuf(buf: Buffer): string {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })
  const f = "push-" + crypto.randomBytes(8).toString("hex") + ".png"
  fs.writeFileSync(path.join(UPLOAD_DIR, f), buf)
  return PUBLIC_BASE + "/" + f
}

// Banner generator: FAL FLUX first (the account's working image provider),
// then OpenAI (gpt-image-1 → dall-e-3) as a fallback for when it's enabled.
async function genBanner(pg: any, topic: string): Promise<{ url?: string; error?: string }> {
  const prompt = `Ultra-premium, photorealistic advertising banner for a UAE luxury car-rental brand. Subject: ${topic}. A pristine exotic supercar, golden-hour Dubai skyline, dramatic cinematic lighting, glossy reflections, shallow depth of field, high-end automotive editorial photography, ultra-detailed, wide 16:9 banner with clean negative space. Absolutely NO text, NO words, NO logos, NO watermarks.`
  let lastErr = ""
  let falKey = "", openaiKey = ""
  try { const r = await pg("app_setting").where({ key: "fal_api_key" }).first(); falKey = r?.value || "" } catch {}
  try { const r = await pg("app_setting").where({ key: "openai_api_key" }).first(); openaiKey = r?.value || "" } catch {}

  if (falKey) {
    for (const model of ["fal-ai/flux/dev", "fal-ai/flux/schnell"]) {
      try {
        const r = await fetch("https://fal.run/" + model, {
          method: "POST",
          headers: { "Authorization": "Key " + falKey, "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, image_size: "landscape_16_9", num_images: 1, enable_safety_checker: false }),
          signal: AbortSignal.timeout(60000),
        })
        const d: any = await r.json().catch(() => ({}))
        const url = d?.images?.[0]?.url
        if (r.ok && url) {
          const img = await fetch(url, { signal: AbortSignal.timeout(45000) })
          return { url: saveBuf(Buffer.from(await img.arrayBuffer())) }
        }
        lastErr = (JSON.stringify(d) || ("FAL " + r.status)).slice(0, 140)
      } catch (e: any) { lastErr = "FAL: " + String(e?.message || e).slice(0, 100) }
    }
  }

  if (openaiKey && openaiKey.length > 20) {
    for (const m of [{ model: "gpt-image-1", size: "1536x1024" }, { model: "dall-e-3", size: "1792x1024" }]) {
      try {
        const payload: any = { model: m.model, prompt, n: 1, size: m.size }
        if (m.model === "dall-e-3") payload.quality = "hd"
        const r = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: { "Authorization": "Bearer " + openaiKey, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(120000),
        })
        const j: any = await r.json()
        let buf: Buffer | null = null
        if (j?.data?.[0]?.b64_json) buf = Buffer.from(j.data[0].b64_json, "base64")
        else if (j?.data?.[0]?.url) { const img = await fetch(j.data[0].url); buf = Buffer.from(await img.arrayBuffer()) }
        else { lastErr = j?.error?.message || lastErr; continue }
        return { url: saveBuf(buf) }
      } catch (e: any) { lastErr = "OpenAI: " + String(e?.message || e).slice(0, 100) }
    }
  }
  return { error: lastErr || "no image provider configured" }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const body = (req.body as any) || {}
  const topic = String(body.topic || "").trim()
  const lang = String(body.language || "ar").toLowerCase() === "en" ? "English" : "Arabic"
  const withImage = !!body.with_image
  if (!topic) return res.status(400).json({ message: "topic required" })

  const cfg = await resolveAiTask(pg, "push")
  if (!cfg.enabled || !cfg.key) return res.status(400).json({ message: "AI not configured — add an OpenAI key in AI settings." })

  const system = `You are a world-class mobile push-notification copywriter for "Auto to Rental", a UAE luxury car-rental marketplace (autotorental.com). Your single goal is to maximize tap-through rate. Reply ONLY in ${lang}. Return a JSON object with EXACTLY these keys: "title" (<=40 chars, a strong scroll-stopping hook, at most ONE emoji), "body" (<=120 chars: a concrete benefit + light urgency + a clear call to action, at most ONE emoji), "link" (the single most relevant in-app path: "/cars", "/cars?brand=<brand>", "/monthly-car-rental-dubai", "/cars?city=dubai", or "" if none fits). Sound premium, natural and human — never ALL-CAPS, never spammy, no surrounding quotes. No markdown, no extra keys.`
  let title = "", bodyTxt = "", link = ""
  try {
    const raw = await aiComplete(cfg, system, topic, { json: true, maxTokens: 300, temperature: 0.85, timeoutMs: 45000 })
    const j = JSON.parse(String(raw).replace(/```json|```/g, "").trim())
    title = String(j.title || "").slice(0, 90)
    bodyTxt = String(j.body || "").slice(0, 220)
    link = String(j.link || "").trim()
  } catch (e: any) {
    return res.status(500).json({ message: "AI text failed: " + String(e?.message || e).slice(0, 160) })
  }

  let image_url = "", image_error = ""
  if (withImage) {
    const out = await genBanner(pg, topic)
    if (out.url) image_url = out.url
    else {
      const e = String(out.error || "")
      const exhausted = /exhaust|locked|balance/i.test(e)
      if (lang === "Arabic")
        image_error = exhausted
          ? "رصيد FAL.ai منتهي — اشحن من fal.ai/dashboard/billing وبتشتغل الصور فورًا (الكود يستخدم FAL أولاً). النص والرابط شغّالين."
          : "توليد الصور يحتاج رصيد: اشحن FAL.ai (fal.ai/dashboard/billing) — الأسرع — أو فعّل نماذج الصور في OpenAI. النص والرابط شغّالين. (" + e.slice(0, 70) + ")"
      else
        image_error = exhausted
          ? "FAL.ai balance is empty — top up at fal.ai/dashboard/billing and images work instantly (code uses FAL first). Text & link work."
          : "Image needs credit: top up FAL.ai (fal.ai/dashboard/billing) — fastest — or enable image models in OpenAI. Text & link work. (" + e.slice(0, 70) + ")"
    }
  }
  res.json({ title, body: bodyTxt, link, image_url, image_error })
}

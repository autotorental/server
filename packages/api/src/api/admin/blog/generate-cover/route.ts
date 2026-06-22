import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import * as fs from "fs"
import * as path from "path"
import * as crypto from "crypto"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const { title, style } = (req.body || {}) as { title: string; style?: string }
  if (!title?.trim()) return res.status(400).json({ message: "title required" })

  const [falRow, openaiRow, hfRow] = await Promise.all([
    pg("app_setting").where({ key: "fal_api_key" }).first(),
    pg("app_setting").where({ key: "openai_api_key" }).first(),
    pg("app_setting").where({ key: "huggingface_api_key" }).first(),
  ])
  const falKey    = falRow?.value || ""
  const openaiKey = openaiRow?.value || ""
  const hfKey     = hfRow?.value    || ""

  const pickCarPhoto = async (): Promise<string | null> => {
    const kw = title.toLowerCase()
    const brands = ["lamborghini","mercedes","ferrari","porsche","rolls","bentley","audi","bmw","range rover","nissan","toyota","cadillac","lexus","gmc","kia","mazda","chevrolet","fiat"]
    const hit = brands.find(b => kw.includes(b.split(" ")[0]))
    const rows = await pg("vehicle").whereNotNull("photos").where("status","active").whereNull("deleted_at").orderByRaw("RANDOM()").limit(40).select("photos","title")
    if (hit) {
      for (const r of rows) {
        try {
          const ph = Array.isArray(r.photos) ? r.photos : JSON.parse(r.photos || "[]")
          if (String(r.title || "").toLowerCase().includes(hit) && ph.length) {
            return ph[Math.floor(Math.random() * Math.min(ph.length, 5))]
          }
        } catch {}
      }
    }
    for (const r of rows) {
      try {
        const ph = Array.isArray(r.photos) ? r.photos : JSON.parse(r.photos || "[]")
        if (ph.length) return ph[Math.floor(Math.random() * Math.min(ph.length, 5))]
      } catch {}
    }
    return null
  }

  const styleMap: Record<string,string> = {
    photo:        "professional photography, photorealistic, high resolution, golden hour lighting",
    illustration: "flat design illustration, clean vector art, modern, vibrant colors",
    cinematic:    "cinematic photography, dramatic lighting, film grain, anamorphic lens, moody",
    minimal:      "minimalist design, clean composition, white background, simple, editorial",
  }
  const styleStr = styleMap[style || "photo"] || styleMap.photo
  const prompt = `Blog cover for article: "${title}". Luxury car rental in Dubai, UAE. ${styleStr}. Wide 16:9 banner, no text, no watermark, premium editorial quality.`

  const tried: { provider: string; reason: string }[] = []

  // Save remote URL → local file (so URL is permanent + we own the asset)
  const saveRemote = async (url: string, source: string): Promise<string> => {
    const r = await fetch(url, { signal: AbortSignal.timeout(45000) })
    if (!r.ok) throw new Error(`download failed ${r.status}`)
    const buf = Buffer.from(await r.arrayBuffer())
    const dir = "/opt/autorental/uploads/blog-covers"
    fs.mkdirSync(dir, { recursive: true })
    const ext = (r.headers.get("content-type") || "").includes("png") ? "png" : "jpg"
    const fname = `cover_${source}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}.${ext}`
    fs.writeFileSync(path.join(dir, fname), buf)
    return `https://api.autotorental.com/static/blog-covers/${fname}`
  }

  // ── 1. HuggingFace Pro → FAL FLUX (premium quality, free via HF Pro) ──
  if (hfKey) {
    try {
      const r = await fetch("https://router.huggingface.co/fal-ai/fal-ai/flux/schnell", {
        method: "POST",
        headers: { "Authorization": `Bearer ${hfKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, image_size: "landscape_16_9", num_images: 1, enable_safety_checker: false }),
        signal: AbortSignal.timeout(60000),
      })
      const d: any = await r.json().catch(() => ({}))
      const remoteUrl = d?.images?.[0]?.url
      if (r.ok && remoteUrl) {
        try {
          const localUrl = await saveRemote(remoteUrl, "hf-fal")
          return res.json({ ok: true, url: localUrl, prompt, source: "huggingface-fal-flux" })
        } catch {
          // If saving fails, return the temporary remote URL anyway
          return res.json({ ok: true, url: remoteUrl, prompt, source: "huggingface-fal-flux-tmp" })
        }
      }
      tried.push({ provider: "hf-fal-flux", reason: (d?.error || `error ${r.status}`).toString().slice(0, 120) })
    } catch (e: any) { tried.push({ provider: "hf-fal-flux", reason: e?.message?.slice(0, 80) || "network" }) }

    // ── 1b. HF native FLUX (backup) ──
    try {
      const r = await fetch("https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell", {
        method: "POST",
        headers: { "Authorization": `Bearer ${hfKey}`, "Content-Type": "application/json", "Accept": "image/png" },
        body: JSON.stringify({ inputs: prompt, parameters: { width: 1280, height: 720, num_inference_steps: 4 } }),
        signal: AbortSignal.timeout(60000),
      })
      if (r.ok) {
        const buf = Buffer.from(await r.arrayBuffer())
        const dir = "/opt/autorental/uploads/blog-covers"
        fs.mkdirSync(dir, { recursive: true })
        const fname = `cover_hf_${Date.now()}_${crypto.randomBytes(4).toString("hex")}.png`
        fs.writeFileSync(path.join(dir, fname), buf)
        return res.json({ ok: true, url: `https://api.autotorental.com/static/blog-covers/${fname}`, prompt, source: "huggingface-flux-native" })
      }
      const t = await r.text().catch(() => "")
      tried.push({ provider: "hf-native-flux", reason: `${r.status}: ${t.slice(0, 100)}` })
    } catch (e: any) { tried.push({ provider: "hf-native-flux", reason: e?.message?.slice(0, 80) || "network" }) }
  } else {
    tried.push({ provider: "huggingface", reason: "no token" })
  }

  // ── 2. Direct FAL.ai (user's own key) ──
  if (falKey) {
    try {
      const r = await fetch("https://fal.run/fal-ai/flux/schnell", {
        method: "POST",
        headers: { "Authorization": `Key ${falKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, image_size: "landscape_16_9", num_images: 1, enable_safety_checker: false }),
        signal: AbortSignal.timeout(45000),
      })
      const d: any = await r.json().catch(() => ({}))
      if (r.ok && d.images?.[0]?.url) return res.json({ ok: true, url: d.images[0].url, prompt, source: "fal-flux-direct" })
      const errStr = JSON.stringify(d).slice(0, 200)
      tried.push({ provider: "fal-direct", reason: errStr.includes("locked") || errStr.includes("Exhausted") ? "balance exhausted" : `error ${r.status}` })
    } catch (e: any) { tried.push({ provider: "fal-direct", reason: e?.message?.slice(0, 80) || "network" }) }
  }

  // ── 3. OpenAI DALL-E (if available) ──
  if (openaiKey) {
    try {
      const r = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { "Authorization": `Bearer ${openaiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "dall-e-3", prompt: prompt.slice(0, 4000), size: "1792x1024", n: 1 }),
        signal: AbortSignal.timeout(60000),
      })
      const d: any = await r.json().catch(() => ({}))
      if (r.ok && d.data?.[0]?.url) return res.json({ ok: true, url: d.data[0].url, prompt, source: "openai-dalle3" })
      tried.push({ provider: "openai-dalle3", reason: (d?.error?.message || `error ${r.status}`).slice(0, 100) })
    } catch (e: any) { tried.push({ provider: "openai-dalle3", reason: e?.message?.slice(0, 80) || "network" }) }
  }

  // ── 4. Fleet photo last-resort ──
  const photo = await pickCarPhoto().catch(() => null)
  if (photo) {
    return res.json({
      ok: true, url: photo, source: "fleet-photo",
      note: `Providers tried: ${tried.map(t => `${t.provider} (${t.reason})`).join("; ")}`,
    })
  }
  return res.status(500).json({ message: "All image providers failed", detail: tried.map(t => `${t.provider}: ${t.reason}`).join("; ") })
}

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getSetting } from "../../../../lib/settings"

// POST /vendor/catalog/describe — AI-generate an SEO title + SEO description (+ suggested color).
const COLORS = ["White","Black","Silver","Grey","Blue","Red","Green","Brown","Beige","Gold","Orange","Yellow","Maroon","Navy"]

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const b = (req.body || {}) as any
  const brand = String(b.brand || "").trim()
  const model = String(b.model || "").trim()
  const year = b.year ? String(b.year) : ""
  const bodyType = String(b.body_type || "").trim()
  const color = String(b.color || "").trim()
  const fuel = String(b.fuel || "").trim()
  const transmission = String(b.transmission || "").trim()
  const seats = b.seats ? String(b.seats) : ""
  const doors = b.doors ? String(b.doors) : ""
  const mileage = b.mileage ? String(b.mileage) : ""
  const city = String(b.city || "").trim()
  const features: string[] = Array.isArray(b.features) ? b.features.filter(Boolean).map(String) : []
  const lang = String(b.lang || "en")

  const fallbackTitle = ([year, brand, model].filter(Boolean).join(" ") || brand || "Vehicle") + (city ? ` for rent in ${city}` : "")

  try {
    const knex: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const row = await knex("ai_setting").where({ id: "default" }).first().catch(() => null)
    const apiKey = row?.api_key || (await getSetting(req.scope, "openai_api_key")) || process.env.OPENAI_API_KEY || ""
    const baseUrl = row?.base_url || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"
    const aiModel = row?.model || process.env.OPENAI_MODEL || "gpt-4o-mini"

    if (apiKey) {
      const facts = [
        brand && `Brand: ${brand}`, model && `Model: ${model}`, year && `Year: ${year}`,
        bodyType && `Body: ${bodyType}`, color && `Known color: ${color}`, fuel && `Fuel: ${fuel}`,
        transmission && `Transmission: ${transmission}`, seats && `Seats: ${seats}`, doors && `Doors: ${doors}`,
        mileage && `Mileage: ${mileage} km`, city && `City: ${city}`,
        features.length ? `Features: ${features.join(", ")}` : "",
      ].filter(Boolean).join("\n")

      const sys = `You write SEO-optimized car-rental listings for a UAE/Syria marketplace. Given the car facts, return ONLY compact JSON:
{"title":"...","description":"...","color":"..."}
- title: a catchy, SEO-friendly rental listing title, max ~65 characters, naturally including brand, model, year and city when available (e.g. "Rent 2022 Range Rover Sport in Dubai — Luxury SUV"). No quotes inside.
- description: SEO-optimized, 50-85 words, natural keywords (car rental + brand/model + city), highlight comfort, key features and who it suits. No prices, phone numbers or emojis.
- color: the single most likely exterior color, chosen ONLY from this list: ${COLORS.join(", ")}. If a known color is given, use it.
Write title and description in ${lang === "ar" ? "Arabic" : "English"}. color stays an English word from the list.`

      const resp = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: aiModel, temperature: 0.7, response_format: { type: "json_object" }, messages: [{ role: "system", content: sys }, { role: "user", content: facts }] }),
      })
      if (resp.ok) {
        const j: any = await resp.json()
        const p = JSON.parse(j?.choices?.[0]?.message?.content || "{}")
        const outColor = COLORS.find((c) => c.toLowerCase() === String(p.color || color).toLowerCase()) || color || ""
        if (p.title || p.description) {
          return res.json({ title: String(p.title || fallbackTitle).trim(), description: String(p.description || "").trim(), color: outColor, ai: true })
        }
      }
    }
  } catch { /* fall through */ }

  const lead = [`This ${[year, brand, model].filter(Boolean).join(" ") || "vehicle"}`, color, bodyType].filter(Boolean).join(" ")
  const featLine = features.length ? ` It comes with ${features.slice(0, 8).join(", ")}.` : ""
  const cityLine = city ? ` Available for rent in ${city}.` : " Available for rent."
  res.json({ title: fallbackTitle, description: `${lead} is a great choice for your next trip.${cityLine}${featLine}`.replace(/\s+/g, " ").trim(), color, ai: false })
}

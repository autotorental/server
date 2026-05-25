import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

const DEFAULT_DESCRIPTION_PROMPT = `Generate JSON with three fields for a car rental listing:
- "title": under 70 characters, catchy headline (include year + model + city if useful)
- "short": under 160 characters, one-line summary for listing cards
- "description": 80-140 words, friendly tone, mention key features, lifestyle, who would enjoy it. Plain text, no markdown.

Never invent specs not provided. Use the details given below.`

async function loadConfig(req: MedusaRequest) {
  const knex: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const row = await knex("ai_setting").where({ id: "default" }).first().catch(() => null)
  return {
    api_key: row?.api_key || process.env.OPENAI_API_KEY || "",
    base_url: row?.base_url || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    model: row?.model || process.env.OPENAI_MODEL || "gpt-4o-mini",
    description_prompt: row?.description_prompt || DEFAULT_DESCRIPTION_PROMPT,
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const cfg = await loadConfig(req)
  if (!cfg.api_key) return res.status(503).json({ message: "AI not configured. Go to Admin → AI Settings to add an API key." })

  const b = req.body as any
  const { brand, model, year, body_type, transmission, fuel_type, seats, color, mileage_km, features = [], price_daily, city, currency = "AED" } = b
  if (!brand && !model) return res.status(400).json({ message: "brand or model required" })

  const featureList = Array.isArray(features) && features.length ? features.join(", ") : ""
  const carName = [year, brand, model].filter(Boolean).join(" ")

  const userPrompt = [
    `Car: ${carName || "(unknown)"}`,
    body_type && `Body type: ${body_type}`,
    transmission && `Transmission: ${transmission}`,
    fuel_type && `Fuel: ${fuel_type}`,
    seats && `Seats: ${seats}`,
    color && `Color: ${color}`,
    mileage_km && `Mileage: ${mileage_km.toLocaleString()} km`,
    featureList && `Features: ${featureList}`,
    price_daily && `Daily rental price: ${currency} ${price_daily}`,
    city && `Located in: ${city}`,
  ].filter(Boolean).join("\n")

  try {
    const url = `${cfg.base_url.replace(/\/$/, "")}/chat/completions`
    const r = await fetch(url, {
      method: "POST",
      headers: { "Authorization": `Bearer ${cfg.api_key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: cfg.model,
        temperature: 0.75,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: cfg.description_prompt },
          { role: "user", content: userPrompt },
        ],
      }),
    })
    if (!r.ok) {
      const t = await r.text()
      return res.status(502).json({ message: "AI provider failed", detail: t.slice(0, 500) })
    }
    const j = await r.json()
    const content = j.choices?.[0]?.message?.content || "{}"
    try {
      const out = JSON.parse(content)
      return res.json({ title: out.title, short: out.short, description: out.description })
    } catch {
      return res.json({ description: content })
    }
  } catch (e: any) {
    res.status(500).json({ message: "generate failed", error: e.message })
  }
}

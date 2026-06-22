import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { resolveAiTask, aiComplete } from "../../../../lib/ai-resolve"

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
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const ai = await resolveAiTask(pg, "descriptions")
  if (ai.provider !== "local" && !ai.key) return res.status(503).json({ message: "AI not configured for descriptions — pick an engine in AI Control Center / add its key in AI Settings." })

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
    const content = await aiComplete(ai, cfg.description_prompt, userPrompt, { json: true, temperature: 0.75 })
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

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { CATALOG_MODULE } from "../../../../modules/catalog"

const SYSTEM_PROMPT = `You pre-fill a car rental listing by selecting which features a specific car most likely has as standard equipment.
Given the car details and a numbered list of AVAILABLE features, return JSON: {"feature_ids":["..."]} with ONLY the ids this exact car/trim very likely has.
Rules: choose from provided ids ONLY; be realistic for the brand/model/year (base economy = no premium features; pre-2010 = no modern tech like CarPlay/360 camera); quality over quantity. Respond with ONLY a JSON object, no markdown.`

function extractJson(text: string): any {
  const t = (text || "").replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim()
  try { return JSON.parse(t) } catch {}
  const s = t.indexOf("{"), e = t.lastIndexOf("}")
  if (s >= 0 && e > s) { try { return JSON.parse(t.slice(s, e + 1)) } catch {} }
  return null
}

async function loadConfig(req: MedusaRequest) {
  const knex: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const row = await knex("ai_setting").where({ id: "default" }).first().catch(() => null)
  const get = async (k: string) => (await knex("app_setting").where({ key: k }).first().catch(() => null))?.value || ""
  const provider = await get("ai_provider")
  // Map provider → endpoint
  if (provider.startsWith("claude")) {
    return { kind: "ollama" as const, api_key: row?.api_key || "", base_url: row?.base_url || "https://ai.sirizone.com/ollama/v1", model: row?.model || "hermes3:8b" } // claude path complex; use ollama for features
  }
  return {
    kind: "ollama" as const,
    api_key: row?.api_key || "sk-f171498a5cb5e5f93461e0ef12d4ba30c3374dafb2d0d01c",
    base_url: row?.base_url || "https://ai.sirizone.com/ollama/v1",
    model: (provider && !provider.startsWith("claude")) ? provider : (row?.model || "qwen2.5-coder:14b"),
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const cfg = await loadConfig(req)
  if (!cfg.api_key) return res.status(503).json({ message: "AI not configured (AI Settings)." })

  const b = (req.body as any) || {}
  const { brand, model, year, body_type, transmission, fuel_type, seats } = b
  if (!brand && !model) return res.status(400).json({ message: "brand or model required" })

  const svc: any = req.scope.resolve(CATALOG_MODULE)
  const features = await svc.listFeatures({}).catch(() => [])
  if (!features?.length) return res.json({ feature_ids: [] })

  const validIds = new Set(features.map((f: any) => f.id))
  const featureLines = features.map((f: any) => `${f.id} :: ${f.name}${f.category ? ` (${f.category})` : ""}`).join("\n")
  const carName = [year, brand, model].filter(Boolean).join(" ")
  const userPrompt = [
    `Car: ${carName || "(unknown)"}`,
    body_type && `Body type: ${body_type}`,
    transmission && `Transmission: ${transmission}`,
    fuel_type && `Fuel: ${fuel_type}`,
    seats && `Seats: ${seats}`,
    "", "AVAILABLE FEATURES (id :: name):", featureLines,
  ].filter((x) => x !== undefined && x !== false).join("\n")

  try {
    const r = await fetch(`${cfg.base_url.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.api_key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: cfg.model, temperature: 0.2, max_tokens: 800,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: userPrompt }],
      }),
      signal: AbortSignal.timeout(90000),
    })
    if (!r.ok) return res.status(502).json({ message: "AI provider failed", feature_ids: [] })
    const j = await r.json().catch(() => null)
    const parsed = extractJson(j?.choices?.[0]?.message?.content || "")
    const ids: string[] = Array.isArray(parsed?.feature_ids) ? parsed.feature_ids : []
    return res.json({ feature_ids: ids.filter((id) => validIds.has(id)) })
  } catch (e: any) {
    return res.status(500).json({ message: e?.name === "TimeoutError" ? "AI timed out" : "suggest failed", feature_ids: [] })
  }
}
